const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');

const generateTokens = async (userId, ipAddress, userAgent) => {
  const payload = {
    userId,
    timestamp: Date.now()
  };
  
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
  
  // Store session in database
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  await pool.query(
    `INSERT INTO user_sessions (user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, tokenHash, expiresAt, ipAddress, userAgent]
  );
  
  return token;
};

const generateSetupToken = (userData) => {
  const payload = {
    phoneNumber: userData.phoneNumber,
    age: userData.age,
    occupation: userData.occupation,
    location: userData.location,
    inferredData: userData.inferredData,
    type: 'setup'
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
};

const verifySetupToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'setup') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired setup token');
  }
};

const revokeUserSessions = async (userId) => {
  await pool.query(
    'DELETE FROM user_sessions WHERE user_id = $1',
    [userId]
  );
};

const cleanupExpiredSessions = async () => {
  await pool.query(
    'DELETE FROM user_sessions WHERE expires_at < NOW()'
  );
};

module.exports = {
  generateTokens,
  generateSetupToken,
  verifySetupToken,
  revokeUserSessions,
  cleanupExpiredSessions
};