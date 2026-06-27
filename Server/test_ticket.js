const mongoose = require('mongoose');
const Ticket = require('./models/Ticket');

async function check() {
  await mongoose.connect('mongodb://127.0.0.1:27017/teaching_pariksha');
  const dummy = new Ticket({
    userId: new mongoose.Types.ObjectId(),
    subject: "Test",
    category: "Test",
    message: "Test",
  });
  console.log(dummy.validateSync());
  console.log("Validation passed");
  process.exit(0);
}
check();
