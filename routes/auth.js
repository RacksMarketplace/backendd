const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// ✅ User Registration
router.post("/register", async (req, res) => {
  const { email, password, username } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (email, password, username) 
      VALUES ($1, $2, $3) RETURNING *`;
    const values = [email, hashedPassword, username];

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error registering user:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ User Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const userQuery = "SELECT * FROM users WHERE email=$1";
    const userResult = await pool.query(userQuery, [email]);
    if (userResult.rowCount === 0) return res.status(400).json({ error: "Invalid credentials" });

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ user_id: user.id }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, user });
  } catch (err) {
    console.error("Error logging in:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
