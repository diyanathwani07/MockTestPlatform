const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    default: ""
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    default: "Announcement"
  },
  image: {
    type: String,
    required: true
  },
  ctaLabel: {
    type: String,
    default: "Learn More"
  },
  ctaRoute: {
    type: String,
    default: "/"
  },
  align: {
    type: String,
    enum: ["left", "center", "right"],
    default: "left"
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);
