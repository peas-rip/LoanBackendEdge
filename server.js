require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

// Connect Mongo only once (serverless-friendly)
connectDB(process.env.MONGO_URI);

app.use(express.json());

app.use(cors({
  origin: [
    "http://localhost:8080",
    "https://admin-rs1h.onrender.com",
    "https://loan-inquiry-hub.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));


app.options("*", cors());

// Test route
app.get("/test", (req, res) => {
  res.json({ success: true, message: "Express working on Vercel Serverless!" });
});

// Routes
app.use("/admin", require("./routes/Admin"));
app.use("/application", require("./routes/Application"));

module.exports = app;
