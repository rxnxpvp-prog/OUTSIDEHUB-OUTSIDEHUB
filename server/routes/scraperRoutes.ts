import { Router } from "express";
import axios from "axios";
import { nanoid } from "nanoid";
import { lookup, resolveMx } from "node:dns/promises";
import { getDB, saveDB, type Lead } from "../db.js";
import { requireAdmin } from "../auth.js";

const router = Router();

type PublicLeadSource = "Todas" | "CNPJReceita" | "WebBrasilIA" | "OpenStreetMap" | "Wikidata";
type LeadPlatform = "CNPJReceita" | "OpenStreetMap" | "Wikidata" | "WebBrasilIA";

interface IncomingLead {
  email: string;
  name: string;
  niche: string;
  platform: LeadPlatform;
  handle?: string;
}

const SOURCE_MAX: Record<PublicLeadSource, number> = {
  Todas: 250,
  CNPJReceita: 250,
  WebBrasilIA: 250,
  OpenStreetMap: 250,
  Wikidata: 100,
};

const TEST_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "invalid.com",
  "localhost",
  "dummyjson.com",
  "randomuser.me",
  "jsonplaceholder.typicode.com",
]);

const NICHES = [
  { label: "Marketing Digital", tags: ['["office"="advertising"]', '["shop"="copyshop"]'] },
  { label: "E-commerce", tags: ['["shop"]'] },
  { label: "Tecnologia", tags: ['["shop"="computer"]', '["office"="it"]', '["craft"="electronics_repair"]'] },
  { label: "Saude", tags: ['["amenity"="clinic"]', '["amenity"="dentist"]', '["amenity"="doctors"]', '["healthcare"]'] },
  { label: "Educacao", tags: ['["amenity"="school"]', '["amenity"="college"]', '["amenity"="university"]', '["office"="educational_institution"]'] },
  { label: "Gastronomia", tags: ['["amenity"="restaurant"]', '["amenity"="cafe"]', '["amenity"="bar"]', '["shop"="bakery"]'] },
  { label: "Beleza", tags: ['["shop"="hairdresser"]', '["shop"="beauty"]', '["shop"="cosmetics"]'] },
  { label: "Imobiliario", tags: ['["office"="estate_agent"]'] },
  { label: "Turismo", tags: ['["tourism"="hotel"]', '["tourism"="hostel"]', '["office"="travel_agent"]'] },
  { label: "Automotivo", tags: ['["shop"="car_repair"]', '["shop"="car"]', '["amenity"="vehicle_inspection"]'] },
  { label: "Juridico", tags: ['["office"="lawyer"]'] },
  { label: "Financeiro", tags: ['["amenity"="bank"]', '["office"="financial"]', '["office"="accountant"]'] },
  { label: "Esportes", tags: ['["leisure"="fitness_centre"]', '["shop"="sports"]'] },
  { label: "Arte", tags: ['["tourism"="gallery"]', '["shop"="art"]', '["amenity"="arts_centre"]'] },
  { label: "Moda", tags: ['["shop"="clothes"]', '["shop"="shoes"]'] },
];

const WEB_QUERY_TERMS: Record<string, string[]> = {
  "Marketing Digital": ["agencia marketing digital", "agencia publicidade", "gestao trafego pago", "social media"],
  "E-commerce": ["loja virtual", "ecommerce", "e-commerce", "loja online"],
  Tecnologia: ["empresa software", "desenvolvimento sistemas", "consultoria ti", "suporte informatica"],
  Saude: ["clinica medica", "clinica odontologica", "laboratorio exames", "consultorio"],
  Educacao: ["curso profissionalizante", "escola particular", "faculdade", "instituto educacional"],
  Gastronomia: ["restaurante", "delivery", "buffet", "cafeteria"],
  Beleza: ["salao beleza", "clinica estetica", "barbearia", "cosmeticos"],
  Imobiliario: ["imobiliaria", "corretora imoveis", "administradora condominios"],
  Turismo: ["agencia turismo", "hotel", "pousada", "receptivo"],
  Automotivo: ["oficina mecanica", "auto pecas", "concessionaria", "funilaria"],
  Juridico: ["advocacia", "escritorio advocacia", "assessoria juridica"],
  Financeiro: ["contabilidade", "consultoria financeira", "seguros", "corretora seguros"],
  Esportes: ["academia", "crossfit", "escola futebol", "loja esportes"],
  Arte: ["galeria arte", "produtora cultural", "escola musica", "atelier"],
  Moda: ["loja roupas", "moda feminina", "moda masculina", "calcados"],
};

