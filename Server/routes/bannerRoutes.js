const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

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
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const banners = await Banner.find({}).sort({ order: 1, createdAt: -1 });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching banners' });
  }
});

// @route   POST /api/banners
// @desc    Create a new banner (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const newBanner = new Banner(req.body);
    const savedBanner = await newBanner.save();
    
    await AuditLog.create({
      action: "Created Banner",
      performedBy: req.user?.email || "Admin",
      details: `Created a new banner with CTA route ${savedBanner.ctaRoute || 'none'}`,
      ipAddress: req.ip || req.connection?.remoteAddress,
      module: "Banners"
    });

    res.status(201).json(savedBanner);
  } catch (error) {
    res.status(400).json({ message: 'Error creating banner', error: error.message });
  }
});

// @route   PUT /api/banners/:id
// @desc    Update a banner (admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const oldBanner = await Banner.findById(req.params.id);
    if (!oldBanner) return res.status(404).json({ message: 'Banner not found' });

    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    if (oldBanner.isActive !== banner.isActive) {
      await AuditLog.create({
        action: "Updated Banner Status",
        performedBy: req.user?.email || "Admin",
        details: `Changed banner status from ${oldBanner.isActive ? 'Active' : 'Draft'} to ${banner.isActive ? 'Active' : 'Draft'} (ID: ${banner._id}).`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        module: "Banners"
      });
    } else {
      await AuditLog.create({
        action: "Updated Banner",
        performedBy: req.user?.email || "Admin",
        details: `Updated banner details (ID: ${banner._id}).`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        module: "Banners"
      });
    }

    res.json(banner);
  } catch (error) {
    res.status(400).json({ message: 'Error updating banner', error: error.message });
  }
});

// @route   DELETE /api/banners/:id
// @desc    Delete a banner (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    
    await AuditLog.create({
      action: "Deleted Banner",
      performedBy: req.user?.email || "Admin",
      details: `Deleted banner (ID: ${req.params.id}).`,
      ipAddress: req.ip || req.connection?.remoteAddress,
      module: "Banners"
    });

    res.json({ message: 'Banner deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting banner' });
  }
});

module.exports = router;
