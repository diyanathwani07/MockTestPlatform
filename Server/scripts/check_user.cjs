const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');
  const User = require('../models/User');
  const count = await User.countDocuments();
  console.log('Total users count:', count);
  const found = await User.find({ email: /mocktesting/i }).select('fullName email role phone').lean();
  console.log('Mock testing users found:', found);
  const sample = await User.find().select('fullName email role').limit(5).lean();
  console.log('Sample users in DB:', sample);
  await mongoose.disconnect();
}

check().catch(console.error);
