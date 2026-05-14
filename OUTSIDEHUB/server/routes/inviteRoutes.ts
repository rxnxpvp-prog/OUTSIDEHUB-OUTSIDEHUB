import { Router } from "express";
import { getDB, saveDB, DEFAULT_PERMISSIONS, type Permission } from "../db.js";
import { requireAuth, requireAdmin, hashPassword, type AuthRequest, signToken } from "../auth.js";
import { nanoid } from "nanoid";

const router = Router();

// ── Generate a random invite code ─────────────────────────
function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// POST /api/invites — admin creates invite
router.post("/", requireAdmin, (req: AuthRequest, res) => {
  try {
    const { note, roleId, expiresInDays, customPermissions } = req.body ?? {};
    const db = getDB();

    const code = genCode();
    const invite = {
      id: nanoid(),
      code,
      createdBy: req.user!.userId,
      note: note ? String(note).trim() : undefined,
      roleId: roleId || undefined,
      customPermissions: customPermissions || undefined,
      expiresAt: expiresInDays
        ? new Date(Date.now() + Number(expiresInDays) * 86400_000).toISOString()
        : undefined,
      createdAt: new Date().toISOString(),
    };

    db.invites.push(invite);
    saveDB(db);
    res.status(201).json(invite);
  } catch (err) {
    console.error("POST /api/invites", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/invites — admin lists all invites
router.get("/", requireAdmin, (_req, res) => {
  try {
    const db = getDB();
    res.json(db.invites);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

// DELETE /api/invites/:id — admin deletes invite
router.delete("/:id", requireAdmin, (req, res) => {
  try {
    const db = getDB();
    db.invites = db.invites.filter((i) => i.id !== req.params.id);
    saveDB(db);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/invites/validate — check code validity (public)
router.post("/validate", async (req, res) => {
  try {
    const { code } = req.body ?? {};
    if (!code) {
      res.status(400).json({ error: "Código obrigatório" });
      return;
    }
    const db = getDB();
    const invite = db.invites.find(
      (i) => i.code.toUpperCase() === String(code).toUpperCase().trim()
    );
    if (!invite) {
      res.status(404).json({ error: "Código de convite inválido" });
      return;
    }
    if (invite.usedBy) {
      res.status(409).json({ error: "Este convite já foi usado" });
      return;
    }
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      res.status(410).json({ error: "Convite expirado" });
      return;
    }
    res.json({ valid: true, invite: { id: invite.id, code: invite.code, note: invite.note } });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/invites/register — redeem invite + create account
router.post("/register", async (req, res) => {
  try {
    const { code, username, password } = req.body ?? {};
    if (!code || !username || !password) {
      res.status(400).json({ error: "Código, usuário e senha são obrigatórios" });
      return;
    }

    const db = getDB();
    const invite = db.invites.find(
      (i) => i.code.toUpperCase() === String(code).toUpperCase().trim()
    );
    if (!invite) {
      res.status(404).json({ error: "Código de convite inválido" });
      return;
    }
    if (invite.usedBy) {
      res.status(409).json({ error: "Este convite já foi usado" });
      return;
    }
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      res.status(410).json({ error: "Convite expirado" });
      return;
    }

    const trimmedUsername = String(username).trim().toLowerCase();
    if (db.users.find((u) => u.username === trimmedUsername)) {
      res.status(409).json({ error: "Nome de usuário já em uso" });
      return;
    }

    // Resolve permissions from role or invite overrides
    let basePermissions = { ...DEFAULT_PERMISSIONS };
    if (invite.roleId) {
      const role = db.customRoles.find((r) => r.id === invite.roleId);
      if (role) basePermissions = { ...role.permissions };
    }
    const finalPermissions = { ...basePermissions, ...(invite.customPermissions || {}) };

    const subdomain = trimmedUsername.replace(/[^a-z0-9]/g, "");

    const newUser = {
      id: nanoid(),
      name: trimmedUsername,
      username: trimmedUsername,
      email: `${trimmedUsername}@outsidehub.local`,
      passwordHash: await hashPassword(String(password)),
      role: "user" as const,
      customRoleId: invite.roleId,
      permissions: finalPermissions,
      subdomain,
      avatar: "",
      bio: "",
      badges: [] as any[],
      inviteCode: invite.code,
      createdAt: new Date().toISOString(),
    };

    // Mark invite as used
    const idx = db.invites.findIndex((i) => i.id === invite.id);
    if (idx !== -1) {
      db.invites[idx].usedBy = newUser.id;
      db.invites[idx].usedAt = new Date().toISOString();
    }

    db.users.push(newUser);
    saveDB(db);

    const { passwordHash, ...safe } = newUser;
    const token = signToken({ userId: newUser.id, role: newUser.role });
    res.status(201).json({ token, user: safe });
  } catch (err) {
    console.error("POST /api/invites/register", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// ── Custom Roles ───────────────────────────────────────────

// GET /api/invites/roles
router.get("/roles", requireAdmin, (_req, res) => {
  try {
    res.json(getDB().customRoles);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/invites/roles
router.post("/roles", requireAdmin, (req: AuthRequest, res) => {
  try {
    const { name, color, permissions } = req.body ?? {};
    if (!name) {
      res.status(400).json({ error: "Nome obrigatório" });
      return;
    }
    const db = getDB();
    const role = {
      id: nanoid(),
      name: String(name).trim(),
      color: color || "#e5484d",
      permissions: { ...DEFAULT_PERMISSIONS, ...(permissions || {}) },
      createdAt: new Date().toISOString(),
    };
    db.customRoles.push(role);
    saveDB(db);
    res.status(201).json(role);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

// PUT /api/invites/roles/:id
router.put("/roles/:id", requireAdmin, (req, res) => {
  try {
    const { name, color, permissions } = req.body ?? {};
    const db = getDB();
    const idx = db.customRoles.findIndex((r) => r.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: "Cargo não encontrado" });
      return;
    }
    if (name) db.customRoles[idx].name = String(name).trim();
    if (color) db.customRoles[idx].color = color;
    if (permissions) db.customRoles[idx].permissions = { ...DEFAULT_PERMISSIONS, ...permissions };
    saveDB(db);
    res.json(db.customRoles[idx]);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

// DELETE /api/invites/roles/:id
router.delete("/roles/:id", requireAdmin, (req, res) => {
  try {
    const db = getDB();
    db.customRoles = db.customRoles.filter((r) => r.id !== req.params.id);
    saveDB(db);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

// PUT /api/invites/user/:id/permissions — update a user's permissions directly
router.put("/user/:id/permissions", requireAdmin, (req, res) => {
  try {
    const db = getDB();
    const idx = db.users.findIndex((u) => u.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    const { permissions, customRoleId } = req.body ?? {};
    if (permissions) db.users[idx].permissions = { ...DEFAULT_PERMISSIONS, ...permissions };
    if (customRoleId !== undefined) db.users[idx].customRoleId = customRoleId || undefined;
    saveDB(db);
    const { passwordHash, ...safe } = db.users[idx];
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
