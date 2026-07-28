/**
 * JWT Authentication Middleware for TrypheneMart
 * Verifies Authorization headers for protected endpoints (orders, profile)
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'tryphenemart_secret_key_2026';

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in to complete checkout.' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token missing.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired authentication session. Please log in again.' });
  }
}

module.exports = {
  verifyToken,
  JWT_SECRET
};
