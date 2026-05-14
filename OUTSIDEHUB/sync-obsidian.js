#!/usr/bin/env node
/**
 * OUTSIDEHUB → OBSIDIAN SYNC
 * Lê o db.json e popula o vault Obsidian como segundo cérebro.
 *
 * Uso:
 *   node sync-obsidian.js            (roda uma vez)
 *   node sync-obsidian.js --watch    (fica observando mudanças no db.json)
 *   node sync-obsidian.js --force    (força reescrita de todas as notas)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────

const DB_PATH    = path.join(__dirname, "data", "db.json");
const VAULT_PATH = "C:\\Users\\CLIENTE\\Documents\\Obsidian\\OutsideHub";

const DIRS = {
  leads:   path.join(VAULT_PATH, "01-Leads"),
  users:   path.join(VAULT_PATH, "02-Usuarios"),
  scraper: path.join(VAULT_PATH, "03-Scraper"),
  feed:    path.join(VAULT_PATH, "04-Feed"),
  chat:    path.join(VAULT_PATH, "05-Chat"),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const colors = {
  reset:  "\x1b[0m",
  green:  "\x1b[32m",
  cyan:   "\x1b[36m",
  yellow: "\x1b[33m",
  red:    "\x1b[31m",
  bold:   "\x1b[1m",
};

function log(msg, color = "reset") {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    log("❌ Não foi possível ler db.json", "red");
    process.exit(1);
  }
}

function ensureDirs() {
  for (const d of Object.values(DIRS)) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }
}

function safeFilename(name) {
  return name.replace(/[\\/:*?"<>|#^[\]]/g, "-").replace(/\s+/g, "-").slice(0, 80);
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function writeIfChanged(filePath, content) {
  const force = process.argv.includes("--force");
  if (!force && fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, "utf-8");
    if (existing === content) return false;
  }
  fs.writeFileSync(filePath, content, "utf-8");
  return true;
}

// ── Status bar ────────────────────────────────────────────────────────────────

function progressBar(done, total, width = 30) {
  const pct   = total === 0 ? 1 : done / total;
  const filled = Math.round(pct * width);
  return `[${"█".repeat(filled)}${"░".repeat(width - filled)}] ${done}/${total}`;
}

// ── 01-Leads ──────────────────────────────────────────────────────────────────

function syncLeads(db) {
  const leads = db.leads || [];
  log(`\n📊 Sincronizando ${leads.length} leads...`, "cyan");

  const statusEmoji = { novo: "🔵", contatado: "🟡", convertido: "🟢" };
  const nicheTag    = (n) => n.toLowerCase().replace(/\s+/g, "-");

  let written = 0;

  for (let i = 0; i < leads.length; i++) {
    const l = leads[i];
    const fname = safeFilename(`${l.name || "sem-nome"}-${l.id.slice(-6)}`);
    const filePath = path.join(DIRS.leads, `${fname}.md`);

    const content = `---
id: "${l.id}"
email: "${l.email || ""}"
niche: "${l.niche || ""}"
status: "${l.status}"
createdAt: "${l.createdAt}"
tags: [lead, ${nicheTag(l.niche || "geral")}, ${l.status}]
---

# ${statusEmoji[l.status] || "⚪"} ${l.name || "Sem nome"}

| Campo | Valor |
|-------|-------|
| **Email** | ${l.email || "—"} |
| **Nicho** | ${l.niche || "—"} |
| **Status** | ${l.status} |
| **Criado em** | ${formatDate(l.createdAt)} |

## Histórico

- ${formatDate(l.createdAt)} — Lead adicionado como \`${l.status}\`

## Ações

- [ ] Enviar email de prospecção
- [ ] Verificar perfil na plataforma
- [ ] Agendar follow-up

## Links
- [[01-Leads/_Dashboard]]
- [[08-Funcionalidades/Sistema-de-Leads]]
`;

    if (writeIfChanged(filePath, content)) written++;
    process.stdout.write(`\r  ${progressBar(i + 1, leads.length)}`);
  }

  console.log();

  // Dashboard de leads
  const byStatus = { novo: 0, contatado: 0, convertido: 0 };
  const byNiche  = {};
  for (const l of leads) {
    byStatus[l.status] = (byStatus[l.status] || 0) + 1;
    byNiche[l.niche]   = (byNiche[l.niche]   || 0) + 1;
  }

  const topNiches = Object.entries(byNiche)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([n, c]) => `| ${n} | ${c} |`)
    .join("\n");

  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20)
    .map((l) => `| [[${safeFilename(`${l.name || "sem-nome"}-${l.id.slice(-6)}`)}\\|${l.name}]] | ${l.email || "—"} | ${l.niche} | ${l.status} | ${formatDate(l.createdAt)} |`)
    .join("\n");

  const dashboard = `---
tags: [dashboard, leads]
updated: "${new Date().toISOString()}"
---

# 📊 Dashboard de Leads

> Sincronizado em: **${formatDate(new Date().toISOString())}**

## Resumo

| Métrica | Valor |
|---------|-------|
| **Total de Leads** | ${leads.length} |
| 🔵 Novos | ${byStatus.novo} |
| 🟡 Contatados | ${byStatus.contatado} |
| 🟢 Convertidos | ${byStatus.convertido} |
| **Taxa de Conversão** | ${leads.length ? ((byStatus.convertido / leads.length) * 100).toFixed(1) : 0}% |

## Top Nichos

| Nicho | Leads |
|-------|-------|
${topNiches || "| — | — |"}

## 20 Leads Mais Recentes

| Nome | Email | Nicho | Status | Data |
|------|-------|-------|--------|------|
${recentLeads || "| — | — | — | — | — |"}

## Links
- [[08-Funcionalidades/Sistema-de-Leads]]
- [[08-Funcionalidades/Scraper]]
`;

  writeIfChanged(path.join(DIRS.leads, "_Dashboard.md"), dashboard);
  log(`  ✅ ${written} notas de leads atualizadas`, "green");
}

// ── 02-Usuarios ───────────────────────────────────────────────────────────────

function syncUsers(db) {
  const users = (db.users || []).map((u) => ({ ...u }));
  log(`\n👥 Sincronizando ${users.length} usuários...`, "cyan");

  let written = 0;

  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const fname    = safeFilename(u.username || u.name || u.id);
    const filePath = path.join(DIRS.users, `${fname}.md`);

    const badges = (u.badges || []).map((b) => `- ${b.icon || "🏷️"} **${b.name}**`).join("\n") || "- Nenhuma";
    const perms   = u.permissions || {};
    const permList = Object.entries(perms).map(([k, v]) => `| ${k} | ${v ? "✅" : "❌"} |`).join("\n");

    const content = `---
id: "${u.id}"
username: "${u.username}"
role: "${u.role}"
createdAt: "${u.createdAt}"
tags: [usuario, ${u.role}]
---

# ${u.role === "admin" ? "👑" : "👤"} ${u.name || u.username}

| Campo | Valor |
|-------|-------|
| **Username** | @${u.username} |
| **Email** | ${u.email || "—"} |
| **Role** | ${u.role} |
| **Bio** | ${u.bio || "—"} |
| **Discord** | ${u.discordUsername ? `@${u.discordUsername}` : "—"} |
| **2FA** | ${u.twoFactorEnabled ? "✅ Ativo" : "❌ Inativo"} |
| **Criado em** | ${formatDate(u.createdAt)} |

## Badges

${badges}

## Permissões Customizadas

${permList || "Usando permissões do role padrão"}

## Links
- [[02-Usuarios/_Dashboard]]
`;

    if (writeIfChanged(filePath, content)) written++;
    process.stdout.write(`\r  ${progressBar(i + 1, users.length)}`);
  }

  console.log();

  // Dashboard de usuários
  const admins = users.filter((u) => u.role === "admin").length;
  const withDiscord = users.filter((u) => u.discordId).length;
  const with2fa = users.filter((u) => u.twoFactorEnabled).length;

  const userList = users
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((u) => `| [[${safeFilename(u.username || u.name || u.id)}\\|${u.name}]] | @${u.username} | ${u.role} | ${formatDate(u.createdAt)} |`)
    .join("\n");

  const dashboard = `---
tags: [dashboard, usuarios]
updated: "${new Date().toISOString()}"
---

# 👥 Dashboard de Usuários

> Sincronizado em: **${formatDate(new Date().toISOString())}**

## Resumo

| Métrica | Valor |
|---------|-------|
| **Total** | ${users.length} |
| 👑 Admins | ${admins} |
| 👤 Users | ${users.length - admins} |
| Discord vinculado | ${withDiscord} |
| 2FA ativo | ${with2fa} |

## Todos os Usuários

| Nome | Username | Role | Criado em |
|------|----------|------|-----------|
${userList || "| — | — | — | — |"}
`;

  writeIfChanged(path.join(DIRS.users, "_Dashboard.md"), dashboard);
  log(`  ✅ ${written} notas de usuários atualizadas`, "green");
}

// ── 04-Feed ───────────────────────────────────────────────────────────────────

function syncFeed(db) {
  const posts = db.posts || [];
  log(`\n📰 Sincronizando ${posts.length} posts do feed...`, "cyan");

  let written = 0;
  const MAX_POSTS = 200;
  const recent = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, MAX_POSTS);

  for (let i = 0; i < recent.length; i++) {
    const p = recent[i];
    const fname    = safeFilename(`${formatDate(p.createdAt).replace(/[/:]/g, "-")}-${p.id.slice(-6)}`);
    const filePath = path.join(DIRS.feed, `${fname}.md`);

    const comments = (p.comments || [])
      .map((c) => `> **${c.userName}** (${formatDate(c.createdAt)}): ${c.content}`)
      .join("\n\n") || "> Nenhum comentário";

    const content = `---
id: "${p.id}"
userId: "${p.userId}"
userName: "${p.userName}"
likes: ${p.likes?.length || 0}
comments: ${p.comments?.length || 0}
createdAt: "${p.createdAt}"
tags: [feed, post]
---

# 📝 Post de ${p.userName}

> ${formatDate(p.createdAt)}

---

${p.content}

---

## Engajamento

| ❤️ Likes | 💬 Comentários |
|-----------|----------------|
| ${p.likes?.length || 0} | ${p.comments?.length || 0} |

## Comentários

${comments}

## Links
- [[04-Feed/_Arquivo]]
`;

    if (writeIfChanged(filePath, content)) written++;
    process.stdout.write(`\r  ${progressBar(i + 1, recent.length)}`);
  }

  console.log();

  // Arquivo geral
  const archive = `---
tags: [feed, arquivo]
updated: "${new Date().toISOString()}"
---

# 📰 Arquivo do Feed

> Sincronizado em: **${formatDate(new Date().toISOString())}**
> Total de posts: **${posts.length}** (mostrando últimos ${Math.min(posts.length, MAX_POSTS)})

## Posts Recentes

${recent.map((p) => {
  const fname = safeFilename(`${formatDate(p.createdAt).replace(/[/:]/g, "-")}-${p.id.slice(-6)}`);
  return `- [[${fname}|${p.userName} — ${formatDate(p.createdAt)}]] · ❤️ ${p.likes?.length || 0} · 💬 ${p.comments?.length || 0}`;
}).join("\n") || "- Nenhum post ainda"}
`;

  writeIfChanged(path.join(DIRS.feed, "_Arquivo.md"), archive);
  log(`  ✅ ${written} posts sincronizados`, "green");
}

// ── 05-Chat ───────────────────────────────────────────────────────────────────

function syncChat(db) {
  const messages = db.messages || [];
  log(`\n💬 Sincronizando ${messages.length} mensagens do chat...`, "cyan");

  const recent = [...messages]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 500);

  const byUser = {};
  for (const m of messages) {
    byUser[m.userName] = (byUser[m.userName] || 0) + 1;
  }

  const topUsers = Object.entries(byUser)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => `| ${name} | ${count} |`)
    .join("\n");

  const msgLines = recent
    .map((m) => `**${m.userName}** (${formatDate(m.createdAt)}): ${m.content.slice(0, 200)}`)
    .join("\n\n---\n\n");

  const archive = `---
tags: [chat, arquivo]
updated: "${new Date().toISOString()}"
---

# 💬 Arquivo do Chat

> Sincronizado em: **${formatDate(new Date().toISOString())}**
> Total de mensagens: **${messages.length}** (mostrando últimas ${recent.length})

## Usuários Mais Ativos

| Usuário | Mensagens |
|---------|-----------|
${topUsers || "| — | — |"}

## Últimas Mensagens

${msgLines || "Nenhuma mensagem ainda."}
`;

  const changed = writeIfChanged(path.join(DIRS.chat, "_Arquivo.md"), archive);
  log(`  ✅ Chat ${changed ? "atualizado" : "sem mudanças"}`, "green");
}

// ── 03-Scraper ────────────────────────────────────────────────────────────────

function syncScraperSessions(db) {
  const leads  = db.leads || [];
  const today  = new Date().toISOString().slice(0, 10);
  const fname  = path.join(DIRS.scraper, `_Sessions.md`);

  const twitchLeads = leads.filter((l) => ["Art", "Makers & Crafting", "VALORANT", "Fortnite", "Counter-Strike", "Twitch"].includes(l.niche));
  const kickLeads   = leads.filter((l) => l.niche === "Kick");
  const withEmail   = leads.filter((l) => l.email && l.email.includes("@"));

  const content = `---
tags: [scraper, sessions]
updated: "${new Date().toISOString()}"
---

# 🕷️ Sessões do Scraper

> Sincronizado em: **${formatDate(new Date().toISOString())}**

## Estatísticas Totais

| Plataforma | Leads | Com Email |
|------------|-------|-----------|
| Twitch | ${twitchLeads.length} | ${twitchLeads.filter((l) => l.email).length} |
| Kick | ${kickLeads.length} | ${kickLeads.filter((l) => l.email).length} |
| **Total** | **${leads.length}** | **${withEmail.length}** |

## Taxa de Captação de Email

- Total de leads: **${leads.length}**
- Com email: **${withEmail.length}**
- Taxa: **${leads.length ? ((withEmail.length / leads.length) * 100).toFixed(1) : 0}%**

## Por Nicho

${Object.entries(
    leads.reduce((acc, l) => { acc[l.niche] = (acc[l.niche] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).map(([n, c]) => `| ${n} | ${c} |`).join("\n") || "| — | — |"}

## Links
- [[01-Leads/_Dashboard]]
- [[08-Funcionalidades/Scraper]]
`;

  writeIfChanged(fname, content);
  log(`  ✅ Sessões do scraper atualizadas`, "green");
}

// ── INDEX MASTER ──────────────────────────────────────────────────────────────

function syncIndex(db) {
  const leads    = db.leads    || [];
  const users    = db.users    || [];
  const posts    = db.posts    || [];
  const messages = db.messages || [];

  const content = `---
tags: [index, master]
updated: "${new Date().toISOString()}"
---

# 🧠 OUTSIDEHUB — Segundo Cérebro

> Sincronizado automaticamente com o **db.json** do OUTSIDEHUB.
> Última atualização: **${formatDate(new Date().toISOString())}**

---

## 📊 Visão Geral

| Módulo | Total | Link |
|--------|-------|------|
| 📊 Leads | ${leads.length} | [[01-Leads/_Dashboard]] |
| 👥 Usuários | ${users.length} | [[02-Usuarios/_Dashboard]] |
| 🕷️ Scraper | — | [[03-Scraper/_Sessions]] |
| 📰 Feed | ${posts.length} posts | [[04-Feed/_Arquivo]] |
| 💬 Chat | ${messages.length} msgs | [[05-Chat/_Arquivo]] |

---

## 🗺️ Navegação

### Base de Conhecimento
- [[06-Design-System/Gang-Liquid-Glass]] — Design System completo
- [[06-Design-System/Paleta-de-Cores]] — Cores e tokens CSS
- [[07-Arquitetura/Stack]] — Stack tecnológica
- [[07-Arquitetura/Banco-de-Dados]] — Schema do db.json
- [[07-Arquitetura/Rotas-API]] — Todas as rotas da API

### Funcionalidades
- [[08-Funcionalidades/Scraper]] — Como o scraper funciona
- [[08-Funcionalidades/Sistema-de-Leads]] — CRM de leads
- [[08-Funcionalidades/Chat]] — Chat global + badges
- [[08-Funcionalidades/Admin]] — Painel Admin
- [[08-Funcionalidades/EmailDispatch]] — Disparo de emails

### Dados Vivos (sincronizados)
- [[01-Leads/_Dashboard]] — Dashboard de leads
- [[02-Usuarios/_Dashboard]] — Dashboard de usuários
- [[03-Scraper/_Sessions]] — Sessões do scraper
- [[04-Feed/_Arquivo]] — Arquivo do feed
- [[05-Chat/_Arquivo]] — Arquivo do chat

### Recursos
- [[09-Roadmap/Features-Planejadas]] — O que vem por aí
- [[10-Recursos/Chaves-API]] — Como obter credenciais
- [[10-Recursos/Como-Rodar]] — Setup e desenvolvimento

---

## 🎨 Identidade

**"Gang Liquid Glass"** — Estética dark premium, vidro translúcido, dois modos:
- 🔴 **Modo Oni** — Vermelho sangue + vidro negro
- ⚪ **Modo Crystal** — Prata + diamante

---

## ⚡ Sync Rápido

\`\`\`bash
# Na pasta do projeto:
node sync-obsidian.js          # sincroniza uma vez
node sync-obsidian.js --watch  # fica monitorando
\`\`\`
`;

  writeIfChanged(path.join(VAULT_PATH, "00-INDEX.md"), content);
  log(`  ✅ INDEX master atualizado`, "green");
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

function runSync() {
  log(`\n${"═".repeat(55)}`, "bold");
  log(`  🧠 OUTSIDEHUB → OBSIDIAN SYNC`, "bold");
  log(`${"═".repeat(55)}\n`, "bold");
  log(`  DB:    ${DB_PATH}`, "cyan");
  log(`  Vault: ${VAULT_PATH}\n`, "cyan");

  ensureDirs();

  const db = readDB();

  syncLeads(db);
  syncUsers(db);
  syncScraperSessions(db);
  syncFeed(db);
  syncChat(db);
  syncIndex(db);

  log(`\n${"═".repeat(55)}`, "bold");
  log(`  ✅ Sync concluído! Abra o Obsidian e acesse:`, "green");
  log(`     ${VAULT_PATH}`, "cyan");
  log(`${"═".repeat(55)}\n`, "bold");
}

// ── Watch Mode ────────────────────────────────────────────────────────────────

if (process.argv.includes("--watch")) {
  log("👁️  Watch mode ativo — monitorando db.json...", "yellow");
  runSync();

  let debounce = null;
  fs.watch(DB_PATH, () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      log(`\n🔄 db.json mudou — re-sincronizando...`, "yellow");
      runSync();
    }, 800);
  });
} else {
  runSync();
}
