import { Router } from "express";
import axios from "axios";
import * as speakeasy from "speakeasy";
import { nanoid } from "nanoid";
import { getDB, saveDB } from "../db.js";
import {
  signToken,
  comparePassword,
  hashPassword,
  requireAuth,
  type AuthRequest,
  verifyToken,
} from "../auth.js";
import { emitRealtime } from "../events.js";

const router = Router();
const RESERVED_USERNAMES = new Set(["admin", "api", "www", "login", "profile", "discord"]);

function normalizeUsername(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 24);
}

function getDiscordConfig() {
  const db = getDB();
  const cfg = db.discordConfig;
  const clean = (value: string | undefined, placeholder: string) => {
    const text = String(value || "").trim();
    return text && text !== placeholder ? text : "";
  };
  return {
    clientId: clean(cfg?.clientId || process.env.DISCORD_CLIENT_ID, "your_discord_client_id"),
    clientSecret: clean(cfg?.clientSecret || process.env.DISCORD_CLIENT_SECRET, "your_discord_client_secret"),
    redirectUri:
      cfg?.redirectUri ||
      process.env.DISCORD_REDIRECT_URI ||
      "https://www.outsidehub.com.br/api/auth/discord/callback",
    clientUrl: cfg?.clientUrl || process.env.CLIENT_URL || "https://www.outsidehub.com.br",
    rpcDetails: cfg?.rpcDetails || "OutsideHub",
    rpcState: cfg?.rpcState || "Online",
  };
}

function buildSafeUser(user: any) {
  const {
    passwordHash,
    twoFactorSecret,
    twoFactorTempSecret,
    discordAccessToken,
    discordRefreshToken,
    discordTokenExpiresAt,
    ...safe
  } = user;
  const db = getDB();
  const index = db.users.findIndex((u) => u.id === user.id);
  return {
    ...safe,
    accessCode: index === -1 ? "OH-000" : `OH-${String(index + 1).padStart(3, "0")}`,
  };
}

function getDisplayRole(user: any) {
  if (String(user?.username || "").toLowerCase() === "crema") return "CEO";
  if (user?.role === "admin") return "ADMIN";
  if (user?.role === "moderator") return "MODERATOR";
  return "USUARIO";
}

