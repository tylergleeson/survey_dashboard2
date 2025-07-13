const express = require('express');
const twilio = require('twilio');
const { generateSetupToken } = require('../utils/jwt');
const { inferUserCharacteristics } = require('../utils/featureInference');

const router = express.Router();

// SMS onboarding webhook
router.post('/sms', async (req, res) => {
  try {
    const { Body: message, From: phoneNumber } = req.body;
    
    // Validate Twilio request (optional but recommended)
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioSignature = req.headers['x-twilio-signature'];
    
    if (process.env.NODE_ENV === 'production' && twilioSignature) {
      const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      const isValid = twilio.validateRequest(authToken, twilioSignature, url, req.body);
      
      if (!isValid) {
        return res.status(403).json({ error: 'Invalid Twilio signature' });
      }
    }
    
    // Parse SMS message format: "AGE OCCUPATION CITY"
    const messageParts = message.trim().split(/\s+/);
    
    if (messageParts.length < 3) {
      // Send error response via SMS
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      await client.messages.create({
        body: 'Invalid format. Please send: AGE OCCUPATION CITY (example: "28 Software Engineer Austin")',
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });
      
      return res.status(200).send('<Response></Response>');
    }
    
    // Extract data
    const age = parseInt(messageParts[0]);
    const occupation = messageParts.slice(1, -1).join(' '); // Everything except first and last
    const location = messageParts[messageParts.length - 1];
    
    // Validate age
    if (isNaN(age) || age < 18 || age > 80) {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      await client.messages.create({
        body: 'Invalid age. Please provide an age between 18 and 80.',
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });
      
      return res.status(200).send('<Response></Response>');
    }
    
    // Run feature inference
    const inferredData = inferUserCharacteristics(age, occupation, location);
    
    // Generate setup token
    const userData = {
      phoneNumber,
      age,
      occupation,
      location,
      inferredData
    };
    
    const setupToken = generateSetupToken(userData);
    
    // Create dashboard URL
    const dashboardUrl = `${process.env.FRONTEND_URL}/setup?token=${setupToken}`;
    
    // Send SMS with dashboard link
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    const welcomeMessage = `Welcome to Survey Gig! 🎯

Based on your profile (${age}, ${occupation}, ${location}), you're eligible for our platform.

Complete your setup here: ${dashboardUrl}

This link expires in 24 hours. Reply STOP to opt out.`;
    
    await client.messages.create({
      body: welcomeMessage,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    
    console.log(`SMS onboarding initiated for ${phoneNumber}`);
    
    res.status(200).send('<Response></Response>');
    
  } catch (error) {
    console.error('SMS webhook error:', error);
    
    // Send error SMS if possible
    try {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      await client.messages.create({
        body: 'Sorry, there was an error processing your request. Please try again later.',
        from: process.env.TWILIO_PHONE_NUMBER,
        to: req.body.From
      });
    } catch (smsError) {
      console.error('Failed to send error SMS:', smsError);
    }
    
    res.status(200).send('<Response></Response>');
  }
});

// Twilio Voice webhook for call status updates
router.post('/call-status', async (req, res) => {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body;
    
    console.log(`Call ${CallSid} status: ${CallStatus}, duration: ${CallDuration}`);
    
    // Update call status in database
    const pool = require('../config/database');
    
    await pool.query(
      `UPDATE calls 
       SET status = $1, call_duration = $2
       WHERE twilio_call_sid = $3`,
      [CallStatus === 'completed' ? 'completed' : CallStatus, CallDuration, CallSid]
    );
    
    res.status(200).send('<Response></Response>');
    
  } catch (error) {
    console.error('Call status webhook error:', error);
    res.status(200).send('<Response></Response>');
  }
});

// Stripe webhook for subscription events
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  const pool = require('../config/database');
  
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        
        // Update user subscription status
        await pool.query(
          `UPDATE users 
           SET subscription_status = $1, tier = $2
           WHERE stripe_customer_id = $3`,
          [subscription.status, subscription.metadata.tier, subscription.customer]
        );
        
        console.log(`Subscription ${subscription.id} updated for customer ${subscription.customer}`);
        break;
        
      case 'customer.subscription.deleted':
        const deletedSub = event.data.object;
        
        // Downgrade to basic tier
        await pool.query(
          `UPDATE users 
           SET subscription_status = 'cancelled', tier = 'basic'
           WHERE stripe_customer_id = $1`,
          [deletedSub.customer]
        );
        
        console.log(`Subscription cancelled for customer ${deletedSub.customer}`);
        break;
        
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        
        await pool.query(
          `UPDATE users 
           SET subscription_status = 'past_due'
           WHERE stripe_customer_id = $1`,
          [failedInvoice.customer]
        );
        
        console.log(`Payment failed for customer ${failedInvoice.customer}`);
        break;
        
      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }
    
    res.json({ received: true });
    
  } catch (error) {
    console.error('Stripe webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;