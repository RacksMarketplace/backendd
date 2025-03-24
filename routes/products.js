const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ✅ Ensure Upload Directory Exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Set Up Multer for Image Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// ✅ GET /products - Fetch All Products (With Pagination & Search)
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

// ✅ POST /products - Add New Product with Image Upload
router.post("/", upload.single("image"), async (req, res) => {
    const { user_id, name, price, description, category } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    if (!user_id || !name || !price || !description) {
        return res.status(400).json({ error: "All fields are required" });
    }
    if (isNaN(price) || price <= 0) {
        return res.status(400).json({ error: "Price must be a valid number" });
    }

    try {
        const result = await pool.query(
            "INSERT INTO products (user_id, name, price, description, category, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [user_id, name, price, description, category || "Other", image_url]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Error adding product:", err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ PUT /products/:id - Update a Product
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

// ✅ DELETE /products/:id - Soft Delete a Product
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
