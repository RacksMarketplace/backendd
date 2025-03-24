const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ✅ SECRET KEY for JWT
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// ✅ Register a New User
router.post("/register",
    [
        body("username").notEmpty().withMessage("Username is required"),
        body("email").isEmail().withMessage("Valid email is required"),
        body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { username, email, password } = req.body;
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const result = await pool.query(
                "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email",
                [username, email, hashedPassword]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error("Error registering user:", err);
            res.status(500).json({ error: err.message });
        }
    }
);

// ✅ Login User
router.post("/login",
    [
        body("email").isEmail().withMessage("Valid email is required"),
        body("password").notEmpty().withMessage("Password is required")
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { email, password } = req.body;
        try {
            const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
            if (user.rows.length === 0) return res.status(400).json({ error: "Invalid credentials" });

            const isMatch = await bcrypt.compare(password, user.rows[0].password);
            if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

            const token = jwt.sign({ userId: user.rows[0].id }, JWT_SECRET, { expiresIn: "1h" });
            res.json({ token, user: { id: user.rows[0].id, username: user.rows[0].username, email } });
        } catch (err) {
            console.error("Error logging in:", err);
            res.status(500).json({ error: err.message });
        }
    }
);

// ✅ Protect Routes Middleware
const authenticateToken = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
        const decoded = jwt.verify(token.replace("Bearer ", ""), JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: "Invalid token" });
    }
};

module.exports = { router, authenticateToken };
