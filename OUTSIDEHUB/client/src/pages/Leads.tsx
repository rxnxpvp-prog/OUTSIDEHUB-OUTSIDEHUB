import React, { useState, useEffect } from "react";
import { Plus, Trash2, Download, Search, FileUp, TrendingUp, Users, CheckCircle, Clock } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

interface Lead {
  id: string;
  email: string;
  name: string;
  niche: string;
  status: "novo" | "contatado" | "convertido";
  createdAt: string;
}

const STATUS: Record<Lead["status"], { label: string; bg: string; color: string }> = {
  novo:       { label: "Novo",       bg: "rgba(59,130,246,0.12)",  color: "#3b82f6" },
  contatado:  { label: "Contatado",  bg: "rgba(234,179,8,0.12)",   color: "#eab308" },
  convertido: { label: "Convertido", bg: "rgba(34,197,94,0.12)",   color: "#22c55e" },
};

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [niche, setNiche] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", niche: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.get("/leads").then((r) => setLeads(r.data)).catch(() => toast.error("Erro ao carregar leads")).finally(() => setLoading(false));
  }, []);

  const niches = Array.from(new Set(leads.map((l) => l.niche)));
  const filtered = leads.filter((l) => {
    const matchNiche = !niche || l.niche === niche;
    const matchSearch = !search || l.email.toLowerCase().includes(search.toLowerCase()) || l.name.toLowerCase().includes(search.toLowerCase());
    return matchNiche && matchSearch;
  });

  const add = async () => {
    if (!form.email.trim()) { toast.error("Email obrigatório"); return; }
    setAdding(true);
    try {
      const r = await api.post("/leads", form);
      setLeads((p) => [r.data, ...p]);
      setForm({ email: "", name: "", niche: "" });
      setShowForm(false);
      toast.success("Lead adicionado");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro");
    } finally { setAdding(false); }
  };

  const del = async (id: string) => {
    try {
      await api.delete(`/leads/${id}`);
      setLeads((p) => p.filter((l) => l.id !== id));
      toast.success("Removido");
    } catch { toast.error("Erro"); }
  };

  const changeStatus = async (id: string, status: Lead["status"]) => {
    try {
      const r = await api.put(`/leads/${id}`, { status });
      setLeads((p) => p.map((l) => l.id === id ? r.data : l));
    } catch { toast.error("Erro"); }
  };

  const bulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const lines = (ev.target?.result as string).split("\n").filter((l) => l.trim());
      const toAdd = lines.map((line) => {
        const p = line.split(",").map((x) => x.trim());
        return { email: p[0] || "", name: p[1] || "Sem nome", niche: p[2] || "Geral" };
      }).filter((l) => l.email);
      try {
        const r = await api.post("/leads/bulk", { leads: toAdd });
        setLeads((p) => [...r.data.leads, ...p]);
        toast.success(`${r.data.added} importados, ${r.data.skipped} ignorados`);
      } catch { toast.error("Erro ao importar"); }
    };
    reader.readAsText(file);
  };

  const exportCSV = () => {
    const csv = ["email,nome,nicho,status", ...filtered.map((l) => `${l.email},${l.name},${l.niche},${l.status}`)].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `leads_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    { label: "Total",      value: leads.length,                                    icon: Users,       color: "var(--foreground)" },
    { label: "Novos",      value: leads.filter((l) => l.status === "novo").length,       icon: Clock,       color: "#3b82f6" },
    { label: "Contatados", value: leads.filter((l) => l.status === "contatado").length,  icon: TrendingUp,  color: "#eab308" },
    { label: "Convertidos",value: leads.filter((l) => l.status === "convertido").length, icon: CheckCircle, color: "#22c55e" },
  ];

  const s: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" };
  const field: React.CSSProperties = { padding: "7px 10px", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--foreground)", fontSize: 13, outline: "none", width: "100%" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-sub">Gerencie seus leads de forma centralizada</p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <label className="action action-outline" style={{ cursor: "pointer", gap: 5 }}>
            <FileUp size={13} /> Importar CSV
            <input type="file" accept=".csv,.txt" onChange={bulkUpload} style={{ display: "none" }} />
          </label>
          <button onClick={exportCSV} className="action action-outline" style={{ gap: 5 }}>
            <Download size={13} /> Exportar
          </button>
          <button onClick={() => setShowForm(!showForm)} className="action action-solid" style={{ gap: 5 }}>
            <Plus size={13} /> Adicionar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4">
        {stats.map((s) => (
          <div key={s.label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{s.label}</span>
              <s.icon size={13} style={{ color: s.color }} />
            </div>
            <p style={{ fontSize: 22, fontWeight: 700, color: s.color, letterSpacing: "-0.03em" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ ...s, padding: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>Novo Lead</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginBottom: 10 }}>
            <input style={field} placeholder="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} onFocus={(e) => (e.target.style.borderColor = "var(--foreground)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
            <input style={field} placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onFocus={(e) => (e.target.style.borderColor = "var(--foreground)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
            <input style={field} placeholder="Nicho" value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} onFocus={(e) => (e.target.style.borderColor = "var(--foreground)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={add} disabled={adding} className="action action-solid">{adding ? "Adicionando…" : "Adicionar"}</button>
            <button onClick={() => setShowForm(false)} className="action action-outline">Cancelar</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input style={{ ...field, paddingLeft: 30 }} placeholder="Buscar por email ou nome…" value={search} onChange={(e) => setSearch(e.target.value)} onFocus={(e) => (e.target.style.borderColor = "var(--foreground)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
        </div>
        <select style={{ ...field, width: "auto", minWidth: 140 }} value={niche} onChange={(e) => setNiche(e.target.value)} onFocus={(e) => (e.target.style.borderColor = "var(--foreground)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")}>
          <option value="">Todos os nichos</option>
          {niches.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ ...s, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
          <thead>
            <tr>
              {["Email", "Nome", "Nicho", "Status", "Data", ""].map((h) => (
                <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ height: 12, background: "var(--accent)", borderRadius: 3 }} className="pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "40px 12px", textAlign: "center", fontSize: 13, color: "var(--muted-foreground)" }}>
                  Nenhum lead encontrado
                </td>
              </tr>
            ) : filtered.map((lead) => (
              <tr key={lead.id} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)", fontSize: 12, fontFamily: "monospace", color: "var(--foreground)" }}>{lead.email}</td>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)", fontSize: 13, color: "var(--foreground)" }}>{lead.name}</td>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)", fontSize: 13, color: "var(--muted-foreground)" }}>{lead.niche}</td>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)" }}>
                  <select
                    value={lead.status}
                    onChange={(e) => changeStatus(lead.id, e.target.value as Lead["status"])}
                    style={{ padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: STATUS[lead.status].bg, color: STATUS[lead.status].color, border: "none", outline: "none", cursor: "pointer" }}
                  >
                    <option value="novo">Novo</option>
                    <option value="contatado">Contatado</option>
                    <option value="convertido">Convertido</option>
                  </select>
                </td>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)", fontSize: 12, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
                  {new Date(lead.createdAt).toLocaleDateString("pt-BR")}
                </td>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)", textAlign: "center" }}>
                  <button onClick={() => del(lead.id)} className="action action-ghost" style={{ padding: 5 }} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--destructive)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}>
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
