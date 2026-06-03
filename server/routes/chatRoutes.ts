import { Router } from "express";
import { getDB, saveDB } from "../db.js";
import { requireAuth, type AuthRequest } from "../auth.js";
import { nanoid } from "nanoid";
import { emitRealtime } from "../events.js";

const router = Router();
const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

function normalizeChannelName(name: string) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 32);
}

function normalizeAttachments(input: any[]) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, MAX_ATTACHMENTS).map((item) => ({
    id: nanoid(),
    name: String(item.name || "arquivo").slice(0, 120),
    type: String(item.type || "application/octet-stream").slice(0, 80),
    size: Number(item.size || 0),
    url: String(item.url || ""),
  })).filter((item) =>
    item.url.startsWith("data:") &&
    item.size > 0 &&
    item.size <= MAX_ATTACHMENT_BYTES
  );
}

function hydrateMessage(message: any, db: ReturnType<typeof getDB>) {
  const user = db.users.find((u) => u.id === message.userId);
  const reply = message.replyTo ? db.messages.find((m) => m.id === message.replyTo) : null;
  const replyUser = reply ? db.users.find((u) => u.id === reply.userId) : null;

  return {
    ...message,
    attachments: message.attachments || [],
    userName: user?.name || message.userName,
    userAvatar: user?.avatar || message.userAvatar,
    userRole: user?.role || "user",
    userBadges: user?.badges || [],
    replyToMessage: reply ? {
      id: reply.id,
      content: reply.content,
      userName: replyUser?.name || reply.userName,
      attachments: reply.attachments || [],
    } : undefined,
  };
}

router.get("/messages", requireAuth, (req, res) => {
  const channel = (req.query.channel as string) || "general";
  const db = getDB();
  const messages = db.messages
    .filter((m) => m.channel === channel)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-100)
    .map((message) => hydrateMessage(message, db));
  res.json(messages);
});

router.get("/channels", requireAuth, (_req, res) => {
  const db = getDB();
  res.json(db.chatChannels);
});

router.post("/messages", requireAuth, (req: AuthRequest, res) => {
  const { content, channel, replyTo } = req.body;
  const attachments = normalizeAttachments(req.body.attachments);

  if (!content?.trim() && attachments.length === 0) {
    res.status(400).json({ error: "Conteudo ou arquivo obrigatorio" });
    return;
  }
  if (Array.isArray(req.body.attachments) && req.body.attachments.length > 0 && attachments.length === 0) {
    res.status(400).json({ error: "Arquivo invalido ou acima de 8MB" });
    return;
  }

  const db = getDB();
  const user = db.users.find((u) => u.id === req.user!.userId);
  if (!user) {
    res.status(404).json({ error: "Usuario nao encontrado" });
    return;
  }

  const targetChannel = normalizeChannelName(channel || "general") || "general";
  if (!db.chatChannels.some((ch) => ch.name === targetChannel)) {
    res.status(404).json({ error: "Canal nao encontrado" });
    return;
  }
  if (db.chatChannels.find((ch) => ch.name === targetChannel)?.locked && user.role !== "admin") {
    res.status(403).json({ error: "Canal bloqueado para envio" });
    return;
  }

  const message = {
    id: nanoid(),
    content: content?.trim() || "",
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar,
    channel: targetChannel,
    replyTo: replyTo || undefined,
    attachments,
    reactions: {} as Record<string, number>,
    createdAt: new Date().toISOString(),
  };

  db.messages.push(message);

  const channelMessages = db.messages.filter((m) => m.channel === message.channel);
  if (channelMessages.length > 500) {
    const excess = channelMessages.length - 500;
    const toRemoveIds = new Set(channelMessages.slice(0, excess).map((m) => m.id));
    db.messages = db.messages.filter((m) => !toRemoveIds.has(m.id));
  }

  saveDB(db);
  emitRealtime({ type: "chat:changed", channel: message.channel });
  emitRealtime({
    type: "chat:message",
    messageId: message.id,
    channel: message.channel,
    actorId: user.id,
    actorName: user.name,
    preview: message.content || (attachments.length ? `${attachments.length} arquivo(s)` : "Nova mensagem"),
  });
  emitRealtime({
    type: "admin:log",
    logId: nanoid(),
    level: "info",
    action: "CHAT_MESSAGE",
    description: `${user.name} enviou mensagem em #${message.channel}`,
    actorName: user.name,
  });
  res.status(201).json(hydrateMessage(message, db));
});

router.delete("/messages/:id", requireAuth, (req: AuthRequest, res) => {
  const { id } = req.params;
  const db = getDB();
  const idx = db.messages.findIndex((m) => m.id === id);

  if (idx === -1) {
    res.status(404).json({ error: "Mensagem nao encontrada" });
    return;
  }

  const msg = db.messages[idx];
  if (msg.userId !== req.user!.userId && req.user!.role !== "admin") {
    res.status(403).json({ error: "Sem permissao" });
    return;
  }

  db.messages.splice(idx, 1);
  saveDB(db);
  emitRealtime({ type: "chat:changed", channel: msg.channel });
  res.json({ ok: true });
});

router.post("/messages/:id/react", requireAuth, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { emoji } = req.body;

  if (!emoji) {
    res.status(400).json({ error: "Emoji obrigatorio" });
    return;
  }

  const db = getDB();
  const idx = db.messages.findIndex((m) => m.id === id);

  if (idx === -1) {
    res.status(404).json({ error: "Mensagem nao encontrada" });
    return;
  }

  const userId = req.user!.userId;
  const reactionsKey = `${emoji}:users`;
  const reactors: string[] = (db.messages[idx] as any)[reactionsKey] || [];

  if (reactors.includes(userId)) {
    (db.messages[idx] as any)[reactionsKey] = reactors.filter((u) => u !== userId);
    const count = (db.messages[idx] as any)[reactionsKey].length;
    if (count === 0) {
      delete db.messages[idx].reactions[emoji];
      delete (db.messages[idx] as any)[reactionsKey];
    } else {
      db.messages[idx].reactions[emoji] = count;
    }
  } else {
    reactors.push(userId);
    (db.messages[idx] as any)[reactionsKey] = reactors;
    db.messages[idx].reactions[emoji] = reactors.length;
  }

  saveDB(db);
  emitRealtime({ type: "chat:changed", channel: db.messages[idx].channel });
  res.json(hydrateMessage(db.messages[idx], db));
});

export default router;
