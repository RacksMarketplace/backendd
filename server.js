require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const productRoutes = require("./routes/products"); // ✅ Must match correct file path
app.use("/products", productRoutes);



// ✅ Connect to PostgreSQL Database
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }  // Required for Render PostgreSQL
});

// ✅ Test database connection
pool.query("SELECT NOW()", (err, res) => {
    if (err) {
        console.error("❌ Database connection error:", err);
    } else {
        console.log("✅ Connected to PostgreSQL at:", res.rows[0].now);
    }
});

// ✅ Test API route
app.get("/test-db", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");
        res.json({ message: "Database connected", time: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