const CNPJ_SEEDS: Record<string, string[]> = {
  "E-commerce": [
    "47960950000121", // Magazine Luiza
    "15436940000103", // Amazon Brasil
    "33014556000196", // Americanas
    "33041260065290", // Casas Bahia
  ],
  Tecnologia: [
    "02558157000162", // Telefonica Brasil
    "76535764000143", // Oi
    "02421421000111", // TIM
    "27865757000102", // Globo
  ],
  Financeiro: [
    "00000000000191", // Banco do Brasil
    "60746948000112", // Bradesco
    "61186680000174", // Banco BMG
  ],
  Saude: [
    "60840055000131", // Fleury
    "61486650000183", // Dasa
  ],
  Gastronomia: [
    "60409075000152", // Nestle
    "07526557000100", // Ambev
  ],
  Turismo: [
    "07575651000159", // Gol
  ],
  "Marketing Digital": [
    "27865757000102", // Globo
  ],
  Automotivo: [
    "59275792000150", // General Motors Brasil
  ],
  Educacao: [
    "11222333000181", // Escola estadual
  ],
};

const NICHE_KEYWORDS: Array<{ label: string; words: string[] }> = [
  { label: "Marketing Digital", words: ["advertising", "marketing", "publicidade", "media", "agency", "agencia"] },
  { label: "E-commerce", words: ["retail", "commerce", "loja", "shop", "marketplace"] },
  { label: "Tecnologia", words: ["software", "technology", "computer", "internet", "telecom", "electronics", "tecnologia", "it "] },
  { label: "Saude", words: ["health", "hospital", "clinic", "medical", "pharma", "saude", "healthcare"] },
  { label: "Educacao", words: ["education", "school", "college", "university", "educacao", "ensino", "biblioteca", "library"] },
  { label: "Gastronomia", words: ["restaurant", "food", "cafe", "bar", "bakery", "comida", "gastronomia"] },
  { label: "Beleza", words: ["beauty", "cosmetic", "hair", "salon", "beleza"] },
  { label: "Imobiliario", words: ["real estate", "property", "imobiliario", "estate"] },
  { label: "Turismo", words: ["tourism", "hotel", "travel", "airline", "turismo"] },
  { label: "Automotivo", words: ["automotive", "vehicle", "car", "auto", "automotivo"] },
  { label: "Juridico", words: ["law", "legal", "lawyer", "juridico", "advocacia"] },
  { label: "Financeiro", words: ["finance", "bank", "insurance", "accounting", "financial", "financeiro"] },
  { label: "Esportes", words: ["sport", "fitness", "gym", "esporte"] },
  { label: "Arte", words: ["art", "gallery", "museum", "music", "arte", "museu"] },
  { label: "Moda", words: ["fashion", "clothing", "apparel", "shoes", "moda"] },
];

const BRAZIL_BBOXES = [
  "-23.75,-46.85,-23.35,-46.35", // Sao Paulo
  "-23.05,-43.80,-22.70,-43.05", // Rio de Janeiro
  "-20.10,-44.10,-19.75,-43.75", // Belo Horizonte
  "-25.65,-49.45,-25.25,-49.10", // Curitiba
  "-30.25,-51.35,-29.85,-50.95", // Porto Alegre
  "-16.10,-48.25,-15.45,-47.45", // Brasilia
  "-13.10,-38.75,-12.75,-38.25", // Salvador
  "-8.25,-35.15,-7.85,-34.75",   // Recife
  "-3.95,-38.75,-3.60,-38.35",   // Fortaleza
];

const domainCache = new Map<string, boolean>();
const pageCache = new Map<string, string>();

function normalizeEmail(value: unknown) {
  const raw = String(value || "").replace(/^mailto:/i, "").trim().toLowerCase();
  const match = raw.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/);
  return match ? match[0] : raw;
}

