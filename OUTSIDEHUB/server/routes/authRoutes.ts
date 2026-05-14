import { Router } from "express";
import axios from "axios";
import * as speakeasy from "speakeasy";
import { getDB, saveDB } from "../db.js";
import {
  signToken,
  comparePassword,
  hashPassword,
  requireAuth,
  type AuthRequest,
  verifyToken,
} from "../auth.js";

const router = Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || "";
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || "";
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || "http://localhost:3001/api/auth/discord/callback";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

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
  return safe;
}

async function refreshDiscordToken(user: any) {
  if (!user.discordRefreshToken) {
    return false;
  }

  const body = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
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
  const state = Buffer.from(token, "utf8").toString("base64url");
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
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
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
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
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: DISCORD_REDIRECT_URI,
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

    res.redirect(`${CLIENT_URL}/discord?connected=1`);
  } catch (err) {
    console.error("/api/auth/discord/callback", err);
    res.status(500).send("Erro ao conectar Discord");
  }
});

// GET /api/auth/discord/status
router.get("/discord/status", requireAuth, (req: AuthRequest, res) => {
  try {
    const db = getDB();
    const user = db.users.find((u) => u.id === req.user!.userId);
    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    res.json({
      connected: Boolean(user.discordId),
      discordId: user.discordId,
      discordUsername: user.discordUsername,
      discordDiscriminator: user.discordDiscriminator,
      discordAvatar: user.discordAvatar,
    });
  } catch (err) {
    console.error("/api/auth/discord/status", err);
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
    res.json({ ok: true });
  } catch (err) {
    console.error("/api/auth/2fa/disable", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// PUT /api/auth/profile
router.put("/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, bio, avatar } = req.body ?? {};
    const db = getDB();
    const idx = db.users.findIndex((u) => u.id === req.user!.userId);
    if (idx === -1) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    if (name !== undefined) db.users[idx].name = String(name).trim() || db.users[idx].name;
    if (bio !== undefined) db.users[idx].bio = String(bio);
    if (avatar !== undefined) db.users[idx].avatar = String(avatar);
    saveDB(db);
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
    res.json({ ok: true });
  } catch (err) {
    console.error("/api/auth/password", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
