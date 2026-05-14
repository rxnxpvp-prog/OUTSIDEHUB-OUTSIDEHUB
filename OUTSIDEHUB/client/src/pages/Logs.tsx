import React, { useState } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type LogType = "all" | "auth" | "system" | "error" | "info";

interface LogEntry {
  id: string;
  ts: string;
  type: Exclude<LogType, "all">;
  action: string;
  description: string;
  user?: string;
}

const LOGS: LogEntry[] = [
  { id: "1", ts: "2025-01-15T10:32:14Z", type: "auth",   action: "LOGIN",       description: "Login realizado com sucesso",                user: "admin@outsidehub.com" },
  { id: "2", ts: "2025-01-15T10:28:05Z", type: "system", action: "STARTUP",     description: "Servidor iniciado na porta 3001" },
  { id: "3", ts: "2025-01-15T10:15:42Z", type: "error",  action: "API_ERROR",   description: "Timeout em /api/scraper após 30s",           user: "user123" },
  { id: "4", ts: "2025-01-15T09:58:31Z", type: "info",   action: "EMAIL_SENT",  description: "Disparo concluído: 1.240 destinatários",     user: "admin@outsidehub.com" },
  { id: "5", ts: "2025-01-15T09:45:17Z", type: "auth",   action: "LOGOUT",      description: "Sessão encerrada",                           user: "user456" },
  { id: "6", ts: "2025-01-15T09:30:00Z", type: "system", action: "DB_BACKUP",   description: "Backup automático concluído" },
  { id: "7", ts: "2025-01-15T09:12:55Z", type: "error",  action: "AUTH_FAIL",   description: "Tentativa de login inválida",                user: "unknown" },
  { id: "8", ts: "2025-01-15T08:55:22Z", type: "info",   action: "SCRAPER_RUN", description: "342 leads coletados",                        user: "admin@outsidehub.com" },
  { id: "9", ts: "2025-01-15T08:40:10Z", type: "system", action: "CACHE_CLEAR", description: "Cache limpo manualmente",                    user: "admin@outsidehub.com" },
  { id: "10",ts: "2025-01-15T08:20:03Z", type: "info",   action: "USER_CREATED",description: "Novo usuário registrado",                    user: "admin@outsidehub.com" },
];

const BADGE_COLOR: Record<Exclude<LogType, "all">, string> = {
  auth:   "rgba(59,130,246,0.15)",
  system: "rgba(139,92,246,0.15)",
  error:  "rgba(229,72,77,0.15)",
  info:   "rgba(34,197,94,0.15)",
};
const BADGE_TEXT: Record<Exclude<LogType, "all">, string> = {
  auth:   "#3b82f6",
  system: "#8b5cf6",
  error:  "#e5484d",
  info:   "#22c55e",
};
const BADGE_LABEL: Record<Exclude<LogType, "all">, string> = {
  auth: "Auth", system: "Sistema", error: "Erro", info: "Info",
};

export default function Logs() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<LogType>("all");

  if (user?.role !== "admin") {
    return (
      <div style={{ maxWidth: 400, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <h1 className="page-title">Logs</h1>
          <p className="page-sub">Histórico de atividades</p>
        </div>
        <div className="surface" style={{ padding: "48px 24px", textAlign: "center" }}>
          <Lock size={24} style={{ color: "var(--muted-foreground)", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 4 }}>Acesso restrito</p>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Apenas administradores podem ver os logs.</p>
        </div>
      </div>
    );
  }

  const filtered = filter === "all" ? LOGS : LOGS.filter((l) => l.type === filter);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Logs</h1>
          <p className="page-sub">Histórico de atividades do sistema</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as LogType)}
          className="field"
          style={{ width: "auto" }}
        >
          <option value="all">Todos</option>
          <option value="auth">Auth</option>
          <option value="system">Sistema</option>
          <option value="error">Erro</option>
          <option value="info">Info</option>
        </select>
      </div>

      <div className="surface" style={{ overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{filtered.length} entrada(s)</span>
        </div>
        {filtered.map((log) => (
          <div
            key={log.id}
            style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "10px 14px", borderBottom: "1px solid var(--border)", transition: "background 100ms" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ flexShrink: 0, width: 120 }}>
              <p style={{ fontSize: 11, fontFamily: "monospace", color: "var(--muted-foreground)" }}>
                {new Date(log.ts).toLocaleDateString("pt-BR")}
              </p>
              <p style={{ fontSize: 11, fontFamily: "monospace", color: "var(--muted-foreground)", opacity: 0.7 }}>
                {new Date(log.ts).toLocaleTimeString("pt-BR")}
              </p>
            </div>
            <div style={{ flexShrink: 0, paddingTop: 1 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 500,
                padding: "2px 7px",
                borderRadius: "var(--radius)",
                background: BADGE_COLOR[log.type],
                color: BADGE_TEXT[log.type],
              }}>
                {BADGE_LABEL[log.type]}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>{log.action}</p>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{log.description}</p>
              {log.user && (
                <p style={{ fontSize: 11, fontFamily: "monospace", color: "var(--muted-foreground)", opacity: 0.6, marginTop: 2 }}>{log.user}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