function normalizeName(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim() || "Sem nome";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function emailDomain(email: string) {
  return email.split("@")[1]?.toLowerCase() || "";
}

function clampLimit(value: unknown, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return Math.min(50, max);
  return Math.max(1, Math.min(Math.floor(parsed), max));
}

function selectedNiches(category: unknown) {
  const value = String(category || "").trim().toLowerCase();
  if (!value || value === "todos" || value === "todos os nichos") return NICHES;
  const found = NICHES.find((niche) => niche.label.toLowerCase() === value);
  return found ? [found] : [{ label: String(category).trim() || "Geral", tags: ['["shop"]', '["office"]'] }];
}

function isAllNiches(category: unknown) {
  const value = String(category || "").trim().toLowerCase();
  return !value || value === "todos" || value === "todos os nichos";
}

function classifyNiche(text: unknown, fallback = "Empresas") {
  const value = String(text || "").toLowerCase();
  const match = NICHE_KEYWORDS.find((niche) => niche.words.some((word) => value.includes(word)));
  return match?.label || fallback;
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value: string) {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isBrazilianWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol.startsWith("http") && url.hostname.toLowerCase().endsWith(".br");
  } catch {
    return false;
  }
}

function getHostnameName(value: string) {
  try {
    const host = new URL(value).hostname.replace(/^www\./, "");
    return host.split(".")[0].replace(/[-_]+/g, " ");
  } catch {
    return "Empresa brasileira";
  }
}

function extractEmailsFromText(value: string) {
  const matches = value.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [];
  return Array.from(new Set(matches.map(normalizeEmail))).filter((email) => {
    const domain = emailDomain(email);
    if (!isEmail(email) || TEST_DOMAINS.has(domain)) return false;
    if (email.match(/\.(png|jpg|jpeg|gif|webp|svg|css|js)$/i)) return false;
    return domain.endsWith(".br");
  });
}

function extractPageName(html: string, url: string) {
  const og = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  const name = normalizeName(stripHtml(og || title || ""));
  if (name && name !== "Sem nome") return name.slice(0, 90);
  const hostName = getHostnameName(url);
  return hostName.charAt(0).toUpperCase() + hostName.slice(1);
}

function extractDuckDuckGoUrls(html: string) {
  const urls = new Set<string>();
  const hrefPattern = /href="([^"]+)"/gi;
  let match: RegExpExecArray | null;

  while ((match = hrefPattern.exec(html))) {
    const raw = decodeHtml(match[1]);
    let candidate = raw;

    if (raw.startsWith("//duckduckgo.com/l/") || raw.startsWith("https://duckduckgo.com/l/")) {
      const full = raw.startsWith("//") ? `https:${raw}` : raw;
      const uddg = new URL(full).searchParams.get("uddg");
      if (uddg) candidate = decodeURIComponent(uddg);
    }

    if (isBrazilianWebUrl(candidate)) urls.add(candidate.split("#")[0]);
  }

  return Array.from(urls).slice(0, 12);
}

function buildWebQueries(category: unknown, limit: number) {
  const niches = selectedNiches(category).slice(0, isAllNiches(category) ? 8 : 1);
  const queries: Array<{ niche: string; q: string }> = [];

  for (const niche of niches) {
    const terms = WEB_QUERY_TERMS[niche.label] || [niche.label];
    for (const term of terms.slice(0, isAllNiches(category) ? 1 : 4)) {
      queries.push({
        niche: niche.label,
        q: `site:.br "${term}" "contato" email`,
      });
    }
  }

  return queries.slice(0, Math.max(2, Math.min(12, Math.ceil(limit / 3))));
}

function pageMatchesNiche(text: string, niche: string) {
  const keywords = NICHE_KEYWORDS.find((item) => item.label === niche)?.words || [];
  const value = text.toLowerCase();
  return keywords.some((word) => value.includes(word)) || (WEB_QUERY_TERMS[niche] || []).some((term) => value.includes(term));
}

async function hasUsableDomain(email: string) {
  const domain = emailDomain(email);
  if (!domain || TEST_DOMAINS.has(domain)) return false;
  if (domainCache.has(domain)) return domainCache.get(domain) || false;

  try {
    const mx = await resolveMx(domain);
    const ok = mx.length > 0;
    domainCache.set(domain, ok);
    return ok;
  } catch {
    try {
      await lookup(domain);
      domainCache.set(domain, true);
      return true;
    } catch {
      domainCache.set(domain, false);
      return false;
    }
  }
}

