import { Router } from "express";
import { getDB, saveDB } from "../db.js";
import { requireAdmin } from "../auth.js";
import { nanoid } from "nanoid";
import { emitRealtime } from "../events.js";

const router = Router();

function requireCrema(req: any, res: any, next: any) {
  requireAdmin(req, res, () => {
    const db = getDB();
    const user = db.users.find((item) => item.id === req.user?.userId);
    if (user?.username !== "crema") {
      res.status(403).json({ error: "Apenas crema pode alterar Discord" });
      return;
    }
    next();
  });
}

function normalizeChannelName(name: string) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 32);
}

router.get("/maintenance/public", (_req, res) => {
  const db = getDB();
  res.json(db.maintenance);
});

router.get("/desktop/public", (_req, res) => {
  const db = getDB();
  const cfg = db.desktopConfig || {
    version: "1.0.4",
    downloadUrl: "https://github.com/rxnxpvp-prog/OUTSIDEHUB-OUTSIDEHUB/releases/download/v1/OutsideHub.exe",
    loginUrl: "https://www.outsidehub.com.br/login",
    notes: "OutsideHub desktop update",
  };
  res.json({
    version: cfg.version || "1.0.4",
    downloadUrl: cfg.downloadUrl || "",
    loginUrl: cfg.loginUrl || "https://www.outsidehub.com.br/login",
    notes: cfg.notes || "",
  });
});

router.get("/settings", requireAdmin, (req, res) => {
  const db = getDB();
  res.json({
    logoUrl: db.logoUrl,
    maintenance: db.maintenance,
    smtpConfig: {
      host: db.smtpConfig.host,
      port: db.smtpConfig.port,
      email: db.smtpConfig.email,
      fromName: db.smtpConfig.fromName,
    },
    discordConfig: {
      clientId: db.discordConfig?.clientId || "",
      clientSecretSet: Boolean(db.discordConfig?.clientSecret),
      redirectUri: db.discordConfig?.redirectUri || "https://www.outsidehub.com.br/api/auth/discord/callback",
      clientUrl: db.discordConfig?.clientUrl || "https://www.outsidehub.com.br",
      rpcDetails: db.discordConfig?.rpcDetails || "OutsideHub",
      rpcState: db.discordConfig?.rpcState || "Online",
    },
    hostingerAliasConfig: {
      domain: db.hostingerAliasConfig?.domain || "",
      inboxEmail: db.hostingerAliasConfig?.inboxEmail || "",
      inboxPasswordSet: Boolean(db.hostingerAliasConfig?.inboxPassword),
      imapHost: db.hostingerAliasConfig?.imapHost || "imap.hostinger.com",
      imapPort: db.hostingerAliasConfig?.imapPort || "993",
    },
    desktopConfig: {
      version: db.desktopConfig?.version || "1.0.4",
      downloadUrl: db.desktopConfig?.downloadUrl || "https://github.com/rxnxpvp-prog/OUTSIDEHUB-OUTSIDEHUB/releases/download/v1/OutsideHub.exe",
      loginUrl: db.desktopConfig?.loginUrl || "https://www.outsidehub.com.br/login",
      notes: db.desktopConfig?.notes || "",
    },
  });
});

router.put("/logo", requireAdmin, (req, res) => {
  const db = getDB();
  db.logoUrl = req.body.logoUrl || "";
  saveDB(db);
  emitRealtime({ type: "maintenance:changed" });
  res.json({ logoUrl: db.logoUrl });
});

router.put("/maintenance/:id", requireAdmin, (req, res) => {
  const db = getDB();
  const idx = db.maintenance.findIndex((m) => m.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Item não encontrado" });
    return;
  }
  db.maintenance[idx].status = db.maintenance[idx].status === "online" ? "maintenance" : "online";
  saveDB(db);
  emitRealtime({ type: "maintenance:changed" });
  res.json(db.maintenance[idx]);
});

router.get("/chat/channels", requireAdmin, (_req, res) => {
  const db = getDB();
  const channels = db.chatChannels.map((channel) => ({
    ...channel,
    messageCount: db.messages.filter((message) => message.channel === channel.name).length,
  }));
  res.json(channels);
});

router.post("/chat/channels", requireAdmin, (req, res) => {
  const name = normalizeChannelName(req.body.name);
  if (!name) {
    res.status(400).json({ error: "Nome obrigatorio" });
    return;
  }
  const db = getDB();
  if (db.chatChannels.some((channel) => channel.name === name)) {
    res.status(409).json({ error: "Canal ja existe" });
    return;
  }
  const channel = {
    id: nanoid(),
    name,
    description: String(req.body.description || "").trim() || undefined,
    locked: Boolean(req.body.locked),
    createdAt: new Date().toISOString(),
  };
  db.chatChannels.push(channel);
  saveDB(db);
  emitRealtime({ type: "channels:changed" });
  res.status(201).json({ ...channel, messageCount: 0 });
});

