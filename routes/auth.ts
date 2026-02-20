import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { RowDataPacket, ResultSetHeader } from "mysql2";

const router = Router();
const SALT_ROUNDS = 10;

// Generate JWT token
function generateToken(user: { id: number; name: string; email: string; is_admin: boolean }): string {
    return jwt.sign(
        { id: user.id, name: user.name, email: user.email, is_admin: user.is_admin },
        process.env.JWT_SECRET || "fallback_secret",
        { expiresIn: "7d" }
    );
}

// POST /api/auth/signup
router.post("/signup", async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            res.status(400).json({ error: "Name, email, and password are required." });
            return;
        }

        // Check if user already exists
        const [existing] = await pool.execute<RowDataPacket[]>(
            "SELECT id FROM user_details WHERE email = ?",
            [email]
        );

        if (existing.length > 0) {
            res.status(409).json({ error: "A user with this email already exists." });
            return;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Insert user
        const isAdminUser = email === process.env.ADMIN_EMAIL;
        const [result] = await pool.execute<ResultSetHeader>(
            "INSERT INTO user_details (name, email, password, is_admin) VALUES (?, ?, ?, ?)",
            [name, email, hashedPassword, isAdminUser]
        );

        const newUser = { id: result.insertId, name, email, is_admin: isAdminUser };
        const token = generateToken(newUser);

        res.status(201).json({
            message: "User created successfully!",
            user: newUser,
            token,
        });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            res.status(400).json({ error: "Email and password are required." });
            return;
        }

        // Find user by email
        const [rows] = await pool.execute<RowDataPacket[]>(
            "SELECT * FROM user_details WHERE email = ?",
            [email]
        );

        if (rows.length === 0) {
            res.status(401).json({ error: "Invalid email or password." });
            return;
        }

        const user = rows[0];

        // Compare password with hash
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            res.status(401).json({ error: "Invalid email or password." });
            return;
        }

        // Update is_admin status based on current ADMIN_EMAIL (in case it changed)
        const isAdminUser = email === process.env.ADMIN_EMAIL;
        if (user.is_admin !== (isAdminUser ? 1 : 0)) {
            await pool.execute("UPDATE user_details SET is_admin = ? WHERE id = ?", [isAdminUser, user.id]);
            user.is_admin = isAdminUser ? 1 : 0;
        }

        // Update activity
        await pool.execute("UPDATE user_details SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);

        const token = generateToken({
            id: user.id,
            name: user.name,
            email: user.email,
            is_admin: !!user.is_admin,
        });

        res.json({
            message: "Login successful!",
            user: { id: user.id, name: user.name, email: user.email, is_admin: !!user.is_admin },
            token,
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// GET /api/auth/me — protected route
router.get("/me", authenticateToken, (req: AuthRequest, res: Response) => {
    res.json({ user: req.user });
});

export default router;
