const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Multer for File Upload
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// ✅ Get All Products
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching products:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Add New Product (with Image Upload)
router.post("/", upload.single("image"), async (req, res) => {
  const { name, price, description, category, user_id } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const query = `
      INSERT INTO products (name, price, description, category, image_url, user_id) 
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
    const values = [name, price, description, category, imageUrl, user_id];

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error adding product:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Update Product
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, price, description, category } = req.body;

  try {
    const query = `
      UPDATE products SET name=$1, price=$2, description=$3, category=$4 
      WHERE id=$5 RETURNING *`;
    const values = [name, price, description, category, id];

    const result = await pool.query(query, values);
    if (result.rowCount === 0) return res.status(404).json({ error: "Product not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating product:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Delete Product
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("DELETE FROM products WHERE id=$1 RETURNING *", [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Product not found" });

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("Error deleting product:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
