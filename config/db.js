let isConnected = false;

async function connectDB(uri) {
  if (isConnected) return;

  const mongoose = require("mongoose");

  const db = await mongoose.connect(uri);
  isConnected = db.connections[0].readyState === 1;

  console.log("MongoDB connected");
}

module.exports = connectDB;
