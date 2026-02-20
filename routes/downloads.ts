import { Router, Response } from "express";
import pool from "../db";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { ResultSetHeader } from "mysql2";

const router = Router();

// POST /api/downloads/log
router.post("/log", authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { resume_name, certificate_name } = req.body;
        const username = req.user?.name;

        if (!username) {
            res.status(401).json({ error: "User not authenticated." });
            return;
        }

        // Insert log entry
        await pool.execute<ResultSetHeader>(
            "INSERT INTO download_details (downloaded_by, resume_name, certificate_name) VALUES (?, ?, ?)",
            [username, resume_name || null, certificate_name || null]
        );

        res.status(201).json({ message: "Download logged successfully." });
    } catch (error) {
        console.error("Download logging error:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

export default router;
