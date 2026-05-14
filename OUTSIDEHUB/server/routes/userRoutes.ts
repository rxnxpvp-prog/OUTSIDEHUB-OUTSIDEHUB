import { Router } from "express";
import { getDB, saveDB } from "../db.js";
import { requireAuth, requireAdmin, hashPassword, type AuthRequest } from "../auth.js";
import { nanoid } from "nanoid";

const router = Router();

router.get("/", requireAuth, (req, res) => {
  const db = getDB();
  res.json(db.users.map(({ passwordHash, ...u }) => u));
});

// GET /api/users/online — usuários ativos nos últimos N minutos (default 5)
router.get("/online", requireAuth, (req, res) => {
  const minutes = Math.max(1, Math.min(60, parseInt(String(req.query.window ?? "5"), 10) || 5));
  const cutoff = Date.now() - minutes * 60_000;
  const db = getDB();
  const online = db.users
    .filter((u: any) => u.lastSeen && new Date(u.lastSeen).getTime() >= cutoff)
    .map(({ passwordHash, twoFactorSecret, twoFactorTempSecret, discordAccessToken, discordRefreshToken, ...u }: any) => u)
    .sort((a: any, b: any) => +new Date(b.lastSeen) - +new Date(a.lastSeen));
  res.json({ window: minutes, count: online.length, users: online });
});

router.get("/:id/public", requireAuth, (req, res) => {
  const db = getDB();
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    avatar: user.avatar,
    bio: user.bio,
    badges: user.badges,
    createdAt: user.createdAt,
  });
});

router.post("/", requireAdmin, async (req, res) => {
  const { username, password, role, name, email } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: "Username e senha são obrigatórios" });
    return;
  }

  const trimmedUsername = String(username).trim().toLowerCase();
  const db = getDB();

  const safeEmail = email && String(email).trim().toLowerCase();
  const generatedEmail = safeEmail || `${trimmedUsername}@outsidehub.local`;
  const generatedName = name && String(name).trim() ? String(name).trim() : String(username).trim();

  if (db.users.find((u) => u.email === generatedEmail || u.username === trimmedUsername)) {
    res.status(409).json({ error: "Username já em uso" });
    return;
  }

  const newUser = {
    id: nanoid(),
    name: generatedName,
    username: trimmedUsername,
    email: generatedEmail,
    passwordHash: await hashPassword(password),
    role: (role === "admin" ? "admin" : "user") as "admin" | "user",
    avatar: "",
    bio: "",
    badges: [] as any[],
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDB(db);

  const { passwordHash: _, ...safe } = newUser;
  res.status(201).json(safe);
});

router.delete("/:id", requireAdmin, (req: AuthRequest, res) => {
  const { id } = req.params;
  if (id === req.user!.userId) {
    res.status(400).json({ error: "Não pode deletar sua própria conta" });
    return;
  }
  const db = getDB();
  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  db.users.splice(idx, 1);
  saveDB(db);
  res.json({ ok: true });
});

router.put("/:id/role", requireAdmin, (req, res) => {
  const { role } = req.body;
  if (!["admin", "user"].includes(role)) {
    res.status(400).json({ error: "Role inválido" });
    return;
  }
  const db = getDB();
  const idx = db.users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  db.users[idx].role = role;
  saveDB(db);
  const { passwordHash, ...safe } = db.users[idx];
  res.json(safe);
});

router.post("/:id/badges", requireAdmin, (req, res) => {
  const { name, icon, image, color } = req.body;
  if (!name) {
    res.status(400).json({ error: "Nome obrigatório" });
    return;
  }
  const db = getDB();
  const idx = db.users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  if (db.users[idx].badges.length >= 10) {
    res.status(400).json({ error: "Máximo 10 badges" });
    return;
  }
  db.users[idx].badges.push({
    id: nanoid(),
    name: String(name).trim(),
    icon: icon || "⭐",
    image: image || undefined,
    color: color || undefined,
  } as any);
  saveDB(db);
  const { passwordHash, ...safe } = db.users[idx];
  res.json(safe);
});

router.delete("/:id/badges/:badgeId", requireAdmin, (req, res) => {
  const db = getDB();
  const idx = db.users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  db.users[idx].badges = db.users[idx].badges.filter((b) => b.id !== req.params.badgeId);
  saveDB(db);
  const { passwordHash, ...safe } = db.users[idx];
  res.json(safe);
});

export default router;
