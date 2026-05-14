import React, { useState, useEffect } from "react";
import { Users, Bell, Power, Plus, Trash2, Shield, CheckCircle, AlertCircle, X, Award, BarChart3, MessageSquare, FileText, Globe, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────
interface UserRow {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "admin" | "user";
  badges: { id: string; name: string; icon: string }[];
  role: "admin" | "moderator" | "user";
  badges: { id: string; name: string; icon: string }[];
  createdAt: string;
}

interface InviteRow {
  id: string;
  code: string;
  role: "admin" | "moderator" | "user";
  used: boolean;
  usedBy?: string;
  expiresAt: string;
}

interface MaintenanceItem {
  id: string;
  name: string;
  status: "online" | "maintenance";
  icon: string;
}

interface Stats {
  totalUsers: number;
  totalPosts: number;
  totalLeads: number;
  totalMessages: number;
}

// ── Shared input style ────────────────────────────────────
const inp =
  "w-full px-3 py-2 text-[13px] rounded outline-none transition-all";
const inpStyle = {
  background: "var(--input)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
};
const inpFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = "var(--foreground)";
};
const inpBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = "var(--border)";
};

// ── Section wrapper ───────────────────────────────────────
function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div
      className="rounded p-5"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon size={14} style={{ color: "var(--muted-foreground)" }} />
        <span className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────
