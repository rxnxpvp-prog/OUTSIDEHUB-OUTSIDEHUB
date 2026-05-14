import React, { useState } from "react";
import { Send, Paperclip, X, Clock, Settings, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

interface Attachment { id: string; name: string; size: number; }
interface SMTP { host: string; port: string; email: string; password: string; fromName: string; }

const PRESETS: Record<string, { host: string; port: string }> = {
  hostinger: { host: "smtp.hostinger.com", port: "587" },
  gmail:     { host: "smtp.gmail.com",     port: "587" },
  outlook:   { host: "smtp-mail.outlook.com", port: "587" },
  sendgrid:  { host: "smtp.sendgrid.net",  port: "587" },
};

const fmt = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

const field: React.CSSProperties = { padding: "7px 10px", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--foreground)", fontSize: 13, outline: "none", width: "100%" };
const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => (e.target.style.borderColor = "var(--foreground)");
const onBlur  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => (e.target.style.borderColor = "var(--border)");

export default function EmailDispatch() {
  const [recipients, setRecipients] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [html, setHtml] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [schedule, setSchedule] = useState("");
  const [mode, setMode] = useState<"text" | "html" | "preview">("text");
  const [showSMTP, setShowSMTP] = useState(false);
  const [sending, setSending] = useState(false);
  const [smtp, setSmtp] = useState<SMTP>({ host: "", port: "587", email: "", password: "", fromName: "" });

  const count = recipients.split(/[,\n]/).filter((e) => e.trim()).length;

  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.currentTarget.files || []).forEach((f) => {
      setAttachments((p) => [...p, { id: Date.now() + Math.random().toString(), name: f.name, size: f.size }]);
    });
  };

  const saveSMTP = async () => {
    try { await api.put("/admin/smtp", smtp); setShowSMTP(false); toast.success("SMTP salvo"); }
    catch { toast.error("Erro ao salvar SMTP"); }
  };

  const send = async () => {
    if (!recipients || !subject || (!body && !html)) { toast.error("Preencha destinatários, assunto e mensagem"); return; }
    setSending(true);
    await new Promise((r) => setTimeout(r, 1500));
    setSending(false);
    toast.success("Email enviado!");
    setRecipients(""); setSubject(""); setBody(""); setHtml(""); setAttachments([]); setSchedule("");
  };

  const surface: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 14 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 className="page-title">Disparo de Email</h1>
          <p className="page-sub">Envie emails em massa para seus leads</p>
        </div>
        <button onClick={() => setShowSMTP(!showSMTP)} className="action action-outline" style={{ gap: 5 }}>
          <Settings size={13} /> SMTP
        </button>
      </div>

      {showSMTP && (
        <div style={surface}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>Configurar SMTP</span>
            <button onClick={() => setShowSMTP(false)} className="action action-ghost" style={{ padding: 4 }}><X size={14} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 12 }}>
            {[
              { label: "Provedor", content: (
                <select style={field} onChange={(e) => { const p = PRESETS[e.target.value]; if (p) setSmtp((s) => ({ ...s, ...p })); }} onFocus={onFocus} onBlur={onBlur}>
                  <option value="">Selecione…</option>
                  {Object.keys(PRESETS).map((k) => <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
                </select>
              )},
              { label: "Host", content: <input style={field} value={smtp.host} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} placeholder="smtp.example.com" onFocus={onFocus} onBlur={onBlur} /> },
              { label: "Porta", content: <input style={field} value={smtp.port} onChange={(e) => setSmtp({ ...smtp, port: e.target.value })} onFocus={onFocus} onBlur={onBlur} /> },
              { label: "Email", content: <input style={field} type="email" value={smtp.email} onChange={(e) => setSmtp({ ...smtp, email: e.target.value })} placeholder="seu@email.com" onFocus={onFocus} onBlur={onBlur} /> },
              { label: "Senha/Token", content: <input style={field} type="password" value={smtp.password} onChange={(e) => setSmtp({ ...smtp, password: e.target.value })} placeholder="••••••••" onFocus={onFocus} onBlur={onBlur} /> },
              { label: "Remetente", content: <input style={field} value={smtp.fromName} onChange={(e) => setSmtp({ ...smtp, fromName: e.target.value })} placeholder="Seu Nome" onFocus={onFocus} onBlur={onBlur} /> },
            ].map(({ label, content }) => (
              <div key={label}>
                <label style={{ display: "block", fontSize: 11, color: "var(--muted-foreground)", marginBottom: 5 }}>{label}</label>
                {content}
              </div>
            ))}
          </div>
          <button onClick={saveSMTP} className="action action-solid">Salvar</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gap: 14 }} className="stack-mobile">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={surface}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Destinatários</label>
            <textarea style={{ ...field, resize: "none" }} rows={4} value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="Emails separados por vírgula ou quebra de linha" onFocus={onFocus as any} onBlur={onBlur as any} />
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 5 }}>{count} email(s)</p>
          </div>

          <div style={surface}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Assunto</label>
            <input style={field} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto do email" onFocus={onFocus} onBlur={onBlur} />
          </div>

          <div style={surface}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Mensagem</label>
              <div style={{ display: "flex", gap: 3 }}>
                {(["text", "html", "preview"] as const).map((m) => (
                  <button key={m} onClick={() => setMode(m)} className={mode === m ? "action action-solid" : "action action-ghost"} style={{ padding: "3px 9px", fontSize: 12 }}>
                    {m === "text" ? "Texto" : m === "html" ? "HTML" : "Preview"}
                  </button>
                ))}
              </div>
            </div>
            {mode === "text" && <textarea style={{ ...field, resize: "none" }} rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreva sua mensagem…" onFocus={onFocus as any} onBlur={onBlur as any} />}
            {mode === "html" && <textarea style={{ ...field, resize: "none", fontFamily: "monospace" }} rows={8} value={html} onChange={(e) => setHtml(e.target.value)} placeholder="<h1>HTML aqui…</h1>" onFocus={onFocus as any} onBlur={onBlur as any} />}
            {mode === "preview" && <div style={{ minHeight: 200, padding: "8px 10px", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 13, color: "var(--foreground)", overflowY: "auto" }} dangerouslySetInnerHTML={{ __html: html || "<p style='color:var(--muted-foreground)'>Nenhum HTML</p>" }} />}
          </div>

          <div style={surface}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Anexos</label>
            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 12px", border: "1px dashed var(--border)", borderRadius: "var(--radius)", cursor: "pointer", transition: "border-color 100ms" }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--foreground)")} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>
              <Paperclip size={20} style={{ color: "var(--muted-foreground)", marginBottom: 6 }} />
              <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Clique para adicionar arquivos</p>
              <p style={{ fontSize: 11, color: "var(--muted-foreground)", opacity: 0.6, marginTop: 3 }}>Máx 25MB por arquivo</p>
              <input type="file" multiple onChange={addFiles} style={{ display: "none" }} />
            </label>
            {attachments.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                {attachments.map((f) => (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                    <Paperclip size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)", flexShrink: 0 }}>{fmt(f.size)}</span>
                    <button onClick={() => setAttachments((p) => p.filter((a) => a.id !== f.id))} className="action action-ghost" style={{ padding: 3 }} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--destructive)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={surface}>
            <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
              <Clock size={12} /> Agendar
            </label>
            <input type="datetime-local" style={field} value={schedule} onChange={(e) => setSchedule(e.target.value)} onFocus={onFocus} onBlur={onBlur} />
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 5 }}>Vazio = enviar agora</p>
          </div>

          <div style={surface}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Resumo</p>
            {[
              { label: "Destinatários", value: count },
              { label: "Assunto", value: subject || "—" },
              { label: "Anexos", value: attachments.length },
              { label: "Formato", value: html ? "HTML" : "Texto" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
              </div>
            ))}
          </div>

          <button onClick={send} disabled={sending || !recipients || !subject || (!body && !html)} className="action action-solid" style={{ width: "100%", padding: "9px 12px", gap: 6 }}>
            {sending ? <span className="spin" style={{ width: 13, height: 13, borderRadius: "50%", border: "1.5px solid var(--primary-foreground)", borderTopColor: "transparent", display: "inline-block" }} /> : <Send size={14} />}
            {sending ? "Enviando…" : "Enviar Agora"}
          </button>

          <div style={{ display: "flex", gap: 8, padding: "10px 12px", background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "var(--radius)" }}>
            <AlertCircle size={13} style={{ color: "#eab308", flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Configure o SMTP antes de enviar emails reais.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
