import { Router, Response } from "express";
import pool from "../db";
import { RowDataPacket } from "mysql2";

const router = Router();

// GET /api/certificates - Fetch all certificates
router.get("/", async (req, res): Promise<void> => {
    try {
        const [rows] = await pool.execute<RowDataPacket[]>(
            "SELECT id, title, issuer, year, filename, path FROM certificates ORDER BY created_at DESC"
        );
        res.json(rows);
    } catch (error) {
        console.error("Fetch certificates error:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

export default router;
