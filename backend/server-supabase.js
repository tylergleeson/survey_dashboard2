require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const twilio = require('twilio');
const { supabaseAdmin, supabaseClient } = require('./config/supabase');
const { generateTokens, generateSetupToken, verifySetupToken, revokeUserSessions } = require('./utils/supabase-jwt');
const { authenticateToken } = require('./middleware/supabase-auth');
const { inferUserCharacteristics } = require('./utils/featureInference');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Survey Gig Backend with Supabase is running!',
    supabase: !!supabaseAdmin ? 'Connected' : 'Disconnected'
  });
});

// Test Supabase connection
app.get('/api/test-db', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('surveys')
      .select('survey_id, title, base_reward, tier_requirements')
      .limit(3);

    if (error) {
      throw error;
    }

    res.json({ 
      message: 'Supabase connection successful!',
      surveys: data,
      count: data.length
    });
  } catch (error) {
    console.error('Supabase connection error:', error);
    res.status(500).json({ 
      error: 'Database connection failed',
      details: error.message
    });
  }
});

// Authentication endpoints
app.post('/api/auth/demo-login', async (req, res) => {
  try {
    // Return demo user data
    const mockUser = {
      user_id: 'demo-user-123',
      phone_number: '+1 (555) 123-4567',
      age: 28,
      occupation: 'Software Engineer',
      location: 'Austin',
      tier: 'pro',
      earnings: 1247.50,
      quality_score: 4.2,
      subscription_status: 'active',
      created_at: '2024-01-15T10:30:00Z',
      last_active: new Date().toISOString()
    };

    res.json({
      success: true,
      token: 'demo-token-123',
      user: mockUser
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User dashboard stats
app.get('/api/users/dashboard-stats', async (req, res) => {
  try {
    // For now, return mock data. Later this will query Supabase based on user
    const stats = {
      totalEarnings: 1247.50,
      completedSurveys: 23,
      availableOpportunities: 8,
      qualityRating: 4.2,
      monthlyEarnings: 325.00,
      surveyCompletionRate: 87.5
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available surveys
app.get('/api/surveys/available', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('surveys')
      .select(`
        survey_id,
        title,
        questions,
        base_reward,
        tier_requirements,
        estimated_duration,
        category,
        status,
        created_at
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Add potential earnings calculation
    const surveysWithEarnings = data.map(survey => ({
      ...survey,
      potential_earnings: {
        total_potential: survey.base_reward * 1.25, // Mock calculation
        demographic_bonus: survey.base_reward * 0.25
      }
    }));

    res.json({ 
      success: true, 
      data: surveysWithEarnings,
      count: surveysWithEarnings.length
    });
  } catch (error) {
    console.error('Error fetching surveys:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get survey details
app.get('/api/surveys/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabaseAdmin
      .from('surveys')
      .select('*')
      .eq('survey_id', id)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching survey:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new survey (Elite tier only - placeholder)
app.post('/api/surveys', async (req, res) => {
  try {
    const { title, questions, base_reward, tier_requirements, estimated_duration, category } = req.body;

    const { data, error } = await supabaseAdmin
      .from('surveys')
      .insert([{
        title,
        questions,
        base_reward,
        tier_requirements,
        estimated_duration,
        category,
        status: 'active'
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating survey:', error);
    res.status(500).json({ error: error.message });
  }
});

// Authentication endpoints
app.post('/api/auth/setup', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password required' });
    }
    
    // Verify setup token
    let userData;
    try {
      userData = verifySetupToken(token);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid or expired setup token' });
    }
    
    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('user_id')
      .eq('phone_number', userData.phoneNumber)
      .single();
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const userId = uuidv4();
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert([{
        user_id: userId,
        phone_number: userData.phoneNumber,
        age: userData.age,
        occupation: userData.occupation,
        location: userData.location,
        income_level: userData.inferredData.incomeLevel,
        education_level: userData.inferredData.educationLevel,
        housing_situation: userData.inferredData.housingSituation,
        family_status: userData.inferredData.familyStatus,
        tech_adoption: userData.inferredData.techAdoption,
        political_leaning: userData.inferredData.politicalLeaning,
        media_consumption: userData.inferredData.mediaConsumption,
        password_hash: passwordHash
      }])
      .select('user_id, phone_number, tier, earnings, quality_score, created_at')
      .single();
    
    if (error) {
      throw error;
    }
    
    // Generate JWT token
    const jwtToken = await generateTokens(
      userId,
      req.ip,
      req.get('User-Agent')
    );
    
    res.status(201).json({
      success: true,
      data: {
        message: 'Account created successfully',
        token: jwtToken,
        user: newUser
      }
    });
    
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;
    
    if (!phoneNumber || !password) {
      return res.status(400).json({ error: 'Phone number and password required' });
    }
    
    // Find user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select(`
        user_id, phone_number, password_hash, tier, subscription_status, 
        earnings, quality_score, last_active
      `)
      .eq('phone_number', phoneNumber)
      .single();
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last active
    await supabaseAdmin
      .from('users')
      .update({ last_active: new Date().toISOString() })
      .eq('user_id', user.user_id);
    
    // Generate JWT token
    const token = await generateTokens(
      user.user_id,
      req.ip,
      req.get('User-Agent')
    );
    
    const { password_hash, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      data: {
        message: 'Login successful',
        token,
        user: userWithoutPassword
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    await revokeUserSessions(req.user.userId);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select(`
        user_id, phone_number, age, occupation, location, tier,
        earnings, quality_score, subscription_status, created_at, last_active,
        income_level, education_level, housing_situation, family_status,
        tech_adoption, political_leaning, media_consumption
      `)
      .eq('user_id', req.user.userId)
      .single();
    
    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, data: { user } });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

// SMS onboarding webhook - DISABLED: Now using Supabase phone auth signup
// app.post('/webhook/sms', async (req, res) => {
app.post('/webhook/sms-disabled', async (req, res) => {
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

// Real-time endpoint to get Supabase realtime connection info
app.get('/api/realtime/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Survey Gig Backend with Supabase running on port ${PORT}`);
  console.log(`📅 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🗄️  Database test: http://localhost:${PORT}/api/test-db`);
  
  // Test Supabase connection on startup
  supabaseAdmin
    .from('surveys')
    .select('count', { count: 'exact' })
    .then(({ count, error }) => {
      if (error) {
        console.error('❌ Supabase connection failed:', error.message);
      } else {
        console.log(`✅ Supabase connected successfully! Found ${count} surveys`);
      }
    });
});