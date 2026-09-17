const express = require('express');
const { User } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
const FLAG = process.env.FLAG;

// GET /api/bank/me
// Returns the current user's balances. Used by the dashboard.
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('username account_a account_b').lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({
      username: user.username,
      account_a: user.account_a,
      account_b: user.account_b
    });
  } catch (err) {
    console.error('Me error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/bank/transfer
// Hidden endpoint. Intended to contain a race condition.
//
// body: { amount: number }

router.post('/transfer', auth, async (req, res) => {
  try {
    const { amount } = req.body || {};
    const parsedAmount = Number(amount);

    const sleep = (ms) =>
      new Promise(resolve => setTimeout(resolve, ms));

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        error: 'Amount must be a positive number.'
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found.'
      });
    }

    // Vulnerable balance check.
    // Multiple concurrent requests can all pass this
    // before any of them performs the update.
    if (parsedAmount > user.account_a) {
      return res.status(400).json({
        error: 'Insufficient Balance'
      });
    }

    // Intentional race-condition window.
    await sleep(2000);
console.log("UPDATING:", req.user.id, parsedAmount);
    // Atomic update.
    // Unlike user.save(), this increments the CURRENT
    // database values instead of overwriting them with
    // a stale Mongoose document.
    await User.updateOne(
      { _id: req.user.id },
      {
        $inc: {
          account_a: -parsedAmount,
          account_b: parsedAmount
        }
      }
    );

    // Get the actual current balances.
    const updatedUser = await User.findById(req.user.id)
      .select('account_a account_b')
      .lean();

    return res.json({
      message: 'Transfer processed.',
      account_a: updatedUser.account_a,
      account_b: updatedUser.account_b
    });

  } catch (err) {
    console.error('Transfer error:', err.message);

    return res.status(500).json({
      error: 'Internal server error.'
    });
  }
});

// POST /api/bank/reset
// Resets account_a to 500 and account_b to 0 for the authenticated user.
router.post('/reset', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    user.account_a = 500;
    user.account_b = 0;
    await user.save();

    return res.json({
      message: 'Balances reset.',
      account_a: user.account_a,
      account_b: user.account_b
    });
  } catch (err) {
    console.error('Reset error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/bank/flag
// Server-side only check. The flag is never sent to the client unless
// account_b exceeds the threshold.
router.get('/flag', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('account_b').lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.account_b > 1000) {
      return res.json({ success: true, flag: FLAG });
    }

    return res.json({
      success: false,
      message: 'The condition has not been satisfied. Account B does not reflect enough value yet.'
    });
  } catch (err) {
    console.error('Flag error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