export default function AdminPanel() {
  const { user: me, isAdmin } = useAuth();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // create user form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", role: "user" as "admin" | "moderator" | "user" });
  const [creating, setCreating] = useState(false);

  // create invite form
  const permList = [
    { id: "feed", label: "Feed" },
    { id: "chat", label: "Chat" },
    { id: "tempmail", label: "TempMail" },
    { id: "leads", label: "Leads" },
    { id: "email", label: "Email Dispatch" },
    { id: "search", label: "Search" },
    { id: "downloads", label: "Downloads" },
    { id: "builders", label: "Builders" },
    { id: "scraper", label: "Scraper" },
    { id: "discord", label: "Discord" }
  ];
  
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({ 
    code: "", 
    role: "user" as "admin" | "moderator" | "user", 
    expiresInDays: 0,
    permissions: permList.reduce((acc, p) => ({ ...acc, [p.id]: true }), {}) as Record<string, boolean>
  });
  const [creatingInvite, setCreatingInvite] = useState(false);

  // notification
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMsg, setNotifMsg] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);

  // scraper
  const [scraperUrl, setScraperUrl] = useState("");
  const [scraperLoading, setScraperLoading] = useState(false);
  const [scraperResult, setScraperResult] = useState<{ title: string; description: string; emails: string[]; phones: string[]; links: string[]; text: string } | null>(null);
  const [scraperError, setScraperError] = useState("");

  // badge modal
  const [badgeTarget, setBadgeTarget] = useState<UserRow | null>(null);
  const [badgeName, setBadgeName] = useState("");
  const [badgeIcon, setBadgeIcon] = useState("⭐");
  const [badgeImage, setBadgeImage] = useState<string>("");
  const [badgeTab, setBadgeTab] = useState<"emoji" | "image">("emoji");

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      api.get("/users").then((r) => setUsers(r.data)),
      api.get("/admin/settings").then((r) => setMaintenance(r.data.maintenance || [])),
      api.get("/admin/stats").then((r) => setStats(r.data)),
      api.get("/admin/invites").then((r) => setInvites(r.data)),
    ])
      .catch(() => toast.error("Erro ao carregar painel"))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield size={32} style={{ color: "var(--muted-foreground)", margin: "0 auto 12px" }} />
          <p className="text-[15px] font-semibold" style={{ color: "var(--foreground)" }}>Acesso negado</p>
          <p className="text-[13px] mt-1" style={{ color: "var(--muted-foreground)" }}>Apenas administradores</p>
        </div>
      </div>
    );
  }

  // ── Handlers ──
  const createUser = async () => {
    if (!form.username || !form.password) {
      toast.error("Preencha usuário e senha");
      return;
    }
    setCreating(true);
    try {
      const payload = {
        username: form.username.trim(),
        password: form.password,
        role: form.role,
      };
      const res = await api.post("/users", payload);
      setUsers((p) => [...p, res.data]);
      setForm({ username: "", password: "", role: "user" });
      setShowForm(false);
      toast.success(`Usuário "${res.data.username}" criado`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao criar usuário");
    } finally {
      setCreating(false);
    }
  };

  const createInvite = async () => {
    if (!inviteForm.code) {
      toast.error("Preencha o código");
      return;
    }
    setCreatingInvite(true);
    try {
      const res = await api.post("/admin/invites", inviteForm);
      setInvites((p) => [res.data, ...p]);
      setInviteForm({ 
        code: "", 
        role: "user", 
        expiresInDays: 0,
        permissions: permList.reduce((acc, p) => ({ ...acc, [p.id]: true }), {})
      });
      setShowInviteForm(false);
      toast.success(`Convite "${res.data.code}" criado`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao criar convite");
    } finally {
      setCreatingInvite(false);
    }
  };

  const deleteInvite = async (id: string) => {
    try {
      await api.delete(`/admin/invites/${id}`);
      setInvites((p) => p.filter((i) => i.id !== id));
      toast.success("Convite removido");
    } catch { toast.error("Erro ao remover"); }
  };

  const deleteUser = async (id: string) => {
    if (id === me?.id) { toast.error("Não pode deletar sua própria conta"); return; }
    try {
      await api.delete(`/users/${id}`);
      setUsers((p) => p.filter((u) => u.id !== id));
      toast.success("Usuário removido");
    } catch { toast.error("Erro ao remover"); }
  };

  const changeRole = async (id: string, role: "admin" | "user") => {
    try {
      const res = await api.put(`/users/${id}/role`, { role });
      setUsers((p) => p.map((u) => (u.id === id ? res.data : u)));
      toast.success("Cargo atualizado");
    } catch { toast.error("Erro ao atualizar cargo"); }
  };

  const toggleMaintenance = async (id: string) => {
    try {
      const res = await api.put(`/admin/maintenance/${id}`);
      setMaintenance((p) => p.map((m) => (m.id === id ? res.data : m)));
      window.dispatchEvent(new Event("maintenanceUpdated"));
    } catch { toast.error("Erro"); }
  };

  const sendNotif = async () => {
    if (!notifTitle || !notifMsg) { toast.error("Preencha título e mensagem"); return; }
    setSendingNotif(true);
    try {
      await api.post("/admin/notifications", { title: notifTitle, message: notifMsg });
      setNotifTitle(""); setNotifMsg("");
      toast.success("Notificação enviada");
    } catch { toast.error("Erro ao enviar"); }
    finally { setSendingNotif(false); }
  };

  const addBadge = async () => {
    if (!badgeTarget || !badgeName) { toast.error("Nome obrigatório"); return; }
    try {
      const res = await api.post(`/users/${badgeTarget.id}/badges`, {
        name: badgeName,
        icon: badgeTab === "emoji" ? badgeIcon : "",
        image: badgeTab === "image" ? badgeImage : undefined,
      });
      setUsers((p) => p.map((u) => (u.id === badgeTarget.id ? res.data : u)));
      setBadgeName(""); setBadgeIcon("⭐"); setBadgeImage(""); setBadgeTarget(null);
      toast.success("Badge adicionada");
    } catch (err: any) { toast.error(err.response?.data?.error || "Erro"); }
  };

  const removeBadge = async (userId: string, badgeId: string) => {
    try {
      const res = await api.delete(`/users/${userId}/badges/${badgeId}`);
      setUsers((p) => p.map((u) => (u.id === userId ? res.data : u)));
      toast.success("Badge removida");
    } catch { toast.error("Erro"); }
  };

  const runScraper = async () => {
    if (!scraperUrl) { toast.error("Informe uma URL"); return; }
    let url = scraperUrl.trim();
    if (!url.startsWith("http")) url = "https://" + url;
    setScraperLoading(true);
    setScraperResult(null);
    setScraperError("");
    try {
      const res = await api.post("/admin/scrape", { url });
      setScraperResult(res.data);
    } catch (err: any) {
      setScraperError(err.response?.data?.error || "Erro ao fazer scraping");
    } finally {
      setScraperLoading(false);
    }
  };

  // ── Render ──
  return (
    <div className="space-y-4 pb-10 max-w-4xl">
      <div>
        <h1 className="text-[18px] font-semibold" style={{ color: "var(--foreground)", letterSpacing: "-0.03em" }}>
          Admin
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          Gerencie usuários, módulos e notificações
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Usuários", value: stats.totalUsers, icon: Users },
            { label: "Posts", value: stats.totalPosts, icon: MessageSquare },
            { label: "Leads", value: stats.totalLeads, icon: BarChart3 },
            { label: "Mensagens", value: stats.totalMessages, icon: FileText },
          ].map((s) => (
            <div key={s.label} className="rounded p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{s.label}</span>
                <s.icon size={13} style={{ color: "var(--muted-foreground)" }} />
              </div>
              <p className="text-[22px] font-semibold" style={{ color: "var(--foreground)", letterSpacing: "-0.03em" }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Maintenance */}
      <Section title="Módulos" icon={Power}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {maintenance.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleMaintenance(item.id)}
              className="flex items-center gap-2.5 p-3 rounded text-left transition-colors"
              style={{
                background: "var(--background)",
                border: `1px solid ${item.status === "online" ? "rgba(34,197,94,0.2)" : "rgba(234,179,8,0.2)"}`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--background)")}
            >
              <span className="text-base">{item.icon}</span>
              <div>
                <p className="text-[13px] font-medium" style={{ color: "var(--foreground)" }}>{item.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {item.status === "online"
                    ? <CheckCircle size={10} style={{ color: "#22c55e" }} />
                    : <AlertCircle size={10} style={{ color: "#eab308" }} />}
                  <span className="text-[11px]" style={{ color: item.status === "online" ? "#22c55e" : "#eab308" }}>
                    {item.status === "online" ? "Online" : "Manutenção"}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* Notification */}
      <Section title="Enviar Notificação" icon={Bell}>
        <div className="space-y-2">
          <input
            className={inp}
            style={inpStyle}
            placeholder="Título"
            value={notifTitle}
            onChange={(e) => setNotifTitle(e.target.value)}
            onFocus={inpFocus}
            onBlur={inpBlur}
          />
          <textarea
            className={`${inp} resize-none`}
            style={inpStyle}
            placeholder="Mensagem"
            rows={3}
            value={notifMsg}
            onChange={(e) => setNotifMsg(e.target.value)}
            onFocus={inpFocus as any}
            onBlur={inpBlur as any}
          />
          <button
            onClick={sendNotif}
            disabled={sendingNotif}
            className="action action-solid"
            style={{ opacity: sendingNotif ? 0.5 : 1 }}
          >
            {sendingNotif ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </Section>

      {/* Invites */}
      <Section title={`Convites (${invites.length})`} icon={FileText}>
        <div className="flex justify-end mb-3">
          <button
            onClick={() => {
              const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
              setInviteForm(f => ({...f, code: randomCode}));
              setShowInviteForm(!showInviteForm);
            }}
            className="action action-solid"
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <Plus size={13} />
            Novo Convite
          </button>
        </div>

        {showInviteForm && (
          <div
            className="rounded p-4 mb-4 space-y-2"
            style={{ background: "var(--background)", border: "1px solid var(--border)" }}
          >
            <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>
              GERAR CONVITE
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input className={inp} style={inpStyle} placeholder="Código (ex: XMAS-2026)"
                value={inviteForm.code} onChange={(e) => setInviteForm({ ...inviteForm, code: e.target.value.toUpperCase() })}
                onFocus={inpFocus} onBlur={inpBlur} />
              <input className={inp} style={inpStyle} placeholder="Dias de validade (0 = Lifetime)" type="number" min="0"
                value={inviteForm.expiresInDays} onChange={(e) => setInviteForm({ ...inviteForm, expiresInDays: Number(e.target.value) })}
                onFocus={inpFocus} onBlur={inpBlur} />
              <select
                className={`${inp} col-span-2`}
                style={inpStyle}
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as any })}
                onFocus={inpFocus} onBlur={inpBlur}
              >
                <option value="user">Usuário Regular</option>
                <option value="moderator">Moderador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            
            <div className="mt-3">
              <p className="text-[11px] font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>
                PERMISSÕES DE ACESSO
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {permList.map(perm => (
                  <label key={perm.id} className="flex items-center gap-2 text-[12px]" style={{ color: "var(--foreground)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={inviteForm.permissions[perm.id]}
                      onChange={(e) => setInviteForm({
                        ...inviteForm,
                        permissions: { ...inviteForm.permissions, [perm.id]: e.target.checked }
                      })}
                      style={{ accentColor: "var(--foreground)" }}
                    />
                    {perm.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2 mt-2" style={{ borderTop: "1px solid var(--border)" }}>
              <button onClick={createInvite} disabled={creatingInvite} className="action action-solid">
                {creatingInvite ? "Criando…" : "Gerar Convite"}
              </button>
              <button onClick={() => setShowInviteForm(false)} className="action action-outline">
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {loading ? (
             <div className="h-12 rounded animate-pulse" style={{ background: "var(--accent)" }} />
          ) : invites.length === 0 ? (
            <p className="text-[13px] py-4 text-center" style={{ color: "var(--muted-foreground)" }}>
              Nenhum convite
            </p>
          ) : (
            invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded"
                style={{
                  background: inv.used ? "var(--background)" : "var(--accent)",
                  border: "1px solid var(--border)",
                  opacity: inv.used ? 0.6 : 1
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium" style={{ color: "var(--foreground)" }}>
                      {inv.code}
                    </span>
                    <span className="text-[11px] px-1.5 rounded" style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
                      {inv.role}
                    </span>
                  </div>
                  <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                    {inv.used ? `Usado` : (inv.expiresAt.startsWith("9999-") ? "Lifetime" : `Expira em ${new Date(inv.expiresAt).toLocaleDateString()}`)}
                  </span>
                </div>

                <div className="flex items-center flex-shrink-0">
                  <button
                    onClick={() => deleteInvite(inv.id)}
                    className="p-1.5 rounded transition-colors"
                    style={{ color: "var(--muted-foreground)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--destructive)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
                    title="Remover"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Section>

      {/* Users */}
      <Section title={`Usuários (${users.length})`} icon={Users}>
        {/* Create button */}
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setShowForm(!showForm)}
            className="action action-solid"
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <Plus size={13} />
            Novo Usuário
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div
            className="rounded p-4 mb-4 space-y-2"
            style={{ background: "var(--background)", border: "1px solid var(--border)" }}
          >
            <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>
              CRIAR USUÁRIO
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input className={inp} style={inpStyle} placeholder="Username *"
                value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                onFocus={inpFocus} onBlur={inpBlur} />
              <input className={inp} style={inpStyle} placeholder="Senha *" type="password"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                onFocus={inpFocus} onBlur={inpBlur} />
              <select
                className={`${inp} col-span-2`}
                style={inpStyle}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "moderator" | "user" })}
                onFocus={inpFocus} onBlur={inpBlur}
              >
                <option value="user">Usuário Regular</option>
                <option value="moderator">Moderador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={createUser} disabled={creating} className="action action-solid">
                {creating ? "Criando…" : "Criar Usuário"}
              </button>
              <button onClick={() => setShowForm(false)} className="action action-outline">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="space-y-1.5">
          {loading ? (
            [1, 2].map((i) => (
              <div key={i} className="h-12 rounded animate-pulse" style={{ background: "var(--accent)" }} />
            ))
          ) : users.length === 0 ? (
            <p className="text-[13px] py-4 text-center" style={{ color: "var(--muted-foreground)" }}>
              Nenhum usuário
            </p>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded"
                style={{
                  background: u.role === "admin" ? "var(--accent)" : "var(--background)",
                  border: "1px solid var(--border)",
                }}
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold flex-shrink-0"
                  style={{ background: "var(--muted)", color: "var(--foreground)" }}
                >
                  {u.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium truncate" style={{ color: "var(--foreground)" }}>
                      {u.name}
                    </span>
                    {u.role === "admin" && (
                      <Shield size={11} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                    )}
                  </div>
                  <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                    @{u.username} · {u.email}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value as "admin" | "moderator" | "user")}
                    className="text-[12px] px-2 py-1 rounded outline-none"
                    style={{ background: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  >
                    <option value="user">Usuário</option>
                    <option value="moderator">Moderador</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={() => setBadgeTarget(u)}
                    className="p-1.5 rounded transition-colors"
                    style={{ color: "var(--muted-foreground)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
                    title="Badges"
                  >
                    <Award size={14} />
                  </button>
                  {u.id !== me?.id && (
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="p-1.5 rounded transition-colors"
                      style={{ color: "var(--muted-foreground)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--destructive)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
                      title="Remover"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Section>

      {/* Scraper */}
      <Section title="IA Scraper (Admin)" icon={Globe}>
        <div className="space-y-3">
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className={`${inp} flex-1`}
              style={inpStyle}
              placeholder="https://exemplo.com"
              value={scraperUrl}
              onChange={(e) => setScraperUrl(e.target.value)}
              onFocus={inpFocus}
              onBlur={inpBlur}
              onKeyDown={(e) => { if (e.key === "Enter") runScraper(); }}
            />
            <button
              onClick={runScraper}
              disabled={scraperLoading}
              className="action action-solid"
              style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}
            >
              {scraperLoading ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
              {scraperLoading ? "Coletando…" : "Scrape"}
            </button>
          </div>

          {scraperError && (
            <p style={{ fontSize: 12, color: "#ef4444" }}>{scraperError}</p>
          )}

          {scraperResult && (
            <div className="space-y-3" style={{ fontSize: 12 }}>
              {scraperResult.title && (
                <div>
                  <p style={{ fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 2, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Título</p>
                  <p style={{ color: "var(--foreground)" }}>{scraperResult.title}</p>
                </div>
              )}
              {scraperResult.description && (
                <div>
                  <p style={{ fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 2, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Descrição</p>
                  <p style={{ color: "var(--foreground)" }}>{scraperResult.description}</p>
                </div>
              )}
              {scraperResult.emails.length > 0 && (
                <div>
                  <p style={{ fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 4, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Emails ({scraperResult.emails.length})</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {scraperResult.emails.map((e, i) => (
                      <span key={i} style={{ padding: "2px 8px", background: "var(--accent)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--foreground)", fontSize: 11 }}>{e}</span>
                    ))}
                  </div>
                </div>
              )}
              {scraperResult.phones.length > 0 && (
                <div>
                  <p style={{ fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 4, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Telefones ({scraperResult.phones.length})</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {scraperResult.phones.map((p, i) => (
                      <span key={i} style={{ padding: "2px 8px", background: "var(--accent)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--foreground)", fontSize: 11 }}>{p}</span>
                    ))}
                  </div>
                </div>
              )}
              {scraperResult.links.length > 0 && (
                <div>
                  <p style={{ fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 4, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Links ({scraperResult.links.length})</p>
                  <div style={{ maxHeight: 120, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                    {scraperResult.links.slice(0, 30).map((l, i) => (
                      <a key={i} href={l} target="_blank" rel="noopener noreferrer" style={{ color: "var(--foreground)", textDecoration: "underline", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l}</a>
                    ))}
                  </div>
                </div>
              )}
              {scraperResult.text && (
                <div>
                  <p style={{ fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 2, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Texto extraído</p>
                  <pre style={{ fontSize: 11, color: "var(--foreground)", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 200, overflowY: "auto", background: "var(--background)", padding: 8, borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>{scraperResult.text.slice(0, 3000)}{scraperResult.text.length > 3000 ? "…" : ""}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* Badge modal */}
      {badgeTarget && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setBadgeTarget(null); }}
        >
          <div
            className="w-full max-w-sm rounded p-5"
            style={{ background: "var(--popover)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
                Badges — {badgeTarget.name}
              </span>
              <button onClick={() => setBadgeTarget(null)} style={{ color: "var(--muted-foreground)" }}>
                <X size={15} />
              </button>
            </div>

            {/* Existing */}
            {badgeTarget.badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {badgeTarget.badges.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px]"
                    style={{ background: "var(--accent)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  >
                    {(b as any).image ? (
                      <img src={(b as any).image} alt={b.name} style={{ width: 14, height: 14, borderRadius: 2, objectFit: "cover" }} />
                    ) : (
                      <span>{b.icon}</span>
                    )}
                    <span>{b.name}</span>
                    <button
                      onClick={() => removeBadge(badgeTarget.id, b.id)}
                      className="ml-0.5"
                      style={{ color: "var(--muted-foreground)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--destructive)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <input className={inp} style={inpStyle} placeholder="Nome da badge *"
                value={badgeName} onChange={(e) => setBadgeName(e.target.value)}
                onFocus={inpFocus} onBlur={inpBlur} />

              {/* Tab: emoji ou imagem */}
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => setBadgeTab("emoji")}
                  className={`action ${badgeTab === "emoji" ? "action-solid" : "action-outline"}`}
                  style={{ flex: 1, fontSize: 12 }}
                >
                  Emoji
                </button>
                <button
                  onClick={() => setBadgeTab("image")}
                  className={`action ${badgeTab === "image" ? "action-solid" : "action-outline"}`}
                  style={{ flex: 1, fontSize: 12 }}
                >
                  Imagem
                </button>
              </div>

              {badgeTab === "emoji" ? (
                <div>
                  <input className={inp} style={inpStyle} placeholder="Emoji (ex: ⭐🔥🎖️)" maxLength={4}
                    value={badgeIcon} onChange={(e) => setBadgeIcon(e.target.value)}
                    onFocus={inpFocus} onBlur={inpBlur} />
                  {badgeIcon && (
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 24 }}>{badgeIcon}</span>
                      <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>preview</span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "8px 12px",
                      border: "1px dashed var(--border)",
                      borderRadius: "var(--radius)",
                      cursor: "pointer",
                      fontSize: 12,
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {badgeImage ? "Trocar imagem" : "Selecionar imagem"}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setBadgeImage(reader.result as string);
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {badgeImage && (
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      <img
                        src={badgeImage}
                        alt="badge preview"
                        style={{ width: 32, height: 32, borderRadius: "var(--radius)", objectFit: "cover", border: "1px solid var(--border)" }}
                      />
                      <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>preview</span>
                      <button
                        onClick={() => setBadgeImage("")}
                        style={{ fontSize: 11, color: "var(--muted-foreground)" }}
                      >
                        remover
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={addBadge}
                className="action action-solid w-full"
                disabled={!badgeName || (badgeTab === "image" && !badgeImage)}
              >
                Adicionar Badge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
