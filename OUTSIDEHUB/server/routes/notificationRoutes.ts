import { Router } from "express";
import { getDB } from "../db.js";
import { requireAuth } from "../auth.js";

const router = Router();

// GET /api/notifications — for regular users
router.get("/", requireAuth, (req, res) => {
  const db = getDB();
  res.json(db.notifications.slice(0, 20));
});

export default router;
