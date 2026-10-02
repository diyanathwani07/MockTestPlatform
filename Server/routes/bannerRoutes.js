const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner');
const { protect, admin } = require('../middlewares/authMiddleware');

// @route   GET /api/banners
// @desc    Get all active banners (public)
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching banners' });
  }
});

// @route   GET /api/banners/all
// @desc    Get all banners including inactive (admin only)
router.get('/all', protect, admin, async (req, res) => {
  try {
    const banners = await Banner.find({}).sort({ order: 1, createdAt: -1 });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching banners' });
  }
});

// @route   POST /api/banners
// @desc    Create a new banner (admin only)
router.post('/', protect, admin, async (req, res) => {
  try {
    const newBanner = new Banner(req.body);
    const savedBanner = await newBanner.save();
    res.status(201).json(savedBanner);
  } catch (error) {
    res.status(400).json({ message: 'Error creating banner', error: error.message });
  }
});

// @route   PUT /api/banners/:id
// @desc    Update a banner (admin only)
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    res.json(banner);
  } catch (error) {
    res.status(400).json({ message: 'Error updating banner', error: error.message });
  }
});

// @route   DELETE /api/banners/:id
// @desc    Delete a banner (admin only)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    res.json({ message: 'Banner deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting banner' });
  }
});

module.exports = router;
