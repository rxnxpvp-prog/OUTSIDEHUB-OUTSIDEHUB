import { Router } from "express";
import { getDB, saveDB } from "../db.js";
import { requireAuth, type AuthRequest } from "../auth.js";
import { nanoid } from "nanoid";

const router = Router();

// GET /api/posts
router.get("/", requireAuth, (req, res) => {
  const db = getDB();
  res.json(db.posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

// POST /api/posts
router.post("/", requireAuth, (req: AuthRequest, res) => {
  const { content, image } = req.body;

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

  const post = {
    id: nanoid(),
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar,
    content,
    image: image || undefined,
    likes: [] as string[],
    comments: [],
    createdAt: new Date().toISOString(),
  };

  db.posts.unshift(post);
  saveDB(db);
  res.status(201).json(post);
});

// DELETE /api/posts/:id
router.delete("/:id", requireAuth, (req: AuthRequest, res) => {
  const { id } = req.params;
  const db = getDB();
  const idx = db.posts.findIndex((p) => p.id === id);

  if (idx === -1) {
    res.status(404).json({ error: "Post não encontrado" });
    return;
  }

  const post = db.posts[idx];
  if (post.userId !== req.user!.userId && req.user!.role !== "admin") {
    res.status(403).json({ error: "Sem permissão" });
    return;
  }

  db.posts.splice(idx, 1);
  saveDB(db);
  res.json({ success: true });
});

// POST /api/posts/:id/like
router.post("/:id/like", requireAuth, (req: AuthRequest, res) => {
  const { id } = req.params;
  const db = getDB();
  const idx = db.posts.findIndex((p) => p.id === id);

  if (idx === -1) {
    res.status(404).json({ error: "Post não encontrado" });
    return;
  }

  const userId = req.user!.userId;
  const likeIdx = db.posts[idx].likes.indexOf(userId);

  if (likeIdx === -1) {
    db.posts[idx].likes.push(userId);
  } else {
    db.posts[idx].likes.splice(likeIdx, 1);
  }

  saveDB(db);
  res.json(db.posts[idx]);
});

// POST /api/posts/:id/comments
router.post("/:id/comments", requireAuth, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content?.trim()) {
    res.status(400).json({ error: "Conteúdo é obrigatório" });
    return;
  }

  const db = getDB();
  const idx = db.posts.findIndex((p) => p.id === id);

  if (idx === -1) {
    res.status(404).json({ error: "Post não encontrado" });
    return;
  }

  const user = db.users.find((u) => u.id === req.user!.userId);
  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  const comment = {
    id: nanoid(),
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar,
    content,
    createdAt: new Date().toISOString(),
  };

  db.posts[idx].comments.push(comment);
  saveDB(db);
  res.status(201).json(comment);
});

export default router;
