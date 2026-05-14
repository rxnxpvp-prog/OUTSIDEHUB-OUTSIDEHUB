import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import { getDB, saveDB } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "outsidehub-dev-secret-change-in-production";
const JWT_EXPIRES = "7d";

// In-memory throttle for lastSeen DB writes (1 write per minute per user max)
const lastSeenWriteCache = new Map<string, number>();
const PRESENCE_WRITE_THROTTLE_MS = 60_000;

export interface JWTPayload {
  userId: string;
  role: "admin" | "user";
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

function touchPresence(userId: string) {
  const now = Date.now();
  const last = lastSeenWriteCache.get(userId) ?? 0;
  if (now - last < PRESENCE_WRITE_THROTTLE_MS) return;
  lastSeenWriteCache.set(userId, now);
  try {
    const db = getDB();
    const idx = db.users.findIndex((u: any) => u.id === userId);
    if (idx !== -1) {
      (db.users[idx] as any).lastSeen = new Date().toISOString();
      saveDB(db);
    }
  } catch {
    // swallow — presence is best-effort, must never break a request
  }
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token não fornecido" });
    return;
  }
  const payload = verifyToken(header.slice(7));
  if (!payload) {
    res.status(401).json({ error: "Token inválido ou expirado" });
    return;
  }
  req.user = payload;
  touchPresence(payload.userId);
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== "admin") {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }
    next();
  });
}
