const Taxonomy = require("../models/Taxonomy");

// Get all active taxonomies optionally filtered by type
exports.getTaxonomies = async (req, res) => {
  try {
    const { type } = req.query;
    const filter = { isActive: true };
    if (type) {
      filter.type = type;
    }
    
    const taxonomies = await Taxonomy.find(filter).sort({ name: 1 });
    res.status(200).json(taxonomies);
  } catch (error) {
    console.error("Error fetching taxonomies:", error);
    res.status(500).json({ message: "Server error while fetching taxonomies" });
  }
};

// Create a new taxonomy (used by CreatableSelect on Admin UI)
exports.createTaxonomy = async (req, res) => {
  try {
    const { type, name } = req.body;
    if (!type || !name) {
      return res.status(400).json({ message: "Type and Name are required" });
    }

    // Check if it already exists (case-insensitive for convenience, though index is strict)
    const existing = await Taxonomy.findOne({ 
      type, 
      name: { $regex: new RegExp(`^${name}$`, "i") } 
    });

    if (existing) {
      return res.status(200).json(existing); // Return existing instead of throwing error
    }

    const taxonomy = new Taxonomy({
      type,
      name,
      createdBy: req.user ? req.user._id : null
    });

    await taxonomy.save();
    res.status(201).json(taxonomy);
  } catch (error) {
    // Handle unique constraint violation gracefully
    if (error.code === 11000) {
      const existing = await Taxonomy.findOne({ type: req.body.type, name: req.body.name });
      return res.status(200).json(existing);
    }
    console.error("Error creating taxonomy:", error);
    res.status(500).json({ message: "Server error while creating taxonomy" });
  }
};
