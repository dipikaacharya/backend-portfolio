import { Router, Response } from "express";
import pool from "../db";
import { RowDataPacket } from "mysql2";

const router = Router();

// GET /api/resumes - Fetch all resumes
router.get("/", async (req, res): Promise<void> => {
    try {
        const [rows] = await pool.execute<RowDataPacket[]>(
            "SELECT id, title, description, filename, path FROM resumes ORDER BY created_at DESC"
        );
        res.json(rows);
    } catch (error) {
        console.error("Fetch resumes error:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

export default router;
