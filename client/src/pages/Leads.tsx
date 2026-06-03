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
  platform?: "Twitch" | "Kick" | "CNPJReceita" | "OpenStreetMap" | "Wikidata" | "WebBrasilIA" | "Outro";
  handle?: string;
  followers?: number;
  source?: "scraper" | "manual" | "import" | "api" | "public_api";
  createdAt: string;
}

const STATUS: Record<Lead["status"], { label: string; bg: string; color: string }> = {
  novo:       { label: "New",        bg: "rgba(59,130,246,0.12)",  color: "#3b82f6" },
  contatado:  { label: "Contacted",  bg: "rgba(234,179,8,0.12)",   color: "#eab308" },
  convertido: { label: "Converted",  bg: "rgba(34,197,94,0.12)",   color: "#22c55e" },
};

export default function Leads({ embedded = false, refreshKey = 0 }: { embedded?: boolean; refreshKey?: number }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [niche, setNiche] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", niche: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get("/leads").then((r) => setLeads(r.data)).catch(() => toast.error("Failed to load leads")).finally(() => setLoading(false));
  }, [refreshKey]);

  const niches = Array.from(new Set(leads.map((l) => l.niche)));
  const filtered = leads.filter((l) => {
    const matchNiche = !niche || l.niche === niche;
    const matchSearch = !search || l.email.toLowerCase().includes(search.toLowerCase()) || l.name.toLowerCase().includes(search.toLowerCase());
    return matchNiche && matchSearch;
  });

  const add = async () => {
    if (!form.email.trim()) { toast.error("Email is required"); return; }
    setAdding(true);
    try {
      const r = await api.post("/leads", form);
      setLeads((p) => [r.data, ...p]);
      setForm({ email: "", name: "", niche: "" });
      setShowForm(false);
      toast.success("Lead added");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro");
    } finally { setAdding(false); }
  };

  const del = async (id: string) => {
    try {
      await api.delete(`/leads/${id}`);
      setLeads((p) => p.filter((l) => l.id !== id));
      toast.success("Removed");
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
        const separator = line.includes(":") ? ":" : ",";
        const p = line.split(separator).map((x) => x.trim());
        return { email: p[0] || "", name: p[1] || "No name", niche: p[2] || "General" };
      }).filter((l) => l.email);
      try {
        const r = await api.post("/leads/bulk", { leads: toAdd });
        setLeads((p) => [...r.data.leads, ...p]);
        toast.success(`${r.data.added} imported, ${r.data.skipped} skipped`);
      } catch { toast.error("Failed to import"); }
    };
    reader.readAsText(file);
  };

  const exportLeads = () => {
    const content = filtered.map((l) => `${l.email}:${l.name}`).join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    const a = document.createElement("a"); a.href = url; a.download = `leads_${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    { label: "Total",     value: leads.length,                                    icon: Users,       color: "var(--foreground)" },
    { label: "New",       value: leads.filter((l) => l.status === "novo").length,       icon: Clock,       color: "#3b82f6" },
    { label: "Contacted", value: leads.filter((l) => l.status === "contatado").length,  icon: TrendingUp,  color: "#eab308" },
    { label: "Converted", value: leads.filter((l) => l.status === "convertido").length, icon: CheckCircle, color: "#22c55e" },
  ];

  const s: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" };
  const field: React.CSSProperties = { padding: "7px 10px", background: "var(--input)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--foreground)", fontSize: 13, outline: "none", width: "100%" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {!embedded && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div>
            <h1 className="page-title">Leads</h1>
            <p className="page-sub">Manage your leads centrally</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <label className="action action-outline" style={{ cursor: "pointer", gap: 5 }}>
              <FileUp size={13} /> Import TXT/CSV
              <input type="file" accept=".csv,.txt" onChange={bulkUpload} style={{ display: "none" }} />
            </label>
            <button onClick={exportLeads} className="action action-outline" style={{ gap: 5 }}>
              <Download size={13} /> Export TXT
            </button>
            <button onClick={() => setShowForm(!showForm)} className="action action-solid" style={{ gap: 5 }}>
              <Plus size={13} /> Add
            </button>
          </div>
        </div>
      )}
      {embedded && (
        <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 6 }}>
          <label className="action action-outline" style={{ cursor: "pointer", gap: 5 }}>
            <FileUp size={13} /> Importar TXT/CSV
            <input type="file" accept=".csv,.txt" onChange={bulkUpload} style={{ display: "none" }} />
          </label>
          <button onClick={exportLeads} className="action action-outline" style={{ gap: 5 }}>
            <Download size={13} /> Exportar TXT
          </button>
          <button onClick={() => setShowForm(!showForm)} className="action action-solid" style={{ gap: 5 }}>
            <Plus size={13} /> Adicionar
          </button>
        </div>
      )}

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
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>New Lead</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginBottom: 10 }}>
            <input style={field} placeholder="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} onFocus={(e) => (e.target.style.borderColor = "var(--foreground)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
            <input style={field} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onFocus={(e) => (e.target.style.borderColor = "var(--foreground)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
            <input style={field} placeholder="Niche" value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} onFocus={(e) => (e.target.style.borderColor = "var(--foreground)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={add} disabled={adding} className="action action-solid">{adding ? "Adding..." : "Add"}</button>
            <button onClick={() => setShowForm(false)} className="action action-outline">Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input style={{ ...field, paddingLeft: 30 }} placeholder="Search by email or name..." value={search} onChange={(e) => setSearch(e.target.value)} onFocus={(e) => (e.target.style.borderColor = "var(--foreground)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
        </div>
        <select style={{ ...field, width: "auto", minWidth: 140 }} value={niche} onChange={(e) => setNiche(e.target.value)} onFocus={(e) => (e.target.style.borderColor = "var(--foreground)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")}>
          <option value="">All niches</option>
          {niches.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ ...s, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
          <thead>
            <tr>
              {["Lead", "Niche", "Platform", "Status", "Date", ""].map((h) => (
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
                  No leads found
                </td>
              </tr>
            ) : filtered.map((lead) => (
              <tr key={lead.id} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 13, color: "var(--foreground)", fontWeight: 500 }}>{lead.name}</span>
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{lead.email}</span>
                  </div>
                </td>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)", fontSize: 13, color: "var(--muted-foreground)" }}>{lead.niche}</td>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)" }}>
                  {lead.platform ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ 
                        padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, 
                        background: lead.platform === "Twitch" ? "rgba(145,70,255,0.15)" : lead.platform === "Kick" ? "rgba(83,252,24,0.15)" : "var(--accent)", 
                        color: lead.platform === "Twitch" ? "#b983ff" : lead.platform === "Kick" ? "#53fc18" : "var(--foreground)" 
                      }}>
                        {lead.platform}
                      </span>
                      {lead.followers !== undefined && <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{lead.followers.toLocaleString('en-US')} followers</span>}
                    </div>
                  ) : <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>-</span>}
                </td>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)" }}>
                  <select
                    value={lead.status}
                    onChange={(e) => changeStatus(lead.id, e.target.value as Lead["status"])}
                    style={{ padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: STATUS[lead.status].bg, color: STATUS[lead.status].color, border: "none", outline: "none", cursor: "pointer" }}
                  >
                    <option value="novo">New</option>
                    <option value="contatado">Contacted</option>
                    <option value="convertido">Converted</option>
                  </select>
                </td>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)", fontSize: 12, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
                  {new Date(lead.createdAt).toLocaleDateString("en-US")}
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