router.put("/chat/channels/:id", requireAdmin, (req, res) => {
  const db = getDB();
  const idx = db.chatChannels.findIndex((channel) => channel.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Canal nao encontrado" });
    return;
  }
  const previousName = db.chatChannels[idx].name;
  const nextName = normalizeChannelName(req.body.name || previousName);
  if (!nextName) {
    res.status(400).json({ error: "Nome obrigatorio" });
    return;
  }
  if (db.chatChannels.some((channel) => channel.id !== req.params.id && channel.name === nextName)) {
    res.status(409).json({ error: "Canal ja existe" });
    return;
  }
  db.chatChannels[idx] = {
    ...db.chatChannels[idx],
    name: nextName,
    description: String(req.body.description || "").trim() || undefined,
    locked: Boolean(req.body.locked),
  };
  if (previousName !== nextName) {
    db.messages = db.messages.map((message) => message.channel === previousName ? { ...message, channel: nextName } : message);
  }
  saveDB(db);
  emitRealtime({ type: "channels:changed" });
  res.json({
    ...db.chatChannels[idx],
    messageCount: db.messages.filter((message) => message.channel === nextName).length,
  });
});

router.delete("/chat/channels/:id", requireAdmin, (req, res) => {
  const db = getDB();
  const channel = db.chatChannels.find((item) => item.id === req.params.id);
  if (!channel) {
    res.status(404).json({ error: "Canal nao encontrado" });
    return;
  }
  if (db.chatChannels.length <= 1) {
    res.status(400).json({ error: "Mantenha pelo menos um canal" });
    return;
  }
  db.chatChannels = db.chatChannels.filter((item) => item.id !== req.params.id);
  db.messages = db.messages.filter((message) => message.channel !== channel.name);
  saveDB(db);
  emitRealtime({ type: "channels:changed" });
  emitRealtime({ type: "chat:changed", channel: channel.name });
  res.json({ ok: true });
});

router.delete("/chat/channels/:id/messages", requireAdmin, (req, res) => {
  const db = getDB();
  const channel = db.chatChannels.find((item) => item.id === req.params.id);
  if (!channel) {
    res.status(404).json({ error: "Canal nao encontrado" });
    return;
  }
  db.messages = db.messages.filter((message) => message.channel !== channel.name);
  saveDB(db);
  emitRealtime({ type: "chat:changed", channel: channel.name });
  res.json({ ok: true });
});

router.get("/notifications", requireAdmin, (req, res) => {
  res.json(getDB().notifications);
});

router.post("/notifications", requireAdmin, (req, res) => {
  const { title, message } = req.body;
  if (!title || !message) {
    res.status(400).json({ error: "Título e mensagem obrigatórios" });
    return;
  }
  const db = getDB();
  const notif = { id: nanoid(), title, message, createdAt: new Date().toISOString() };
  db.notifications.unshift(notif);
  if (db.notifications.length > 50) db.notifications = db.notifications.slice(0, 50);
  saveDB(db);
  emitRealtime({ type: "notifications:changed" });
  res.status(201).json(notif);
});

router.delete("/notifications/:id", requireAdmin, (req, res) => {
  const db = getDB();
  db.notifications = db.notifications.filter((n) => n.id !== req.params.id);
  saveDB(db);
  emitRealtime({ type: "notifications:changed" });
  res.json({ ok: true });
});

router.put("/smtp", requireAdmin, (req, res) => {
  const { host, port, email, password, fromName } = req.body;
  const db = getDB();
  if (host !== undefined) db.smtpConfig.host = host;
  if (port !== undefined) db.smtpConfig.port = port;
  if (email !== undefined) db.smtpConfig.email = email;
  if (password !== undefined) db.smtpConfig.password = password;
  if (fromName !== undefined) db.smtpConfig.fromName = fromName;
  saveDB(db);
  res.json({ ok: true });
});

router.put("/discord", requireCrema, (req, res) => {
  const { clientId, clientSecret, redirectUri, clientUrl, rpcDetails, rpcState } = req.body;
  const db = getDB();
  db.discordConfig = db.discordConfig || {
    clientId: "",
    clientSecret: "",
    redirectUri: "",
    clientUrl: "",
    rpcDetails: "OutsideHub",
    rpcState: "Online",
  };
  if (clientId !== undefined) db.discordConfig.clientId = String(clientId).trim();
  if (clientSecret !== undefined && String(clientSecret).trim()) {
    db.discordConfig.clientSecret = String(clientSecret).trim();
  }
  if (redirectUri !== undefined) db.discordConfig.redirectUri = String(redirectUri).trim();
  if (clientUrl !== undefined) db.discordConfig.clientUrl = String(clientUrl).trim();
  if (rpcDetails !== undefined) db.discordConfig.rpcDetails = String(rpcDetails).trim() || "OutsideHub";
  if (rpcState !== undefined) db.discordConfig.rpcState = String(rpcState).trim() || "Online";
  saveDB(db);
  res.json({
    ok: true,
    discordConfig: {
      clientId: db.discordConfig.clientId,
      clientSecretSet: Boolean(db.discordConfig.clientSecret),
      redirectUri: db.discordConfig.redirectUri,
      clientUrl: db.discordConfig.clientUrl,
      rpcDetails: db.discordConfig.rpcDetails,
      rpcState: db.discordConfig.rpcState,
    },
  });
});

