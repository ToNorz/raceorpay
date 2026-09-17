require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

const { mongoose } = require('./db');
const authRoutes = require('./routes/auth');
const bankRoutes = require('./routes/bank');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/bank', bankRoutes);

// Page routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/dashboard', (req, res) => {
  // The dashboard HTML itself is static; the client-side JS verifies
  // the session by calling /api/bank/me. This avoids leaking any
  // server-rendered user-specific state.
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// Fallback 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Generic error handler (avoid leaking stack traces)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong.' });
});

mongoose.connection.once('open', () => {
  app.listen(PORT, () => {
    console.log(`Achronous: Beyond Time — Bank Transfer running on port ${PORT}`);
  });
});
