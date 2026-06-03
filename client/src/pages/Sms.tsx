import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ban, CheckCircle, Copy, Hash, Phone, Plus, RefreshCw, Search, Send, Signal } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import TempMail from "./TempMail";

const KEY = "outsidehub_sms_activations";
const MONO = "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace";

type ActivationState = "waiting" | "retry" | "resend" | "code" | "cancelled" | "missing" | "error" | "unknown";

interface SmsActivation {
  id: string;
  phone: string;
  service: string;
  country: string;
  operator?: string;
  code?: string;
  state: ActivationState;
  message: string;
  raw?: string;
  createdAt: string;
  updatedAt: string;
}

type ServiceCategory = "all" | "social" | "accounts" | "market" | "finance" | "other";

interface ServiceOption {
  id: string;
  label: string;
  category: Exclude<ServiceCategory, "all">;
  badge: string;
  cost?: string;
  count?: number;
  serverId?: string | number;
}

const CATEGORIES: { id: ServiceCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "social", label: "Social" },
  { id: "accounts", label: "Accounts" },
  { id: "market", label: "Market" },
  { id: "finance", label: "Finance" },
  { id: "other", label: "Other" },
];

const SERVICES: ServiceOption[] = [
  { id: "fb", label: "Facebook", category: "social", badge: "FB" },
  { id: "ig", label: "Instagram", category: "social", badge: "IG" },
  { id: "tw", label: "Twitter / X", category: "social", badge: "X" },
  { id: "lf", label: "TikTok", category: "social", badge: "TT" },
  { id: "vk", label: "VK", category: "social", badge: "VK" },
  { id: "oi", label: "Tinder", category: "social", badge: "TD" },
  { id: "go", label: "Google / Gmail", category: "accounts", badge: "GO" },
  { id: "ya", label: "Yandex", category: "accounts", badge: "YA" },
  { id: "mm", label: "Microsoft", category: "accounts", badge: "MS" },
  { id: "wx", label: "Apple", category: "accounts", badge: "AP" },
  { id: "dp", label: "ProtonMail", category: "accounts", badge: "PM" },
  { id: "mb", label: "Yahoo", category: "accounts", badge: "YH" },
  { id: "am", label: "Amazon", category: "market", badge: "AM" },
  { id: "nf", label: "Netflix", category: "market", badge: "NF" },
  { id: "ub", label: "Uber", category: "market", badge: "UB" },
  { id: "sn", label: "OLX", category: "market", badge: "OL" },
  { id: "av", label: "Avito", category: "market", badge: "AV" },
  { id: "ym", label: "Youla", category: "market", badge: "YL" },
  { id: "uk", label: "Airbnb", category: "market", badge: "AB" },
  { id: "hw", label: "AliPay", category: "finance", badge: "AP" },
  { id: "ts", label: "PayPal", category: "finance", badge: "PP" },
  { id: "ot", label: "Outro / custom", category: "other", badge: "OT" },
];

const COUNTRIES = [
  { id: "0", label: "Russia / Default" },
  { id: "73", label: "Brazil" },
  { id: "12", label: "USA" },
  { id: "16", label: "England" },
  { id: "6", label: "Indonesia" },
  { id: "22", label: "India" },
];

const COUNTRY_OPTIONS = [
  ...COUNTRIES,
  { id: "36", label: "Canada" },
  { id: "43", label: "Germany" },
  { id: "78", label: "France" },
  { id: "86", label: "Italy" },
  { id: "56", label: "Spain" },
  { id: "48", label: "Mexico" },
  { id: "33", label: "Colombia" },
  { id: "39", label: "Argentina" },
];

const OPERATORS = [
  { id: "any", label: "Any" },
  { id: "beeline", label: "Beeline" },
  { id: "megafon", label: "Megafon" },
  { id: "mts", label: "MTS" },
  { id: "tele2", label: "Tele2" },
  { id: "rostelecom", label: "Rostelecom" },
  { id: "yota", label: "Yota" },
  { id: "motiv", label: "Motiv" },
  { id: "matrix", label: "Matrix" },
  { id: "tmobile", label: "T-Mobile" },
];

