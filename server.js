require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Import Routes
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");

// Use Routes
app.use("/auth", authRoutes);
app.use("/products", productRoutes);

// Root Route
app.get("/", (req, res) => {
  res.send("Welcome to Racks Marketplace API");
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
