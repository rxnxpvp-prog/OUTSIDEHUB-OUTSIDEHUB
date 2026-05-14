import { Router } from "express";
import { requireAdmin } from "../auth.js";
import axios from "axios";
import { getDB, saveDB } from "../db.js";
import { nanoid } from "nanoid";

const router = Router();

// Extrai email da bio
function extractEmailFromText(text: string): string {
  const match = text.match(/[\w\.-]+@[\w\.-]+\.\w+/);
  return match ? match[0] : "";
}

// ============================================================================
// TWITCH SCRAPER
// ============================================================================
async function twitchGetToken(clientId: string, clientSecret: string) {
  const res = await axios.post("https://id.twitch.tv/oauth2/token", null, {
    params: {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials"
    }
  });
  return res.data.access_token;
}

async function twitchGetCategoryId(headers: any, categoryName: string) {
  const res = await axios.get("https://api.twitch.tv/helix/games", {
    headers,
    params: { name: categoryName }
  });
  const data = res.data.data || [];
  return data.length > 0 ? data[0].id : null;
}

async function twitchGetStreamers(headers: any, categoryId: string, maxResults: number) {
  const streamers = [];
  let cursor = null;

  while (streamers.length < maxResults) {
    const params: any = { game_id: categoryId, first: Math.min(100, maxResults - streamers.length) };
    if (cursor) params.after = cursor;

    const res = await axios.get("https://api.twitch.tv/helix/streams", { headers, params });
    const data = res.data;
    
    streamers.push(...(data.data || []));
    cursor = data.pagination?.cursor;

    if (!cursor || !data.data || data.data.length === 0) break;
    await new Promise(r => setTimeout(r, 300));
  }
  return streamers;
}

async function twitchGetUserInfo(headers: any, userIds: string[]) {
  const users: Record<string, any> = {};
  for (let i = 0; i < userIds.length; i += 100) {
    const batch = userIds.slice(i, i + 100);
    const params = new URLSearchParams();
    batch.forEach(id => params.append("id", id));
    
    const res = await axios.get(`https://api.twitch.tv/helix/users?${params.toString()}`, { headers });
    for (const u of (res.data.data || [])) {
      users[u.id] = u;
    }
    await new Promise(r => setTimeout(r, 300));
  }
  return users;
}

// ============================================================================
// KICK SCRAPER
// ============================================================================
async function kickGetToken(clientId: string, clientSecret: string) {
  const res = await axios.post("https://id.kick.com/oauth/token", {
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret
  });
  return res.data.access_token;
}

async function kickGetStreamers(token: string, categorySlug: string | null, maxResults: number) {
  const streamers = [];
  let page = 1;
  const headers = { Authorization: `Bearer ${token}` };

  while (streamers.length < maxResults) {
    try {
      const params: any = { language: "pt", page };
      if (categorySlug) params.subcategory = categorySlug;

      const res = await axios.get("https://api.kick.com/public/v1/livestreams", { headers, params, timeout: 15000 });
      const batch = res.data.data || [];
      if (batch.length === 0) break;
      
      streamers.push(...batch);
      if (batch.length < 25) break;
      
      page++;
      await new Promise(r => setTimeout(r, 1200));
    } catch (err: any) {
      if (err.response?.status === 429) {
        await new Promise(r => setTimeout(r, 15000));
        continue;
      }
      break;
    }
  }
  return streamers;
}

async function kickGetChannelDescriptions(token: string, slugs: string[]) {
  const descriptions: Record<string, string> = {};
  const headers = { Authorization: `Bearer ${token}` };

  for (let i = 0; i < slugs.length; i += 25) {
    const batch = slugs.slice(i, i + 25);
    try {
      const params = new URLSearchParams();
      batch.forEach(s => params.append("slug", s));
      const res = await axios.get(`https://api.kick.com/public/v1/channels?${params.toString()}`, { headers, timeout: 15000 });
      for (const ch of (res.data.data || [])) {
        descriptions[ch.slug] = ch.channel_description || "";
      }
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      // ignore errors for descriptions
    }
  }
  return descriptions;
}

// ============================================================================
// ROUTES
// ============================================================================

router.post("/run", requireAdmin, async (req, res) => {
  const { platform, category, maxResults = 100 } = req.body;
  const db = getDB();
  const leadsAdded = [];

  try {
    if (platform === "Twitch") {
      const clientId = process.env.TWITCH_CLIENT_ID;
      const clientSecret = process.env.TWITCH_CLIENT_SECRET;
      if (!clientId || !clientSecret) return res.status(400).json({ error: "Twitch API keys missing" });

      const token = await twitchGetToken(clientId, clientSecret);
      const headers = { "Client-ID": clientId, Authorization: `Bearer ${token}` };

      const catId = await twitchGetCategoryId(headers, category);
      if (!catId) return res.status(404).json({ error: "Twitch category not found" });

      const streamers = await twitchGetStreamers(headers, catId, maxResults);
      const ptStreamers = streamers.filter((s: any) => s.language === "pt");

      const userIds = ptStreamers.map((s: any) => s.user_id);
      const userInfos = await twitchGetUserInfo(headers, userIds);

      for (const s of ptStreamers) {
        const info = userInfos[s.user_id] || {};
        const email = extractEmailFromText(info.description || "");

        // Somente salvar se tiver email para não poluir, ou salvar todos?
        // O script original salva todos. Vamos salvar apenas os que tem email ou deixar o user filtrar?
        // Vou salvar apenas com email válido para ser um "lead" real, ou salvar todos se preferirem.
        // O cliente pediu leads funcionais. Vamos priorizar com email.
        
        const lead = {
          id: nanoid(),
          email: email || `sem-email-${s.user_login}@twitch.local`,
          name: s.user_name || s.user_login,
          niche: category,
          status: "novo" as const,
          platform: "Twitch" as const,
          handle: `twitch.tv/${s.user_login}`,
          followers: s.viewer_count || 0,
          source: "scraper" as const,
          createdAt: new Date().toISOString()
        };
        db.leads.push(lead);
        leadsAdded.push(lead);
      }
      saveDB(db);

    } else if (platform === "Kick") {
      const clientId = process.env.KICK_CLIENT_ID;
      const clientSecret = process.env.KICK_CLIENT_SECRET;
      if (!clientId || !clientSecret) return res.status(400).json({ error: "Kick API keys missing" });

      const token = await kickGetToken(clientId, clientSecret);
      const streamers = await kickGetStreamers(token, category || null, maxResults);
      
      const slugs = streamers.map((s: any) => s.slug).filter(Boolean);
      const descriptions = await kickGetChannelDescriptions(token, slugs);

      for (const ch of streamers) {
        const slug = ch.slug;
        if (!slug) continue;
        const desc = descriptions[slug] || "";
        const email = extractEmailFromText(desc);
        
        const catName = ch.category?.name || category || "Geral";
        
        const lead = {
          id: nanoid(),
          email: email || `sem-email-${slug}@kick.local`,
          name: slug,
          niche: catName,
          status: "novo" as const,
          platform: "Kick" as const,
          handle: `kick.com/${slug}`,
          followers: ch.viewer_count || 0,
          source: "scraper" as const,
          createdAt: new Date().toISOString()
        };
        db.leads.push(lead);
        leadsAdded.push(lead);
      }
      saveDB(db);
    } else {
      return res.status(400).json({ error: "Invalid platform" });
    }

    res.json({ success: true, count: leadsAdded.length, leads: leadsAdded });
  } catch (err: any) {
    console.error("Scraper error:", err.message);
    res.status(500).json({ error: err.message || "Erro no scraper" });
  }
});

export default router;