interface ServicePrice {
  cost?: string;
  count?: number;
}

function load(): SmsActivation[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

function save(items: SmsActivation[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

function Spin() {
  return <span className="spin" style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid currentColor", borderTopColor: "transparent", display: "inline-block", opacity: 0.65 }} />;
}

const card: React.CSSProperties = {
  background: "radial-gradient(circle at 14% 12%, rgba(255,255,255,0.08), transparent 24%), linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.012)), rgba(6,6,8,0.8)",
  border: "1px solid rgba(255,255,255,0.085)",
  borderRadius: 10,
  overflow: "hidden",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.055)",
};

const input: React.CSSProperties = {
  width: "100%",
  height: 34,
  padding: "0 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.085)",
  background: "rgba(255,255,255,0.04)",
  color: "var(--foreground)",
  fontSize: 12,
  outline: "none",
};

const label: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  color: "rgba(255,255,255,0.32)",
  fontFamily: MONO,
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
};

function stateColor(state: ActivationState) {
  if (state === "code") return "#22c55e";
  if (state === "cancelled" || state === "missing") return "rgba(255,255,255,0.32)";
  if (state === "error") return "rgba(229,72,77,0.9)";
  return "rgba(255,255,255,0.72)";
}

function flattenPrices(payload: any, country: string): Record<string, ServicePrice> {
  const root = payload?.prices ?? payload;
  const source = root?.[country] ?? root?.[String(country)] ?? root;
  const out: Record<string, ServicePrice> = {};
  if (!source || typeof source !== "object" || Array.isArray(source)) return out;

  for (const [key, value] of Object.entries(source as Record<string, any>)) {
    if (value && typeof value === "object" && ("cost" in value || "count" in value)) {
      out[key] = {
        cost: value.cost !== undefined ? String(value.cost) : undefined,
        count: value.count !== undefined ? Number(value.count) : undefined,
      };
    } else if (value && typeof value === "object") {
      for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, any>)) {
        if (nestedValue && typeof nestedValue === "object" && ("cost" in nestedValue || "count" in nestedValue)) {
          out[nestedKey] = {
            cost: (nestedValue as any).cost !== undefined ? String((nestedValue as any).cost) : undefined,
            count: (nestedValue as any).count !== undefined ? Number((nestedValue as any).count) : undefined,
          };
        }
      }
    }
  }
  return out;
}

function flattenCountryPrices(payload: any, service: string): Record<string, ServicePrice> {
  const root = payload?.prices ?? payload;
  const out: Record<string, ServicePrice> = {};
  if (!root || typeof root !== "object" || Array.isArray(root)) return out;

  for (const [countryId, value] of Object.entries(root as Record<string, any>)) {
    const price = value?.[service];
    if (price && typeof price === "object") {
      const count = price.count !== undefined ? Number(price.count) : 0;
      if (count > 0) {
        out[countryId] = {
          cost: price.cost !== undefined ? String(price.cost) : undefined,
          count,
        };
      }
    }
  }
  return out;
}

