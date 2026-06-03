import React, { useState, useEffect } from "react";
import { Users, Bell, Power, Plus, Trash2, Shield, CheckCircle, AlertCircle, X, Award, BarChart3, MessageSquare, FileText, Globe, Loader2, Palette, Hash, Lock, Activity, MessageCircle, Search as SearchIcon, Zap, Bug, Mail, Download } from "lucide-react";

const MODULE_ICONS: Record<string, React.ElementType> = {
  feed: Activity,
  chat: MessageCircle,
  search: SearchIcon,
  builders: Zap,
  logs: FileText,
  scraper: Bug,
};

function getModuleIcon(name: string): React.ElementType {
  return MODULE_ICONS[name.toLowerCase()] ?? Globe;
}
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import BadgeIcon, { BadgeDisplay, BADGE_CONFIGS, SYS_BADGE_TYPES, SysBadgeType, getSysBadgeType } from "@/components/BadgeIcon";
import { emitUserUpdated } from "@/lib/userEvents";
import { isSupremeUsername } from "@/lib/identity";

// ── Types ─────────────────────────────────────────────────
interface UserRow {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "admin" | "moderator" | "user";
  permissions?: Record<string, boolean>;
  badges: { id: string; name: string; icon: string; image?: string; color?: string }[];
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

interface ChatChannelRow {
  id: string;
  name: string;
  description?: string;
  locked?: boolean;
  messageCount: number;
  createdAt: string;
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
  const [chatChannels, setChatChannels] = useState<ChatChannelRow[]>([]);
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
    { id: "sms", label: "Caixas" },
    { id: "leads", label: "Leads" },
    { id: "email", label: "Disparo" },
    { id: "search", label: "Search" },
    { id: "builders", label: "Builders" },
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

  const [chatForm, setChatForm] = useState({ name: "", description: "", locked: false });

