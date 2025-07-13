const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireTier } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard-stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user's total earnings
    const earningsQuery = `
      SELECT COALESCE(SUM(earnings), 0) as total_earnings
      FROM calls 
      WHERE user_id = $1 AND status = 'completed'
    `;
    
    // Get completed surveys count
    const completedQuery = `
      SELECT COUNT(*) as completed_count
      FROM calls 
      WHERE user_id = $1 AND status = 'completed'
    `;
    
    // Get available surveys count
    const availableQuery = `
      SELECT COUNT(*) as available_count
      FROM surveys s
      WHERE s.status = 'active' 
      AND (s.tier_requirements = 'basic' OR s.tier_requirements = $2)
      AND s.survey_id NOT IN (
        SELECT DISTINCT survey_id 
        FROM calls 
        WHERE user_id = $1 AND status IN ('completed', 'in-progress')
      )
    `;
    
    // Get user's quality rating
    const qualityQuery = `
      SELECT quality_score
      FROM users 
      WHERE user_id = $1
    `;
    
    // Get monthly earnings (current month)
    const monthlyQuery = `
      SELECT COALESCE(SUM(earnings), 0) as monthly_earnings
      FROM calls 
      WHERE user_id = $1 
      AND status = 'completed'
      AND DATE_TRUNC('month', completed_at) = DATE_TRUNC('month', CURRENT_DATE)
    `;
    
    // Get survey completion rate
    const completionRateQuery = `
      WITH user_calls AS (
        SELECT 
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) as total
        FROM calls 
        WHERE user_id = $1 AND status IN ('completed', 'failed')
      )
      SELECT 
        CASE 
          WHEN total = 0 THEN 0 
          ELSE ROUND((completed::DECIMAL / total) * 100, 1)
        END as completion_rate
      FROM user_calls
    `;
    
    const [earnings, completed, available, quality, monthly, completionRate] = await Promise.all([
      pool.query(earningsQuery, [userId]),
      pool.query(completedQuery, [userId]),
      pool.query(availableQuery, [userId, req.user.tier]),
      pool.query(qualityQuery, [userId]),
      pool.query(monthlyQuery, [userId]),
      pool.query(completionRateQuery, [userId])
    ]);
    
    const stats = {
      totalEarnings: parseFloat(earnings.rows[0].total_earnings),
      completedSurveys: parseInt(completed.rows[0].completed_count),
      availableOpportunities: parseInt(available.rows[0].available_count),
      qualityRating: parseFloat(quality.rows[0].quality_score) || 0,
      monthlyEarnings: parseFloat(monthly.rows[0].monthly_earnings),
      surveyCompletionRate: parseFloat(completionRate.rows[0].completion_rate) || 0
    };
    
    res.json({ data: stats });
    
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const allowedFields = ['age', 'occupation', 'location'];
    
    // Filter only allowed fields
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key) && req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    });
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    // Build dynamic query
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const query = `
      UPDATE users 
      SET ${setClause}, last_active = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING user_id, phone_number, age, occupation, location, tier, 
                earnings, quality_score, subscription_status, created_at, last_active
    `;
    
    const values = [userId, ...Object.values(updates)];
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      message: 'Profile updated successfully',
      data: result.rows[0] 
    });
    
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get earnings history
router.get('/earnings-history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const query = `
      SELECT 
        c.call_id,
        c.survey_id,
        s.title as survey_title,
        c.earnings,
        c.quality_scores,
        c.completed_at,
        c.call_duration,
        s.category
      FROM calls c
      JOIN surveys s ON c.survey_id = s.survey_id
      WHERE c.user_id = $1 AND c.status = 'completed'
      ORDER BY c.completed_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [userId, limit, offset]);
    
    res.json({ data: result.rows });
    
  } catch (error) {
    console.error('Earnings history error:', error);
    res.status(500).json({ error: 'Failed to fetch earnings history' });
  }
});

// Get user achievements
router.get('/achievements', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const query = `
      SELECT 
        achievement_type,
        achievement_data,
        earned_at,
        bonus_earnings
      FROM user_achievements
      WHERE user_id = $1
      ORDER BY earned_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    
    res.json({ data: result.rows });
    
  } catch (error) {
    console.error('Achievements error:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// Update enhanced demographics (Pro/Elite only)
router.put('/enhanced-demographics', authenticateToken, requireTier('pro'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      income_level,
      education_credentials,
      work_experience,
      company_info,
      professional_certifications
    } = req.body;
    
    const query = `
      UPDATE users 
      SET 
        income_level = $1,
        education_credentials = $2,
        work_experience = $3,
        company_info = $4,
        professional_certifications = $5,
        last_active = CURRENT_TIMESTAMP
      WHERE user_id = $6
      RETURNING user_id
    `;
    
    const result = await pool.query(query, [
      income_level,
      education_credentials,
      work_experience,
      company_info,
      professional_certifications,
      userId
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'Enhanced demographics updated successfully' });
    
  } catch (error) {
    console.error('Enhanced demographics error:', error);
    res.status(500).json({ error: 'Failed to update enhanced demographics' });
  }
});

// Get user's tier upgrade eligibility
router.get('/tier-eligibility', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { getUserTierEligibility } = require('../utils/api');
    const eligibility = await getUserTierEligibility(userId);
    res.json({ data: eligibility });
  } catch (error) {
    console.error('Tier eligibility error:', error);
    res.status(500).json({ error: 'Failed to fetch tier eligibility' });
  }
});

module.exports = router;