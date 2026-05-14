import React, { useState } from "react";
import { useLocation } from "wouter";
import { Zap, Twitch, CheckCircle2, AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

type Platform = "twitch" | "kick" | "both";

interface Creds {
  twitchClientId: string;
  twitchClientSecret: string;
  kickClientId: string;
  kickClientSecret: string;
}

interface Result {
  added: number;
  skipped: number;
  total: number;
}

const field: React.CSSProperties = {
  padding: "8px 11px",
  background: "var(--input)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  color: "var(--foreground)",
  fontSize: 13,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        style={{ ...field, paddingRight: 36 }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => (e.target.style.borderColor = "var(--foreground)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 0, display: "flex" }}
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

function PlatformBtn({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 18px",
        borderRadius: "var(--radius)",
        border: active ? `1.5px solid ${color}` : "1.5px solid var(--border)",
        background: active ? `${color}18` : "var(--input)",
        color: active ? color : "var(--muted-foreground)",
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

export default function Scraper() {
  const [, navigate] = useLocation();
  const [platform, setPlatform] = useState<Platform>("twitch");
  const [creds, setCreds] = useState<Creds>({ twitchClientId: "", twitchClientSecret: "", kickClientId: "", kickClientSecret: "" });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof Creds) => (v: string) => setCreds((p) => ({ ...p, [k]: v }));

  const needsTwitch = platform === "twitch" || platform === "both";
  const needsKick   = platform === "kick"   || platform === "both";

  const run = async () => {
    setError(null);
    setResult(null);
    setRunning(true);
    try {
      const r = await api.post("/scraper/streamers", {
        platform,
        twitchClientId:     creds.twitchClientId,
        twitchClientSecret: creds.twitchClientSecret,
        kickClientId:       creds.kickClientId,
        kickClientSecret:   creds.kickClientSecret,
      });
      setResult(r.data);
      toast.success(`${r.data.added} leads adicionados!`);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Erro ao executar scraping";
      setError(msg);
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  };

  const card: React.CSSProperties = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "18px 20px",
  };

  const label: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--muted-foreground)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 6,
    display: "block",
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div>
        <h1 className="page-title">IA Scraper</h1>
        <p className="page-sub">Coleta leads de streamers BR da Twitch e Kick</p>
      </div>

      {/* Platform selector */}
      <div style={card}>
        <span style={label}>Plataforma</span>
        <div style={{ display: "flex", gap: 8 }}>
          <PlatformBtn active={platform === "twitch"} onClick={() => setPlatform("twitch")} label="Twitch" color="#9146ff" />
          <PlatformBtn active={platform === "kick"}   onClick={() => setPlatform("kick")}   label="Kick"   color="#53fc18" />
          <PlatformBtn active={platform === "both"}   onClick={() => setPlatform("both")}   label="Twitch + Kick" color="#3b82f6" />
        </div>
      </div>

      {/* Twitch credentials */}
      {needsTwitch && (
        <div style={card}>
          <span style={{ ...label, color: "#9146ff" }}>Conta Twitch</span>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 12 }}>
            Crie um app em{" "}
            <span style={{ color: "#9146ff", fontFamily: "monospace" }}>dev.twitch.tv/console</span>
            {" "}→ Register → OAuth: http://localhost
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <span style={label}>Client ID</span>
              <input
                style={field}
                placeholder="Ex: p2j3uji4suf8e5i197dk..."
                value={creds.twitchClientId}
                onChange={(e) => set("twitchClientId")(e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = "#9146ff")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
            <div>
              <span style={label}>Client Secret</span>
              <SecretInput value={creds.twitchClientSecret} onChange={set("twitchClientSecret")} placeholder="Client Secret gerado no console" />
            </div>
          </div>
        </div>
      )}

      {/* Kick credentials */}
      {needsKick && (
        <div style={card}>
          <span style={{ ...label, color: "#53fc18" }}>Conta Kick</span>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 12 }}>
            Crie um app em{" "}
            <span style={{ color: "#53fc18", fontFamily: "monospace" }}>kick.com/settings/developer</span>
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <span style={label}>Client ID</span>
              <input
                style={field}
                placeholder="Ex: 01KR4EMSH06MX46Q7AZN..."
                value={creds.kickClientId}
                onChange={(e) => set("kickClientId")(e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = "#53fc18")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
            <div>
              <span style={label}>Client Secret</span>
              <SecretInput value={creds.kickClientSecret} onChange={set("kickClientSecret")} placeholder="Client Secret do app Kick" />
            </div>
          </div>
        </div>
      )}

      {/* Run button */}
      <button
        onClick={run}
        disabled={running}
        className="action action-solid"
        style={{ gap: 7, justifyContent: "center", padding: "10px 0", fontSize: 14, fontWeight: 600, opacity: running ? 0.7 : 1 }}
      >
        {running ? (
          <>
            <span className="spin" style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", display: "inline-block" }} />
            Coletando leads... (pode levar alguns minutos)
          </>
        ) : (
          <>
            <Zap size={14} /> Iniciar Scraping
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div style={{ ...card, border: "1px solid var(--destructive)", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <AlertCircle size={16} style={{ color: "var(--destructive)", flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: "var(--destructive)", margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ ...card, border: "1px solid rgba(34,197,94,0.4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <CheckCircle2 size={16} style={{ color: "#22c55e" }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#22c55e" }}>Scraping concluído!</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Encontrados", value: result.total },
              { label: "Adicionados", value: result.added,   color: "#22c55e" },
              { label: "Já existiam", value: result.skipped, color: "var(--muted-foreground)" },
            ].map((s) => (
              <div key={s.label} style={{ background: "var(--accent)", borderRadius: "var(--radius)", padding: "10px 12px", textAlign: "center" }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: s.color || "var(--foreground)", letterSpacing: "-0.03em", margin: 0 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>{s.label}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate("/leads")}
            className="action action-solid"
            style={{ gap: 6, width: "100%", justifyContent: "center" }}
          >
            Ver Leads <ArrowRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
