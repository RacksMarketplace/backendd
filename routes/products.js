const express = require("express");
const router = express.Router();
const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ✅ GET /products - Fetch all products (With Pagination & Filters)
router.get("/", async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "" } = req.query;
        const offset = (page - 1) * limit;

        const result = await pool.query(
            "SELECT * FROM products WHERE deleted_at IS NULL AND (name ILIKE $1 OR description ILIKE $1) ORDER BY created_at DESC LIMIT $2 OFFSET $3",
            [`%${search}%`, limit, offset]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching products:", err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ POST /products - Add a new product (With Validation & User ID)
router.post("/", async (req, res) => {
    const { user_id, name, price, description, category, image_url } = req.body;

    if (!user_id || !name || !price || !description) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    if (isNaN(price) || price <= 0) {
        return res.status(400).json({ error: "Price must be a valid number greater than 0" });
    }

    try {
        const result = await pool.query(
            "INSERT INTO products (user_id, name, price, description, category, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [user_id, name, price, description, category || "Other", image_url || ""]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Error adding product:", err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ PUT /products/:id - Update a product
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { name, price, description, category, image_url } = req.body;

    try {
        const result = await pool.query(
            "UPDATE products SET name = COALESCE($1, name), price = COALESCE($2, price), description = COALESCE($3, description), category = COALESCE($4, category), image_url = COALESCE($5, image_url), updated_at = NOW() WHERE id = $6 RETURNING *",
            [name, price, description, category, image_url, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Product not found" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error updating product:", err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ DELETE /products/:id - Soft delete a product
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            "UPDATE products SET deleted_at = NOW() WHERE id = $1 RETURNING *",
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Product not found" });
        }
        res.json({ message: "Product deleted successfully" });
    } catch (err) {
        console.error("Error deleting product:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
