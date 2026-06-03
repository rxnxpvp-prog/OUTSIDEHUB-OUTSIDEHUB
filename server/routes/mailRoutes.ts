import { Router } from "express";
import { ImapFlow } from "imapflow";
import { nanoid } from "nanoid";
import { getDB, saveDB } from "../db.js";
import type { HostingerAlias } from "../db.js";
import { requireAuth } from "../auth.js";
import type { AuthRequest } from "../auth.js";

const router = Router();

const aliasNames = [
  "james.hill", "charles.davis", "william.parker", "henry.morgan", "thomas.brooks",
  "oliver.reed", "ethan.walker", "lucas.bennett", "mason.cole", "logan.hayes",
  "noah.turner", "liam.foster", "owen.price", "jack.miller", "samuel.king",
  "arthur.gray", "leo.morris", "daniel.ward", "ben.carter", "max.river",
];

function publicConfig() {
  const db = getDB();
  const config = db.hostingerAliasConfig || {
    domain: "",
    inboxEmail: "",
    inboxPassword: "",
    imapHost: "imap.hostinger.com",
    imapPort: "993",
  };
  return {
    configured: Boolean(config.domain && config.inboxEmail && config.inboxPassword),
    domain: config.domain,
    inboxEmail: config.inboxEmail,
    imapHost: config.imapHost,
    imapPort: config.imapPort,
  };
}

