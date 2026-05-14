import { Router } from "express";
import { requireAdmin, requireAuth } from "../auth.js";
import https from "https";
import http from "http";
import { URL } from "url";
import { getDB, saveDB } from "../db.js";
import { nanoid } from "nanoid";

const router = Router();

function fetchUrl(urlStr: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(urlStr);
      const mod = parsed.protocol === "https:" ? https : http;
      const req = mod.get(
        urlStr,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; OniScraper/1.0)",
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
          },
          timeout: 10000,
        },
        (res) => {
          // follow redirects
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            fetchUrl(res.headers.location).then(resolve).catch(reject);
            return;
          }
          let data = "";
          res.setEncoding("utf-8");
          res.on("data", (chunk) => { data += chunk; });
          res.on("end", () => resolve(data));
        }
      );
      req.on("error", reject);
      req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    } catch (e) {
      reject(e);
    }
  });
}

function extractMeta(html: string, name: string): string {
  const m =
    html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)`, "i")) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i")) ||
    html.match(new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)`, "i"));
  return m ? m[1].trim() : "";
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : extractMeta(html, "title");
}

function extractEmails(html: string): string[] {
  const raw = html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [];
  return [...new Set(raw)].filter(
    (e) => !e.endsWith(".png") && !e.endsWith(".jpg") && !e.endsWith(".svg")
  ).slice(0, 20);
}

function extractPhones(html: string): string[] {
  const raw = html.match(/(\+?\d[\d\s().\-]{7,}\d)/g) || [];
  return [...new Set(raw.map((p) => p.trim()))].filter((p) => p.replace(/\D/g, "").length >= 8).slice(0, 10);
}

function extractLinks(html: string, base: string): string[] {
  const matches = html.match(/href=["']([^"'#]+)["']/gi) || [];
  const urls = matches.map((m) => {
    const href = m.replace(/href=["']/i, "").replace(/["']$/, "");
    try {
      return new URL(href, base).href;
    } catch {
      return null;
    }
  }).filter(Boolean) as string[];
  return [...new Set(urls)].slice(0, 50);
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

router.post("/", requireAdmin, async (req, res) => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: "URL obrigatória" });
    return;
  }

  try {
    const html = await fetchUrl(url);
    const title = extractTitle(html);
    const description = extractMeta(html, "description") || extractMeta(html, "og:description");
    const emails = extractEmails(html);
    const phones = extractPhones(html);
    const links = extractLinks(html, url);
    const text = stripHtml(html).slice(0, 5000);

    res.json({ title, description, emails, phones, links, text });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro ao acessar URL" });
  }
});

// ─── helpers for JSON API calls ──────────────────────────────────────────────

function apiGet(urlStr: string, headers: Record<string, string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(urlStr);
      const mod = parsed.protocol === "https:" ? https : http;
      const req = mod.get(urlStr, { headers: { "User-Agent": "OniScraper/1.0", ...headers }, timeout: 15000 }, (res) => {
        let data = "";
        res.setEncoding("utf-8");
        res.on("data", (c) => { data += c; });
        res.on("end", () => {
          try { resolve(JSON.parse(data)); } catch { reject(new Error("JSON parse error")); }
        });
      });
      req.on("error", reject);
      req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    } catch (e) { reject(e); }
  });
}

function apiPost(urlStr: string, body: Record<string, string>, headers: Record<string, string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(urlStr);
      const payload = new URLSearchParams(body).toString();
      const options = {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(payload), "User-Agent": "OniScraper/1.0", ...headers },
        timeout: 15000,
      };
      const mod = parsed.protocol === "https:" ? https : http;
      const req = mod.request(options, (res) => {
        let data = "";
        res.setEncoding("utf-8");
        res.on("data", (c) => { data += c; });
        res.on("end", () => {
          try { resolve(JSON.parse(data)); } catch { reject(new Error("JSON parse error")); }
        });
      });
      req.on("error", reject);
      req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
      req.write(payload);
      req.end();
    } catch (e) { reject(e); }
  });
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function extractEmailFromText(text: string): string {
  const m = (text || "").match(/[\w.\-]+@[\w.\-]+\.\w{2,}/);
  return m ? m[0] : "";
}

// ─── Twitch scraping ─────────────────────────────────────────────────────────