function buildOverpassQuery(tags: string[], limit: number) {
  const selectors = [];
  for (const bbox of BRAZIL_BBOXES) {
    for (const tag of tags) {
      selectors.push(`node${tag}["email"](${bbox});`);
      selectors.push(`way${tag}["email"](${bbox});`);
      selectors.push(`relation${tag}["email"](${bbox});`);
      selectors.push(`node${tag}["contact:email"](${bbox});`);
      selectors.push(`way${tag}["contact:email"](${bbox});`);
      selectors.push(`relation${tag}["contact:email"](${bbox});`);
    }
  }

  return `[out:json][timeout:25];(${selectors.join("")});out tags ${Math.min(limit * 3, 500)};`;
}

async function getOpenStreetMapLeads(niches: ReturnType<typeof selectedNiches>, limit: number): Promise<IncomingLead[]> {
  const perNiche = Math.max(3, Math.ceil(limit / niches.length));
  const leads: IncomingLead[] = [];

  for (const niche of niches) {
    if (leads.length >= limit) break;

    const res = await axios.post("https://overpass-api.de/api/interpreter", buildOverpassQuery(niche.tags, perNiche), {
      headers: { "Content-Type": "text/plain" },
      timeout: 35000,
    });

    for (const item of res.data.elements || []) {
      const tags = item.tags || {};
      const email = normalizeEmail(tags["contact:email"] || tags.email);
      const name = normalizeName(tags.name || tags.operator || tags.brand);
      if (!email || !name) continue;

      leads.push({
        email,
        name,
        niche: niche.label,
        platform: "OpenStreetMap",
        handle: tags.website || tags["contact:website"] || `osm:${item.type}/${item.id}`,
      });

      if (leads.length >= limit) break;
    }
  }

  return leads;
}

async function getWikidataLeads(limit: number, category: unknown): Promise<IncomingLead[]> {
  const query = `
    SELECT ?item ?itemLabel ?email ?industryLabel WHERE {
      ?item wdt:P968 ?email.
      ?item wdt:P17 wd:Q155.
      OPTIONAL { ?item wdt:P452 ?industry. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". }
    }
    LIMIT ${Math.min(limit, 100)}
  `;

  const res = await axios.get("https://query.wikidata.org/sparql", {
    params: { query, format: "json" },
    headers: { "User-Agent": "OutsideHubLeadPanel/1.0" },
    timeout: 30000,
  });

  const requestedNiche = String(category || "").trim();
  return (res.data.results?.bindings || []).flatMap((row: any) => {
    const name = normalizeName(row.itemLabel?.value);
    const industry = normalizeName(row.industryLabel?.value || "");
    const niche = classifyNiche(`${industry} ${name}`);

    if (!isAllNiches(category) && niche !== requestedNiche) {
      return [];
    }

    return [{
      email: normalizeEmail(row.email?.value),
      name,
      niche,
      platform: "Wikidata" as const,
      handle: row.item?.value,
    }];
  });
}

async function searchBrazilianWeb(query: string) {
  const res = await axios.get("https://html.duckduckgo.com/html/", {
    params: { q: query, kl: "br-pt" },
    headers: {
      "User-Agent": "Mozilla/5.0 OutsideHubLeadPanel/1.0",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.7",
    },
    timeout: 20000,
  });

  return extractDuckDuckGoUrls(String(res.data || ""));
}

async function fetchPublicPage(url: string) {
  if (pageCache.has(url)) return pageCache.get(url) || "";

  const res = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 OutsideHubLeadPanel/1.0",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.7",
    },
    maxRedirects: 3,
    timeout: 12000,
    responseType: "text",
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const html = String(res.data || "").slice(0, 600000);
  pageCache.set(url, html);
  return html;
}

async function getWebBrazilLeads(category: unknown, limit: number): Promise<IncomingLead[]> {
  const queries = buildWebQueries(category, limit);
  const leads: IncomingLead[] = [];
  const visited = new Set<string>();

  for (const item of queries) {
    if (leads.length >= limit) break;

    let urls: string[] = [];
    try {
      urls = await searchBrazilianWeb(item.q);
    } catch {
      continue;
    }

    for (const url of urls) {
      if (leads.length >= limit || visited.has(url)) continue;
      visited.add(url);

      try {
        const html = await fetchPublicPage(url);
        const text = stripHtml(html).slice(0, 20000);
        const emails = extractEmailsFromText(`${html} ${text}`);
        if (emails.length === 0) continue;

        const detectedNiche = classifyNiche(text, item.niche);
        const niche = isAllNiches(category) ? detectedNiche : item.niche;
        if (!isAllNiches(category) && !pageMatchesNiche(text, item.niche)) continue;

        const name = extractPageName(html, url);
        for (const email of emails.slice(0, 2)) {
          leads.push({
            email,
            name,
            niche,
            platform: "WebBrasilIA",
            handle: url,
          });
          if (leads.length >= limit) break;
        }
      } catch {
        continue;
      }
    }
  }

  return leads;
}

