import { Router } from "express";
import { getDB, saveDB } from "../db.js";
import { requireAuth, type AuthRequest } from "../auth.js";
import { nanoid } from "nanoid";

const router = Router();

// GET /api/leads
router.get("/", requireAuth, (req, res) => {
  const db = getDB();
  res.json(db.leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

// POST /api/leads
router.post("/", requireAuth, (req, res) => {
  const { email, name, niche } = req.body;

  if (!email) {
    res.status(400).json({ error: "Email é obrigatório" });
    return;
  }

  const db = getDB();
  const exists = db.leads.find((l) => l.email === email);
  if (exists) {
    res.status(409).json({ error: "Lead com este email já existe" });
    return;
  }

  const lead = {
    id: nanoid(),
    email,
    name: name || "Sem nome",
    niche: niche || "Geral",
    status: "novo" as const,
    createdAt: new Date().toISOString(),
  };

  db.leads.unshift(lead);
  saveDB(db);
  res.status(201).json(lead);
});

// POST /api/leads/bulk — import multiple leads
router.post("/bulk", requireAuth, (req, res) => {
  const { leads } = req.body;

  if (!Array.isArray(leads) || leads.length === 0) {
    res.status(400).json({ error: "Lista de leads é obrigatória" });
    return;
  }

  const db = getDB();
  const added: typeof db.leads = [];
  const skipped: string[] = [];

  for (const l of leads) {
    if (!l.email) continue;
    const exists = db.leads.find((existing) => existing.email === l.email);
    if (exists) {
      skipped.push(l.email);
      continue;
    }
    const lead = {
      id: nanoid(),
      email: l.email,
      name: l.name || "Sem nome",
      niche: l.niche || "Geral",
      status: "novo" as const,
      createdAt: new Date().toISOString(),
    };
    db.leads.unshift(lead);
    added.push(lead);
  }

  saveDB(db);
  res.json({ added: added.length, skipped: skipped.length, leads: added });
});

// PUT /api/leads/:id
router.put("/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const { status, name, niche } = req.body;

  const db = getDB();
  const idx = db.leads.findIndex((l) => l.id === id);

  if (idx === -1) {
    res.status(404).json({ error: "Lead não encontrado" });
    return;
  }

  if (status) db.leads[idx].status = status;
  if (name) db.leads[idx].name = name;
  if (niche) db.leads[idx].niche = niche;

  saveDB(db);
  res.json(db.leads[idx]);
});

// DELETE /api/leads/:id
router.delete("/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const db = getDB();
  const idx = db.leads.findIndex((l) => l.id === id);

  if (idx === -1) {
    res.status(404).json({ error: "Lead não encontrado" });
    return;
  }

  db.leads.splice(idx, 1);
  saveDB(db);
  res.json({ success: true });
});

export default router;