async function twitchGetToken(clientId: string, clientSecret: string): Promise<string> {
  const data = await apiPost("https://id.twitch.tv/oauth2/token", { client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" });
  if (!data.access_token) throw new Error("Twitch: token inválido — verifique Client ID e Secret");
  return data.access_token;
}

async function twitchGetCategoryId(headers: Record<string, string>, name: string): Promise<string | null> {
  const data = await apiGet(`https://api.twitch.tv/helix/games?name=${encodeURIComponent(name)}`, headers);
  return data?.data?.[0]?.id ?? null;
}

async function twitchGetStreamers(headers: Record<string, string>, gameId: string, max: number): Promise<any[]> {
  const streamers: any[] = [];
  let cursor: string | null = null;
  while (streamers.length < max) {
    const limit = Math.min(100, max - streamers.length);
    let url = `https://api.twitch.tv/helix/streams?game_id=${gameId}&first=${limit}`;
    if (cursor) url += `&after=${cursor}`;
    const data = await apiGet(url, headers);
    if (!data?.data?.length) break;
    streamers.push(...data.data);
    cursor = data.pagination?.cursor ?? null;
    if (!cursor) break;
    await sleep(300);
  }
  return streamers;
}

async function twitchGetUserInfo(headers: Record<string, string>, ids: string[]): Promise<Record<string, any>> {
  const users: Record<string, any> = {};
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const qs = batch.map((id) => `id=${id}`).join("&");
    const data = await apiGet(`https://api.twitch.tv/helix/users?${qs}`, headers);
    for (const u of data?.data ?? []) users[u.id] = u;
    await sleep(300);
  }
  return users;
}

// ─── Kick scraping ───────────────────────────────────────────────────────────

async function kickGetToken(clientId: string, clientSecret: string): Promise<string> {
  const data = await apiPost("https://id.kick.com/oauth/token", { grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret });
  if (!data.access_token) throw new Error("Kick: token inválido — verifique Client ID e Secret");
  return data.access_token;
}

async function kickGetStreamers(token: string, max: number): Promise<any[]> {
  const streamers: any[] = [];
  let page = 1;
  const headers = { Authorization: `Bearer ${token}` };
  while (streamers.length < max) {
    try {
      const data = await apiGet(`https://api.kick.com/public/v1/livestreams?language=pt&page=${page}`, headers);
      const batch = data?.data ?? [];
      if (!batch.length) break;
      streamers.push(...batch);
      if (batch.length < 25) break;
      page++;
      await sleep(1200);
    } catch { break; }
  }
  return streamers;
}

async function kickGetDescriptions(token: string, slugs: string[]): Promise<Record<string, string>> {
  const desc: Record<string, string> = {};
  const headers = { Authorization: `Bearer ${token}` };
  for (let i = 0; i < slugs.length; i += 25) {
    const batch = slugs.slice(i, i + 25);
    try {
      const qs = batch.map((s) => `slug=${s}`).join("&");
      const data = await apiGet(`https://api.kick.com/public/v1/channels?${qs}`, headers);
      for (const ch of data?.data ?? []) desc[ch.slug] = ch.channel_description || "";
      await sleep(300);
    } catch { /* skip */ }
  }
  return desc;
}

// ─── POST /api/scraper/streamers ─────────────────────────────────────────────

const TWITCH_CATEGORIES = ["Art", "Makers & Crafting", "VALORANT", "Fortnite", "Counter-Strike"];
const MAX_PER_CAT = 999;

router.post("/streamers", requireAuth, async (req, res) => {
  const { platform, twitchClientId, twitchClientSecret, kickClientId, kickClientSecret } = req.body as Record<string, string>;

  if (!platform || !["twitch", "kick", "both"].includes(platform)) {
    res.status(400).json({ error: "Plataforma inválida. Use twitch, kick ou both." });
    return;
  }

  const leads: { email: string; name: string; niche: string }[] = [];

  try {
    // ── TWITCH ──
    if (platform === "twitch" || platform === "both") {
      if (!twitchClientId?.trim() || !twitchClientSecret?.trim()) {
        res.status(400).json({ error: "Twitch: Client ID e Client Secret são obrigatórios" });
        return;
      }
      const token = await twitchGetToken(twitchClientId.trim(), twitchClientSecret.trim());
      const headers = { "Client-ID": twitchClientId.trim(), Authorization: `Bearer ${token}` };

      const raw: any[] = [];
      for (const cat of TWITCH_CATEGORIES) {
        const catId = await twitchGetCategoryId(headers, cat);
        if (!catId) continue;
        const streamers = await twitchGetStreamers(headers, catId, MAX_PER_CAT);
        for (const s of streamers) s._categoria = cat;
        raw.push(...streamers);
      }

      if (raw.length) {
        const ids = [...new Set(raw.map((s) => s.user_id))] as string[];
        const userInfo = await twitchGetUserInfo(headers, ids);
        const seen = new Set<string>();
        for (const s of raw) {
          if (seen.has(s.user_id) || s.language !== "pt") continue;
          seen.add(s.user_id);
          const info = userInfo[s.user_id] ?? {};
          leads.push({ email: extractEmailFromText(info.description || ""), name: s.user_name || s.user_login || "", niche: s._categoria || "Twitch" });
        }
      }
    }

    // ── KICK ──
    if (platform === "kick" || platform === "both") {
      if (!kickClientId?.trim() || !kickClientSecret?.trim()) {
        res.status(400).json({ error: "Kick: Client ID e Client Secret são obrigatórios" });
        return;
      }
      const token = await kickGetToken(kickClientId.trim(), kickClientSecret.trim());
      const streamers = await kickGetStreamers(token, MAX_PER_CAT);
      const slugs = streamers.map((s) => s.slug).filter(Boolean);
      const descs = await kickGetDescriptions(token, slugs);
      for (const s of streamers) {
        const slug = s.slug || "";
        leads.push({ email: extractEmailFromText(descs[slug] || ""), name: slug, niche: s.category?.name || "Kick" });
      }
    }

    // ── Save to leads DB ──
    const db = getDB();
    let added = 0;
    let skipped = 0;
    for (const l of leads) {
      if (!l.name && !l.email) continue;
      const emailKey = l.email || `streamer:${l.name}`;
      const exists = db.leads.find((ex) => (l.email && ex.email === l.email) || ex.name === l.name);
      if (exists) { skipped++; continue; }
      db.leads.unshift({ id: nanoid(), email: l.email || "", name: l.name || "Sem nome", niche: l.niche || "Streamer", status: "novo", createdAt: new Date().toISOString() });
      added++;
    }
    saveDB(db);

    res.json({ added, skipped, total: leads.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro no scraping" });
  }
});

export default router;
