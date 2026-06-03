import { Router } from "express";
import axios, { type AxiosInstance } from "axios";
import { requireAuth } from "../auth.js";

const router = Router();

const SMSRUSH_BASE_URL = (process.env.SMSRUSH_BASE_URL || "").replace(/\/$/, "");
const SMSRUSH_EMAIL = process.env.SMSRUSH_EMAIL || "";
const SMSRUSH_PASSWORD = process.env.SMSRUSH_PASSWORD || "";

let cachedToken: string | null = null;

function configured() {
  return Boolean(SMSRUSH_BASE_URL && SMSRUSH_EMAIL && SMSRUSH_PASSWORD);
}

function dataOf(payload: any) {
  return payload?.data ?? payload?.result ?? payload;
}

function listOf(payload: any, keys: string[]) {
  const data = dataOf(payload);
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    const value = data?.[key] ?? payload?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function tokenOf(payload: any) {
  const data = dataOf(payload);
  return data?.token ?? data?.access_token ?? data?.accessToken ?? payload?.token ?? payload?.access_token ?? "";
}

function serviceCategory(label: string) {
  const text = label.toLowerCase();
  if (/(facebook|instagram|twitter|x|tiktok|vk|tinder)/.test(text)) return "social";
  if (/(google|gmail|yandex|microsoft|apple|proton|yahoo)/.test(text)) return "accounts";
  if (/(amazon|netflix|uber|olx|avito|youla|airbnb|shop|market)/.test(text)) return "market";
  if (/(paypal|pay|bank|coin|crypto|finance|alipay)/.test(text)) return "finance";
  return "other";
}

function blockedService(label: string) {
  return /(telegram|whatsapp|viber|wechat|line|signal|messenger)/i.test(label);
}

async function login() {
  if (!configured()) {
    const missing = [
      !SMSRUSH_BASE_URL ? "SMSRUSH_BASE_URL" : "",
      !SMSRUSH_EMAIL ? "SMSRUSH_EMAIL" : "",
      !SMSRUSH_PASSWORD ? "SMSRUSH_PASSWORD" : "",
    ].filter(Boolean).join(", ");
    throw Object.assign(new Error(`Configure ${missing} no .env para usar SMSRush.`), { statusCode: 400 });
  }
  const response = await axios.post(`${SMSRUSH_BASE_URL}/api/v1/auth/login`, {
    email: SMSRUSH_EMAIL,
    password: SMSRUSH_PASSWORD,
  }, { timeout: 20000, validateStatus: () => true });
  const token = tokenOf(response.data);
  if (!token) {
    throw Object.assign(new Error(response.data?.message || "SMSRush nao retornou token de acesso."), { statusCode: response.status || 400 });
  }
  cachedToken = token;
  return token;
}

async function client(): Promise<AxiosInstance> {
  const token = cachedToken || await login();
  return axios.create({
    baseURL: SMSRUSH_BASE_URL,
    timeout: 20000,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    validateStatus: () => true,
  });
}

async function rush<T = any>(method: "get" | "post" | "delete", url: string, body?: any, retry = true): Promise<T> {
  const api = await client();
  const response = method === "get"
    ? await api.get(url)
    : method === "delete"
      ? await api.delete(url)
      : await api.post(url, body ?? {});
  if ((response.status === 401 || response.status === 403) && retry) {
    cachedToken = null;
    return rush(method, url, body, false);
  }
  if (response.status >= 400) {
    const message = response.data?.message || response.data?.error || response.data?.errors?.[0]?.message || "Erro na SMSRush";
    throw Object.assign(new Error(message), { statusCode: response.status, payload: response.data });
  }
  return response.data;
}

function normalizeCountry(item: any) {
  return {
    id: String(item.id ?? item.country_id ?? item.code ?? item.countryCode ?? ""),
    label: String(item.name ?? item.country ?? item.title ?? item.label ?? item.iso ?? "Pais"),
    iso: item.iso ?? item.iso2 ?? item.short_name,
  };
}

function normalizeOperator(item: any) {
  return {
    id: String(item.id ?? item.operator_id ?? item.code ?? item.slug ?? item.name ?? "any"),
    label: String(item.name ?? item.title ?? item.label ?? item.code ?? "Any"),
  };
}

function normalizeService(item: any) {
  const label = String(item.name ?? item.service ?? item.title ?? item.label ?? `Servico ${item.id ?? ""}`);
  const id = String(item.id ?? item.service_id ?? item.code ?? "");
  const serverId = item.server_id ?? item.serverId ?? item.server?.id ?? item.servers?.[0]?.id ?? 1;
  return {
    id,
    label,
    badge: label.slice(0, 2).toUpperCase(),
    category: serviceCategory(label),
    cost: item.price ?? item.cost ?? item.amount ?? item.value,
    count: Number(item.count ?? item.available ?? item.quantity ?? item.stock ?? 1),
    serverId,
  };
}

function findCode(payload: any) {
  const data = dataOf(payload);
  const direct = data?.code ?? data?.sms_code ?? data?.otp ?? data?.verification_code ?? data?.activation_code;
  if (direct) return String(direct);
  const message = String(data?.message ?? data?.sms ?? data?.text ?? data?.last_sms ?? data?.messages?.[0]?.text ?? "");
  return message.match(/\b\d{4,8}\b/)?.[0];
}

function parseStatus(payload: any) {
  const data = dataOf(payload);
  const code = findCode(payload);
  const rawStatus = String(data?.status ?? data?.state ?? payload?.status ?? "").toLowerCase();
  if (code) return { state: "code", code, message: "Codigo recebido" };
  if (/cancel|expire|reject/.test(rawStatus)) return { state: "cancelled", message: "Ativacao cancelada ou expirada" };
  if (/wait|pending|process|active/.test(rawStatus)) return { state: "waiting", message: "Aguardando SMS" };
  return { state: "waiting", message: data?.message || "Aguardando SMS" };
}

router.get("/balance", requireAuth, async (_req, res, next) => {
  try {
    const payload = await rush("get", "/api/v1/auth/me");
    const data = dataOf(payload);
    res.json({ balance: data?.balance ?? data?.wallet ?? data?.credits ?? "--", raw: payload });
  } catch (err) {
    next(err);
  }
});

router.get("/countries", requireAuth, async (_req, res, next) => {
  try {
    const payload = await rush("get", "/api/v1/countries");
    const countries = listOf(payload, ["countries", "items"]).map(normalizeCountry).filter((item) => item.id);
    res.json({ countries, raw: payload });
  } catch (err) {
    next(err);
  }
});

router.get("/operators", requireAuth, async (_req, res, next) => {
  try {
    const payload = await rush("get", "/api/v1/operators");
    const operators = [{ id: "any", label: "Any" }, ...listOf(payload, ["operators", "items"]).map(normalizeOperator).filter((item) => item.id)];
    res.json({ operators, raw: payload });
  } catch (err) {
    next(err);
  }
});

router.get("/services", requireAuth, async (req, res, next) => {
  try {
    const country = String(req.query.country || "");
    if (!country) {
      res.status(400).json({ error: "Pais obrigatorio" });
      return;
    }
    const payload = await rush("get", `/api/v1/services/by-country/${encodeURIComponent(country)}`);
    const services = listOf(payload, ["services", "items"])
      .map(normalizeService)
      .filter((item) => item.id && !blockedService(item.label) && item.count > 0);
    res.json({ services, raw: payload });
  } catch (err) {
    next(err);
  }
});

router.post("/number", requireAuth, async (req, res, next) => {
  try {
    const { service, country, serverId } = req.body ?? {};
    if (!service || !country) {
      res.status(400).json({ error: "Pais e servico sao obrigatorios" });
      return;
    }
    const payload = await rush("post", "/api/v1/virtual-numbers", {
      country_id: Number(country),
      service_id: Number(service),
      server_id: Number(serverId || 1),
    });
    const data = dataOf(payload);
    const id = data?.id ?? data?.activation_id ?? data?.virtual_number_id ?? data?.order_id;
    const phone = data?.phone ?? data?.number ?? data?.msisdn ?? data?.virtual_number;
    if (!id || !phone) {
      res.status(400).json({ ok: false, error: "Resposta da SMSRush nao trouxe id/numero", raw: payload });
      return;
    }
    res.json({ ok: true, id: String(id), phone: String(phone), raw: payload });
  } catch (err) {
    next(err);
  }
});

router.get("/activations", requireAuth, async (_req, res, next) => {
  try {
    const payload = await rush("get", "/api/v1/virtual-numbers/activations");
    res.json({ activations: listOf(payload, ["activations", "items"]), raw: payload });
  } catch (err) {
    next(err);
  }
});

router.get("/status/:id", requireAuth, async (req, res, next) => {
  try {
    const payload = await rush("get", `/api/v1/virtual-numbers/${encodeURIComponent(req.params.id)}/status`);
    res.json({ ...parseStatus(payload), raw: payload });
  } catch (err) {
    next(err);
  }
});

router.post("/status/:id", requireAuth, async (req, res, next) => {
  try {
    const status = String(req.body?.status || "").trim();
    if (status === "1") {
      res.json({ ok: true, state: "waiting", message: "Aguardando SMS", raw: null });
      return;
    }
    if (status === "3") {
      const payload = await rush("post", `/api/v1/virtual-numbers/${encodeURIComponent(req.params.id)}/request-new-sms`);
      res.json({ ok: true, state: "retry", message: "Novo SMS solicitado", raw: payload });
      return;
    }
    if (status === "6") {
      const payload = await rush("post", `/api/v1/virtual-numbers/${encodeURIComponent(req.params.id)}/confirm`);
      res.json({ ok: true, state: "code", message: "SMS confirmado", raw: payload });
      return;
    }
    if (status === "8") {
      const payload = await rush("delete", `/api/v1/virtual-numbers/${encodeURIComponent(req.params.id)}`);
      res.json({ ok: true, state: "cancelled", message: "Numero cancelado", raw: payload });
      return;
    }
    res.status(400).json({ error: "Status invalido" });
  } catch (err) {
    next(err);
  }
});

export default router;
