import { Router, Response } from "express";
import pool from "../db";
import { authenticateToken, isAdmin, AuthRequest } from "../middleware/auth";
import { RowDataPacket, ResultSetHeader } from "mysql2";

const router = Router();

// GET /api/admin/stats - Active users and basic details
router.get("/stats", authenticateToken, isAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const [totalUsers] = await pool.execute<RowDataPacket[]>("SELECT COUNT(*) as count FROM user_details");
        const [activeUsers] = await pool.execute<RowDataPacket[]>(
            "SELECT COUNT(*) as count FROM user_details WHERE last_active_at > (NOW() - INTERVAL 5 MINUTE)"
        );
        const [users] = await pool.execute<RowDataPacket[]>(
            "SELECT id, name, email, last_active_at, created_at FROM user_details ORDER BY last_active_at DESC"
        );

        res.json({
            total: totalUsers[0].count,
            active: activeUsers[0].count,
            users
        });
    } catch (error) {
        console.error("Admin stats error:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// GET /api/admin/activities - Download history
router.get("/activities", authenticateToken, isAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const [activities] = await pool.execute<RowDataPacket[]>(
            "SELECT * FROM download_details ORDER BY downloaded_at DESC"
        );
        res.json(activities);
    } catch (error) {
        console.error("Admin activities error:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// POST /api/admin/certificates - Add certificate
router.post("/certificates", authenticateToken, isAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, issuer, year, filename, path } = req.body;

        if (!title || !issuer || !year || !filename || !path) {
            res.status(400).json({ error: "All fields are required." });
            return;
        }

        const [result] = await pool.execute<ResultSetHeader>(
            "INSERT INTO certificates (title, issuer, year, filename, path) VALUES (?, ?, ?, ?, ?)",
            [title, issuer, year, filename, path]
        );

        res.status(201).json({
            message: "Certificate added successfully.",
            id: result.insertId
        });
    } catch (error) {
        console.error("Add certificate error:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// DELETE /api/admin/certificates/:id - Remove certificate
router.delete("/certificates/:id", authenticateToken, isAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await pool.execute("DELETE FROM certificates WHERE id = ?", [id]);
        res.json({ message: "Certificate removed successfully." });
    } catch (error) {
        console.error("Delete certificate error:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// POST /api/admin/resumes - Add resume
router.post("/resumes", authenticateToken, isAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, description, filename, path } = req.body;

        if (!title || !filename || !path) {
            res.status(400).json({ error: "Title, filename, and path are required." });
            return;
        }

        const [result] = await pool.execute<ResultSetHeader>(
            "INSERT INTO resumes (title, description, filename, path) VALUES (?, ?, ?, ?)",
            [title, description || null, filename, path]
        );

        res.status(201).json({
            message: "Resume added successfully.",
            id: result.insertId
        });
    } catch (error) {
        console.error("Add resume error:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// DELETE /api/admin/resumes/:id - Remove resume
router.delete("/resumes/:id", authenticateToken, isAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await pool.execute("DELETE FROM resumes WHERE id = ?", [id]);
        res.json({ message: "Resume removed successfully." });
    } catch (error) {
        console.error("Delete resume error:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

export default router;
