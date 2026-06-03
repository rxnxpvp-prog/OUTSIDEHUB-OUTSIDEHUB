import React, { useState } from "react";
import { Database, Info, Loader2, Play } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

type LeadSource = "Todas" | "CNPJReceita" | "WebBrasilIA" | "OpenStreetMap" | "Wikidata";

const SOURCES: Record<LeadSource, { label: string; description: string; max: number }> = {
  Todas: {
    label: "Todas fontes",
    description: "Consulta CNPJ publico da Receita + web brasileira + OpenStreetMap + Wikidata.",
    max: 250,
  },
  CNPJReceita: {
    label: "CNPJ Receita",
    description: "Fonte estavel com emails cadastrais reais de empresas brasileiras.",
    max: 250,
  },
  WebBrasilIA: {
    label: "Web Brasil IA",
    description: "Pesquisa sites .br por nicho, extrai emails publicos e classifica por contexto.",
    max: 250,
  },
  OpenStreetMap: {
    label: "OpenStreetMap",
    description: "Contatos comerciais publicados em dados abertos de estabelecimentos reais no Brasil.",
    max: 250,
  },
  Wikidata: {
    label: "Wikidata",
    description: "Organizacoes brasileiras com e-mail publico cadastrado.",
    max: 100,
  },
};

const NICHES = [
  "Todos os nichos",
  "Marketing Digital",
  "E-commerce",
  "Tecnologia",
  "Saude",
  "Educacao",
  "Gastronomia",
  "Beleza",
  "Imobiliario",
  "Turismo",
  "Automotivo",
  "Juridico",
  "Financeiro",
  "Esportes",
  "Arte",
  "Moda",
];

export default function Scraper({ embedded = false, onComplete }: { embedded?: boolean; onComplete?: (count: number) => void }) {
  const [source, setSource] = useState<LeadSource>("Todas");
  const [category, setCategory] = useState("Todos os nichos");
  const [maxResults, setMaxResults] = useState(80);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const sourceConfig = SOURCES[source];

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const startScraper = async () => {
    setRunning(true);
    addLog(`Consultando ${sourceConfig.label} em "${category}"...`);

    try {
      const res = await api.post("/scraper/run", {
        source,
        category,
        maxResults,
      });

      const { count, skipped, note } = res.data;
      addLog(`Sucesso: ${count} leads reais salvos no formato email:nome.`);
      if (skipped) addLog(`${skipped} duplicados, testes ou dominios sem DNS foram ignorados.`);
      if (note) addLog(note);
      toast.success(`${count} leads adicionados.`);
      onComplete?.(count);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      addLog(`Erro: ${msg}`);
      toast.error("Erro ao consultar APIs publicas");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {!embedded && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--glass-bg)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--glass-border)", boxShadow: "0 0 15px rgba(255,0,0,0.2)" }}>
            <Database size={24} style={{ color: "rgba(255,50,50,0.8)" }} />
          </div>
          <div>
            <h1 className="page-title" style={{ fontSize: 24 }}>APIs de Leads</h1>
            <p className="page-sub">Contatos comerciais publicos em fontes abertas</p>
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="surface" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
            Configuracoes da Coleta
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Fonte</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
              {(Object.keys(SOURCES) as LeadSource[]).map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setSource(item);
                    setMaxResults((value) => Math.min(value, SOURCES[item].max));
                  }}
                  className={`action ${source === item ? "action-solid" : "action-outline"}`}
                  style={{ justifyContent: "center", borderColor: source === item ? "rgba(255,0,0,0.4)" : "var(--glass-border)" }}
                >
                  {SOURCES[item].label}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.45 }}>{sourceConfig.description}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Nicho</label>
            <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
              {NICHES.map((niche) => (
                <option key={niche} value={niche}>{niche}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Quantidade maxima</label>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{maxResults}</span>
            </div>
            <input
              type="range"
              min={5}
              max={sourceConfig.max}
              step={5}
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              style={{ width: "100%", accentColor: "rgba(255,50,50,0.8)" }}
            />
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 10, background: "rgba(255,255,255,0.02)", color: "var(--muted-foreground)", fontSize: 12, lineHeight: 1.45 }}>
            Exportacao em <span style={{ color: "var(--foreground)", fontFamily: "monospace" }}>email:nome</span>. A coleta usa CNPJ publico, web brasileira e fontes abertas, classifica por contexto e remove dominios fake, demo e sem DNS.
          </div>

          <div style={{ marginTop: "auto", paddingTop: 8 }}>
            <button
              className="action action-solid"
              style={{ width: "100%", padding: 14, fontSize: 14, background: running ? "rgba(50,50,50,0.5)" : "rgba(180,0,0,0.15)", borderColor: running ? "var(--border)" : "rgba(255,0,0,0.3)" }}
              onClick={startScraper}
              disabled={running}
            >
              {running ? (
                <>
                  <Loader2 size={16} className="spin" /> Consultando...
                </>
              ) : (
                <>
                  <Play size={16} fill="currentColor" /> Buscar Leads
                </>
              )}
            </button>
          </div>
        </div>

        <div className="surface" style={{ display: "flex", flexDirection: "column", height: 400 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 6 }}>
              <Info size={14} style={{ color: "var(--muted-foreground)" }} /> Terminal de Logs
            </h2>
            {running && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,50,50,1)", boxShadow: "0 0 10px rgba(255,0,0,0.8)" }} className="pulse" />}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 20, fontFamily: "monospace", fontSize: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {logs.length === 0 ? (
              <div style={{ margin: "auto", color: "var(--muted-foreground)", textAlign: "center" }}>
                Aguardando consulta nas APIs publicas...
              </div>
            ) : (
              logs.map((log, i) => (
                <div key={i} style={{ color: log.includes("Erro") ? "var(--destructive)" : log.includes("Sucesso") ? "#22c55e" : "var(--muted-foreground)" }}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
