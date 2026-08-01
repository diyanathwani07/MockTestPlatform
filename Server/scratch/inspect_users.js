const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Quiz = require('../models/Quiz');

const dbUri = process.env.MONGO_URI;
console.log('Connecting to:', dbUri);

mongoose.connect(dbUri).then(async () => {
  const users = await User.find({});
  console.log('Found', users.length, 'users:\n');
  for (const u of users) {
    console.log('User:', u.fullName, '| Email:', u.email, '| Role:', u.role);
    console.log(' - purchasedExams (count):', u.purchasedExams?.length);
    console.log(' - purchasedExams list:', u.purchasedExams);
  }
  process.exit(0);
}).catch(err => {
  console.error('Connection error:', err);
  process.exit(1);
});
