const express = require("express");
const router = express.Router();
const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ✅ Get all products
router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM products");
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching products:", err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ Add a new product
router.post("/", async (req, res) => {
    const { name, price, description } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO products (name, price, description) VALUES ($1, $2, $3) RETURNING *",
            [name, price, description]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Error adding product:", err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ Delete a product
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM products WHERE id = $1 RETURNING *", [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Product not found" });
        }
        res.json({ message: "Product deleted successfully", deletedProduct: result.rows[0] });
    } catch (err) {
        console.error("Error deleting product:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
