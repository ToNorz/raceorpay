const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo/bank_transfer_ctf';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// Schema roughly mirrors: users(id, username, password, account_a, account_b)
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  account_a: {
    type: Number,
    required: true,
    default: 500
  },
  account_b: {
    type: Number,
    required: true,
    default: 0
  }
});

const User = mongoose.model('User', userSchema);

module.exports = { mongoose, User };
