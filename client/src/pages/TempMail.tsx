import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Copy, Trash2, Plus, RefreshCw, Mail, CheckCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const BASE = "https://api.mail.tm";
const KEY = "tempmail_mailboxes";

interface Mailbox { id: string; address: string; password: string; token: string; createdAt: string; }
interface HostingerConfig { configured: boolean; domain: string; inboxEmail: string; imapHost: string; imapPort: string; }
interface MailMsg { id: string; from: { address: string; name: string }; subject: string; intro: string; createdAt: string; seen: boolean; text?: string; codes?: string[]; }
interface MailDetail { id: string; from: { address: string; name: string }; subject: string; text?: string; html?: string[]; createdAt: string; }

function load(): Mailbox[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}
function save(b: Mailbox[]) { localStorage.setItem(KEY, JSON.stringify(b)); }

function Spin() {
  return <span className="spin" style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid currentColor", borderTopColor: "transparent", display: "inline-block", opacity: 0.6 }} />;
}

export default function TempMail({ embedded = false }: { embedded?: boolean }) {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>(load);
  const [selected, setSelected] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Record<string, MailMsg[]>>({});
  const [openMsg, setOpenMsg] = useState<string | null>(null);
  const [detail, setDetail] = useState<MailDetail | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [mode, setMode] = useState<"hostinger" | "tm">("hostinger");
  const [hostinger, setHostinger] = useState<HostingerConfig | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const visibleMailboxes = mode === "hostinger"
    ? mailboxes.filter((m) => m.id.startsWith("hostinger-"))
    : mailboxes.filter((m) => !m.id.startsWith("hostinger-"));
  const current = visibleMailboxes.find((m) => m.id === selected) ?? null;

  useEffect(() => {
    api.get("/mail/hostinger-alias/config")
      .then((res) => setHostinger(res.data))
      .catch(() => setHostinger(null));
  }, []);

  const loadHostingerAliases = useCallback(async () => {
    try {
      const res = await api.get("/mail/hostinger-alias/aliases");
      const aliases: Mailbox[] = (res.data.aliases || []).map((item: any) => ({
        id: item.id,
        address: item.address,
        password: "",
        token: "",
        createdAt: item.createdAt,
      }));
      setMailboxes((current) => {
        const updated = [...aliases, ...current.filter((m) => !m.id.startsWith("hostinger-"))];
        save(updated);
        return updated;
      });
      if (aliases.length > 0) setSelected((current) => current || aliases[0].id);
    } catch {
      setMailboxes((current) => current.filter((m) => !m.id.startsWith("hostinger-")));
    }
  }, []);

  useEffect(() => {
    loadHostingerAliases();
  }, [loadHostingerAliases]);

  const generateHostingerAlias = async () => {
    if (!hostinger?.configured || !hostinger.domain) {
      toast.error("Configure o catch-all da Hostinger no Admin");
      return;
    }
    setGenLoading(true);
    try {
      const res = await api.post("/mail/hostinger-alias/aliases");
      const item = res.data.alias;
      const nb: Mailbox = { id: item.id, address: item.address, password: "", token: "", createdAt: item.createdAt };
      setMailboxes((current) => {
        const updated = [nb, ...current.filter((m) => m.id !== nb.id)];
        save(updated);
        return updated;
      });
      setSelected(nb.id); setOpenMsg(null); setDetail(null);
      navigator.clipboard.writeText(nb.address);
      toast.success("Alias criado e copiado");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Erro ao criar alias");
    } finally {
      setGenLoading(false);
    }
  };

  const fetchMsgs = useCallback(async (mb: Mailbox, silent = false) => {
    if (!silent) setMsgsLoading(true);
    try {
      if (mb.id.startsWith("hostinger-")) {
        const r = await api.get("/mail/hostinger-alias/messages", { params: { alias: mb.address } });
        const mapped: MailMsg[] = (r.data.messages || []).map((item: any) => ({
          id: item.id,
          from: { address: item.from || "hostinger", name: item.codes?.[0] ? `Code ${item.codes[0]}` : "Hostinger" },
          subject: item.subject,
          intro: item.intro,
          createdAt: item.createdAt,
          seen: false,
          text: item.text,
          codes: item.codes || [],
        }));
        setMsgs((p) => ({ ...p, [mb.id]: mapped }));
        if (!silent) toast.success(`${mapped.length} email(s) encontrados`);
        return;
      }
      const r = await axios.get(`${BASE}/messages`, { headers: { Authorization: `Bearer ${mb.token}` } });
      setMsgs((p) => ({ ...p, [mb.id]: r.data["hydra:member"] ?? [] }));
    } catch {
      if (!silent) toast.error("Erro ao buscar emails");
    } finally {
      if (!silent) setMsgsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (!current) return;
    fetchMsgs(current, true);
    timer.current = setInterval(() => fetchMsgs(current, true), 10000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [selected, current, fetchMsgs]);

  const generate = async () => {
    if (mode === "hostinger") {
      generateHostingerAlias();
      return;
    }
    setGenLoading(true);
    try {
      const dr = await axios.get(`${BASE}/domains`);
      const domains: { domain: string }[] = dr.data["hydra:member"] ?? [];
      if (!domains.length) { toast.error("Nenhum domínio disponível"); return; }
      const domain = domains[0].domain;
      const username = `user${Math.random().toString(36).slice(2, 10)}`;
      const password = Math.random().toString(36).slice(2, 14) + "A1!";
      const address = `${username}@${domain}`;
      await axios.post(`${BASE}/accounts`, { address, password });
      const tr = await axios.post(`${BASE}/token`, { address, password });
      const token: string = tr.data.token;
      const mr = await axios.get(`${BASE}/me`, { headers: { Authorization: `Bearer ${token}` } });
      const id: string = mr.data.id;
      const nb: Mailbox = { id, address, password, token, createdAt: new Date().toISOString() };
      const updated = [nb, ...mailboxes];
      setMailboxes(updated); save(updated);
      setSelected(id); setOpenMsg(null); setDetail(null);
      toast.success("Email criado");
    } catch (err: any) {
      toast.error(err?.response?.data?.["hydra:description"] || err?.response?.data?.message || "Erro ao criar email");
    } finally { setGenLoading(false); }
  };

  const deleteMb = (id: string) => {
    const target = mailboxes.find((m) => m.id === id);
    if (target?.id.startsWith("hostinger-")) {
      api.delete(`/mail/hostinger-alias/aliases/${id}`)
        .then(() => {
          const updated = mailboxes.filter((m) => m.id !== id);
          setMailboxes(updated); save(updated);
          if (selected === id) { setSelected(null); setOpenMsg(null); setDetail(null); }
          toast.success("Alias removido");
        })
        .catch((err) => toast.error(err?.response?.data?.error || "Erro ao remover alias"));
      return;
    }
    const updated = mailboxes.filter((m) => m.id !== id);
    setMailboxes(updated); save(updated);
    if (selected === id) { setSelected(null); setOpenMsg(null); setDetail(null); }
    toast.success("Caixa removida");
  };

  const copy = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(addr); toast.success("Copiado");
    setTimeout(() => setCopied(null), 2000);
  };

  const openDetail = async (msgId: string) => {
    if (!current) return;
    if (current.id.startsWith("hostinger-")) {
      const msg = (msgs[current.id] || []).find((item) => item.id === msgId);
      if (!msg) return;
      setOpenMsg(msgId);
      setDetail({
        id: msg.id,
        from: msg.from,
        subject: msg.subject,
        text: msg.text || msg.intro || "Sem conteudo",
        createdAt: msg.createdAt,
      });
      return;
    }
    setOpenMsg(msgId); setDetailLoading(true);
    try {
      const r = await axios.get(`${BASE}/messages/${msgId}`, { headers: { Authorization: `Bearer ${current.token}` } });
      setDetail(r.data);
    } catch { toast.error("Erro ao carregar email"); }
    finally { setDetailLoading(false); }
  };

  const currentMsgs = current ? (msgs[current.id] ?? []) : [];

  const s: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" };

  return (
    <div>
      {!embedded && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h1 className="page-title">TempMail</h1>
            <p className="page-sub">Emails temporários via mail.tm</p>
          </div>
          <button onClick={generate} disabled={genLoading} className="action action-solid" style={{ gap: 6 }}>
            {genLoading ? <Spin /> : <Plus size={14} />}
            {mode === "hostinger" ? "Gerar Alias" : "Gerar Email"}
          </button>
        </div>
      )}
      {embedded && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button onClick={generate} disabled={genLoading} className="action action-solid" style={{ gap: 6 }}>
            {genLoading ? <Spin /> : <Plus size={14} />}
            {mode === "hostinger" ? "Gerar Alias" : "Gerar Email"}
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setMode("hostinger")} className={mode === "hostinger" ? "action action-solid" : "action action-ghost"}>Hostinger</button>
        <button onClick={() => setMode("tm")} className={mode === "tm" ? "action action-solid" : "action action-ghost"}>mail.tm</button>
      </div>

      {mode === "hostinger" && (
        <div style={{ marginBottom: 12, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--card)" }}>
          <p style={{ fontSize: 12, color: "var(--foreground)", fontWeight: 600 }}>
            {hostinger?.configured ? `Catch-all ativo: *@${hostinger.domain}` : "Hostinger catch-all nao configurado"}
          </p>
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 3 }}>
            {hostinger?.configured ? `Recebimento em ${hostinger.inboxEmail}` : "Configure dominio e inbox no painel Admin."}
          </p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }} className="stack-mobile">
        <div style={s}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
              Caixas ({visibleMailboxes.length})
            </span>
          </div>
          <div style={{ overflowY: "auto", maxHeight: 500 }}>
            {visibleMailboxes.length === 0 ? (
              <div style={{ padding: "32px 12px", textAlign: "center" }}>
                <Mail size={24} style={{ color: "var(--muted-foreground)", margin: "0 auto 8px", opacity: 0.4 }} />
                <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Nenhuma caixa criada</p>
              </div>
            ) : visibleMailboxes.map((mb) => {
              const count = msgs[mb.id]?.length ?? 0;
              const isSel = selected === mb.id;
              return (
                <div
                  key={mb.id}
                  onClick={() => { setSelected(mb.id); setOpenMsg(null); setDetail(null); }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "10px 12px",
                    cursor: "pointer",
                    borderBottom: "1px solid var(--border)",
                    background: isSel ? "var(--accent)" : "transparent",
                    borderLeft: isSel ? "2px solid var(--foreground)" : "2px solid transparent",
                    transition: "background 100ms",
                  }}
                  onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "var(--accent)"; }}
                  onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontFamily: "monospace", color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mb.address}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{mb.id.startsWith("hostinger-") ? "Hostinger catch-all" : `${count} emails`}</span>
                      {count > 0 && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--foreground)" }} />}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); copy(mb.address); }}
                      className="action action-ghost"
                      style={{ padding: 4 }}
                    >
                      {copied === mb.address ? <CheckCircle size={12} style={{ color: "#22c55e" }} /> : <Copy size={12} />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteMb(mb.id); }}
                      className="action action-ghost"
                      style={{ padding: 4 }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--destructive)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          {!current ? (
            <div style={{ ...s, padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: 300 }}>
              <Mail size={32} style={{ color: "var(--muted-foreground)", marginBottom: 10, opacity: 0.3 }} />
              <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Selecione ou crie uma caixa</p>
            </div>
          ) : openMsg ? (
            <div style={s}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                <button onClick={() => { setOpenMsg(null); setDetail(null); }} className="action action-ghost" style={{ padding: 4 }}>
                  <ArrowLeft size={14} />
                </button>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {detailLoading ? "Carregando…" : detail?.subject ?? "Email"}
                </span>
              </div>
              {detailLoading ? (
                <div style={{ padding: 48, display: "flex", justifyContent: "center" }}>
                  <Spin />
                </div>
              ) : detail ? (
                <div style={{ padding: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14, fontSize: 13 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ color: "var(--muted-foreground)", width: 40, flexShrink: 0 }}>De:</span>
                      <span style={{ color: "var(--foreground)" }}>{detail.from.name ? `${detail.from.name} <${detail.from.address}>` : detail.from.address}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ color: "var(--muted-foreground)", width: 40, flexShrink: 0 }}>Data:</span>
                      <span style={{ color: "var(--foreground)" }}>{new Date(detail.createdAt).toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                  <div style={{ paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                    {detail.html?.length ? (
                      <div style={{ fontSize: 13, color: "var(--foreground)", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: detail.html.join("") }} />
                    ) : (
                      <pre style={{ fontSize: 13, color: "var(--foreground)", whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{detail.text ?? "Sem conteúdo"}</pre>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div style={s}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current.address}</p>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{currentMsgs.length} email(s)</p>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => copy(current.address)} className="action action-ghost" style={{ padding: 5 }}>
                    {copied === current.address ? <CheckCircle size={13} style={{ color: "#22c55e" }} /> : <Copy size={13} />}
                  </button>
                  <button onClick={() => fetchMsgs(current)} disabled={msgsLoading} className="action action-solid" style={{ gap: 5 }}>
                    {msgsLoading ? <Spin /> : <RefreshCw size={13} />}
                    Verificar
                  </button>
                </div>
              </div>

              <div style={{ overflowY: "auto", maxHeight: 500 }}>
                {msgsLoading ? (
                  <div style={{ padding: 40, display: "flex", justifyContent: "center" }}><Spin /></div>
                ) : currentMsgs.length === 0 ? (
                  <div style={{ padding: "40px 12px", textAlign: "center" }}>
                    <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Nenhum email recebido</p>
                    <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4, opacity: 0.6 }}>Atualiza a cada 10s</p>
                  </div>
                ) : currentMsgs.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => openDetail(msg.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "10px 12px",
                      textAlign: "left",
                      borderBottom: "1px solid var(--border)",
                      transition: "background 100ms",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: msg.seen ? 400 : 600, color: msg.seen ? "var(--muted-foreground)" : "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {msg.subject || "(sem assunto)"}
                      </p>
                      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {msg.from.name || msg.from.address}
                      </p>
                      {msg.intro && (
                        <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2, opacity: 0.7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {msg.intro}
                        </p>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {!msg.seen && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--foreground)" }} />}
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                        {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
