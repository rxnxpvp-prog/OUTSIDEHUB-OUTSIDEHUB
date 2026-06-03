import { Router } from "express";
import axios from "axios";
import { requireAdmin, requireAuth, type AuthRequest } from "../auth.js";

const router = Router();

interface OsintResult {
  id: string;
  source: string;
  type: string;
  title: string;
  description: string;
  url: string;
  risk: "baixo" | "medio" | "alto";
  meta?: Record<string, string | number | boolean>;
  details?: Record<string, string | number | boolean>;
}

function cleanQuery(value: unknown) {
  return String(value || "").trim().slice(0, 180);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isDomain(value: string) {
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value) && !value.includes("@");
}

function githubHeaders(extra: Record<string, string> = {}) {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "OutsideHub-OSINT-Search",
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    ...extra,
  };
}

function intelxKeys() {
  const list = String(process.env.INTELX_API_KEYS || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
  const single = String(process.env.INTELX_API_KEY || "").trim();
  return list.length > 0 ? list : single ? [single] : [];
}

function activeIntelxKey() {
  const keys = intelxKeys();
  if (keys.length === 0) return "";
  const rotationHours = Number(process.env.INTELX_ROTATION_HOURS || 48);
  const intervalMs = Math.max(1, rotationHours) * 60 * 60 * 1000;
  const index = Math.floor(Date.now() / intervalMs) % keys.length;
  return keys[index];
}

function hasIntelxKey() {
  return intelxKeys().length > 0;
}

function intelxHeaders() {
  return {
    "X-Key": activeIntelxKey(),
    "User-Agent": "OutsideHub-IntelX-OSINT",
  };
}

function intelxSearchBase() {
  return (process.env.INTELX_SEARCH_BASE_URL || "https://2.intelx.io").replace(/\/$/, "");
}

function intelxLeaksBase() {
  return (process.env.INTELX_LEAKS_BASE_URL || "https://3.intelx.io").replace(/\/$/, "");
}

function pushUnique(results: OsintResult[], item: OsintResult) {
  if (results.some((existing) => existing.url === item.url && existing.title === item.title)) return;
  results.push(item);
}

function maskValue(value: string) {
  if (isEmail(value)) {
    const [name, domain] = value.split("@");
    return `${name.slice(0, 2)}***@${domain.replace(/^[^.]+/, "***")}`;
  }
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function redactResults(results: OsintResult[], query: string) {
  return results.map((item, index) => ({
    id: `redacted-${index}`,
    source: "Fonte censurada",
    type: item.type,
    title: `Ocorrencia relacionada a ${maskValue(query)}`,
    description: "Resultado encontrado, mas detalhes ficam ocultos para usuarios sem permissao administrativa.",
    url: "",
    risk: item.risk,
    meta: { visibility: "censurado" },
  }));
}

function sanitizeCredentialLike(value: unknown) {
  const text = String(value ?? "");
  if (!text) return "";
  if (text.length <= 4) return "****";
  return `${text.slice(0, 2)}***${text.slice(-2)}`;
}

function flattenObject(value: any, prefix = "", out: Record<string, string | number | boolean> = {}) {
  if (!value || typeof value !== "object") return out;
  for (const [key, raw] of Object.entries(value)) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (raw === null || raw === undefined) continue;
    if (typeof raw === "object" && !Array.isArray(raw)) {
      flattenObject(raw, name, out);
      continue;
    }
    const safeKey = key.toLowerCase();
    const display = safeKey.includes("password") || safeKey.includes("pass") || safeKey.includes("token") || safeKey.includes("secret")
      ? sanitizeCredentialLike(raw)
      : Array.isArray(raw) ? raw.join(", ") : raw;
    if (typeof display === "string" || typeof display === "number" || typeof display === "boolean") out[name] = display;
  }
  return out;
}

async function fetchIntelxLeaks(query: string): Promise<OsintResult[]> {
  if (!hasIntelxKey() || (!isEmail(query) && !isDomain(query))) return [];

  const response = await axios.get(`${intelxLeaksBase()}/accounts/1`, {
    params: {
      selector: query,
      limit: 50,
      timeout: 60,
    },
    headers: intelxHeaders(),
    timeout: 75_000,
  }).catch(() => ({ data: [] }));

  const rows = Array.isArray(response.data) ? response.data : [];
  return rows.slice(0, 50).map((row: any, index: number) => {
    const details = flattenObject(row);
    return {
      id: `intelx-account-${index}`,
      source: "IntelX Leaks API",
      type: "leaked_account",
      title: String(row.email || row.Email || row.selector || row.Selector || query),
      description: "Registro de conta vazada retornado pela IntelX Leaks API. Credenciais secretas sao mascaradas no painel.",
      url: "",
      risk: "alto" as const,
      meta: {
        bucket: row.bucket || row.Bucket || row.source || row.Source || "",
        date: row.date || row.Date || row.lastseen || row.LastSeen || "",
      },
      details,
    };
  });
}

async function fetchIntelxSearch(query: string): Promise<OsintResult[]> {
  if (!hasIntelxKey()) return [];

  const search = await axios.post(`${intelxSearchBase()}/intelligent/search`, null, {
    params: {
      term: query,
      maxresults: 100,
      buckets: "leaks.logs,leaks.private.comb,leaks.private.general,leaks.public.general,pastes,dumpster",
      timeout: 30,
      datefrom: "",
      dateto: "",
      sort: 4,
      media: 0,
    },
    headers: intelxHeaders(),
    timeout: 40_000,
  });

  const searchId = search.data?.id;
  if (!searchId) return [];

  const records: any[] = [];
  for (let i = 0; i < 5; i++) {
    const page = await axios.get(`${intelxSearchBase()}/intelligent/search/result`, {
      params: {
        id: searchId,
        limit: 20,
        statistics: 1,
        previewlines: 8,
      },
      headers: intelxHeaders(),
      timeout: 30_000,
    }).catch(() => null);

    const data = page?.data;
    if (Array.isArray(data?.records)) records.push(...data.records);
    if (data?.status === 1 || data?.status === 2 || data?.status === 4) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return records.slice(0, 50).map((record: any, index: number) => ({
    id: `intelx-search-${record.systemid || record.storageid || index}`,
    source: "IntelX Search API",
    type: "intelx_result",
    title: String(record.name || record.title || record.systemid || "IntelX result"),
    description: String(record.preview || record.description || "Resultado retornado pela IntelX Search API. Conteudo bruto de dumps nao e renderizado."),
    url: "",
    risk: String(record.bucket || "").includes("leaks") ? "alto" : "medio",
    meta: {
      bucket: record.bucket || "",
      media: record.media || "",
      date: record.date || "",
      size: record.size || "",
    },
    details: flattenObject(record),
  }));
}

router.get("/rockyou", requireAdmin, async (req, res) => {
  const query = cleanQuery(req.query.q);
  const terms = ["topic:rockyou2024"];
  if (query) terms.push(`${query} in:name,description,readme`);

  try {
    const gh = await axios.get("https://api.github.com/search/repositories", {
      params: {
        q: terms.join(" "),
        sort: "updated",
        order: "desc",
        per_page: 20,
      },
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "OutsideHub-OSINT-Search",
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
      timeout: 20000,
    });

    const results = (gh.data.items || []).map((repo: any) => ({
      id: repo.id,
      name: repo.full_name,
      description: repo.description || "",
      url: repo.html_url,
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      updatedAt: repo.updated_at,
      language: repo.language || "",
      topics: repo.topics || [],
    }));

    res.json({
      query,
      topicUrl: "https://github.com/topics/rockyou2024",
      count: results.length,
      results,
      note: "Admin-only OSINT metadata search. Arquivos e wordlists nao sao baixados pelo sistema.",
    });
  } catch (err: any) {
    res.status(err.response?.status || 502).json({
      error: err.response?.data?.message || err.message || "Erro ao consultar GitHub",
    });
  }
});

router.get("/osint", requireAuth, async (req: AuthRequest, res) => {
  const query = cleanQuery(req.query.q);
  if (!query) {
    res.status(400).json({ error: "Informe email, dominio, usuario ou termo para investigar." });
    return;
  }

    const results: OsintResult[] = [];
  const isAdmin = req.user?.role === "admin";
  const searches = [
    {
      source: "GitHub Repos",
      type: "repositorio",
      q: `${query} leak OR breach OR stealer OR combo OR rockyou2024 in:name,description,readme`,
    },
    {
      source: "GitHub Topic",
      type: "rockyou2024",
      q: `topic:rockyou2024 ${query} in:name,description,readme`,
    },
    {
      source: "GitHub Issues",
      type: "issue",
      q: `${query} leak breach exposure in:title,body`,
    },
  ];

  try {
    const intelxCalls = Promise.all([
      fetchIntelxLeaks(query).catch(() => []),
      fetchIntelxSearch(query).catch(() => []),
    ]);

    const repoCalls = searches.slice(0, 2).map((item) =>
      axios.get("https://api.github.com/search/repositories", {
        params: { q: item.q, sort: "updated", order: "desc", per_page: 10 },
        headers: githubHeaders(),
        timeout: 20000,
      }).then((response) => ({ ...item, data: response.data.items || [] })).catch(() => ({ ...item, data: [] }))
    );

    const issueCall = axios.get("https://api.github.com/search/issues", {
      params: { q: `${searches[2].q} is:public`, sort: "updated", order: "desc", per_page: 10 },
      headers: githubHeaders(),
      timeout: 20000,
    }).then((response) => ({ ...searches[2], data: response.data.items || [] })).catch(() => ({ ...searches[2], data: [] }));

    const [settled, intelxSettled] = await Promise.all([
      Promise.all([...repoCalls, issueCall]),
      intelxCalls,
    ]);

    for (const item of intelxSettled.flat()) {
      pushUnique(results, item);
    }

    for (const item of settled) {
      for (const row of item.data) {
        if (item.type === "issue") {
          pushUnique(results, {
            id: `issue-${row.id}`,
            source: "Public Code Index",
            type: item.type,
            title: row.title || "Issue publica",
            description: row.body ? `${String(row.body).slice(0, 220)}...` : "Ocorrencia publica relacionada ao termo pesquisado.",
            url: "",
            risk: "medio",
            meta: { state: row.state || "", comments: row.comments || 0 },
            details: {
              issueId: row.id,
              author: row.user?.login || "",
              createdAt: row.created_at || "",
              updatedAt: row.updated_at || "",
              labels: (row.labels || []).map((label: any) => label.name).join(", "),
            },
          });
          continue;
        }

        pushUnique(results, {
          id: `repo-${row.id}`,
          source: "Public Repo Index",
          type: item.type,
          title: row.full_name,
          description: row.description || "Repositorio publico relacionado ao termo pesquisado.",
          url: "",
          risk: item.type === "rockyou2024" ? "alto" : "medio",
          meta: {
            stars: row.stargazers_count || 0,
            forks: row.forks_count || 0,
            updated: row.updated_at || "",
            language: row.language || "",
          },
          details: {
            repositoryId: row.id,
            owner: row.owner?.login || "",
            repository: row.full_name || "",
            visibility: row.visibility || "",
            defaultBranch: row.default_branch || "",
            createdAt: row.created_at || "",
            pushedAt: row.pushed_at || "",
            topics: (row.topics || []).join(", "),
            license: row.license?.spdx_id || "",
          },
        });
      }
    }

    if (process.env.GITHUB_TOKEN) {
      const codeQuery = isEmail(query) || isDomain(query) ? `"${query}" in:file` : `"${query}" leak in:file`;
      const codeRes = await axios.get("https://api.github.com/search/code", {
        params: { q: codeQuery, sort: "indexed", order: "desc", per_page: 10 },
        headers: githubHeaders(),
        timeout: 20000,
      }).catch(() => ({ data: { items: [] } }));

      for (const row of codeRes.data.items || []) {
        pushUnique(results, {
          id: `code-${row.sha || row.url}`,
          source: "Public Code Index",
          type: "codigo_publico",
          title: `${row.repository?.full_name || "repo"}/${row.path}`,
          description: "Ocorrencia em arquivo publico. O app mostra apenas localizacao, nao conteudo sensivel bruto.",
          url: "",
          risk: "alto",
          meta: { repo: row.repository?.full_name || "" },
          details: {
            repository: row.repository?.full_name || "",
            path: row.path || "",
            fileName: row.name || "",
            score: row.score || 0,
          },
        });
      }
    }

    if (process.env.HIBP_API_KEY && isEmail(query)) {
      const hibp = await axios.get(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(query)}`, {
        params: { truncateResponse: false },
        headers: {
          "hibp-api-key": process.env.HIBP_API_KEY,
          "User-Agent": "OutsideHub-OSINT-Search",
        },
        timeout: 20000,
        validateStatus: (status) => status === 200 || status === 404,
      }).catch(() => null);

      if (hibp?.status === 200) {
        for (const breach of hibp.data || []) {
          pushUnique(results, {
            id: `hibp-${breach.Name}`,
            source: "Have I Been Pwned",
            type: "breach",
            title: breach.Title || breach.Name,
            description: String(breach.Description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 260),
            url: `https://haveibeenpwned.com/PwnedWebsites#${breach.Name}`,
            risk: "alto",
            meta: { domain: breach.Domain || "", date: breach.BreachDate || "", accounts: breach.PwnCount || 0 },
            details: {
              breachName: breach.Name || "",
              addedDate: breach.AddedDate || "",
              modifiedDate: breach.ModifiedDate || "",
              verified: Boolean(breach.IsVerified),
              sensitive: Boolean(breach.IsSensitive),
              retired: Boolean(breach.IsRetired),
              spamList: Boolean(breach.IsSpamList),
              exposedDataClasses: (breach.DataClasses || []).join(", "),
            },
          });
        }
      }
    }

    const capabilities = {
      githubCodeSearch: Boolean(process.env.GITHUB_TOKEN),
      hibp: Boolean(process.env.HIBP_API_KEY),
      intelx: hasIntelxKey(),
    };

    if (results.length === 0) {
      results.push({
        id: "diagnostic-0",
        source: "OSINT Engine",
        type: "diagnostico",
        title: "Nenhuma ocorrencia confirmada nas fontes conectadas",
        description: capabilities.githubCodeSearch || capabilities.hibp
          ? "A busca foi concluida nas fontes disponiveis e nao encontrou exposicao confirmada para este termo."
          : "Para busca profunda de codigo e breaches, configure GITHUB_TOKEN e HIBP_API_KEY no backend.",
        url: "",
        risk: "baixo",
        meta: capabilities,
        details: {
          githubTokenEnv: "GITHUB_TOKEN",
          hibpKeyEnv: "HIBP_API_KEY",
          intelxKeyEnv: "INTELX_API_KEY",
          githubCodeSearchEnabled: capabilities.githubCodeSearch,
          hibpEnabled: capabilities.hibp,
          intelxEnabled: capabilities.intelx,
        },
      });
    }

    const visibleResults = isAdmin ? results : redactResults(results, query);

    res.json({
      query,
      count: visibleResults.length,
      mode: isAdmin ? "admin_leaks" : "censored",
      results: visibleResults,
      capabilities,
      note: isAdmin
        ? "Admin defensive OSINT. Conteudo sensivel bruto, senhas e dumps nao sao exibidos pelo app."
        : "Resultados censurados para usuario sem permissao administrativa.",
    });
  } catch (err: any) {
    res.status(502).json({ error: err.response?.data?.message || err.message || "Erro na busca OSINT" });
  }
});

export default router;
