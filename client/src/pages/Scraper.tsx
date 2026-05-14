import React, { useState } from "react";
import { Bot, Play, Square, Loader2, Info } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function Scraper() {
  const [platform, setPlatform] = useState<"Twitch" | "Kick">("Twitch");
  const [category, setCategory] = useState("Art");
  const [maxResults, setMaxResults] = useState(100);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const startScraper = async () => {
    if (!category.trim()) {
      toast.error("Categoria obrigatória");
      return;
    }
    
    setRunning(true);
    addLog(`Iniciando scraper para ${platform} na categoria "${category}"...`);
    
    try {
      const res = await api.post("/scraper/run", {
        platform,
        category,
        maxResults
      });
      
      const { count } = res.data;
      addLog(`✅ Sucesso! ${count} leads capturados.`);
      toast.success(`${count} leads capturados e salvos.`);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      addLog(`❌ Erro: ${msg}`);
      toast.error("Erro ao executar scraper");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--glass-bg)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--glass-border)", boxShadow: "0 0 15px rgba(255,0,0,0.2)" }}>
          <Bot size={24} style={{ color: "rgba(255,50,50,0.8)" }} />
        </div>
        <div>
          <h1 className="page-title" style={{ fontSize: 24 }}>IA Scraper</h1>
          <p className="page-sub">Coleta de leads automática na Twitch e Kick</p>
        </div>
      </div>

      <div className="grid-2">
        {/* Painel de Controle */}
        <div className="surface" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
            Configurações da Coleta
          </h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Plataforma</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["Twitch", "Kick"] as const).map(p => (
                <button 
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`action ${platform === p ? "action-solid" : "action-outline"}`}
                  style={{ flex: 1, borderColor: platform === p ? "rgba(255,0,0,0.4)" : "var(--glass-border)" }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Categoria / Nicho</label>
            <input 
              className="field" 
              value={category} 
              onChange={e => setCategory(e.target.value)} 
              placeholder="Ex: Art, VALORANT, Just Chatting..."
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <label style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Limite Máximo de Streamers</label>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{maxResults}</span>
            </div>
            <input 
              type="range" 
              min={10} max={999} step={10}
              value={maxResults} 
              onChange={e => setMaxResults(Number(e.target.value))} 
              style={{ width: "100%", accentColor: "rgba(255,50,50,0.8)" }}
            />
          </div>

          <div style={{ marginTop: "auto", paddingTop: 16 }}>
            <button 
              className="action action-solid" 
              style={{ width: "100%", padding: 14, fontSize: 14, background: running ? "rgba(50,50,50,0.5)" : "rgba(180,0,0,0.15)", borderColor: running ? "var(--border)" : "rgba(255,0,0,0.3)" }}
              onClick={startScraper}
              disabled={running}
            >
              {running ? (
                <>
                  <Loader2 size={16} className="spin" /> Processando...
                </>
              ) : (
                <>
                  <Play size={16} fill="currentColor" /> Iniciar Varredura
                </>
              )}
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="surface" style={{ display: "flex", flexDirection: "column", height: 400 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 6 }}>
              <Info size={14} style={{ color: "var(--muted-foreground)" }}/> Terminal de Logs
            </h2>
            {running && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,50,50,1)", boxShadow: "0 0 10px rgba(255,0,0,0.8)" }} className="pulse" />}
          </div>
          
          <div style={{ flex: 1, overflowY: "auto", padding: 20, fontFamily: "monospace", fontSize: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {logs.length === 0 ? (
              <div style={{ margin: "auto", color: "var(--muted-foreground)", textAlign: "center" }}>
                Aguardando inicialização do scraper...
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
