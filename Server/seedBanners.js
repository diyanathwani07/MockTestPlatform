const mongoose = require('mongoose');
require('dotenv').config();
const Banner = require('./models/Banner');

const TEACHING_PARIKSHA_BANNERS = [
  {
    image: "https://res.cloudinary.com/nzg9ltae/image/upload/v1791025570/banners/tmqtyv9qvifkklxme1fw.png",
    title: "",
    description: "",
    category: "",
    ctaLabel: "",
    ctaRoute: "/dashboard/exams",
    align: "left",
    isActive: true,
    order: 1
  },
  {
    image: "https://res.cloudinary.com/nzg9ltae/image/upload/v1791266909/banners/suuqcss9wtioa27staxk.png",
    title: "",
    description: "",
    category: "",
    ctaLabel: "",
    ctaRoute: "/dashboard/practice",
    align: "left",
    isActive: true,
    order: 2
  },
  {
    image: "https://res.cloudinary.com/nzg9ltae/image/upload/v1791461847/banners/ic6zdjmqrrge1dottxok.png",
    title: "",
    description: "",
    category: "",
    ctaLabel: "",
    ctaRoute: "/dashboard/exams",
    align: "center",
    isActive: true,
    order: 3
  }
];

mongoose.connect(process.env.MONGO_URI)
.then(async () => {
  console.log("Connected to MongoDB.");
  
  await Banner.deleteMany({});
  console.log("Cleared existing banners.");
  
  await Banner.insertMany(TEACHING_PARIKSHA_BANNERS);
  console.log("Successfully seeded banners.");
  
  process.exit();
})
.catch(err => {
  console.error(err);
  process.exit(1);
});
