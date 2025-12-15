require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

// Connect Mongo only once
connectDB(process.env.MONGO_URI);

app.use(express.json());

// CORS FIX: ADD PATCH
app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "https://admin-rs1h.onrender.com",
      "https://loan-inquiry-hub.vercel.app",
      "https://saifinancefrontend.onrender.com"
    ],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

// Handle OPTIONS manually for Verce

// Test route
app.get("/test", (req, res) => {
  res.json({ success: true, message: "Express working on Vercel Serverless!" });
});

// Routes
app.use("/admin", require("./routes/Admin"));
app.use("/api/application", require("./routes/Application"));

module.exports = app;
