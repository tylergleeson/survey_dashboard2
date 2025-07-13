// API utilities for surveys categories
const pool = require('../config/database');

const getSurveyCategories = async () => {
  const query = `
    SELECT DISTINCT category, COUNT(*) as survey_count
    FROM surveys 
    WHERE status = 'active'
    GROUP BY category
    ORDER BY survey_count DESC
  `;
  
  const result = await pool.query(query);
  return result.rows;
};

const getUserTierEligibility = async (userId) => {
  // Get user stats for tier eligibility
  const query = `
    SELECT 
      u.tier,
      u.quality_score,
      u.earnings,
      COUNT(c.call_id) as completed_surveys,
      AVG(c.earnings) as avg_earnings
    FROM users u
    LEFT JOIN calls c ON u.user_id = c.user_id AND c.status = 'completed'
    WHERE u.user_id = $1
    GROUP BY u.user_id, u.tier, u.quality_score, u.earnings
  `;
  
  const result = await pool.query(query, [userId]);
  const userStats = result.rows[0];
  
  const eligibility = {
    currentTier: userStats.tier,
    proEligible: userStats.quality_score >= 3.5 && userStats.completed_surveys >= 5,
    eliteEligible: userStats.quality_score >= 4.0 && userStats.avg_earnings >= 10 && userStats.completed_surveys >= 20,
    requirements: {
      pro: {
        qualityScore: 3.5,
        completedSurveys: 5
      },
      elite: {
        qualityScore: 4.0,
        avgEarnings: 10,
        completedSurveys: 20,
        applicationRequired: true
      }
    },
    currentStats: {
      qualityScore: parseFloat(userStats.quality_score) || 0,
      completedSurveys: parseInt(userStats.completed_surveys) || 0,
      avgEarnings: parseFloat(userStats.avg_earnings) || 0
    }
  };
  
  return eligibility;
};

module.exports = {
  getSurveyCategories,
  getUserTierEligibility
};