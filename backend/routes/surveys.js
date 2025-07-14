const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireTier } = require('../middleware/auth');
const { calculateDemographicBonus } = require('../utils/featureInference');

const router = express.Router();

// Get available surveys for user
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userTier = req.user.tier;
    
    // Get surveys that user is eligible for and hasn't completed
    const query = `
      SELECT 
        s.survey_id,
        s.title,
        s.questions,
        s.base_reward,
        s.tier_requirements,
        s.estimated_duration,
        s.category,
        s.target_demographics,
        s.created_at
      FROM surveys s
      WHERE s.status = 'active'
      AND (
        s.tier_requirements = 'basic' OR
        (s.tier_requirements = 'pro' AND $2 IN ('pro', 'elite')) OR
        (s.tier_requirements = 'elite' AND $2 = 'elite')
      )
      AND s.survey_id NOT IN (
        SELECT DISTINCT survey_id 
        FROM calls 
        WHERE user_id = $1 AND status IN ('completed', 'in-progress')
      )
      ORDER BY s.base_reward DESC, s.created_at DESC
    `;
    
    const result = await pool.query(query, [userId, userTier]);
    
    // Get user data for demographic bonus calculation
    const userQuery = `
      SELECT age, occupation, location, income_level, education_level
      FROM users WHERE user_id = $1
    `;
    const userResult = await pool.query(userQuery, [userId]);
    const userData = userResult.rows[0];
    
    // Calculate potential earnings for each survey
    const surveysWithBonuses = result.rows.map(survey => {
      const demographicBonus = calculateDemographicBonus(
        userData, 
        survey.target_demographics
      );
      
      return {
        ...survey,
        potential_earnings: {
          base_reward: parseFloat(survey.base_reward),
          demographic_bonus: demographicBonus,
          total_potential: parseFloat(survey.base_reward) + demographicBonus
        }
      };
    });
    
    res.json({ data: surveysWithBonuses });
    
  } catch (error) {
    console.error('Available surveys error:', error);
    res.status(500).json({ error: 'Failed to fetch available surveys' });
  }
});

// Get survey details
router.get('/:surveyId', authenticateToken, async (req, res) => {
  try {
    const { surveyId } = req.params;
    const userId = req.user.userId;
    
    const query = `
      SELECT 
        s.*,
        CASE 
          WHEN c.call_id IS NOT NULL THEN c.status
          ELSE NULL
        END as user_call_status
      FROM surveys s
      LEFT JOIN calls c ON s.survey_id = c.survey_id AND c.user_id = $2
      WHERE s.survey_id = $1
    `;
    
    const result = await pool.query(query, [surveyId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    
    const survey = result.rows[0];
    
    // Check if user is eligible for this survey
    const tierLevels = { basic: 1, pro: 2, elite: 3 };
    const userTierLevel = tierLevels[req.user.tier];
    const requiredTierLevel = tierLevels[survey.tier_requirements];
    
    if (userTierLevel < requiredTierLevel) {
      return res.status(403).json({ 
        error: 'Insufficient tier level',
        required: survey.tier_requirements,
        current: req.user.tier
      });
    }
    
    res.json({ data: survey });
    
  } catch (error) {
    console.error('Survey details error:', error);
    res.status(500).json({ error: 'Failed to fetch survey details' });
  }
});

// Start a survey (initiate call)
router.post('/:surveyId/start', authenticateToken, async (req, res) => {
  try {
    const { surveyId } = req.params;
    const userId = req.user.userId;
    
    // Check if survey exists and user is eligible
    const surveyQuery = `
      SELECT * FROM surveys 
      WHERE survey_id = $1 AND status = 'active'
    `;
    const surveyResult = await pool.query(surveyQuery, [surveyId]);
    
    if (surveyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Survey not found or inactive' });
    }
    
    const survey = surveyResult.rows[0];
    
    // Check tier eligibility
    const tierLevels = { basic: 1, pro: 2, elite: 3 };
    const userTierLevel = tierLevels[req.user.tier];
    const requiredTierLevel = tierLevels[survey.tier_requirements];
    
    if (userTierLevel < requiredTierLevel) {
      return res.status(403).json({ 
        error: 'Insufficient tier level',
        required: survey.tier_requirements 
      });
    }
    
    // Check if user already has a call for this survey
    const existingCallQuery = `
      SELECT call_id, status FROM calls 
      WHERE user_id = $1 AND survey_id = $2
    `;
    const existingCall = await pool.query(existingCallQuery, [userId, surveyId]);
    
    if (existingCall.rows.length > 0) {
      const call = existingCall.rows[0];
      if (call.status === 'completed') {
        return res.status(400).json({ error: 'Survey already completed' });
      }
      if (call.status === 'in-progress') {
        return res.status(400).json({ 
          error: 'Survey already in progress',
          callId: call.call_id 
        });
      }
    }
    
    // Get user's phone number
    const userQuery = `
      SELECT phone_number FROM users WHERE user_id = $1
    `;
    const userResult = await pool.query(userQuery, [userId]);
    const phoneNumber = userResult.rows[0].phone_number;
    
    // Create call record
    const { v4: uuidv4 } = require('uuid');
    const callId = uuidv4();
    
    const createCallQuery = `
      INSERT INTO calls (call_id, user_id, survey_id, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING call_id
    `;
    await pool.query(createCallQuery, [callId, userId, surveyId]);
    
    // Here you would integrate with Twilio to initiate the actual call
    // For now, we'll simulate the call initiation
    console.log(`Initiating call for survey ${surveyId} to ${phoneNumber}`);
    
    // In a real implementation, you would:
    // 1. Use Twilio to initiate a call
    // 2. Generate TwiML with ElevenLabs TTS for the questions
    // 3. Handle the call flow and recording
    
    // For this implementation, we'll mark the call as in-progress
    await pool.query(
      'UPDATE calls SET status = $1 WHERE call_id = $2',
      ['in-progress', callId]
    );
    
    res.json({ 
      message: 'Survey call initiated',
      data: { 
        callId,
        status: 'in-progress',
        estimatedDuration: survey.estimated_duration 
      }
    });
    
  } catch (error) {
    console.error('Start survey error:', error);
    res.status(500).json({ error: 'Failed to start survey' });
  }
});

// Get survey categories
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const { getSurveyCategories } = require('../utils/api');
    const categories = await getSurveyCategories();
    res.json({ data: categories });
  } catch (error) {
    console.error('Survey categories error:', error);
    res.status(500).json({ error: 'Failed to fetch survey categories' });
  }
});

