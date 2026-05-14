import React, { useState, useEffect } from "react";
import { Search as SearchIcon, Clock, Trash2, Globe, Database, Layers } from "lucide-react";

type Tab = "intelx" | "database" | "lofy";

interface Recent { id: string; query: string; tab: Tab; ts: number; }

const TABS: { id: Tab; label: string; icon: React.ElementType; description: string }[] = [
  { id: "intelx",   label: "IntelX",          icon: Globe,    description: "Pesquisa em fontes abertas e indexadas" },
  { id: "database", label: "Database Lookup",  icon: Database, description: "Consulta em bases de dados e registros" },
  { id: "lofy",     label: "Lofy Search",      icon: Layers,   description: "Busca avançada com filtros personalizados" },
];

function ago(ts: number) {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function Search() {
  const [tab, setTab] = useState<Tab>("intelx");
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<Recent[]>(() => {
    try { return JSON.parse(localStorage.getItem("search_recent") || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("search_recent", JSON.stringify(recent.slice(0, 20)));
  }, [recent]);

  const search = () => {
    if (!query.trim()) return;
    setRecent((p) => [{ id: Date.now().toString(), query: query.trim(), tab, ts: Date.now() }, ...p]);
    setQuery("");
  };

  const filtered = recent.filter((r) => r.tab === tab);
  const cfg = TABS.find((t) => t.id === tab)!;
  const Icon = cfg.icon;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">Search</h1>
        <p className="page-sub">Pesquisa avançada em múltiplas fontes</p>
      </div>

      <div style={{ display: "flex", gap: 2, padding: 3, background: "var(--accent)", borderRadius: "var(--radius)", marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "6px 10px",
              fontSize: 13,
              fontWeight: tab === t.id ? 500 : 400,
              color: tab === t.id ? "var(--foreground)" : "var(--muted-foreground)",
              background: tab === t.id ? "var(--card)" : "transparent",
              borderRadius: "calc(var(--radius) - 1px)",
              border: tab === t.id ? "1px solid var(--border)" : "1px solid transparent",
              transition: "all 100ms",
            }}
          >
            <t.icon size={13} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="surface" style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <SearchIcon size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder={`Pesquisar em ${cfg.label}…`}
              className="field"
              style={{ paddingLeft: 32 }}
            />
          </div>
          <button onClick={search} className="action action-solid">Pesquisar</button>
        </div>
      </div>

      <div className="surface" style={{ padding: "40px 24px", textAlign: "center", marginBottom: 16 }}>
        <Icon size={22} style={{ color: "var(--muted-foreground)", margin: "0 auto 10px" }} />
        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)", marginBottom: 4 }}>{cfg.label}</p>
        <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{cfg.description}</p>
        <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 10, opacity: 0.6 }}>
          Integração via API em breve
        </p>
      </div>

      {filtered.length > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Recentes
          </p>
          <div className="surface" style={{ overflow: "hidden" }}>
            {filtered.map((r, i) => (
              <div
                key={r.id}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none", transition: "background 100ms" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Clock size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.query}</span>
                <span style={{ fontSize: 11, color: "var(--muted-foreground)", flexShrink: 0 }}>{ago(r.ts)}</span>
                <button
                  onClick={() => setRecent((p) => p.filter((x) => x.id !== r.id))}
                  className="action action-ghost"
                  style={{ padding: 4 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--destructive)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
