const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabase');

const generateTokens = async (userId, ipAddress, userAgent) => {
  const payload = {
    userId,
    timestamp: Date.now()
  };
  
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
  
  // Store session in Supabase
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  const { error } = await supabaseAdmin
    .from('user_sessions')
    .insert([{
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent
    }]);
  
  if (error) {
    throw new Error('Failed to create session');
  }
  
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
  const { error } = await supabaseAdmin
    .from('user_sessions')
    .delete()
    .eq('user_id', userId);
  
  if (error) {
    throw new Error('Failed to revoke sessions');
  }
};

const cleanupExpiredSessions = async () => {
  const { error } = await supabaseAdmin
    .from('user_sessions')
    .delete()
    .lt('expires_at', new Date().toISOString());
  
  if (error) {
    console.error('Failed to cleanup expired sessions:', error);
  }
};

module.exports = {
  generateTokens,
  generateSetupToken,
  verifySetupToken,
  revokeUserSessions,
  cleanupExpiredSessions
};