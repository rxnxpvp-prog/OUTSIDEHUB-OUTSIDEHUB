import { Router } from "express";
import { getDB, saveDB } from "../db.js";
import { requireAdmin } from "../auth.js";
import { nanoid } from "nanoid";

const router = Router();

router.get("/maintenance/public", (_req, res) => {
  const db = getDB();
  res.json(db.maintenance);
});

router.get("/settings", requireAdmin, (_req, res) => {
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

router.get("/notifications", requireAdmin, (_req, res) => {
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

router.get("/stats", requireAdmin, (_req, res) => {
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

// DELETE /api/admin/chat — reset messages (optionally by channel)
router.delete("/chat", requireAdmin, (req, res) => {
  const { channel } = req.query as { channel?: string };
  const db = getDB();
  if (channel) {
    const before = db.messages.length;
    db.messages = db.messages.filter((m) => m.channel !== channel);
    saveDB(db);
    res.json({ ok: true, deleted: before - db.messages.length });
  } else {
    const total = db.messages.length;
    db.messages = [];
    saveDB(db);
    res.json({ ok: true, deleted: total });
  }
});

export default router;
