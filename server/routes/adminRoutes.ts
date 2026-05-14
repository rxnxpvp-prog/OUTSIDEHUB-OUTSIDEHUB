import { Router } from "express";
import { getDB, saveDB } from "../db.js";
import { requireAdmin } from "../auth.js";
import { nanoid } from "nanoid";

const router = Router();

router.get("/maintenance/public", (_req, res) => {
  const db = getDB();
  res.json(db.maintenance);
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
  });
});

router.put("/logo", requireAdmin, (req, res) => {
  const db = getDB();
  db.logoUrl = req.body.logoUrl || "";
  saveDB(db);
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
  res.json(db.maintenance[idx]);
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
  res.status(201).json(notif);
});

router.delete("/notifications/:id", requireAdmin, (req, res) => {
  const db = getDB();
  db.notifications = db.notifications.filter((n) => n.id !== req.params.id);
  saveDB(db);
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
  res.status(201).json(newInvite);
});

router.delete("/invites/:id", requireAdmin, (req, res) => {
  const db = getDB();
  db.invites = db.invites.filter((i) => i.id !== req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

export default router;
