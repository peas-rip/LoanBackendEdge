const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Admin = require("../models/Admin");
const Application = require("../models/Application");
const auth = require("../middleware/auth");
const { streamApplicationPDF } = require("../utils/pdf");

/* =========================
   PUBLIC ROUTES
   ========================= */

// ✅ ADMIN LOGIN (PUBLIC)
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    res.json({ token, username: admin.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   PROTECTED ROUTES
   ========================= */

// ✅ GET ALL APPLICATIONS
router.get("/applications", auth, async (req, res) => {
  try {
    const { search, gender, loanCategory, fromDate, toDate } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
        { primaryContactNumber: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
        { referralName1: { $regex: search, $options: "i" } },
        { referralName2: { $regex: search, $options: "i" } },
        { referralPhone1: { $regex: search, $options: "i" } },
        { referralPhone2: { $regex: search, $options: "i" } },
      ];
    }

    if (gender && gender !== "all") query.gender = gender;
    if (loanCategory && loanCategory !== "all") query.loanCategory = loanCategory;

    if (fromDate || toDate) {
      query.submittedAt = {};
      if (fromDate) query.submittedAt.$gte = new Date(fromDate);
      if (toDate) query.submittedAt.$lte = new Date(toDate);
    }

    const applications = await Application.find(query)
      .sort({ submittedAt: -1 })
      .lean();

    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ GET SINGLE APPLICATION
router.get("/applications/:id", auth, async (req, res) => {
  try {
    const app = await Application.findById(req.params.id).lean();
    if (!app) return res.status(404).json({ message: "Not found" });
    res.json(app);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ DOWNLOAD PDF
router.get("/applications/:id/pdf", auth, async (req, res) => {
  try {
    const app = await Application.findById(req.params.id).lean();
    if (!app) return res.status(404).json({ message: "Not found" });

    const buffer = await streamApplicationPDF(app);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${app.name}.pdf"`
    );

    res.end(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ DELETE APPLICATION
router.delete("/applications/:id", auth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    await application.deleteOne();

    res.json({ message: "Application deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