function decodeQuotedPrintable(text: string) {
  return text
    .replace(/=\r?\n/g, "")
    .replace(/=([A-Fa-f0-9]{2})/g, (_match, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function headerValue(headers: string, name: string) {
  const unfolded = headers.replace(/\r?\n[ \t]+/g, " ");
  const match = unfolded.match(new RegExp(`^${name}:\\s*([^\\r\\n]+)`, "im"));
  return match?.[1]?.trim() || "";
}

function decodeBody(body: string, encoding: string) {
  const cleanEncoding = encoding.toLowerCase();
  if (cleanEncoding.includes("base64")) {
    try {
      return Buffer.from(body.replace(/\s+/g, ""), "base64").toString("utf8");
    } catch {
      return body;
    }
  }
  if (cleanEncoding.includes("quoted-printable")) {
    return decodeQuotedPrintable(body);
  }
  return body;
}

function stripHtml(text: string) {
  return text
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function parseMimeParts(raw: string): { contentType: string; text: string }[] {
  const [headers = "", ...bodyParts] = raw.split(/\r?\n\r?\n/);
  const body = bodyParts.join("\n\n");
  const contentType = headerValue(headers, "Content-Type");
  const boundary = contentType.match(/boundary="?([^";]+)"?/i)?.[1];

  if (!boundary) {
    return [{
      contentType,
      text: decodeBody(body, headerValue(headers, "Content-Transfer-Encoding")),
    }];
  }

  const delimiter = `--${boundary}`;
  return body
    .split(delimiter)
    .map((part) => part.replace(new RegExp(`^\\s*|--\\s*$`, "g"), ""))
    .filter((part) => part.trim())
    .flatMap((part) => {
      const [partHeaders = "", ...partBody] = part.split(/\r?\n\r?\n/);
      const partContentType = headerValue(partHeaders, "Content-Type");
      const partText = decodeBody(partBody.join("\n\n"), headerValue(partHeaders, "Content-Transfer-Encoding"));
      if (/multipart\//i.test(partContentType)) return parseMimeParts(part);
      return [{ contentType: partContentType, text: partText }];
    });
}

function readableText(raw: string) {
  const parts = parseMimeParts(raw);
  const plain = parts.find((part) => /text\/plain/i.test(part.contentType));
  const html = parts.find((part) => /text\/html/i.test(part.contentType));
  const chosen = plain?.text || html?.text || parts.map((part) => part.text).join("\n\n") || raw;
  return stripHtml(chosen)
    .replace(/^Content-[A-Za-z-]+:.*$/gim, " ")
    .replace(/^--[A-Za-z0-9=_+./-]+--?$/gim, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCodes(text: string) {
  const found = new Set<string>();
  const priority = [
    /\b(?:code|codigo|c[oó]digo|verification|verify|security|instagram|confirma[cç][aã]o)\D{0,40}(\d{4,8})\b/gi,
    /\b(\d{6})\b/g,
    /\b(\d{4,8})\b/g,
  ];

  for (const pattern of priority) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text))) {
      const code = match[1];
      if (!code || /^0+$/.test(code) || code === "2026") continue;
      found.add(code);
      if (found.size >= 6) return Array.from(found);
    }
  }
  return Array.from(found);
}

function aliasForUser(req: AuthRequest, address: string) {
  const db = getDB();
  return (db.hostingerAliases || []).find(
    (alias) => alias.address.toLowerCase() === address.toLowerCase() && alias.userId === req.user?.userId,
  );
}

function createAddress(domain: string, existing: HostingerAlias[]) {
  for (let i = 0; i < 50; i++) {
    const base = aliasNames[Math.floor(Math.random() * aliasNames.length)];
    const suffix = Math.random().toString(36).slice(2, 6);
    const address = `${base}.${suffix}@${domain}`.toLowerCase();
    if (!existing.some((alias) => alias.address === address)) return address;
  }
  return `user.${nanoid(8).toLowerCase()}@${domain}`.toLowerCase();
}

router.get("/hostinger-alias/config", requireAuth, (_req, res) => {
  res.json(publicConfig());
});

router.get("/hostinger-alias/aliases", requireAuth, (req: AuthRequest, res) => {
  const db = getDB();
  const aliases = (db.hostingerAliases || [])
    .filter((alias) => alias.userId === req.user?.userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ aliases });
});

router.post("/hostinger-alias/aliases", requireAuth, (req: AuthRequest, res) => {
  const db = getDB();
  const config = db.hostingerAliasConfig;
  if (!config?.domain || !config?.inboxEmail || !config?.inboxPassword) {
    res.status(400).json({ error: "Configure o catch-all da Hostinger no Admin" });
    return;
  }

  db.hostingerAliases = db.hostingerAliases || [];
  const alias: HostingerAlias = {
    id: `hostinger-${nanoid(10)}`,
    userId: req.user!.userId,
    address: createAddress(config.domain.toLowerCase(), db.hostingerAliases),
    createdAt: new Date().toISOString(),
  };
  db.hostingerAliases.push(alias);
  saveDB(db);
  res.status(201).json({ alias });
});

router.delete("/hostinger-alias/aliases/:id", requireAuth, (req: AuthRequest, res) => {
  const db = getDB();
  const before = (db.hostingerAliases || []).length;
  db.hostingerAliases = (db.hostingerAliases || []).filter(
    (alias) => !(alias.id === req.params.id && alias.userId === req.user?.userId),
  );
  if (db.hostingerAliases.length === before) {
    res.status(404).json({ error: "Alias nao encontrado" });
    return;
  }
  saveDB(db);
  res.json({ ok: true });
});

router.get("/hostinger-alias/messages", requireAuth, async (req: AuthRequest, res) => {
  const alias = String(req.query.alias || "").trim().toLowerCase();
  if (!alias || !alias.includes("@")) {
    res.status(400).json({ error: "Alias obrigatorio" });
    return;
  }
  if (!aliasForUser(req, alias)) {
    res.status(403).json({ error: "Esse alias nao pertence ao usuario logado" });
    return;
  }

  const db = getDB();
  const config = db.hostingerAliasConfig;
  if (!config?.inboxEmail || !config?.inboxPassword || !config?.imapHost) {
    res.status(400).json({ error: "Configure email, senha e IMAP da Hostinger no Admin" });
    return;
  }

  const client = new ImapFlow({
    host: config.imapHost,
    port: Number(config.imapPort || 993),
    secure: true,
    auth: {
      user: config.inboxEmail,
      pass: config.inboxPassword,
    },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const total = client.mailbox ? (client.mailbox.exists || 0) : 0;
      const from = Math.max(1, total - 120);
      const messages = [];
      for await (const msg of client.fetch(`${from}:*`, { envelope: true, source: true, internalDate: true, uid: true })) {
        const raw = msg.source?.toString("utf8") || "";
        const envelopeTo = [
          ...(msg.envelope?.to || []),
          ...(msg.envelope?.cc || []),
          ...(msg.envelope?.bcc || []),
        ].map((to) => to.address?.toLowerCase()).join(" ");
        if (!raw.toLowerCase().includes(alias) && !envelopeTo.includes(alias)) continue;

        const subject = msg.envelope?.subject || "(sem assunto)";
        const fromAddress = msg.envelope?.from?.[0]
          ? `${msg.envelope.from[0].name || ""} <${msg.envelope.from[0].address || ""}>`.trim()
          : "";
        const text = readableText(raw);
        messages.push({
          id: String(msg.uid),
          subject,
          from: fromAddress,
          createdAt: msg.internalDate ? (typeof msg.internalDate === "string" ? msg.internalDate : msg.internalDate.toISOString()) : new Date().toISOString(),
          intro: text.slice(0, 320),
          text: text.slice(0, 6000),
          codes: extractCodes(text),
        });
      }
      res.json({ messages: messages.reverse() });
    } finally {
      lock.release();
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Erro ao ler IMAP Hostinger" });
  } finally {
    await client.logout().catch(() => {});
  }
});

export default router;
