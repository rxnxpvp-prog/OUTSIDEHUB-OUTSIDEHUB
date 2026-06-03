import { Router } from "express";
import { getDB, saveDB } from "../db.js";
import { requireAuth, requireAdmin, hashPassword, type AuthRequest } from "../auth.js";
import { nanoid } from "nanoid";
import { emitRealtime } from "../events.js";

const router = Router();
const CREMA_USERNAME = "crema";
const CREMA_PERMISSIONS = {
  feed: true,
  chat: true,
  sms: true,
  leads: true,
  email: true,
  search: true,
  builders: true,
  discord: true,
  logs: true,
  admin: true,
};

function isCrema(user: { username?: string } | undefined) {
  return user?.username?.toLowerCase() === CREMA_USERNAME;
}

function lockCrema(user: any) {
  if (!isCrema(user)) return;
  user.role = "admin";
  user.permissions = CREMA_PERMISSIONS;
}

function canManageBadges(req: AuthRequest) {
  const db = getDB();
  const current = db.users.find((u) => u.id === req.user?.userId);
  return isCrema(current);
}

function accessCodeForUser(db: ReturnType<typeof getDB>, userId: string): string {
  const index = db.users.findIndex((u) => u.id === userId);
  if (index === -1) return "OH-000";
  return `OH-${String(index + 1).padStart(3, "0")}`;
}

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

router.get("/profile/:identifier", (req, res) => {
  const db = getDB();
  const identifier = req.params.identifier.toLowerCase();
  const user = db.users.find(
    (u) => u.customSubdomain === identifier || u.username === identifier
  );
  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  if (user.isPublic === false) {
    res.json({
      id: user.id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      accessCode: accessCodeForUser(db, user.id),
      isPublic: false,
    });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    username: user.username,
    accessCode: accessCodeForUser(db, user.id),
    role: user.role,
    avatar: user.avatar,
    bio: user.bio,
    links: user.links || [],
    badges: user.badges,
    status: user.status,
    skills: user.skills || [],
    projects: user.projects || [],
    tags: user.tags || [],
    isPublic: true,
    createdAt: user.createdAt,
  });
});

router.get("/:userId/public", (req, res) => {
  const db = getDB();
  const { userId } = req.params;
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  if (user.isPublic === false) {
    res.json({
      id: user.id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      accessCode: accessCodeForUser(db, user.id),
      isPublic: false,
    });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    username: user.username,
    accessCode: accessCodeForUser(db, user.id),
    role: user.role,
    avatar: user.avatar,
    bio: user.bio,
    links: user.links || [],
    badges: user.badges,
    status: user.status,
    skills: user.skills || [],
    projects: user.projects || [],
    tags: user.tags || [],
    isPublic: true,
    createdAt: user.createdAt,
  });
});

router.post("/", requireAdmin, async (req, res) => {
  const { username, password, role, name, email, permissions } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: "Username e senha são obrigatórios" });
    return;
  }

  const trimmedUsername = String(username).trim().toLowerCase();
  const db = getDB();
  if (trimmedUsername === CREMA_USERNAME) {
    res.status(409).json({ error: "crema e uma conta suprema reservada" });
    return;
  }

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
    role: (["admin", "moderator", "user"].includes(role) ? role : "user") as "admin" | "moderator" | "user",
    permissions: permissions || {},
    avatar: "",
    bio: "",
    badges: [] as any[],
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDB(db);
  emitRealtime({ type: "users:changed", userId: newUser.id });

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
  if (isCrema(db.users[idx])) {
    res.status(403).json({ error: "crema e supremo e nao pode ser removido" });
    return;
  }
  db.users.splice(idx, 1);
  saveDB(db);
  emitRealtime({ type: "users:changed", userId: id });
  res.json({ ok: true });
});

router.put("/:id/role", requireAdmin, (req, res) => {
  const { role, permissions } = req.body;
  if (!["admin", "moderator", "user"].includes(role)) {
    res.status(400).json({ error: "Role inválido" });
    return;
  }
  const db = getDB();
  const idx = db.users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  if (isCrema(db.users[idx])) {
    lockCrema(db.users[idx]);
    saveDB(db);
    const { passwordHash, ...safe } = db.users[idx];
    res.status(403).json({ error: "crema e supremo: cargo e permissoes nao podem ser alterados", user: safe });
    return;
  }
  db.users[idx].role = role;
  if (permissions !== undefined) db.users[idx].permissions = permissions;
  saveDB(db);
  emitRealtime({ type: "users:changed", userId: db.users[idx].id });
  const { passwordHash, ...safe } = db.users[idx];
  res.json(safe);
});

router.post("/:id/badges", requireAdmin, (req: AuthRequest, res) => {
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
  if (!canManageBadges(req)) {
    res.status(403).json({ error: "Apenas crema pode adicionar badges" });
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
  emitRealtime({ type: "users:changed", userId: db.users[idx].id });
  const { passwordHash, ...safe } = db.users[idx];
  res.json(safe);
});

router.put("/:id/badges/:badgeId", requireAdmin, (req: AuthRequest, res) => {
  const { name, icon, image, color } = req.body;
  if (!name) {
    res.status(400).json({ error: "Nome obrigatÃ³rio" });
    return;
  }
  const db = getDB();
  const idx = db.users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "UsuÃ¡rio nÃ£o encontrado" });
    return;
  }
  if (!canManageBadges(req)) {
    res.status(403).json({ error: "Apenas crema pode editar badges" });
    return;
  }
  const badgeIdx = db.users[idx].badges.findIndex((b) => b.id === req.params.badgeId);
  if (badgeIdx === -1) {
    res.status(404).json({ error: "Badge nÃ£o encontrada" });
    return;
  }

  db.users[idx].badges[badgeIdx] = {
    ...db.users[idx].badges[badgeIdx],
    name: String(name).trim(),
    icon: icon || "",
    image: image || undefined,
    color: color || undefined,
  } as any;
  saveDB(db);
  emitRealtime({ type: "users:changed", userId: db.users[idx].id });
  const { passwordHash, ...safe } = db.users[idx];
  res.json(safe);
});

router.delete("/:id/badges/:badgeId", requireAdmin, (req: AuthRequest, res) => {
  const db = getDB();
  const idx = db.users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  if (!canManageBadges(req)) {
    res.status(403).json({ error: "Apenas crema pode remover badges" });
    return;
  }
  db.users[idx].badges = db.users[idx].badges.filter((b) => b.id !== req.params.badgeId);
  saveDB(db);
  emitRealtime({ type: "users:changed", userId: db.users[idx].id });
  const { passwordHash, ...safe } = db.users[idx];
  res.json(safe);
});

export default router;
