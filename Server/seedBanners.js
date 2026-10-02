const mongoose = require('mongoose');
require('dotenv').config();
const Banner = require('./models/Banner');

const MOCK_BANNERS = [
  {
    image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1200&auto=format&fit=crop",
    category: "New Launch",
    title: "BPSC TRE 4.0",
    description: "Prepare smarter with full-length mock tests tailored to the latest pattern.",
    ctaLabel: "Explore Exam",
    ctaRoute: "/dashboard/exams",
    align: "left",
    order: 1
  },
  {
    image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=1200&auto=format&fit=crop",
    category: "Pro Plan",
    title: "Unlock AI Tests",
    description: "Generate unlimited custom AI mock tests with instant analysis and explanations.",
    ctaLabel: "Upgrade Now",
    ctaRoute: "/dashboard/practice",
    align: "center",
    order: 2
  },
  {
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=1200&auto=format&fit=crop",
    category: "Challenge",
    title: "Weekly Mega Quiz",
    description: "Compete with thousands of students and climb the live leaderboard this weekend.",
    ctaLabel: "Register Free",
    ctaRoute: "/dashboard/practice",
    align: "right",
    order: 3
  }
];

mongoose.connect(process.env.MONGO_URI)
.then(async () => {
  console.log("Connected to MongoDB.");
  
  await Banner.deleteMany({});
  console.log("Cleared existing banners.");
  
  await Banner.insertMany(MOCK_BANNERS);
  console.log("Successfully seeded banners.");
  
  process.exit();
})
.catch(err => {
  console.error(err);
  process.exit(1);
});
