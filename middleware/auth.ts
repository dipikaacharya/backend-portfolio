import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    user?: {
        id: number;
        name: string;
        email: string;
    };
}

export function authenticateToken(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void {
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
        ) as { id: number; name: string; email: string };

        req.user = decoded;
        next();
    } catch (error) {
        res.status(403).json({ error: "Invalid or expired token." });
    }
}
