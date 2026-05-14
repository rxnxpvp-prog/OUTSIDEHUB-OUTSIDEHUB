import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { getDB, saveDB } from "./db.js";
import { hashPassword } from "./auth.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import scraperRoutes from "./routes/scraperRoutes.js";
import inviteRoutes from "./routes/inviteRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Seed admin ────────────────────────────────────────────
async function seed() {
  const db = getDB();
  const existingCrema = db.users.find((u) => u.username === "crema");
  if (existingCrema) {
    existingCrema.role = "admin";
    existingCrema.passwordHash = await hashPassword("crema");
    saveDB(db);
    console.log("✅  Admin crema confirmado  →  crema / crema");
    return;
  }

  const passwordHash = await hashPassword("crema");
  db.users.push({
    id: "admin-crema",
    name: "Crema Admin",
    username: "crema",
    email: "crema@outsidehub.com",
    passwordHash,
    role: "admin",
    avatar: "",
    bio: "",
    badges: [],
    createdAt: new Date().toISOString(),
  });
  saveDB(db);
  console.log("✅  Admin criado  →  crema / crema");
}

// ── Start ─────────────────────────────────────────────────
async function start() {
  await seed();

  const app = express();

  // ── Middleware ──
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(
    cors({
      origin: true,   // allow all origins in dev
      credentials: true,
    })
  );

  // ── Request logger (dev) ──
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`${req.method} ${req.path}`);
    }
    next();
  });

  // ── API ──
  app.use("/api/auth",          authRoutes);
  app.use("/api/users",         userRoutes);
  app.use("/api/posts",         postRoutes);
  app.use("/api/chat",          chatRoutes);
  app.use("/api/leads",         leadRoutes);
  app.use("/api/admin",         adminRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/admin/scrape",  scraperRoutes);
  app.use("/api/scraper",       scraperRoutes);
  app.use("/api/invites",       inviteRoutes);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
  });

  // ── Static (production) ──
  if (process.env.NODE_ENV === "production") {
    const staticPath = process.env.STATIC_PATH || path.resolve(__dirname, "public");
    app.use(express.static(staticPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(staticPath, "index.html"));
    });
  }

  // ── Global error handler ──
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Erro interno do servidor" });
  });

  const port = parseInt(process.env.PORT || "3001", 10);
  const server = createServer(app);

  server.listen(port, "0.0.0.0", () => {
    console.log(`\n🚀  Backend  →  http://localhost:${port}/api`);
    console.log(`🔑  Login    →  crema / crema\n`);
  });
}

start().catch((err) => {
  console.error("Falha ao iniciar servidor:", err);
  process.exit(1);
});
