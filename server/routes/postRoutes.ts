import { Router } from "express";
import { getDB, saveDB } from "../db.js";
import { requireAuth, type AuthRequest } from "../auth.js";
import { nanoid } from "nanoid";
import { emitRealtime } from "../events.js";

const router = Router();

function hydratePost(post: any, db: ReturnType<typeof getDB>) {
  const user = db.users.find((u) => u.id === post.userId);
  return {
    ...post,
    userName: user?.name || post.userName,
    userAvatar: user?.avatar || post.userAvatar,
    userRole: user?.role || "user",
    userBadges: user?.badges || [],
    comments: (post.comments || []).map((comment: any) => {
      const commentUser = db.users.find((u) => u.id === comment.userId);
      return {
        ...comment,
        userName: commentUser?.name || comment.userName,
        userAvatar: commentUser?.avatar || comment.userAvatar,
        userRole: commentUser?.role || "user",
        userBadges: commentUser?.badges || [],
      };
    }),
  };
}

// GET /api/posts
router.get("/", requireAuth, (req, res) => {
  const db = getDB();
  res.json(
    db.posts
      .map((post) => hydratePost(post, db))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  );
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
  emitRealtime({ type: "posts:changed" });
  emitRealtime({
    type: "feed:post",
    postId: post.id,
    actorId: user.id,
    actorName: user.name,
    preview: content.trim().slice(0, 140),
  });
  emitRealtime({
    type: "admin:log",
    logId: nanoid(),
    level: "info",
    action: "FEED_POST",
    description: `${user.name} publicou no feed`,
    actorName: user.name,
  });
  res.status(201).json(hydratePost(post, db));
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
  emitRealtime({ type: "posts:changed" });
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
  emitRealtime({ type: "posts:changed" });
  res.json(hydratePost(db.posts[idx], db));
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
  emitRealtime({ type: "posts:changed" });
  res.status(201).json(hydratePost(db.posts[idx], db).comments.find((item: any) => item.id === comment.id) || comment);
});

export default router;
