const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { calculatePayment } = require('../utils/featureInference');

const router = express.Router();

// Get call status
router.get('/:callId/status', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.userId;
    
    const query = `
      SELECT 
        c.*,
        s.title as survey_title,
        s.estimated_duration
      FROM calls c
      JOIN surveys s ON c.survey_id = s.survey_id
      WHERE c.call_id = $1 AND c.user_id = $2
    `;
    
    const result = await pool.query(query, [callId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Call not found' });
    }
    
    res.json({ data: result.rows[0] });
    
  } catch (error) {
    console.error('Call status error:', error);
    res.status(500).json({ error: 'Failed to fetch call status' });
  }
});

// Get user's call history
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status; // Optional filter by status
    
    let query = `
      SELECT 
        c.*,
        s.title as survey_title,
        s.category,
        s.estimated_duration
      FROM calls c
      JOIN surveys s ON c.survey_id = s.survey_id
      WHERE c.user_id = $1
    `;
    
    const queryParams = [userId];
    
    if (status) {
      query += ` AND c.status = $${queryParams.length + 1}`;
      queryParams.push(status);
    }
    
    query += ` ORDER BY c.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);
    
    const result = await pool.query(query, queryParams);
    
    res.json({ data: result.rows });
    
  } catch (error) {
    console.error('User calls error:', error);
    res.status(500).json({ error: 'Failed to fetch user calls' });
  }
});

// Update call responses (simulate call completion)
router.put('/:callId/responses', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.userId;
    const { responses, audio_file_url, call_duration } = req.body;
    
    // Verify the call belongs to the user and is in progress
    const callQuery = `
      SELECT c.*, s.base_reward, s.target_demographics 
      FROM calls c
      JOIN surveys s ON c.survey_id = s.survey_id
      WHERE c.call_id = $1 AND c.user_id = $2 AND c.status = 'in-progress'
    `;
    
    const callResult = await pool.query(callQuery, [callId, userId]);
    
    if (callResult.rows.length === 0) {
      return res.status(404).json({ error: 'Call not found or not in progress' });
    }
    
    const call = callResult.rows[0];
    
    // Simulate quality scoring (in real implementation, this would be done by AI)
    const simulateQualityScoring = (responses) => {
      // Generate random quality scores for demo
      return {
        richness: Math.random() * 2 + 3, // 3-5 range
        emotion: Math.random() * 2 + 3,
        insight: Math.random() * 2 + 3,
        clarity: Math.random() * 2 + 3
      };
    };
    
    const qualityScores = simulateQualityScoring(responses);
    
    // Get user data for payment calculation
    const userQuery = `
      SELECT tier, age, occupation, location, income_level, education_level
      FROM users WHERE user_id = $1
    `;
    const userResult = await pool.query(userQuery, [userId]);
    const userData = userResult.rows[0];
    
    // Calculate payment
    const earnings = calculatePayment(
      parseFloat(call.base_reward),
      qualityScores,
      userData.tier,
      userData,
      call.target_demographics
    );
    
    // Update call with responses and completion
    const updateQuery = `
      UPDATE calls 
      SET 
        responses = $1,
        quality_scores = $2,
        earnings = $3,
        audio_file_url = $4,
        call_duration = $5,
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP
      WHERE call_id = $6
      RETURNING *
    `;
    
    const updateResult = await pool.query(updateQuery, [
      JSON.stringify(responses),
      JSON.stringify(qualityScores),
      earnings.toFixed(2),
      audio_file_url,
      call_duration,
      callId
    ]);
    
    // Update user's total earnings
    await pool.query(
      'UPDATE users SET earnings = earnings + $1, last_active = CURRENT_TIMESTAMP WHERE user_id = $2',
      [earnings, userId]
    );
    
    // Check for achievements
    await checkAndAwardAchievements(userId, earnings, qualityScores);
    
    res.json({
      message: 'Call completed successfully',
      data: {
        call: updateResult.rows[0],
        earnings: earnings,
        qualityScores: qualityScores
      }
    });
    
  } catch (error) {
    console.error('Update call responses error:', error);
    res.status(500).json({ error: 'Failed to update call responses' });
  }
});

// Mark call as failed
router.put('/:callId/fail', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.userId;
    const { reason } = req.body;
    
    const query = `
      UPDATE calls 
      SET status = 'failed', 
          responses = $1,
          completed_at = CURRENT_TIMESTAMP
      WHERE call_id = $2 AND user_id = $3 AND status IN ('pending', 'in-progress')
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      JSON.stringify({ failure_reason: reason }),
      callId,
      userId
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Call not found or cannot be marked as failed' });
    }
    
    res.json({
      message: 'Call marked as failed',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Fail call error:', error);
    res.status(500).json({ error: 'Failed to mark call as failed' });
  }
});