  // notification
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMsg, setNotifMsg] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);
  const [discordSaving, setDiscordSaving] = useState(false);
  const [discordForm, setDiscordForm] = useState({
    clientId: "",
    clientSecret: "",
    clientSecretSet: false,
    redirectUri: "https://www.outsidehub.com.br/api/auth/discord/callback",
    clientUrl: "https://www.outsidehub.com.br",
    rpcDetails: "OutsideHub",
    rpcState: "Online",
  });
  const [hostingerSaving, setHostingerSaving] = useState(false);
  const [hostingerForm, setHostingerForm] = useState({
    domain: "",
    inboxEmail: "",
    inboxPassword: "",
    inboxPasswordSet: false,
    imapHost: "imap.hostinger.com",
    imapPort: "993",
  });
  const [desktopSaving, setDesktopSaving] = useState(false);
  const [desktopForm, setDesktopForm] = useState({
    version: "1.0.2",
    downloadUrl: "https://github.com/rxnxpvp-prog/OUTSIDEHUB-V1/releases/download/v1/OutsideHub.exe",
    loginUrl: "https://www.outsidehub.com.br/login",
    notes: "OutsideHub desktop update",
  });

  // scraper
  const [scraperUrl, setScraperUrl] = useState("");
  const [scraperLoading, setScraperLoading] = useState(false);
  const [scraperResult, setScraperResult] = useState<{ title: string; description: string; emails: string[]; phones: string[]; links: string[]; text: string } | null>(null);
  const [scraperError, setScraperError] = useState("");

  // badge modal
  const [badgeTarget, setBadgeTarget] = useState<UserRow | null>(null);
  const [badgeName, setBadgeName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<SysBadgeType | null>(null);
  const [editingBadgeId, setEditingBadgeId] = useState<string | null>(null);
  const [badgeColor, setBadgeColor] = useState<string>("");

  // badge template colors (persisted in localStorage)
  const [badgeColors, setBadgeColors] = useState<Partial<Record<SysBadgeType, string>>>(() => {
    try { return JSON.parse(localStorage.getItem("oh_badge_colors") || "{}"); }
    catch { return {}; }
  });

  const updateBadgeColor = (type: SysBadgeType, color: string) => {
    const next = { ...badgeColors, [type]: color };
    setBadgeColors(next);
    localStorage.setItem("oh_badge_colors", JSON.stringify(next));
  };

  const [badgeImages, setBadgeImages] = useState<Partial<Record<SysBadgeType, string>>>(() => {
    try { return JSON.parse(localStorage.getItem("oh_badge_images") || "{}"); }
    catch { return {}; }
  });

  const [badgeNames, setBadgeNames] = useState<Partial<Record<SysBadgeType, string>>>(() => {
    try { return JSON.parse(localStorage.getItem("oh_badge_names") || "{}"); }
    catch { return {}; }
  });

  const updateBadgeImage = (type: SysBadgeType, image: string) => {
    const next = { ...badgeImages, [type]: image };
    if (!image) delete next[type];
    setBadgeImages(next);
    localStorage.setItem("oh_badge_images", JSON.stringify(next));
  };

  const updateBadgeName = (type: SysBadgeType, name: string) => {
    const next = { ...badgeNames, [type]: name };
    if (!name.trim()) delete next[type];
    setBadgeNames(next);
    localStorage.setItem("oh_badge_names", JSON.stringify(next));
  };

  const getBadgeLabel = (type: SysBadgeType) => badgeNames[type]?.trim() || BADGE_CONFIGS[type].label;

  const resetBadgeForm = () => {
    setBadgeName("");
    setBadgeColor("");
    setSelectedTemplate(null);
    setEditingBadgeId(null);
  };

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      api.get("/users").then((r) => setUsers(r.data)),
      api.get("/admin/settings").then((r) => {
        setMaintenance(r.data.maintenance || []);
        if (r.data.discordConfig) {
          setDiscordForm((current) => ({
            ...current,
            ...r.data.discordConfig,
            clientSecret: "",
          }));
        }
        if (r.data.hostingerAliasConfig) {
          setHostingerForm((current) => ({ ...current, ...r.data.hostingerAliasConfig }));
        }
        if (r.data.desktopConfig) {
          setDesktopForm((current) => ({ ...current, ...r.data.desktopConfig }));
        }
      }),
      api.get("/admin/stats").then((r) => setStats(r.data)),
      api.get("/admin/invites").then((r) => setInvites(r.data)),
      api.get("/admin/chat/channels").then((r) => setChatChannels(r.data)),
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

  const [permTarget, setPermTarget] = useState<string | null>(null);

  const changeRole = async (id: string, role: "admin" | "moderator" | "user") => {
    try {
      const res = await api.put(`/users/${id}/role`, { role });
      setUsers((p) => p.map((u) => (u.id === id ? res.data : u)));
      toast.success("Cargo atualizado");
    } catch { toast.error("Erro ao atualizar cargo"); }
  };

  const changePermissions = async (id: string, permissions: Record<string, boolean>) => {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    try {
      const res = await api.put(`/users/${id}/role`, { role: user.role, permissions });
      setUsers((p) => p.map((u) => (u.id === id ? res.data : u)));
    } catch { toast.error("Erro ao atualizar permissões"); }
  };

  const toggleMaintenance = async (id: string) => {
    try {
      const res = await api.put(`/admin/maintenance/${id}`);
      setMaintenance((p) => p.map((m) => (m.id === id ? res.data : m)));
      window.dispatchEvent(new Event("maintenanceUpdated"));
    } catch { toast.error("Erro"); }
  };

  const refreshChatChannels = async () => {
    const res = await api.get("/admin/chat/channels");
    setChatChannels(res.data);
  };

  const createChatChannel = async () => {
    if (!chatForm.name.trim()) { toast.error("Nome do canal obrigatorio"); return; }
    try {
      const res = await api.post("/admin/chat/channels", chatForm);
      setChatChannels((p) => [...p, res.data]);
      setChatForm({ name: "", description: "", locked: false });
      toast.success("Canal criado");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao criar canal");
    }
  };

  const updateChatChannel = async (channel: ChatChannelRow, patch: Partial<ChatChannelRow>) => {
    try {
      const payload = {
        name: patch.name ?? channel.name,
        description: patch.description ?? channel.description ?? "",
        locked: patch.locked ?? channel.locked ?? false,
      };
      const res = await api.put(`/admin/chat/channels/${channel.id}`, payload);
      setChatChannels((p) => p.map((item) => item.id === channel.id ? res.data : item));
      toast.success("Canal atualizado");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao atualizar canal");
      refreshChatChannels().catch(() => {});
    }
  };

  const clearChatChannel = async (channel: ChatChannelRow) => {
    if (!window.confirm(`Limpar todas as mensagens de #${channel.name}?`)) return;
    try {
      await api.delete(`/admin/chat/channels/${channel.id}/messages`);
      setChatChannels((p) => p.map((item) => item.id === channel.id ? { ...item, messageCount: 0 } : item));
      setStats((current) => current ? { ...current, totalMessages: Math.max(0, current.totalMessages - channel.messageCount) } : current);
      toast.success("Mensagens limpas");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao limpar canal");
    }
  };

  const deleteChatChannel = async (channel: ChatChannelRow) => {
    if (!window.confirm(`Remover #${channel.name} e apagar suas mensagens?`)) return;
    try {
      await api.delete(`/admin/chat/channels/${channel.id}`);
      setChatChannels((p) => p.filter((item) => item.id !== channel.id));
      setStats((current) => current ? { ...current, totalMessages: Math.max(0, current.totalMessages - channel.messageCount) } : current);
      toast.success("Canal removido");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao remover canal");
    }
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

  const saveDiscord = async () => {
    setDiscordSaving(true);
    try {
      const payload = {
        ...discordForm,
        clientSecret: discordForm.clientSecret.trim() || undefined,
      };
      const res = await api.put("/admin/discord", payload);
      setDiscordForm((current) => ({
        ...current,
        ...res.data.discordConfig,
        clientSecret: "",
      }));
      toast.success("Discord atualizado");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao salvar Discord");
    } finally {
      setDiscordSaving(false);
    }
  };

  const saveHostingerAlias = async () => {
    setHostingerSaving(true);
    try {
      const payload = {
        ...hostingerForm,
        inboxPassword: hostingerForm.inboxPassword.trim() || undefined,
      };
      const res = await api.put("/admin/hostinger-alias", payload);
      setHostingerForm((current) => ({ ...current, ...res.data.hostingerAliasConfig, inboxPassword: "" }));
      toast.success("Hostinger catch-all atualizado");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao salvar Hostinger");
    } finally {
      setHostingerSaving(false);
    }
  };

  const saveDesktopConfig = async () => {
    setDesktopSaving(true);
    try {
      const res = await api.put("/admin/desktop", desktopForm);
      setDesktopForm((current) => ({ ...current, ...res.data.desktopConfig }));
      toast.success("Desktop atualizado");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao salvar desktop");
    } finally {
      setDesktopSaving(false);
    }
  };

  const addBadge = async () => {
    if (!badgeTarget || !badgeName) { toast.error("Nome obrigatorio"); return; }
    if (!selectedTemplate) { toast.error("Selecione um template"); return; }
    try {
      const payload = { name: badgeName, icon: `sys:${selectedTemplate}`, color: badgeColor || badgeColors[selectedTemplate] || BADGE_CONFIGS[selectedTemplate].defaultPrimary, image: badgeImages[selectedTemplate] || undefined };
      const res = editingBadgeId
        ? await api.put(`/users/${badgeTarget.id}/badges/${editingBadgeId}`, payload)
        : await api.post(`/users/${badgeTarget.id}/badges`, payload);
      setUsers((p) => p.map((u) => (u.id === badgeTarget.id ? res.data : u)));
      setBadgeTarget(res.data);
      emitUserUpdated({ userId: badgeTarget.id, user: res.data });
      resetBadgeForm();
      toast.success(editingBadgeId ? "Badge atualizada" : "Badge adicionada");
    } catch (err: any) { toast.error(err.response?.data?.error || "Erro"); }
  };

  const editBadge = (badge: UserRow["badges"][number] & { color?: string }) => {
    const type = getSysBadgeType(badge.icon);
    setEditingBadgeId(badge.id);
    setBadgeName(badge.name);
    setBadgeColor(badge.color || "");
    setSelectedTemplate(type && SYS_BADGE_TYPES.includes(type as SysBadgeType) ? (type as SysBadgeType) : null);
    // template-only mode
  };

  const removeBadge = async (userId: string, badgeId: string) => {
    setBadgeTarget((current) =>
      current && current.id === userId
        ? { ...current, badges: current.badges.filter((b) => b.id !== badgeId) }
        : current
    );
    try {
      const res = await api.delete(`/users/${userId}/badges/${badgeId}`);
      setUsers((p) => p.map((u) => (u.id === userId ? res.data : u)));
      setBadgeTarget((current) => (current && current.id === userId ? res.data : current));
      emitUserUpdated({ userId, user: res.data });
      toast.success("Badge removida");
    } catch {
      const original = users.find((u) => u.id === userId);
      if (original) setBadgeTarget(original);
      toast.error("Erro");
    }
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
              {(() => { const MIcon = getModuleIcon(item.name); return <MIcon size={16} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />; })()}
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

      {/* Chat Control */}
      <Section title={`Chats (${chatChannels.length})`} icon={Hash}>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr_auto] gap-2 mb-3">
          <input className={inp} style={inpStyle} placeholder="novo-canal"
            value={chatForm.name} onChange={(e) => setChatForm({ ...chatForm, name: e.target.value })}
            onFocus={inpFocus} onBlur={inpBlur} />
          <input className={inp} style={inpStyle} placeholder="Descricao opcional"
            value={chatForm.description} onChange={(e) => setChatForm({ ...chatForm, description: e.target.value })}
            onFocus={inpFocus} onBlur={inpBlur} />
          <button onClick={createChatChannel} className="action action-solid" style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
            <Plus size={13} />
            Criar
          </button>
        </div>
        <label className="flex items-center gap-2 mb-4" style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
          <input type="checkbox" checked={chatForm.locked} onChange={(e) => setChatForm({ ...chatForm, locked: e.target.checked })} />
          Criar bloqueado para envio de membros
        </label>

        <div className="space-y-2">
          {chatChannels.map((channel) => (
            <div key={channel.id} className="rounded p-3" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr_auto] gap-2">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Hash size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                  <input className={inp} style={{ ...inpStyle, padding: "6px 8px" }}
                    value={channel.name}
                    onChange={(e) => setChatChannels((p) => p.map((item) => item.id === channel.id ? { ...item, name: e.target.value } : item))}
                    onBlur={() => updateChatChannel(channel, { name: channel.name })}
                    onFocus={inpFocus} />
                </div>
                <input className={inp} style={{ ...inpStyle, padding: "6px 8px" }}
                  value={channel.description || ""}
                  placeholder="Descricao"
                  onChange={(e) => setChatChannels((p) => p.map((item) => item.id === channel.id ? { ...item, description: e.target.value } : item))}
                  onBlur={() => updateChatChannel(channel, { description: channel.description || "" })}
                  onFocus={inpFocus} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{channel.messageCount} msgs</span>
                  <button onClick={() => updateChatChannel(channel, { locked: !channel.locked })} className="action action-outline" title={channel.locked ? "Desbloquear envio" : "Bloquear envio"} style={{ padding: "6px 8px", color: channel.locked ? "#eab308" : "var(--muted-foreground)" }}>
                    <Lock size={13} />
                  </button>
                  <button onClick={() => clearChatChannel(channel)} className="action action-outline" style={{ padding: "6px 8px", fontSize: 11 }}>
                    Limpar
                  </button>
                  <button onClick={() => deleteChatChannel(channel)} className="action action-outline" style={{ padding: "6px 8px", color: "var(--destructive)" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
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

      <Section title="Discord OAuth / RPC" icon={MessageSquare}>
        <div className="space-y-3">
          <div className="grid md:grid-cols-2 gap-2">
            <input className={inp} style={inpStyle} placeholder="Discord Client ID / Application ID"
              value={discordForm.clientId} onChange={(e) => setDiscordForm({ ...discordForm, clientId: e.target.value })}
              onFocus={inpFocus} onBlur={inpBlur} />
            <input className={inp} style={inpStyle} type="password"
              placeholder={discordForm.clientSecretSet ? "Client Secret salvo (preencha para trocar)" : "Discord Client Secret"}
              value={discordForm.clientSecret} onChange={(e) => setDiscordForm({ ...discordForm, clientSecret: e.target.value })}
              onFocus={inpFocus} onBlur={inpBlur} />
          </div>
          <input className={inp} style={inpStyle} placeholder="Redirect URI"
            value={discordForm.redirectUri} onChange={(e) => setDiscordForm({ ...discordForm, redirectUri: e.target.value })}
            onFocus={inpFocus} onBlur={inpBlur} />
          <input className={inp} style={inpStyle} placeholder="URL publica do site"
            value={discordForm.clientUrl} onChange={(e) => setDiscordForm({ ...discordForm, clientUrl: e.target.value })}
            onFocus={inpFocus} onBlur={inpBlur} />
          <div className="grid md:grid-cols-2 gap-2">
            <input className={inp} style={inpStyle} placeholder="RPC details"
              value={discordForm.rpcDetails} onChange={(e) => setDiscordForm({ ...discordForm, rpcDetails: e.target.value })}
              onFocus={inpFocus} onBlur={inpBlur} />
            <input className={inp} style={inpStyle} placeholder="RPC state"
              value={discordForm.rpcState} onChange={(e) => setDiscordForm({ ...discordForm, rpcState: e.target.value })}
              onFocus={inpFocus} onBlur={inpBlur} />
          </div>
          <div className="rounded px-3 py-2" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
            <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>Redirect URI para colar no Discord Developer Portal:</p>
            <code className="text-[12px]" style={{ color: "var(--foreground)", wordBreak: "break-all" }}>{discordForm.redirectUri}</code>
          </div>
          <p className="text-[12px]" style={{ color: "var(--muted-foreground)", lineHeight: 1.45 }}>
            OAuth conecta a conta no site. Rich Presence/RPC aparece no Discord apenas quando o app desktop/local usa este Application ID.
          </p>
          <button onClick={saveDiscord} disabled={discordSaving} className="action action-solid" style={{ opacity: discordSaving ? 0.5 : 1 }}>
            {discordSaving ? "Salvando..." : "Salvar Discord"}
          </button>
        </div>
      </Section>

      <Section title="Desktop App / Updates" icon={Download}>
        <div className="space-y-3">
          <div className="grid md:grid-cols-2 gap-2">
            <input className={inp} style={inpStyle} placeholder="Versao atual, ex: 1.0.2"
              value={desktopForm.version} onChange={(e) => setDesktopForm({ ...desktopForm, version: e.target.value })}
              onFocus={inpFocus} onBlur={inpBlur} />
            <input className={inp} style={inpStyle} placeholder="Login URL do app"
              value={desktopForm.loginUrl} onChange={(e) => setDesktopForm({ ...desktopForm, loginUrl: e.target.value })}
              onFocus={inpFocus} onBlur={inpBlur} />
          </div>
          <input className={inp} style={inpStyle} placeholder="Link direto do novo instalador .exe"
            value={desktopForm.downloadUrl} onChange={(e) => setDesktopForm({ ...desktopForm, downloadUrl: e.target.value })}
            onFocus={inpFocus} onBlur={inpBlur} />
          <textarea className={`${inp} resize-none`} style={inpStyle} rows={2} placeholder="Notas da atualizacao"
            value={desktopForm.notes} onChange={(e) => setDesktopForm({ ...desktopForm, notes: e.target.value })}
            onFocus={inpFocus as any} onBlur={inpBlur as any} />
          <div className="rounded px-3 py-2" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
            <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>Quando o app abrir, ele compara a versao instalada com esta versao. Se for maior, mostra update dentro do Electron.</p>
          </div>
          <button onClick={saveDesktopConfig} disabled={desktopSaving} className="action action-solid" style={{ opacity: desktopSaving ? 0.5 : 1 }}>
            {desktopSaving ? "Salvando..." : "Salvar Desktop"}
          </button>
        </div>
      </Section>

      <Section title="Hostinger Catch-all" icon={Mail}>
        <div className="space-y-3">
          <div className="grid md:grid-cols-2 gap-2">
            <input className={inp} style={inpStyle} placeholder="Dominio catch-all, ex: outsidehub.com.br"
              value={hostingerForm.domain} onChange={(e) => setHostingerForm({ ...hostingerForm, domain: e.target.value })}
              onFocus={inpFocus} onBlur={inpBlur} />
            <input className={inp} style={inpStyle} placeholder="Inbox principal, ex: inbox@outsidehub.com.br"
              value={hostingerForm.inboxEmail} onChange={(e) => setHostingerForm({ ...hostingerForm, inboxEmail: e.target.value })}
              onFocus={inpFocus} onBlur={inpBlur} />
          </div>
          <input className={inp} style={inpStyle} type="password"
            placeholder={hostingerForm.inboxPasswordSet ? "Senha/app password salva (preencha para trocar)" : "Senha/app password da caixa principal"}
            value={hostingerForm.inboxPassword} onChange={(e) => setHostingerForm({ ...hostingerForm, inboxPassword: e.target.value })}
            onFocus={inpFocus} onBlur={inpBlur} />
          <div className="grid md:grid-cols-2 gap-2">
            <input className={inp} style={inpStyle} placeholder="IMAP host"
              value={hostingerForm.imapHost} onChange={(e) => setHostingerForm({ ...hostingerForm, imapHost: e.target.value })}
              onFocus={inpFocus} onBlur={inpBlur} />
            <input className={inp} style={inpStyle} placeholder="IMAP port"
              value={hostingerForm.imapPort} onChange={(e) => setHostingerForm({ ...hostingerForm, imapPort: e.target.value })}
              onFocus={inpFocus} onBlur={inpBlur} />
          </div>
          <p className="text-[12px]" style={{ color: "var(--muted-foreground)", lineHeight: 1.45 }}>
            Isso usa catch-all: os aliases gerados nao aparecem como aliases reais no hPanel, mas chegam na caixa principal configurada.
          </p>
          <button onClick={saveHostingerAlias} disabled={hostingerSaving} className="action action-solid" style={{ opacity: hostingerSaving ? 0.5 : 1 }}>
            {hostingerSaving ? "Salvando..." : "Salvar Hostinger"}
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
            users.map((u) => {
              const isSupreme = isSupremeUsername(u.username);
              const canManageBadges = me?.username?.toLowerCase() === "crema";
              return (
              <div
                key={u.id}
                className="rounded"
                style={{
                  background: u.role === "admin" ? "var(--accent)" : "var(--background)",
                  border: "1px solid var(--border)",
                }}
              >
                {/* Main row */}
                <div className="flex items-center gap-3 px-3 py-2.5">
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
                      {isSupreme && (
                        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: "#ef4444", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 999, padding: "2px 6px", background: "rgba(239,68,68,0.08)" }}>
                          CEO
                        </span>
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
                      disabled={isSupreme}
                      className="text-[12px] px-2 py-1 rounded outline-none"
                      style={{ background: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)", opacity: isSupreme ? 0.55 : 1 }}
                    >
                      <option value="user">Usuário</option>
                      <option value="moderator">Moderador</option>
                      <option value="admin">{isSupreme ? "CEO" : "Admin"}</option>
                    </select>
                    <button
                      onClick={() => !isSupreme && setPermTarget(permTarget === u.id ? null : u.id)}
                      className="p-1.5 rounded transition-colors"
                      style={{ color: permTarget === u.id ? "var(--foreground)" : "var(--muted-foreground)", opacity: isSupreme ? 0.35 : 1, cursor: isSupreme ? "not-allowed" : "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = permTarget === u.id ? "var(--foreground)" : "var(--muted-foreground)")}
                      title="Permissões"
                    >
                      <Lock size={14} />
                    </button>
                    <button
                      onClick={() => { if (canManageBadges) setBadgeTarget(u); }}
                      className="p-1.5 rounded transition-colors"
                      style={{ color: "var(--muted-foreground)", opacity: canManageBadges ? 1 : 0.35, cursor: canManageBadges ? "pointer" : "not-allowed" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
                      title={canManageBadges ? "Badges" : "Apenas crema pode editar badges"}
                    >
                      <Award size={14} />
                    </button>
                    {u.id !== me?.id && !isSupreme && (
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

                {/* Permissions panel */}
                {permTarget === u.id && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "10px 14px 12px" }}>
                    <p className="text-[10px] font-semibold mb-2" style={{ color: "var(--muted-foreground)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Acesso a features {u.role === "admin" && <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>— {isSupreme ? "CEO" : "Admin"} tem acesso total</span>}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-2">
                      {permList.map((perm) => {
                        const isAdmin = u.role === "admin";
                        const checked = isAdmin ? true : (u.permissions?.[perm.id] ?? true);
                        return (
                          <label
                            key={perm.id}
                            className="flex items-center gap-1.5 text-[12px]"
                            style={{ color: "var(--foreground)", cursor: isAdmin ? "default" : "pointer", opacity: isAdmin ? 0.45 : 1 }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={isAdmin}
                              onChange={(e) => {
                                const base = permList.reduce((acc, p) => ({ ...acc, [p.id]: u.permissions?.[p.id] ?? true }), {} as Record<string, boolean>);
                                changePermissions(u.id, { ...base, [perm.id]: e.target.checked });
                              }}
                              style={{ accentColor: "var(--foreground)", width: 13, height: 13, flexShrink: 0 }}
                            />
                            {perm.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )})
          )}
        </div>
      </Section>

      {/* Badge Templates */}
      <Section title="Identidades Visuais" icon={Palette}>
        <p className="text-[12px] mb-4" style={{ color: "var(--muted-foreground)" }}>
          Configure as cores e imagens padrao de cada permissao. Essas imagens serao usadas nas novas badges criadas a partir dos templates.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
          {SYS_BADGE_TYPES.map((type) => {
            const cfg = BADGE_CONFIGS[type];
            const color = badgeColors[type] || cfg.defaultPrimary;
            const image = badgeImages[type];
            const label = getBadgeLabel(type);
            return (
              <div
                key={type}
                className="flex flex-col items-center gap-2 p-3 rounded"
                style={{ background: "var(--background)", border: "1px solid var(--border)" }}
              >
                {image ? (
                  <img src={image} alt={label} style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover", border: "1px solid var(--border)" }} />
                ) : (
                  <BadgeIcon type={type} size={44} primaryColor={color} />
                )}
                <input
                  className={inp}
                  style={{ ...inpStyle, padding: "5px 7px", fontSize: 11, textAlign: "center" }}
                  value={badgeNames[type] ?? ""}
                  placeholder={cfg.label}
                  onChange={(e) => updateBadgeName(type, e.target.value)}
                  onFocus={inpFocus}
                  onBlur={inpBlur}
                  aria-label={`Nome do template ${cfg.label}`}
                />
                <p className="text-[10px] text-center" style={{ color: "var(--muted-foreground)", lineHeight: 1.3 }}>{cfg.description}</p>
                <div className="flex items-center gap-1.5 mt-auto">
                  <input
                    type="color"
                    value={color}
                    title="Cor primária"
                    onChange={(e) => updateBadgeColor(type, e.target.value)}
                    style={{ width: 24, height: 20, border: "none", borderRadius: 3, cursor: "pointer", padding: 0, background: "none" }}
                  />
                  <span className="text-[10px]" style={{ color: "var(--muted-foreground)", fontFamily: "monospace" }}>{color}</span>
                </div>
                <label className="action action-outline" style={{ fontSize: 10, padding: "4px 8px", cursor: "pointer" }}>
                  {image ? "Trocar imagem" : "Imagem"}
                  <input type="file" accept="image/*" style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => updateBadgeImage(type, reader.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                {image && (
                  <button onClick={() => updateBadgeImage(type, "")} className="action action-outline" style={{ fontSize: 10, padding: "4px 8px" }}>
                    Remover imagem
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={() => {
            setBadgeColors({});
            setBadgeImages({});
            setBadgeNames({});
            localStorage.removeItem("oh_badge_colors");
            localStorage.removeItem("oh_badge_images");
            localStorage.removeItem("oh_badge_names");
          }}
          className="action action-outline"
          style={{ fontSize: 12 }}
        >
          Restaurar padrões
        </button>
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
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[12px]"
                    style={{ background: editingBadgeId === b.id ? "var(--muted)" : "var(--accent)", border: `1px solid ${editingBadgeId === b.id ? "var(--foreground)" : "var(--border)"}`, color: "var(--foreground)", cursor: "pointer" }}
                    onClick={() => editBadge(b)}
                    title="Clique para editar"
                  >
                    <BadgeDisplay badge={b as any} size={18} />
                    <span>{b.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeBadge(badgeTarget.id, b.id); }}
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

            <div className="space-y-3">
              {editingBadgeId && (
                <div className="flex items-center justify-between rounded px-3 py-2" style={{ background: "var(--accent)", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Editando badge</span>
                  <button onClick={resetBadgeForm} style={{ fontSize: 12, color: "var(--foreground)" }}>Cancelar edição</button>
                </div>
              )}

              <input className={inp} style={inpStyle} placeholder="Nome da badge *"
                value={badgeName} onChange={(e) => setBadgeName(e.target.value)}
                onFocus={inpFocus} onBlur={inpBlur} />

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={badgeColor || (selectedTemplate ? badgeColors[selectedTemplate] || BADGE_CONFIGS[selectedTemplate].defaultPrimary : "#ffffff")}
                  title="Cor do nome"
                  onChange={(e) => setBadgeColor(e.target.value)}
                  style={{ width: 34, height: 30, border: "none", borderRadius: 4, cursor: "pointer", padding: 0, background: "none" }}
                />
                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Cor do nome quando esta badge estiver no usuário</span>
                {badgeColor && (
                  <button onClick={() => setBadgeColor("")} style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted-foreground)" }}>
                    usar padrão
                  </button>
                )}
              </div>

              {/* Templates */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {SYS_BADGE_TYPES.map((type) => {
                    const cfg = BADGE_CONFIGS[type];
                    const color = badgeColors[type] || cfg.defaultPrimary;
                    const image = badgeImages[type];
                    const label = getBadgeLabel(type);
                    const isSelected = selectedTemplate === type;
                    const rarityColor: Record<string, string> = {
                      COMMON: "#888", UNCOMMON: "#5ba85a", RARE: "#5a8fd4",
                      EPIC: "#a855f7", "FOUNDER · 1/10": "#d4a017",
                    };
                    return (
                      <button
                        key={type}
                        onClick={() => { setSelectedTemplate(type); if (!badgeName || SYS_BADGE_TYPES.some(t => getBadgeLabel(t) === badgeName) || Object.values(BADGE_CONFIGS).some(c => c.label === badgeName)) setBadgeName(label); if (!badgeColor) setBadgeColor(color); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
                          borderRadius: 8, border: `1px solid ${isSelected ? "rgba(255,255,255,0.3)" : "var(--border)"}`,
                          background: isSelected ? "rgba(255,255,255,0.06)" : "var(--background)",
                          cursor: "pointer", textAlign: "left", transition: "all 0.12s",
                        }}
                      >
                        <div style={{ width: 28, height: 28, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {image ? (
                            <img src={image} alt={label} style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover", border: "1px solid var(--border)" }} />
                          ) : (
                            <BadgeIcon type={type} size={28} primaryColor={color} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.01em" }}>{label}</p>
                          {cfg.rarity && (
                            <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", color: rarityColor[cfg.rarity] || "#888", textTransform: "uppercase", marginTop: 1 }}>
                              {cfg.rarity}
                            </p>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input
                            type="color"
                            value={color}
                            title="Cor"
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => { e.stopPropagation(); updateBadgeColor(type, e.target.value); if (selectedTemplate === type && !badgeColor) setBadgeColor(e.target.value); }}
                            style={{ width: 22, height: 18, border: "none", borderRadius: 3, cursor: "pointer", padding: 0 }}
                          />
                          {isSelected && <CheckCircle size={14} style={{ color: "var(--foreground)", flexShrink: 0 }} />}
                        </div>
                      </button>
                    );
                })}
              </div>

              <button
                onClick={addBadge}
                className="action action-solid w-full"
                disabled={!badgeName || !selectedTemplate}
              >
                {editingBadgeId ? "Salvar Badge" : "Adicionar Badge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
