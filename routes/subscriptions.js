const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get subscription info
router.get('/info', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const query = `
      SELECT 
        s.tier,
        s.monthly_fee,
        s.start_date,
        s.next_billing_date,
        s.status,
        s.stripe_subscription_id,
        u.stripe_customer_id
      FROM subscriptions s
      JOIN users u ON s.user_id = u.user_id
      WHERE s.user_id = $1 AND s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.json({ 
        data: { 
          tier: 'basic',
          status: 'inactive' 
        } 
      });
    }
    
    res.json({ data: result.rows[0] });
    
  } catch (error) {
    console.error('Subscription info error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription info' });
  }
});

// Create Stripe checkout session
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const { tier } = req.body;
    const userId = req.user.userId;
    
    if (!['pro', 'elite'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }
    
    // Get user info
    const userQuery = 'SELECT phone_number, stripe_customer_id FROM users WHERE user_id = $1';
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    let customerId = user.stripe_customer_id;
    
    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        phone: user.phone_number,
        metadata: {
          user_id: userId
        }
      });
      
      customerId = customer.id;
      
      // Save customer ID
      await pool.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE user_id = $2',
        [customerId, userId]
      );
    }
    
    // Define pricing
    const tierPricing = {
      pro: { amount: 1900, name: 'Pro Tier' }, // $19.00
      elite: { amount: 19900, name: 'Elite Tier' } // $199.00
    };
    
    const pricing = tierPricing[tier];
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Survey Gig ${pricing.name}`,
              description: `Monthly subscription to ${tier} tier features`,
            },
            unit_amount: pricing.amount,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/subscription?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription?cancelled=true`,
      metadata: {
        user_id: userId,
        tier: tier
      },
    });
    
    res.json({ data: { sessionUrl: session.url } });
    
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Cancel subscription
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get active subscription
    const subQuery = `
      SELECT stripe_subscription_id 
      FROM subscriptions 
      WHERE user_id = $1 AND status = 'active'
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const subResult = await pool.query(subQuery, [userId]);
    
    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }
    
    const stripeSubId = subResult.rows[0].stripe_subscription_id;
    
    // Cancel in Stripe (at period end)
    await stripe.subscriptions.update(stripeSubId, {
      cancel_at_period_end: true
    });
    
    // Update local record
    await pool.query(
      `UPDATE subscriptions 
       SET status = 'cancelled' 
       WHERE user_id = $1 AND stripe_subscription_id = $2`,
      [userId, stripeSubId]
    );
    
    res.json({ message: 'Subscription cancelled successfully' });
    
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Get billing history
router.get('/billing-history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user's Stripe customer ID
    const userQuery = 'SELECT stripe_customer_id FROM users WHERE user_id = $1';
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0 || !userResult.rows[0].stripe_customer_id) {
      return res.json({ data: [] });
    }
    
    const customerId = userResult.rows[0].stripe_customer_id;
    
    // Get invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 12, // Last 12 invoices
    });
    
    const billingHistory = invoices.data.map(invoice => ({
      id: invoice.id,
      amount: invoice.amount_paid / 100, // Convert from cents
      currency: invoice.currency,
      status: invoice.status,
      date: new Date(invoice.created * 1000),
      period_start: new Date(invoice.period_start * 1000),
      period_end: new Date(invoice.period_end * 1000),
      invoice_url: invoice.hosted_invoice_url
    }));
    
    res.json({ data: billingHistory });
    
  } catch (error) {
    console.error('Billing history error:', error);
    res.status(500).json({ error: 'Failed to fetch billing history' });
  }
});

// Elite tier application
router.post('/apply-elite', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      linkedin_profile,
      company_name,
      job_title,
      annual_income,
      team_size,
      reason_for_joining
    } = req.body;
    
    // Check if user is Pro tier
    if (req.user.tier !== 'pro') {
      return res.status(403).json({ 
        error: 'Must be Pro tier to apply for Elite' 
      });
    }
    
    // Store application data
    await pool.query(
      `UPDATE users 
       SET 
         linkedin_profile = $1,
         company_info = $2,
         income_level = $3
       WHERE user_id = $4`,
      [
        linkedin_profile,
        JSON.stringify({
          company_name,
          job_title,
          team_size,
          reason_for_joining
        }),
        annual_income,
        userId
      ]
    );
    
    // In a real implementation, this would trigger a review process
    // For now, we'll just acknowledge the application
    
    res.json({
      message: 'Elite tier application submitted successfully',
      data: {
        status: 'pending_review',
        next_steps: [
          'Income verification review',
          'LinkedIn profile verification',
          'Video interview scheduling',
          'Final approval process'
        ]
      }
    });
    
  } catch (error) {
    console.error('Elite application error:', error);
    res.status(500).json({ error: 'Failed to submit Elite application' });
  }
});

module.exports = router;