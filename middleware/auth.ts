import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import pool from "../db";

export interface AuthRequest extends Request {
    user?: {
        id: number;
        name: string;
        email: string;
        is_admin?: boolean;
    };
}

export async function authenticateToken(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

    if (!token) {
        res.status(401).json({ error: "Access denied. No token provided." });
        return;
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "fallback_secret"
        ) as { id: number; name: string; email: string; is_admin?: boolean };

        req.user = decoded;

        // Update last_active_at in background
        pool.execute(
            "UPDATE user_details SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?",
            [decoded.id]
        ).catch(err => console.error("Failed to update activity status:", err));

        next();
    } catch (error) {
        res.status(403).json({ error: "Invalid or expired token." });
    }
}

export function isAdmin(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void {
    if (!req.user) {
        res.status(401).json({ error: "Unauthorized." });
        return;
    }

    if (!req.user.is_admin) {
        res.status(403).json({ error: "Access denied. Admin only." });
        return;
    }

    next();
}
