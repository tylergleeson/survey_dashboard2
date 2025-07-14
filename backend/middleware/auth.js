const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if session exists and hasn't expired
    const sessionQuery = `
      SELECT us.*, u.user_id, u.tier, u.subscription_status 
      FROM user_sessions us
      JOIN users u ON us.user_id = u.user_id
      WHERE us.user_id = $1 AND us.expires_at > NOW()
    `;
    
    const result = await pool.query(sessionQuery, [decoded.userId]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    req.user = {
      userId: decoded.userId,
      tier: result.rows[0].tier,
      subscriptionStatus: result.rows[0].subscription_status
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

const requireTier = (requiredTier) => {
  const tierLevels = { basic: 1, pro: 2, elite: 3 };
  
  return (req, res, next) => {
    const userTierLevel = tierLevels[req.user.tier];
    const requiredTierLevel = tierLevels[requiredTier];
    
    if (userTierLevel < requiredTierLevel) {
      return res.status(403).json({ 
        error: `${requiredTier} tier required`,
        currentTier: req.user.tier,
        requiredTier 
      });
    }
    
    next();
  };
};

const requireActiveSubscription = (req, res, next) => {
  if (req.user.tier !== 'basic' && req.user.subscriptionStatus !== 'active') {
    return res.status(403).json({ 
      error: 'Active subscription required',
      subscriptionStatus: req.user.subscriptionStatus 
    });
  }
  
  next();
};

module.exports = {
  authenticateToken,
  requireTier,
  requireActiveSubscription
};