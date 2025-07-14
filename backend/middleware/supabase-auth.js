const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabase');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if session exists in Supabase
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const { data: session, error } = await supabaseAdmin
      .from('user_sessions')
      .select('user_id, expires_at')
      .eq('token_hash', tokenHash)
      .single();

    if (error || !session) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if token is expired
    if (new Date(session.expires_at) < new Date()) {
      // Clean up expired session
      await supabaseAdmin
        .from('user_sessions')
        .delete()
        .eq('token_hash', tokenHash);
      
      return res.status(401).json({ error: 'Token expired' });
    }

    req.user = { userId: session.user_id };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { authenticateToken };