async function refreshDiscordToken(user: any) {
  if (!user.discordRefreshToken) {
    return false;
  }

  const discord = getDiscordConfig();
  const body = new URLSearchParams({
    client_id: discord.clientId,
    client_secret: discord.clientSecret,
    grant_type: "refresh_token",
    refresh_token: user.discordRefreshToken,
  });

  const tokenRes = await axios.post("https://discord.com/api/oauth2/token", body.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  user.discordAccessToken = tokenRes.data.access_token;
  user.discordRefreshToken = tokenRes.data.refresh_token;
  user.discordTokenExpiresAt = new Date(Date.now() + tokenRes.data.expires_in * 1000).toISOString();

  // Re-read DB, update the user entry, then save — avoids discarding the token updates
  const db = getDB();
  const idx = db.users.findIndex((u: any) => u.id === user.id);
  if (idx !== -1) {
    db.users[idx].discordAccessToken = user.discordAccessToken;
    db.users[idx].discordRefreshToken = user.discordRefreshToken;
    db.users[idx].discordTokenExpiresAt = user.discordTokenExpiresAt;
    saveDB(db);
  }
  return true;
}

function getDiscordOauthUrl(token: string) {
  const discord = getDiscordConfig();
  const state = Buffer.from(token, "utf8").toString("base64url");
  const params = new URLSearchParams({
    client_id: discord.clientId,
    redirect_uri: discord.redirectUri,
    response_type: "code",
    scope: "identify email",
    state,
    prompt: "consent",
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password, otp } = req.body ?? {};

    if (!username || !password) {
      res.status(400).json({ error: "Usuário e senha são obrigatórios" });
      return;
    }

    const db = getDB();
    const user = db.users.find(
      (u) =>
        u.username?.toLowerCase() === String(username).toLowerCase() ||
        u.email?.toLowerCase() === String(username).toLowerCase()
    );

    if (!user) {
      res.status(401).json({ error: "Usuário ou senha inválidos" });
      return;
    }

    const valid = await comparePassword(String(password), user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Usuário ou senha inválidos" });
      return;
    }

    if (user.twoFactorEnabled) {
      if (!otp) {
        res.status(401).json({ requires2fa: true, message: "Código 2FA necessário" });
        return;
      }

      const otpValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret ?? "",
        encoding: "base32",
        token: String(otp),
        window: 1,
      });

      if (!otpValid) {
        res.status(401).json({ error: "Código 2FA inválido" });
        return;
      }
    }

    const token = signToken({ userId: user.id, role: user.role });
    res.json({ token, user: buildSafeUser(user) });
  } catch (err) {
    console.error("/api/auth/login", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, password, inviteCode } = req.body ?? {};

    if (!username || !password || !inviteCode) {
      res.status(400).json({ error: "Usuário, senha e código de convite são obrigatórios" });
      return;
    }

    const db = getDB();
    const inviteIdx = db.invites.findIndex(i => i.code === inviteCode && !i.used);

    if (inviteIdx === -1) {
      res.status(400).json({ error: "Código de convite inválido ou já utilizado" });
      return;
    }

    const invite = db.invites[inviteIdx];
    if (new Date(invite.expiresAt) < new Date()) {
      res.status(400).json({ error: "Código de convite expirado" });
      return;
    }

    const trimmedUsername = String(username).trim().toLowerCase();
    
    if (db.users.find((u) => u.username === trimmedUsername)) {
      res.status(409).json({ error: "Username já em uso" });
      return;
    }

    const newUser = {
      id: nanoid(),
      name: trimmedUsername,
      username: trimmedUsername,
      email: `${trimmedUsername}@outsidehub.local`,
      passwordHash: await hashPassword(password),
      role: "user" as const,
      permissions: {
        feed: true,
        chat: true,
        sms: false,
        leads: false,
        email: false,
        search: false,
        builders: false,
        discord: true,
      },
      avatar: "",
      bio: "",
      badges: [] as any[],
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    
    db.invites[inviteIdx].used = true;
    db.invites[inviteIdx].usedBy = newUser.id;

    saveDB(db);
    emitRealtime({ type: "users:changed", userId: newUser.id });

    const token = signToken({ userId: newUser.id, role: newUser.role as any });
    res.status(201).json({ token, user: buildSafeUser(newUser) });
  } catch (err) {
    console.error("/api/auth/register", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, (req: AuthRequest, res) => {
  try {
    const db = getDB();
    const user = db.users.find((u) => u.id === req.user!.userId);
    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    res.json(buildSafeUser(user));
  } catch (err) {
    console.error("/api/auth/me", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/auth/2fa/status
router.get("/2fa/status", requireAuth, (req: AuthRequest, res) => {
  try {
    const db = getDB();
    const user = db.users.find((u) => u.id === req.user!.userId);
    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    res.json({ twoFactorEnabled: Boolean(user.twoFactorEnabled) });
  } catch (err) {
    console.error("/api/auth/2fa/status", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/auth/discord/url
router.get("/discord/url", requireAuth, (req: AuthRequest, res) => {
  try {
    const discord = getDiscordConfig();
    if (!discord.clientId || !discord.clientSecret) {
      res.status(500).json({ error: "Discord OAuth não configurado" });
      return;
    }
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Token não fornecido" });
      return;
    }
    const token = authHeader.slice(7);
    const url = getDiscordOauthUrl(token);
    res.json({ url });
  } catch (err) {
    console.error("/api/auth/discord/url", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/auth/discord/callback
router.get("/discord/callback", async (req, res) => {
  try {
    const discord = getDiscordConfig();
    const { code, state } = req.query as { code?: string; state?: string };
    if (!code || !state) {
      res.status(400).send("Parâmetros Discord inválidos");
      return;
    }

    let token: string | null = null;
    try {
      token = Buffer.from(state, "base64url").toString("utf8");
    } catch {
      res.status(400).send("State inválido");
      return;
    }

    const payload = verifyToken(token);
    if (!payload) {
      res.status(400).send("Token inválido");
      return;
    }

    const body = new URLSearchParams({
      client_id: discord.clientId,
      client_secret: discord.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: discord.redirectUri,
    });

    const tokenRes = await axios.post("https://discord.com/api/oauth2/token", body.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const accessToken = tokenRes.data.access_token as string;
    const refreshToken = tokenRes.data.refresh_token as string;
    const expiresAt = new Date(Date.now() + tokenRes.data.expires_in * 1000).toISOString();
    const userRes = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const db = getDB();
    const user = db.users.find((u) => u.id === payload.userId);
    if (!user) {
      res.status(404).send("Usuário não encontrado");
      return;
    }

    user.discordId = userRes.data.id;
    user.discordUsername = userRes.data.username;
    user.discordDiscriminator = userRes.data.discriminator;
    user.discordAvatar = userRes.data.avatar;
    user.discordAccessToken = accessToken;
    user.discordRefreshToken = refreshToken;
    user.discordTokenExpiresAt = expiresAt;
    saveDB(db);
    emitRealtime({ type: "users:changed", userId: user.id });

    res.redirect(`${discord.clientUrl}/discord?connected=1`);
  } catch (err) {
    console.error("/api/auth/discord/callback", err);
    res.status(500).send("Erro ao conectar Discord");
  }
});

// GET /api/auth/discord/status
router.get("/discord/status", requireAuth, (req: AuthRequest, res) => {
  try {
    const discord = getDiscordConfig();
    const db = getDB();
    const user = db.users.find((u) => u.id === req.user!.userId);
    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    res.json({
      configured: Boolean(discord.clientId && discord.clientSecret),
      clientId: discord.clientId,
      redirectUri: discord.redirectUri,
      rpcDetails: discord.rpcDetails,
      rpcState: discord.rpcState,
      rpcName: "OUTSIDE HUB",
      rpcUser: user.username,
      rpcRole: getDisplayRole(user),
      rpcPage: user.currentPage || "Online",
      rpcPath: user.currentPath || "/",
      lastSeen: (user as any).lastSeen,
      connected: Boolean(user.discordId),
      discordId: user.discordId,
      discordUsername: user.discordUsername,
      discordDiscriminator: user.discordDiscriminator,
      discordAvatar: user.discordAvatar,
      rpcToken: user.rpcToken,
    });
  } catch (err) {
    console.error("/api/auth/discord/status", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/auth/presence
router.post("/presence", requireAuth, (req: AuthRequest, res) => {
  try {
    const { page, path } = req.body ?? {};
    const db = getDB();
    const idx = db.users.findIndex((u) => u.id === req.user!.userId);
    if (idx === -1) {
      res.status(404).json({ error: "Usuario nao encontrado" });
      return;
    }

    db.users[idx].currentPage = String(page || "Online").trim().slice(0, 80) || "Online";
    db.users[idx].currentPath = String(path || "/").trim().slice(0, 160) || "/";
    db.users[idx].lastSeen = new Date().toISOString();
    saveDB(db);
    res.json({
      ok: true,
      rpcName: "OUTSIDE HUB",
      rpcUser: db.users[idx].username,
      rpcRole: getDisplayRole(db.users[idx]),
      rpcPage: db.users[idx].currentPage,
      rpcPath: db.users[idx].currentPath,
    });
  } catch (err) {
    console.error("/api/auth/presence", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/auth/discord/guilds
router.get("/discord/guilds", requireAuth, async (req: AuthRequest, res) => {
  try {
    const db = getDB();
    const user = db.users.find((u) => u.id === req.user!.userId);
    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    if (!user.discordAccessToken) {
      res.status(400).json({ error: "Discord não conectado" });
      return;
    }
    if (user.discordTokenExpiresAt && new Date(user.discordTokenExpiresAt) <= new Date()) {
      const refreshed = await refreshDiscordToken(user);
      if (!refreshed) {
        res.status(401).json({ error: "Token Discord expirado" });
        return;
      }
    }
    const token = user.discordAccessToken;
    const guildsRes = await axios.get("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${token}` },
    });
    res.json({ guilds: guildsRes.data });
  } catch (err) {
    console.error("/api/auth/discord/guilds", err);
    res.status(500).json({ error: "Erro ao buscar guilds do Discord" });
  }
});

// POST /api/auth/discord/disconnect
router.post("/discord/disconnect", requireAuth, (req: AuthRequest, res) => {
  try {
    const db = getDB();
    const user = db.users.find((u) => u.id === req.user!.userId);
    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    user.discordId = undefined;
    user.discordUsername = undefined;
    user.discordDiscriminator = undefined;
    user.discordAvatar = undefined;
    saveDB(db);
    emitRealtime({ type: "users:changed", userId: user.id });
    res.json({ ok: true });
  } catch (err) {
    console.error("/api/auth/discord/disconnect", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/auth/2fa/setup
router.post("/2fa/setup", requireAuth, (req: AuthRequest, res) => {
  try {
    const db = getDB();
    const user = db.users.find((u) => u.id === req.user!.userId);
    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }

    if (user.twoFactorEnabled) {
      res.status(400).json({ error: "2FA já está ativado" });
      return;
    }

    const secret = speakeasy.generateSecret({ length: 20, name: `outsidehub:${user.username}` });
    user.twoFactorTempSecret = secret.base32;
    saveDB(db);
    res.json({ secret: secret.base32, otpauthUrl: secret.otpauth_url });
  } catch (err) {
    console.error("/api/auth/2fa/setup", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/auth/2fa/confirm
router.post("/2fa/confirm", requireAuth, (req: AuthRequest, res) => {
  try {
    const { otp } = req.body ?? {};
    if (!otp) {
      res.status(400).json({ error: "Código 2FA obrigatório" });
      return;
    }

    const db = getDB();
    const user = db.users.find((u) => u.id === req.user!.userId);
    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }

    if (!user.twoFactorTempSecret) {
      res.status(400).json({ error: "Nenhum setup de 2FA em andamento" });
      return;
    }

    const otpValid = speakeasy.totp.verify({
      secret: user.twoFactorTempSecret,
      encoding: "base32",
      token: String(otp),
      window: 1,
    });

    if (!otpValid) {
      res.status(401).json({ error: "Código 2FA inválido" });
      return;
    }

    user.twoFactorSecret = user.twoFactorTempSecret;
    user.twoFactorTempSecret = undefined;
    user.twoFactorEnabled = true;
    saveDB(db);
    emitRealtime({ type: "users:changed", userId: user.id });
    res.json({ ok: true });
  } catch (err) {
    console.error("/api/auth/2fa/confirm", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/auth/2fa/disable
router.post("/2fa/disable", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { password } = req.body ?? {};
    if (!password) {
      res.status(400).json({ error: "Senha obrigatória" });
      return;
    }

    const db = getDB();
    const user = db.users.find((u) => u.id === req.user!.userId);
    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }

    const valid = await comparePassword(String(password), user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Senha incorreta" });
      return;
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorTempSecret = undefined;
    saveDB(db);
    emitRealtime({ type: "users:changed", userId: user.id });
    res.json({ ok: true });
  } catch (err) {
    console.error("/api/auth/2fa/disable", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// PUT /api/auth/profile
router.put("/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { username, name, bio, avatar, customSubdomain, links, isPublic, skills, projects, tags } = req.body ?? {};
    const db = getDB();
    const idx = db.users.findIndex((u) => u.id === req.user!.userId);
    if (idx === -1) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    if (username !== undefined) {
      const nextUsername = normalizeUsername(username);
      if (nextUsername.length < 3) {
        res.status(400).json({ error: "Username precisa ter pelo menos 3 caracteres" });
        return;
      }
      if (RESERVED_USERNAMES.has(nextUsername)) {
        res.status(409).json({ error: "Username reservado" });
        return;
      }
      if (db.users.find((u) => u.id !== req.user!.userId && u.username?.toLowerCase() === nextUsername)) {
        res.status(409).json({ error: "Username ja em uso" });
        return;
      }
      if (db.users.find((u) => u.id !== req.user!.userId && u.customSubdomain?.toLowerCase() === nextUsername)) {
        res.status(409).json({ error: "Username conflita com um subdominio em uso" });
        return;
      }
      db.users[idx].username = nextUsername;
    }
    if (name !== undefined) db.users[idx].name = String(name).trim() || db.users[idx].name;
    if (bio !== undefined) db.users[idx].bio = String(bio);
    if (avatar !== undefined) db.users[idx].avatar = String(avatar);
    
    if (customSubdomain !== undefined) {
      const sub = String(customSubdomain).trim().toLowerCase();
      if (sub && db.users.find(u => u.customSubdomain === sub && u.id !== req.user!.userId)) {
        res.status(409).json({ error: "Subdomínio já em uso" });
        return;
      }
      if (sub && db.users.find(u => u.username?.toLowerCase() === sub && u.id !== req.user!.userId)) {
        res.status(409).json({ error: "Subdominio conflita com um username em uso" });
        return;
      }
      db.users[idx].customSubdomain = sub || undefined;
    }
    
    if (links !== undefined && Array.isArray(links)) {
      db.users[idx].links = links.map(l => ({ title: String(l.title), url: String(l.url) }));
    }
    
    if (isPublic !== undefined) db.users[idx].isPublic = Boolean(isPublic);
    if (skills !== undefined && Array.isArray(skills)) db.users[idx].skills = skills.map(String);
    if (tags !== undefined && Array.isArray(tags)) db.users[idx].tags = tags.map(String);
    if (projects !== undefined && Array.isArray(projects)) {
      db.users[idx].projects = projects.map(p => ({
        title: String(p.title),
        description: String(p.description),
        url: String(p.url || "")
      }));
    }
    
    saveDB(db);
    emitRealtime({ type: "users:changed", userId: db.users[idx].id });
    res.json(buildSafeUser(db.users[idx]));
  } catch (err) {
    console.error("/api/auth/profile", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// PUT /api/auth/password
router.put("/password", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body ?? {};
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Campos obrigatórios" });
      return;
    }
    const db = getDB();
    const idx = db.users.findIndex((u) => u.id === req.user!.userId);
    if (idx === -1) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    const valid = await comparePassword(String(currentPassword), db.users[idx].passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Senha atual incorreta" });
      return;
    }
    db.users[idx].passwordHash = await hashPassword(String(newPassword));
    saveDB(db);
    emitRealtime({ type: "users:changed", userId: db.users[idx].id });
    res.json({ ok: true });
  } catch (err) {
    console.error("/api/auth/password", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/auth/rpc/token
router.post("/rpc/token", requireAuth, (req: AuthRequest, res) => {
  try {
    const db = getDB();
    const idx = db.users.findIndex((u) => u.id === req.user!.userId);
    if (idx === -1) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    const token = nanoid(32);
    db.users[idx].rpcToken = token;
    saveDB(db);
    res.json({ token });
  } catch (err) {
    console.error("/api/auth/rpc/token", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/auth/rpc/status
router.get("/rpc/status", (req, res) => {
  try {
    const token = String(req.query.token || req.headers["x-rpc-token"] || "").trim();
    if (!token) {
      res.status(401).json({ error: "Token RPC não fornecido" });
      return;
    }
    const db = getDB();
    const user = db.users.find((u) => u.rpcToken === token);
    if (!user) {
      res.status(401).json({ error: "Token RPC inválido" });
      return;
    }

    const discord = getDiscordConfig();
    
    // Consideramos online se lastSeen for menor que 2 minutos atrás
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const lastSeenDate = user.lastSeen ? new Date(user.lastSeen) : null;
    const online = lastSeenDate ? lastSeenDate > twoMinutesAgo : false;

    res.json({
      online,
      username: user.username,
      rpcClientId: discord.clientId || "1165688537548177538",
      rpcName: "OUTSIDEHUB",
      rpcDetails: user.username,
      rpcState: getDisplayRole(user),
      rpcRole: getDisplayRole(user),
      rpcPage: user.currentPage || "Online",
      rpcPath: user.currentPath || "/",
      lastSeen: user.lastSeen,
    });
  } catch (err) {
    console.error("/api/auth/rpc/status", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/auth/rpc/download
router.get("/rpc/download", (req, res) => {
  try {
    const { file, token } = req.query as { file?: string; token?: string };
    if (!token) {
      res.status(400).send("Token obrigatório para download customizado.");
      return;
    }

    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.get("host");
    const serverUrl = `${protocol}://${host}`;

    if (file === "bat") {
      const batContent = `@echo off
title OutsideHub RPC Companion
echo Verificando dependencias do Node.js...
if not exist node_modules (
  echo Instalando dependencias (discord-rpc e axios)...
  call npm install discord-rpc axios
)
echo Iniciando Discord RPC do OutsideHub...
node outsidehub-rpc.cjs
pause
`;
      res.setHeader("Content-Disposition", "attachment; filename=run-rpc.bat");
      res.setHeader("Content-Type", "application/octet-stream");
      res.send(batContent);
      return;
    }

    const jsContent = `// OutsideHub Discord RPC Companion
const RPC = require('discord-rpc');
const axios = require('axios');

const serverUrl = "${serverUrl}";
const rpcToken = "${token}";

let currentClientId = "";
let rpc = null;
let isConnected = false;

console.log("=========================================");
console.log("  OUTSIDEHUB DISCORD RPC COMPANION  ");
console.log("=========================================");
console.log("Conectando ao servidor: " + serverUrl);

async function updatePresence() {
  try {
    const res = await axios.get(serverUrl + "/api/auth/rpc/status", {
      headers: { "X-RPC-Token": rpcToken }
    });
    
    const { online, username, rpcClientId, rpcDetails, rpcState } = res.data;

    if (!rpcClientId) {
      console.warn("Alerta: Discord Client ID nao configurado no painel da OutsideHub.");
      if (rpc) {
        rpc.destroy().catch(() => {});
        rpc = null;
        isConnected = false;
      }
      return;
    }

    if (rpcClientId !== currentClientId) {
      if (rpc) {
        await rpc.destroy().catch(() => {});
        rpc = null;
        isConnected = false;
      }
      currentClientId = rpcClientId;
      rpc = new RPC.Client({ transport: 'ipc' });
      rpc.on('ready', () => {
        console.log("Conectado ao Discord Client com sucesso!");
        isConnected = true;
      });
      rpc.on('disconnected', () => {
        console.log("Desconectado do Discord.");
        isConnected = false;
      });
      
      console.log("Tentando conectar ao Discord (App ID: " + rpcClientId + ")...");
      rpc.login({ clientId: rpcClientId }).catch(err => {
        console.error("Falha ao conectar no Discord. Certifique-se de que o Discord esta aberto.");
      });
    }

    if (online && isConnected && rpc) {
      rpc.setActivity({
        details: rpcDetails,
        state: rpcState,
        startTimestamp: new Date(res.data.lastSeen || Date.now()),
        largeImageKey: 'outsidehub',
        largeImageText: 'OUTSIDEHUB',
        smallImageKey: 'online',
        smallImageText: username,
        instance: false,
      }).catch(err => {});
      console.log("[" + new Date().toLocaleTimeString() + "] RPC Atualizado: " + rpcDetails + " - " + rpcState);
    } else if (!online && isConnected && rpc) {
      rpc.clearActivity().catch(() => {});
      console.log("[" + new Date().toLocaleTimeString() + "] Silenciando RPC (Usuario offline no site).");
    }
  } catch (err) {
    console.error("[" + new Date().toLocaleTimeString() + "] Erro ao buscar status do servidor: " + (err.response?.data?.error || err.message));
  }
}

updatePresence();
setInterval(updatePresence, 15000);
`;

    res.setHeader("Content-Disposition", "attachment; filename=outsidehub-rpc.cjs");
    res.setHeader("Content-Type", "application/javascript");
    res.send(jsContent);
  } catch (err) {
    console.error("/api/auth/rpc/download", err);
    res.status(500).send("Erro ao gerar arquivos.");
  }
});

export default router;
