import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { getDB, saveDB } from "./db.js";
import { hashPassword } from "./auth.js";
import { addRealtimeClient } from "./events.js";
import { verifyToken } from "./auth.js";
import { SUPREME_PERMISSIONS, SUPREME_USERNAME, consolidateSupremeUsers } from "./supreme.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import scraperRoutes from "./routes/scraperRoutes.js";
import smsRoutes from "./routes/smsRoutes.js";
import mailRoutes from "./routes/mailRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import incidentIntelRoutes from "./routes/incidentIntelRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ADMIN_PASSWORD = "3526";

// ── Seed admin ────────────────────────────────────────────
async function seed() {
  const db = getDB();
  const existingSupreme = consolidateSupremeUsers(db);
  if (existingSupreme) {
    saveDB(db);
    console.log(`✅  CEO confirmado  →  ${SUPREME_USERNAME}`);
    return;
  }

  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  db.users.push({
    id: "admin-540",
    name: SUPREME_USERNAME,
    username: SUPREME_USERNAME,
    email: "540@outsidehub.com",
    passwordHash,
    role: "admin",
    permissions: SUPREME_PERMISSIONS,
    avatar: "",
    bio: "",
    badges: [],
    createdAt: new Date().toISOString(),
    isPublic: true,
  });
  saveDB(db);
  console.log(`✅  CEO criado  →  ${SUPREME_USERNAME} / ${ADMIN_PASSWORD}`);
}

// ── Start ─────────────────────────────────────────────────
async function start() {
  await seed();

  const app = express();

  // ── Middleware ──
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));
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
  app.use("/api/admin/scrape", scraperRoutes);
  app.use("/api/scraper",       scraperRoutes);
  app.use("/api/sms",           smsRoutes);
  app.use("/api/mail",          mailRoutes);
  app.use("/api/search",        searchRoutes);
  app.use("/api/incident-intel", incidentIntelRoutes);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
  });

  app.get("/api/events", (req, res) => {
    const token = String(req.query.token || "");
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: "Token invalido ou expirado" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const removeClient = addRealtimeClient(res);
    req.on("close", removeClient);
  });

  // ── Static (production) ──
  if (process.env.NODE_ENV === "production") {
    const staticPath = path.resolve(process.env.STATIC_PATH || path.join(__dirname, "public"));
    app.use(express.static(staticPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        }
      },
    }));
    app.get("/download", (_req, res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.sendFile(path.join(staticPath, "download.html"));
    });
    app.get("*", (_req, res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.sendFile(path.join(staticPath, "index.html"));
    });
  }

  // ── Global error handler ──
  app.use((err: Error & { statusCode?: number; payload?: unknown }, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(err.statusCode || 500).json({ error: err.message || "Erro interno do servidor", details: err.payload });
  });

  const port = parseInt(process.env.PORT || "3333", 10);
  const server = createServer(app);

  server.listen(port, "0.0.0.0", () => {
    console.log(`\n🚀  Backend  →  http://localhost:${port}/api`);
    console.log(`🔑  Login    →  ${SUPREME_USERNAME} / ${ADMIN_PASSWORD}\n`);
  });
}

start().catch((err) => {
  console.error("Falha ao iniciar servidor:", err);
  process.exit(1);
});
