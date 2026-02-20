import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import { initDB } from "./db";
import authRoutes from "./routes/auth";
import downloadRoutes from "./routes/downloads";
import adminRoutes from "./routes/admin";
import certificateRoutes from "./routes/certificates";
import resumeRoutes from "./routes/resumes";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Middleware
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization"] }));
app.use(express.json());

// Initialize database on cold start
initDB().catch((err) => {
    console.error("Database initialization failed:", err);
});

// Routes
app.get("/", (req: Request, res: Response) => {
    res.json({ message: "Hello TypeScript + Express 🚀" });
});

app.use("/api/auth", authRoutes);
app.use("/api/downloads", downloadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/resumes", resumeRoutes);

// Only listen when running locally (not on Vercel)
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
}

// Export for Vercel serverless
export default app;