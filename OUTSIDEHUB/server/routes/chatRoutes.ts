import { Router } from "express";
import { getDB, saveDB } from "../db.js";
import { requireAuth, type AuthRequest } from "../auth.js";
import { nanoid } from "nanoid";

const router = Router();

router.get("/messages", requireAuth, (req, res) => {
  const channel = (req.query.channel as string) || "general";
  const db = getDB();
  const messages = db.messages
    .filter((m) => m.channel === channel)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-100);
  res.json(messages);
});

router.post("/messages", requireAuth, (req: AuthRequest, res) => {
  const { content, channel, replyTo } = req.body;

  if (!content?.trim()) {
    res.status(400).json({ error: "Conteúdo é obrigatório" });
    return;
  }

  const db = getDB();
  const user = db.users.find((u) => u.id === req.user!.userId);
  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  const message = {
    id: nanoid(),
    content: content.trim(),
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar,
    channel: channel || "general",
    replyTo: replyTo || undefined,
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
  res.status(201).json(message);
});

router.delete("/messages/:id", requireAuth, (req: AuthRequest, res) => {
  const { id } = req.params;
  const db = getDB();
  const idx = db.messages.findIndex((m) => m.id === id);

  if (idx === -1) {
    res.status(404).json({ error: "Mensagem não encontrada" });
    return;
  }

  const msg = db.messages[idx];
  if (msg.userId !== req.user!.userId && req.user!.role !== "admin") {
    res.status(403).json({ error: "Sem permissão" });
    return;
  }

  db.messages.splice(idx, 1);
  saveDB(db);
  res.json({ ok: true });
});

router.post("/messages/:id/react", requireAuth, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { emoji } = req.body;

  if (!emoji) {
    res.status(400).json({ error: "Emoji é obrigatório" });
    return;
  }

  const db = getDB();
  const idx = db.messages.findIndex((m) => m.id === id);

  if (idx === -1) {
    res.status(404).json({ error: "Mensagem não encontrada" });
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
  res.json(db.messages[idx]);
});

export default router;