router.put("/hostinger-alias", requireCrema, (req, res) => {
  const { domain, inboxEmail, inboxPassword, imapHost, imapPort } = req.body;
  const db = getDB();
  db.hostingerAliasConfig = db.hostingerAliasConfig || {
    domain: "",
    inboxEmail: "",
    inboxPassword: "",
    imapHost: "imap.hostinger.com",
    imapPort: "993",
  };
  if (domain !== undefined) {
    db.hostingerAliasConfig.domain = String(domain).trim().replace(/^@/, "").toLowerCase();
  }
  if (inboxEmail !== undefined) db.hostingerAliasConfig.inboxEmail = String(inboxEmail).trim().toLowerCase();
  if (inboxPassword !== undefined && String(inboxPassword).trim()) {
    db.hostingerAliasConfig.inboxPassword = String(inboxPassword);
  }
  if (imapHost !== undefined) db.hostingerAliasConfig.imapHost = String(imapHost).trim() || "imap.hostinger.com";
  if (imapPort !== undefined) db.hostingerAliasConfig.imapPort = String(imapPort).trim() || "993";
  saveDB(db);
  res.json({
    ok: true,
    hostingerAliasConfig: {
      domain: db.hostingerAliasConfig.domain,
      inboxEmail: db.hostingerAliasConfig.inboxEmail,
      inboxPasswordSet: Boolean(db.hostingerAliasConfig.inboxPassword),
      imapHost: db.hostingerAliasConfig.imapHost,
      imapPort: db.hostingerAliasConfig.imapPort,
    },
  });
});

router.put("/desktop", requireCrema, (req, res) => {
  const { version, downloadUrl, loginUrl, notes } = req.body;
  const db = getDB();
  db.desktopConfig = db.desktopConfig || {
    version: "1.0.4",
    downloadUrl: "https://github.com/rxnxpvp-prog/OUTSIDEHUB-OUTSIDEHUB/releases/download/v1/OutsideHub.exe",
    loginUrl: "https://www.outsidehub.com.br/login",
    notes: "OutsideHub desktop update",
  };

  if (version !== undefined) db.desktopConfig.version = String(version).trim() || "1.0.4";
  if (downloadUrl !== undefined) db.desktopConfig.downloadUrl = String(downloadUrl).trim();
  if (loginUrl !== undefined) db.desktopConfig.loginUrl = String(loginUrl).trim() || "https://www.outsidehub.com.br/login";
  if (notes !== undefined) db.desktopConfig.notes = String(notes).trim();

  saveDB(db);
  res.json({ ok: true, desktopConfig: db.desktopConfig });
});

router.get("/stats", requireAdmin, (req, res) => {
  const db = getDB();
  res.json({
    totalUsers: db.users.length,
    totalPosts: db.posts.length,
    totalLeads: db.leads.length,
    totalMessages: db.messages.length,
    leadsNovo: db.leads.filter((l) => l.status === "novo").length,
    leadsContatado: db.leads.filter((l) => l.status === "contatado").length,
    leadsConvertido: db.leads.filter((l) => l.status === "convertido").length,
  });
});

router.get("/invites", requireAdmin, (req, res) => {
  res.json(getDB().invites);
});

router.post("/invites", requireAdmin, (req, res) => {
  const { code, role, permissions, expiresInDays } = req.body;
  if (!code || !role) {
    res.status(400).json({ error: "Código e cargo são obrigatórios" });
    return;
  }
  const db = getDB();
  if (db.invites.find(i => i.code === code)) {
    res.status(409).json({ error: "Código já existe" });
    return;
  }
  
  const days = parseInt(expiresInDays);
  const expiresAt = days === 0 
    ? "9999-12-31T23:59:59.999Z" 
    : new Date(Date.now() + (days || 30) * 24 * 60 * 60 * 1000).toISOString();
  
  const newInvite = {
    id: nanoid(),
    code,
    role,
    permissions: permissions || {},
    used: false,
    expiresAt,
    createdAt: new Date().toISOString()
  };
  
  db.invites.unshift(newInvite as any);
  saveDB(db);
  emitRealtime({ type: "users:changed" });
  res.status(201).json(newInvite);
});

router.delete("/invites/:id", requireAdmin, (req, res) => {
  const db = getDB();
  db.invites = db.invites.filter((i) => i.id !== req.params.id);
  saveDB(db);
  emitRealtime({ type: "users:changed" });
  res.json({ ok: true });
});

export default router;
