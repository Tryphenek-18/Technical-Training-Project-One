/**
 * Auth Routes Module (TrypheneMart)
 * Registration, Login, Profile & JWT Token Generation
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');

// ----------------------------------------------------------------------------
// POST /api/auth/register - Register a new customer account
// ----------------------------------------------------------------------------
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password, phone } = req.body;

    // Data Validation Layer
    if (!full_name || full_name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Please enter a valid full name (at least 2 characters).' });
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists
    const existingUsers = await db.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email address already exists.' });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert User
    const result = await db.query(
      'INSERT INTO users (full_name, email, password_hash, phone) VALUES (?, ?, ?, ?)',
      [full_name.trim(), cleanEmail, passwordHash, phone || '']
    );

    const userId = result.insertId || (await db.query('SELECT id FROM users WHERE email = ?', [cleanEmail]))[0].id;

    // Generate JWT Token
    const userPayload = { id: userId, full_name: full_name.trim(), email: cleanEmail };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: userPayload
    });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration. Please try again.' });
  }
});

// ----------------------------------------------------------------------------
// POST /api/auth/login - User Login
// ----------------------------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input Validation
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Fetch user from DB
    const users = await db.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    if (!users || users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = users[0];

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Generate JWT Token
    const userPayload = { id: user.id, full_name: user.full_name, email: user.email, phone: user.phone };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: userPayload
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ success: false, message: 'Server error during login. Please try again.' });
  }
});

// ----------------------------------------------------------------------------
// GET /api/auth/me - Protected Profile Route
// ----------------------------------------------------------------------------
router.get('/me', verifyToken, async (req, res) => {
  try {
    const users = await db.query('SELECT id, full_name, email, phone, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }
    res.json({ success: true, user: users[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
});

module.exports = router;