// Get survey by category
router.get('/category/:category', authenticateToken, async (req, res) => {
  try {
    const { category } = req.params;
    const userId = req.user.userId;
    const userTier = req.user.tier;
    
    const query = `
      SELECT 
        s.survey_id,
        s.title,
        s.base_reward,
        s.tier_requirements,
        s.estimated_duration,
        s.category,
        s.created_at
      FROM surveys s
      WHERE s.status = 'active'
      AND s.category = $1
      AND (
        s.tier_requirements = 'basic' OR
        (s.tier_requirements = 'pro' AND $3 IN ('pro', 'elite')) OR
        (s.tier_requirements = 'elite' AND $3 = 'elite')
      )
      AND s.survey_id NOT IN (
        SELECT DISTINCT survey_id 
        FROM calls 
        WHERE user_id = $2 AND status = 'completed'
      )
      ORDER BY s.base_reward DESC
    `;
    
    const result = await pool.query(query, [category, userId, userTier]);
    
    res.json({ data: result.rows });
    
  } catch (error) {
    console.error('Category surveys error:', error);
    res.status(500).json({ error: 'Failed to fetch category surveys' });
  }
});

// Admin: Create new survey (Elite tier required for now)
router.post('/', authenticateToken, requireTier('elite'), async (req, res) => {
  try {
    const {
      title,
      questions,
      base_reward,
      tier_requirements = 'basic',
      estimated_duration,
      category,
      target_demographics
    } = req.body;
    
    if (!title || !questions || !base_reward || !estimated_duration || !category) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, questions, base_reward, estimated_duration, category' 
      });
    }
    
    const { v4: uuidv4 } = require('uuid');
    const surveyId = uuidv4();
    
    const query = `
      INSERT INTO surveys (
        survey_id, title, questions, base_reward, tier_requirements,
        estimated_duration, category, target_demographics
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      surveyId,
      title,
      JSON.stringify(questions),
      base_reward,
      tier_requirements,
      estimated_duration,
      category,
      target_demographics ? JSON.stringify(target_demographics) : null
    ]);
    
    res.status(201).json({
      message: 'Survey created successfully',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Create survey error:', error);
    res.status(500).json({ error: 'Failed to create survey' });
  }
});

module.exports = router;