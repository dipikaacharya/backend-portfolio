import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import { initDB } from "./db";
import authRoutes from "./routes/auth";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());

// Routes
app.get("/", (req: Request, res: Response) => {
    res.json({ message: "Hello TypeScript + Express 🚀" });
});

app.use("/api/auth", authRoutes);

// Start server & initialize database
initDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Server running at http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error("Failed to start server:", err);
        process.exit(1);
    });