export default function Sms() {
  const [tool, setTool] = useState<"sms" | "mail">("sms");
  const [items, setItems] = useState<SmsActivation[]>(load);
  const [selected, setSelected] = useState<string | null>(() => load()[0]?.id || null);
  const [balance, setBalance] = useState<string>("--");
  const [category, setCategory] = useState<ServiceCategory>("social");
  const [serviceSearch, setServiceSearch] = useState("");
  const [countries, setCountries] = useState<typeof COUNTRY_OPTIONS>([]);
  const [apiServices, setApiServices] = useState<ServiceOption[]>([]);
  const [apiOperators, setApiOperators] = useState<typeof OPERATORS>([]);
  const [priceMap, setPriceMap] = useState<Record<string, ServicePrice>>({});
  const [service, setService] = useState("fb");
  const [customService, setCustomService] = useState("");
  const [country, setCountry] = useState("73");
  const [operator, setOperator] = useState("any");
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [buying, setBuying] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = useMemo(() => items.find((item) => item.id === selected) || null, [items, selected]);
  const serviceOptions = apiServices.length ? apiServices : SERVICES;
  const countryOptions = countries.length ? countries : COUNTRY_OPTIONS;
  const operatorOptions = apiOperators.length ? apiOperators : OPERATORS;
  const visibleServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    return serviceOptions.filter((item) => {
      const categoryMatch = category === "all" || item.category === category;
      const searchMatch = !q || item.label.toLowerCase().includes(q) || item.id.includes(q);
      return categoryMatch && searchMatch;
    });
  }, [category, serviceOptions, serviceSearch]);
  const availableCountries = useMemo(() => {
    return countryOptions;
  }, [countryOptions]);
  const selectedServiceOption = serviceOptions.find((item) => item.id === service);
  const selectedPrice = selectedServiceOption || priceMap[service];
  const selectedOperator = operatorOptions.find((item) => item.id === operator) || operatorOptions[0] || OPERATORS[0];

  const persist = (next: SmsActivation[]) => {
    setItems(next);
    save(next);
  };

  const patchActivation = useCallback((id: string, patch: Partial<SmsActivation>) => {
    setItems((prev) => {
      const next = prev.map((item) => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item);
      save(next);
      return next;
    });
  }, []);

  const refreshBalance = useCallback(async () => {
    setLoadingBalance(true);
    try {
      const res = await api.get("/sms/balance");
      setBalance(res.data.balance);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to check SMS balance");
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  const refreshPrices = useCallback(async () => {
    const finalService = service === "ot" ? customService.trim() : service;
    if (!finalService) {
      setPriceMap({});
      setApiServices([]);
      return;
    }
    setLoadingPrices(true);
    try {
      const [countriesRes, operatorsRes, servicesRes] = await Promise.all([
        api.get("/sms/countries"),
        api.get("/sms/operators"),
        api.get("/sms/services", { params: { country } }),
      ]);
      setCountries(countriesRes.data.countries || []);
      setApiOperators(operatorsRes.data.operators || []);
      const nextServices: ServiceOption[] = servicesRes.data.services || [];
      setApiServices(nextServices);
      setPriceMap(Object.fromEntries(nextServices.map((item) => [item.id, { cost: item.cost, count: item.count }])));
      if (nextServices.length && !nextServices.some((item) => item.id === service)) setService(nextServices[0].id);
    } catch (err: any) {
      setPriceMap({});
      setApiServices([]);
      toast.error(err.response?.data?.error || "Failed to fetch SMS prices");
    } finally {
      setLoadingPrices(false);
    }
  }, [country, service]);

  const checkStatus = useCallback(async (activation: SmsActivation, silent = false) => {
    if (!silent) setChecking(activation.id);
    try {
      const res = await api.get(`/sms/status/${activation.id}`);
      patchActivation(activation.id, {
        state: res.data.state,
        message: res.data.message,
        code: res.data.code || activation.code,
        raw: res.data.raw,
      });
      if (res.data.state === "code" && res.data.code && res.data.code !== activation.code) {
        toast.success(`Code received: ${res.data.code}`);
      }
    } catch (err: any) {
      if (!silent) toast.error(err.response?.data?.error || "Failed to check SMS");
    } finally {
      if (!silent) setChecking(null);
    }
  }, [patchActivation]);

  useEffect(() => { refreshBalance(); }, [refreshBalance]);
  useEffect(() => { refreshPrices(); }, [refreshPrices]);
  useEffect(() => {
    if (!availableCountries.length) return;
    if (!availableCountries.some((option) => option.id === country)) {
      setCountry(availableCountries[0].id);
    }
  }, [availableCountries, country]);

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    const pending = items.filter((item) => ["waiting", "retry", "resend", "unknown"].includes(item.state));
    if (!pending.length) return;
    timer.current = setInterval(() => {
      pending.forEach((item) => checkStatus(item, true));
    }, 8000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [items, checkStatus]);

  const buyNumber = async () => {
    const finalService = service === "ot" ? customService.trim() : service;
    if (!finalService) {
      toast.error("Enter the service code");
      return;
    }
    if (!availableCountries.length) {
      toast.error("No country available for this service");
      return;
    }
    setBuying(true);
    try {
      const res = await api.post("/sms/number", {
        service: finalService,
        country,
        operator: operator === "any" ? undefined : operator,
        serverId: selectedServiceOption?.serverId || 1,
      });
      const now = new Date().toISOString();
      const activation: SmsActivation = {
        id: res.data.id,
        phone: res.data.phone,
        service: finalService,
        country,
        operator: operator === "any" ? undefined : operator,
        state: "waiting",
        message: "Use in the app and mark SMS sent",
        raw: res.data.raw,
        createdAt: now,
        updatedAt: now,
      };
      const next = [activation, ...items];
      persist(next);
      setSelected(activation.id);
      toast.success("Number reserved");
      refreshBalance();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to reserve number");
    } finally {
      setBuying(false);
    }
  };

  const setRemoteStatus = async (activation: SmsActivation, status: "1" | "6" | "8") => {
    setActioning(`${activation.id}:${status}`);
    try {
      const res = await api.post(`/sms/status/${activation.id}`, { status });
      const statusPatch: Partial<SmsActivation> = {
        raw: res.data.raw,
        state: res.data.state || activation.state,
        message: res.data.message || activation.message,
      };
      if (status === "1") {
        statusPatch.state = "waiting";
        statusPatch.message = res.data.message || "Ready to receive SMS";
      }
      if (status === "8") {
        statusPatch.state = "cancelled";
        statusPatch.message = res.data.message || "Activation cancelled";
      }
      if (status === "6") {
        statusPatch.state = "code";
        statusPatch.message = res.data.message || "Activation completed";
      }
      patchActivation(activation.id, statusPatch);
      toast.success("Status updated");
      refreshBalance();
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.state || data?.message || data?.raw) {
        patchActivation(activation.id, {
          state: data.state || activation.state,
          message: data.message || data.error || activation.message,
          raw: data.raw,
        });
      }
      toast.error(data?.message || data?.error || "Failed to update status");
    } finally {
      setActioning(null);
    }
  };

  const copy = (value: string, message = "Copied") => {
    navigator.clipboard.writeText(value);
    toast.success(message);
  };

  const clearLocal = (id: string) => {
    const next = items.filter((item) => item.id !== id);
    persist(next);
    if (selected === id) setSelected(next[0]?.id || null);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 className="page-title">Mailboxes</h1>
          <p className="page-sub">Virtual SMS and temporary email</p>
        </div>
        {tool === "sms" && <button onClick={refreshBalance} disabled={loadingBalance} className="action action-solid" style={{ gap: 6 }}>
          {loadingBalance ? <Spin /> : <Signal size={14} />}
          Saldo: {balance}
        </button>}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[
          { id: "sms" as const, label: "SMS" },
          { id: "mail" as const, label: "Email" },
        ].map((item) => {
          const active = tool === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTool(item.id)}
              className={active ? "action action-solid" : "action action-ghost"}
              style={{ minWidth: 96, justifyContent: "center" }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tool === "mail" ? <TempMail embedded /> : (
      <div className="stack-mobile" style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={card}>
            <div style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>New number</span>
            </div>
            <div style={{ padding: 12, display: "grid", gap: 10 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                  <span style={{ ...label, marginBottom: 0 }}>categories</span>
                  <button onClick={refreshPrices} disabled={loadingPrices} className="action action-ghost" style={{ padding: "3px 7px", gap: 5, fontSize: 10 }}>
                    {loadingPrices ? <Spin /> : <RefreshCw size={11} />}
                    prices
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                  {CATEGORIES.map((item) => {
                    const active = category === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setCategory(item.id)}
                        style={{
                          height: 24,
                          padding: "0 9px",
                          borderRadius: 999,
                          border: `1px solid ${active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)"}`,
                          background: active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.035)",
                          color: active ? "rgba(255,255,255,0.86)" : "rgba(255,255,255,0.42)",
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <Search size={13} style={{ position: "absolute", left: 10, top: 10, color: "rgba(255,255,255,0.32)" }} />
                  <input value={serviceSearch} onChange={(e) => setServiceSearch(e.target.value)} placeholder="search service or code" style={{ ...input, paddingLeft: 30 }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6, maxHeight: 238, overflowY: "auto", paddingRight: 2 }}>
                  {visibleServices.map((option) => {
                    const active = service === option.id;
                    const price = priceMap[option.id];
                    const count = price?.count ?? 0;
                    const unavailable = Boolean(price) && count <= 0;
                    return (
                      <button
                        key={option.id}
                        onClick={() => { setService(option.id); if (option.id !== "ot") setCustomService(""); }}
                        title={`${option.label} (${option.id})`}
                        style={{
                          minHeight: 36,
                          height: 36,
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          padding: "5px 7px",
                          borderRadius: 999,
                          border: `1px solid ${active ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.075)"}`,
                          background: active ? "linear-gradient(90deg, rgba(255,255,255,0.14), rgba(255,255,255,0.045))" : "rgba(255,255,255,0.032)",
                          boxShadow: active ? "inset 0 0 0 1px rgba(255,255,255,0.035), 0 8px 18px rgba(0,0,0,0.18)" : "none",
                          opacity: unavailable ? 0.45 : 1,
                          textAlign: "left",
                        }}
                      >
                        <span style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          border: `1px solid ${active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)"}`,
                          background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                          color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.72)",
                          fontFamily: MONO,
                          fontSize: 9,
                          fontWeight: 900,
                        }}>{option.badge}</span>
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ display: "block", color: "rgba(255,255,255,0.78)", fontSize: 11, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{option.label}</span>
                          <span style={{ display: "flex", gap: 5, marginTop: 1, alignItems: "center", color: "rgba(255,255,255,0.34)", fontSize: 8, fontFamily: MONO }}>
                            <b style={{ color: "rgba(255,255,255,0.48)" }}>{option.id}</b>
                            {price ? <em style={{ fontStyle: "normal" }}>{price.cost ?? "--"} / {price.count ?? 0}</em> : <em style={{ fontStyle: "normal" }}>no price</em>}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {service === "ot" && (
                <div>
                  <span style={label}>service code</span>
                  <input value={customService} onChange={(e) => setCustomService(e.target.value.toLowerCase())} placeholder="ex: tw" style={input} />
                </div>
              )}
              <div>
                <span style={label}>country</span>
                <select value={availableCountries.some((option) => option.id === country) ? country : ""} onChange={(e) => setCountry(e.target.value)} disabled={!availableCountries.length} style={input}>
                  {!availableCountries.length && <option value="">No country available</option>}
                  {availableCountries.map((option) => {
                    return <option key={option.id} value={option.id}>{option.label} ({option.id})</option>;
                  })}
                </select>
              </div>
              <div>
                <span style={label}>carrier</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {operatorOptions.map((option) => {
                    const active = operator === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => setOperator(option.id)}
                        style={{
                          height: 28,
                          padding: "0 10px",
                          borderRadius: 999,
                          border: `1px solid ${active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)"}`,
                          background: active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.035)",
                          color: active ? "rgba(255,255,255,0.86)" : "rgba(255,255,255,0.42)",
                          fontFamily: MONO,
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.075)", background: "rgba(255,255,255,0.03)", fontSize: 11 }}>
                <span style={{ color: "rgba(255,255,255,0.42)" }}>Selected</span>
                <strong style={{ color: "rgba(255,255,255,0.78)", fontFamily: MONO }}>
                  {service === "ot" ? (customService || "custom") : service}
                  {selectedPrice ? ` • ${selectedPrice.cost ?? "--"} / ${selectedPrice.count ?? 0}` : " • no price"}
                  {` • ${selectedOperator.label}`}
                </strong>
              </div>
              <button onClick={buyNumber} disabled={buying || !availableCountries.length} className="action action-solid" style={{ justifyContent: "center", gap: 6 }}>
                {buying ? <Spin /> : <Plus size={14} />}
                Reserve number
              </button>
            </div>
          </div>

          <div style={card}>
            <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Activations</span>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{items.length}</span>
            </div>
            <div style={{ maxHeight: 460, overflowY: "auto" }}>
              {items.length === 0 ? (
                <div style={{ padding: "30px 12px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 12 }}>
                  No reserved numbers
                </div>
              ) : items.map((item) => {
                const active = item.id === selected;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item.id)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      display: "flex",
                      gap: 9,
                      textAlign: "left",
                      borderBottom: "1px solid var(--border)",
                      background: active ? "rgba(255,255,255,0.06)" : "transparent",
                      borderLeft: active ? "2px solid rgba(255,255,255,0.62)" : "2px solid transparent",
                    }}
                  >
                    <Phone size={14} style={{ marginTop: 2, color: stateColor(item.state), flexShrink: 0 }} />
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <strong style={{ display: "block", color: "var(--foreground)", fontSize: 12, fontFamily: MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.phone}</strong>
                      <span style={{ display: "block", marginTop: 3, color: stateColor(item.state), fontSize: 11 }}>{item.message}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={card}>
          {!current ? (
            <div style={{ minHeight: 420, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
              Select or reserve a number
            </div>
          ) : (
            <>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontFamily: MONO, color: "var(--foreground)", fontSize: 18, fontWeight: 800, letterSpacing: "0.02em" }}>{current.phone}</p>
                  <p style={{ margin: "4px 0 0", color: "var(--muted-foreground)", fontSize: 12 }}>
                    ID {current.id} • service {current.service} • country {current.country}
                  </p>
                </div>
                <button onClick={() => copy(current.phone, "Number copied")} className="action action-ghost" style={{ gap: 6 }}>
                  <Copy size={13} /> Copiar
                </button>
              </div>

              <div style={{ padding: 16, display: "grid", gap: 14 }}>
                <div style={{
                  minHeight: 150,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.075)",
                  background: "rgba(255,255,255,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}>
                  <button
                    onClick={() => copy(current.phone, "Number copied")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 12px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.055)",
                      color: "rgba(255,255,255,0.86)",
                      fontFamily: MONO,
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    <Copy size={13} />
                    {current.phone}
                  </button>
                  <Hash size={28} style={{ color: stateColor(current.state), opacity: 0.72 }} />
                  {current.code ? (
                    <button onClick={() => copy(current.code!, "Code copied")} style={{ fontFamily: MONO, fontSize: 34, fontWeight: 900, letterSpacing: "0.12em", color: "#22c55e" }}>
                      {current.code}
                    </button>
                  ) : (
                    <p style={{ margin: 0, fontFamily: MONO, fontSize: 13, color: "rgba(255,255,255,0.46)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      {current.message}
                    </p>
                  )}
                  <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>Auto-updates every 8s</span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button onClick={() => checkStatus(current)} disabled={checking === current.id} className="action action-solid" style={{ gap: 6 }}>
                    {checking === current.id ? <Spin /> : <RefreshCw size={13} />}
                    Check
                  </button>
                  <button onClick={() => setRemoteStatus(current, "1")} disabled={Boolean(actioning)} className="action action-ghost" style={{ gap: 6 }}>
                    {actioning === `${current.id}:1` ? <Spin /> : <Send size={13} />}
                    SMS sent
                  </button>
                  <button onClick={() => setRemoteStatus(current, "6")} disabled={Boolean(actioning)} className="action action-ghost" style={{ gap: 6, color: "rgba(34,197,94,0.9)" }}>
                    {actioning === `${current.id}:6` ? <Spin /> : <CheckCircle size={13} />}
                    Finish
                  </button>
                  <button onClick={() => setRemoteStatus(current, "8")} disabled={Boolean(actioning)} className="action action-ghost" style={{ gap: 6, color: "rgba(229,72,77,0.9)" }}>
                    {actioning === `${current.id}:8` ? <Spin /> : <Ban size={13} />}
                    Cancel
                  </button>
                  <button onClick={() => clearLocal(current.id)} className="action action-ghost" style={{ marginLeft: "auto" }}>
                    Remove local
                  </button>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "grid", gap: 7, fontFamily: MONO, fontSize: 11, color: "var(--muted-foreground)" }}>
                  <span>Status: <b style={{ color: stateColor(current.state) }}>{current.state}</b></span>
                  <span>Created: {new Date(current.createdAt).toLocaleString("en-US")}</span>
                  <span>Last update: {new Date(current.updatedAt).toLocaleString("en-US")}</span>
                  {current.raw && <span>API Response: {current.raw}</span>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
