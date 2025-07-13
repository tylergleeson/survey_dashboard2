const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const { generateTokens, verifySetupToken, revokeUserSessions } = require('../utils/jwt');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Setup user account (from SMS onboarding)
router.post('/setup', async (req, res) => {
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
    const existingUser = await pool.query(
      'SELECT user_id FROM users WHERE phone_number = $1',
      [userData.phoneNumber]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const userId = uuidv4();
    const userQuery = `
      INSERT INTO users (
        user_id, phone_number, age, occupation, location,
        income_level, education_level, housing_situation, family_status,
        tech_adoption, political_leaning, media_consumption, password_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING user_id, phone_number, tier, earnings, quality_score, created_at
    `;
    
    const userResult = await pool.query(userQuery, [
      userId,
      userData.phoneNumber,
      userData.age,
      userData.occupation,
      userData.location,
      userData.inferredData.incomeLevel,
      userData.inferredData.educationLevel,
      userData.inferredData.housingSituation,
      userData.inferredData.familyStatus,
      userData.inferredData.techAdoption,
      userData.inferredData.politicalLeaning,
      userData.inferredData.mediaConsumption,
      passwordHash
    ]);
    
    // Generate JWT token
    const jwtToken = await generateTokens(
      userId,
      req.ip,
      req.get('User-Agent')
    );
    
    res.status(201).json({
      message: 'Account created successfully',
      token: jwtToken,
      user: userResult.rows[0]
    });
    
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;
    
    if (!phoneNumber || !password) {
      return res.status(400).json({ error: 'Phone number and password required' });
    }
    
    // Find user
    const userResult = await pool.query(
      `SELECT user_id, phone_number, password_hash, tier, subscription_status, 
              earnings, quality_score, last_active
       FROM users WHERE phone_number = $1`,
      [phoneNumber]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = userResult.rows[0];
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last active
    await pool.query(
      'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE user_id = $1',
      [user.user_id]
    );
    
    // Generate JWT token
    const token = await generateTokens(
      user.user_id,
      req.ip,
      req.get('User-Agent')
    );
    
    const { password_hash, ...userWithoutPassword } = user;
    
    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await revokeUserSessions(req.user.userId);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT user_id, phone_number, age, occupation, location, tier,
              earnings, quality_score, subscription_status, created_at, last_active,
              income_level, education_level, housing_situation, family_status,
              tech_adoption, political_leaning, media_consumption
       FROM users WHERE user_id = $1`,
      [req.user.userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: userResult.rows[0] });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const newToken = await generateTokens(
      req.user.userId,
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({ token: newToken });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

module.exports = router;