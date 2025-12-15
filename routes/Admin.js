const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");
const Application = require("../models/Application");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// POST /api/admin/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Missing credentials" });

    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const payload = { id: admin._id, username: admin.username };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "1d" });

    res.json({ token, username: admin.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /api/admin/update
router.patch("/update", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    const admin = await Admin.findOne({ username: req.body.username });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

    const salt = await bcrypt.genSalt(10);
    admin.passwordHash = await bcrypt.hash(newPassword, salt);
    await admin.save();

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/applications (with filters)
router.get("/", async (req, res) => {
  try {
    const { search, gender, loanCategory, fromDate, toDate } = req.query;

    let query = {};

    // 🔍 Global Search (updated to include new referral fields)
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

    // ⚧ Filter by Gender
    if (gender && gender !== "all") {
      query.gender = gender;
    }

    // 🏦 Filter by Loan Category
    if (loanCategory && loanCategory !== "all") {
      query.loanCategory = loanCategory;
    }

    // 📅 Filter by Date Range
    if (fromDate || toDate) {
      query.submittedAt = {};

      if (fromDate) {
        query.submittedAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        query.submittedAt.$lte = new Date(toDate);
      }
    }

    // 🔥 Fetch applications with ALL fields, including referrals
    const applications = await Application.find(query).sort({ submittedAt: -1 }).lean();

    res.json({
      count: applications.length,
      applications,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/:id", auth, async (req, res) => {
  try {
    const app = await Application.findById(req.params.id).lean();
    if (!app) return res.status(404).json({ message: "Not found" });
    res.json(app);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: download PDF for application
router.get("/:id/pdf", auth, async (req, res) => {
  try {
    const app = await Application.findById(req.params.id).lean();
    if (!app) return res.status(404).json({ message: "Not found" });

    const buffer = await generatePDFBuffer(app); // 🆕 MUST RETURN BUFFER

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${app.name}.pdf"`,
    });

    // 🆕🔥 Critical fix for API Gateway binary data
    res.send(Buffer.from(buffer).toString("base64"));
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const application = await Application.findById(id);
    if (!application) return res.status(404).json({ message: "Application not found" });

    await application.deleteOne();

    res.json({
      message: `Application ${id} deleted successfully by admin ${req.admin.username}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;