function selectedSeedCnpjs(category: unknown) {
  if (isAllNiches(category)) {
    return Object.entries(CNPJ_SEEDS).flatMap(([niche, cnpjs]) => cnpjs.map((cnpj) => ({ niche, cnpj })));
  }

  const label = selectedNiches(category)[0]?.label || String(category || "Empresas");
  return (CNPJ_SEEDS[label] || []).map((cnpj) => ({ niche: label, cnpj }));
}

async function getCnpjReceitaLeads(category: unknown, limit: number): Promise<IncomingLead[]> {
  const seeds = selectedSeedCnpjs(category);
  const leads: IncomingLead[] = [];

  for (const seed of seeds) {
    if (leads.length >= limit) break;

    try {
      const res = await axios.get(`https://api.opencnpj.org/${seed.cnpj}`, {
        timeout: 15000,
        headers: { "User-Agent": "OutsideHubLeadPanel/1.0" },
      });
      const data = res.data || {};
      const email = normalizeEmail(data.email);
      if (!email) continue;

      leads.push({
        email,
        name: normalizeName(data.nome_fantasia || data.razao_social),
        niche: seed.niche,
        platform: "CNPJReceita",
        handle: `cnpj:${seed.cnpj}`,
      });
    } catch {
      continue;
    }
  }

  return leads;
}

async function fetchLeads(source: PublicLeadSource, category: unknown, limit: number) {
  const niches = selectedNiches(category);
  const tasks: Promise<IncomingLead[]>[] = [];

  if (source === "Todas" || source === "CNPJReceita") {
    tasks.push(getCnpjReceitaLeads(category, source === "Todas" ? Math.ceil(limit * 0.55) : limit));
  }
  if (source === "Todas" || source === "WebBrasilIA") {
    tasks.push(getWebBrazilLeads(category, source === "Todas" ? Math.ceil(limit * 0.25) : limit));
  }
  if (source === "Todas" || source === "OpenStreetMap") {
    tasks.push(getOpenStreetMapLeads(niches, source === "Todas" ? Math.ceil(limit * 0.15) : limit));
  }
  if (source === "Todas" || source === "Wikidata") {
    tasks.push(getWikidataLeads(source === "Todas" ? Math.ceil(limit * 0.05) : limit, category));
  }

  const settled = await Promise.allSettled(tasks);
  return settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}

router.post("/run", requireAdmin, async (req, res) => {
  const source = String(req.body.source || "Todas") as PublicLeadSource;
  const max = SOURCE_MAX[source];

  if (!max) {
    res.status(400).json({ error: "Fonte invalida. Use Todas, CNPJReceita, WebBrasilIA, OpenStreetMap ou Wikidata." });
    return;
  }

  const limit = clampLimit(req.body.maxResults, max);
  const db = getDB();

  try {
    const incoming = await fetchLeads(source, req.body.category, limit);
    const added: Lead[] = [];
    const skipped: string[] = [];
    const seen = new Set(db.leads.map((lead) => normalizeEmail(lead.email)));

    for (const item of incoming) {
      const email = normalizeEmail(item.email);
      if (!isEmail(email) || seen.has(email) || !(await hasUsableDomain(email))) {
        skipped.push(email || item.name);
        continue;
      }

      const lead: Lead = {
        id: nanoid(),
        email,
        name: item.name,
        niche: item.niche,
        status: "novo",
        platform: item.platform,
        handle: item.handle,
        source: "public_api",
        createdAt: new Date().toISOString(),
      };

      db.leads.unshift(lead);
      added.push(lead);
      seen.add(email);
      if (added.length >= limit) break;
    }

    saveDB(db);
    res.json({
      success: true,
      source,
      count: added.length,
      skipped: skipped.length,
      format: "email:nome",
      leads: added,
      note: "Busca CNPJ publico da Receita, sites brasileiros, OpenStreetMap Brasil e Wikidata Brasil; dominios de teste e inexistentes sao filtrados.",
    });
  } catch (err: any) {
    res.status(502).json({
      error: err.response?.data?.message || err.message || "Erro ao consultar APIs publicas",
    });
  }
});

export default router;