// Get call analytics for user
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const query = `
      WITH call_stats AS (
        SELECT 
          COUNT(*) as total_calls,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_calls,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_calls,
          AVG(earnings) FILTER (WHERE status = 'completed') as avg_earnings,
          AVG(call_duration) FILTER (WHERE status = 'completed') as avg_duration,
          AVG((quality_scores->>'richness')::decimal + 
              (quality_scores->>'emotion')::decimal + 
              (quality_scores->>'insight')::decimal + 
              (quality_scores->>'clarity')::decimal) / 4 
              FILTER (WHERE status = 'completed' AND quality_scores IS NOT NULL) as avg_quality
        FROM calls 
        WHERE user_id = $1
      ),
      monthly_stats AS (
        SELECT 
          DATE_TRUNC('month', completed_at) as month,
          COUNT(*) as monthly_completed,
          SUM(earnings) as monthly_earnings
        FROM calls 
        WHERE user_id = $1 AND status = 'completed'
        AND completed_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', completed_at)
        ORDER BY month DESC
      )
      SELECT 
        cs.*,
        COALESCE(json_agg(
          json_build_object(
            'month', ms.month,
            'completed', ms.monthly_completed,
            'earnings', ms.monthly_earnings
          )
        ) FILTER (WHERE ms.month IS NOT NULL), '[]'::json) as monthly_breakdown
      FROM call_stats cs
      LEFT JOIN monthly_stats ms ON true
      GROUP BY cs.total_calls, cs.completed_calls, cs.failed_calls, 
               cs.avg_earnings, cs.avg_duration, cs.avg_quality
    `;
    
    const result = await pool.query(query, [userId]);
    
    const analytics = result.rows[0];
    
    res.json({ data: analytics });
    
  } catch (error) {
    console.error('Call analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch call analytics' });
  }
});

// Helper function to check and award achievements
async function checkAndAwardAchievements(userId, earnings, qualityScores) {
  try {
    const overallQuality = (
      qualityScores.richness + 
      qualityScores.emotion + 
      qualityScores.insight + 
      qualityScores.clarity
    ) / 4;
    
    // Check for quality achievement
    if (overallQuality >= 4.5) {
      await awardAchievement(userId, 'perfect_quality', {
        quality_score: overallQuality,
        bonus_amount: 5.00
      }, 5.00);
    }
    
    // Check for high earnings achievement
    if (earnings >= 50) {
      await awardAchievement(userId, 'high_earner', {
        earnings: earnings,
        bonus_amount: 10.00
      }, 10.00);
    }
    
    // Check for milestone achievements
    const completedCount = await getCompletedSurveyCount(userId);
    
    if (completedCount === 10) {
      await awardAchievement(userId, 'first_10', {
        milestone: 10,
        bonus_amount: 15.00
      }, 15.00);
    } else if (completedCount === 50) {
      await awardAchievement(userId, 'fifty_club', {
        milestone: 50,
        bonus_amount: 50.00
      }, 50.00);
    } else if (completedCount === 100) {
      await awardAchievement(userId, 'century_club', {
        milestone: 100,
        bonus_amount: 100.00
      }, 100.00);
    }
    
  } catch (error) {
    console.error('Achievement checking error:', error);
  }
}

async function awardAchievement(userId, achievementType, achievementData, bonusEarnings) {
  // Check if user already has this achievement
  const existingQuery = `
    SELECT achievement_id FROM user_achievements 
    WHERE user_id = $1 AND achievement_type = $2
  `;
  const existing = await pool.query(existingQuery, [userId, achievementType]);
  
  if (existing.rows.length === 0) {
    const { v4: uuidv4 } = require('uuid');
    
    await pool.query(`
      INSERT INTO user_achievements (
        achievement_id, user_id, achievement_type, 
        achievement_data, bonus_earnings
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      uuidv4(),
      userId,
      achievementType,
      JSON.stringify(achievementData),
      bonusEarnings
    ]);
    
    // Add bonus to user earnings
    await pool.query(
      'UPDATE users SET earnings = earnings + $1 WHERE user_id = $2',
      [bonusEarnings, userId]
    );
  }
}

async function getCompletedSurveyCount(userId) {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM calls WHERE user_id = $1 AND status = $2',
    [userId, 'completed']
  );
  return parseInt(result.rows[0].count);
}

module.exports = router;