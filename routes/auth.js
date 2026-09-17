const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function isValidUsername(u) {
  return typeof u === 'string' && USERNAME_RE.test(u);
}

function isValidPassword(p) {
  return typeof p === 'string' && p.length >= 6 && p.length <= 128;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!isValidUsername(username)) {
      return res.status(400).json({
        error: 'Username must be 3-20 characters (letters, numbers, underscore only).'
      });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({
        error: 'Password must be between 6 and 128 characters.'
      });
    }

    const existing = await User.findOne({ username }).lean();
    if (existing) {
      return res.status(409).json({ error: 'Username already taken.' });
    }

    const hash = await bcrypt.hash(password, 10);

    // Every new user starts with account_a = 500, account_b = 0
    await User.create({
      username,
      password: hash,
      account_a: 500,
      account_b: 0
    });

    return res.status(201).json({ message: 'Registration successful. You may now log in.' });
  } catch (err) {
    // Handles race-condition duplicate key errors from the unique index too
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Username already taken.' });
    }
    console.error('Register error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!isValidUsername(username) || !isValidPassword(password)) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { id: user._id.toString(), username: user.username },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 2 * 60 * 60 * 1000
    });

    return res.json({ message: 'Login successful.', token });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ message: 'Logged out.' });
});

module.exports = router;
