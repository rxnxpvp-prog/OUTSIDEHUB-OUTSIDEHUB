import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import QRCode from "react-qr-code";
import { Upload, Save, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import Avatar from "@/components/Avatar";

export default function Profile() {
  const { user, updateProfile, logout } = useAuth();
  const [, navigate] = useLocation();
  
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatar, setAvatar] = useState(user?.avatar ?? "");
  const [customSubdomain, setCustomSubdomain] = useState(user?.customSubdomain ?? "");
  const [links, setLinks] = useState<{ title: string; url: string }[]>(user?.links ?? []);
  
  const [isPublic, setIsPublic] = useState(user?.isPublic !== false);
  const [status, setStatus] = useState(user?.status ?? "");
  const [skills, setSkills] = useState<string[]>(user?.skills ?? []);
  const [tags, setTags] = useState<string[]>(user?.tags ?? []);
  const [projects, setProjects] = useState<{title: string; description: string; url: string}[]>(user?.projects ?? []);

  const [saving, setSaving] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSetupSecret, setTwoFactorSetupSecret] = useState("");
  const [twoFactorOtpauthUrl, setTwoFactorOtpauthUrl] = useState("");
  const [twoFactorOtp, setTwoFactorOtp] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorMessage, setTwoFactorMessage] = useState("");

  if (!user) return null;

  const uploadAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2_000_000) { toast.error("Máximo 2MB"); return; }
    const r = new FileReader();
    r.onload = (ev) => setAvatar(ev.target?.result as string);
    r.readAsDataURL(f);
  };

  const loadTwoFactorStatus = async () => {
    try {
      const res = await api.get("/auth/2fa/status");
      setTwoFactorEnabled(Boolean(res.data.twoFactorEnabled));
    } catch {
      setTwoFactorEnabled(false);
    }
  };

  useEffect(() => {
    loadTwoFactorStatus();
  }, []);

  const startTwoFactorSetup = async () => {
    setTwoFactorLoading(true);
    try {
      const res = await api.post("/auth/2fa/setup");
      setTwoFactorSetupSecret(res.data.secret);
      setTwoFactorOtpauthUrl(res.data.otpauthUrl || "");
      setTwoFactorMessage("Use um app de autenticação e insira o código mostrado abaixo.");
    } catch {
      toast.error("Erro ao iniciar 2FA");
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const confirmTwoFactor = async () => {
    if (!twoFactorOtp.trim()) {
      toast.error("Digite o código 2FA");
      return;
    }
    setTwoFactorLoading(true);
    try {
      await api.post("/auth/2fa/confirm", { otp: twoFactorOtp });
      setTwoFactorEnabled(true);
      setTwoFactorSetupSecret("");
      setTwoFactorOtp("");
      setTwoFactorMessage("");
      toast.success("2FA ativado. Faça logout e entre novamente para exigir o código.");
      logout();
      navigate("/login");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao confirmar 2FA");
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const disableTwoFactor = async () => {
    const password = window.prompt("Digite sua senha para desativar o 2FA");
    if (!password) return;
    setTwoFactorLoading(true);
    try {
      await api.post("/auth/2fa/disable", { password });
      setTwoFactorEnabled(false);
      setTwoFactorSetupSecret("");
      setTwoFactorOtp("");
      setTwoFactorMessage("");
      toast.success("2FA desativado");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao desativar 2FA");
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ 
        name, bio, avatar, customSubdomain: customSubdomain.trim(), 
        links, isPublic, status, skills, tags, projects 
      });
      toast.success("Perfil atualizado");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const addLink = () => setLinks([...links, { title: "", url: "" }]);
  const updateLink = (index: number, key: "title" | "url", value: string) => {
    const newLinks = [...links];
    newLinks[index][key] = value;
    setLinks(newLinks);
  };
  const removeLink = (index: number) => setLinks(links.filter((_, i) => i !== index));

  const addProject = () => setProjects([...projects, { title: "", description: "", url: "" }]);
  const updateProject = (index: number, key: "title" | "description" | "url", value: string) => {
    const p = [...projects];
    p[index][key] = value;
    setProjects(p);
  };
  const removeProject = (index: number) => setProjects(projects.filter((_, i) => i !== index));

  const addSkill = () => setSkills([...skills, ""]);
  const updateSkill = (index: number, value: string) => {
    const s = [...skills];
    s[index] = value;
    setSkills(s);
  };
  const removeSkill = (index: number) => setSkills(skills.filter((_, i) => i !== index));

  const addTag = () => setTags([...tags, ""]);
  const updateTag = (index: number, value: string) => {
    const t = [...tags];
    t[index] = value;
    setTags(t);
  };
  const removeTag = (index: number) => setTags(tags.filter((_, i) => i !== index));

  const row = (label: string, content: React.ReactNode) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{label}</label>
      {content}
    </div>
  );

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 60 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">Operator Profile</h1>
          <p className="page-sub">Configure sua identidade digital</p>
        </div>
        <button 
          onClick={() => navigate(`/u/${user.username}`)}
          className="action action-ghost"
        >
          Ver Cartão
        </button>
      </div>

      <div className="surface" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>Visibilidade do Perfil</p>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              {isPublic ? "Seu cartão de operador está visível para o hub." : "Modo furtivo ativo. Somente você pode ver seu cartão."}
            </p>
          </div>
          <button 
            onClick={() => setIsPublic(!isPublic)}
            className={`action ${isPublic ? 'action-solid' : 'action-outline'}`}
            style={{ 
              borderColor: isPublic ? 'transparent' : 'var(--glass-border)',
              color: isPublic ? '#fff' : 'var(--muted-foreground)'
            }}
          >
            {isPublic ? <><Eye size={14} /> Público</> : <><EyeOff size={14} /> Privado</>}
          </button>
        </div>
      </div>

      <div className="surface" style={{ padding: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>Avatar</p>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar name={name} src={avatar || undefined} size={48} />
          <div>
            <label className="action action-outline" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Upload size={12} />
              Alterar foto
              <input type="file" accept="image/*" onChange={uploadAvatar} style={{ display: "none" }} />
            </label>
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 5 }}>PNG, JPG. Máx 2MB.</p>
          </div>
        </div>
      </div>

      <div className="surface" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Dados do Operador</p>
        {row("Nome / Codinome", <input className="field" value={name} onChange={(e) => setName(e.target.value)} />)}
        {row("Status / Current Mission", <input className="field" placeholder="Ex: Construindo o futuro..." value={status} onChange={(e) => setStatus(e.target.value)} />)}
        {row("Bio", (
          <textarea
            className="field"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Resumo da sua jornada..."
            rows={3}
            style={{ resize: "none" }}
          />
        ))}
        {row("Username (ID)", <input className="field" value={user.username} disabled />)}
        {row("Subdomínio Opcional", (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              className="field"
              value={customSubdomain}
              onChange={(e) => setCustomSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="seu-nome"
            />
            <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>.outsidehub.com</span>
          </div>
        ))}
      </div>

      <div className="surface" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Links Oficiais</p>
          <button onClick={addLink} className="action action-ghost" style={{ fontSize: 11, padding: "2px 8px" }}><Plus size={12} /> Add</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {links.map((link, index) => (
            <div key={index} style={{ display: "flex", gap: 8 }}>
              <input className="field" placeholder="Título" value={link.title} onChange={(e) => updateLink(index, "title", e.target.value)} style={{ flex: 1 }} />
              <input className="field" placeholder="URL (https://...)" value={link.url} onChange={(e) => updateLink(index, "url", e.target.value)} style={{ flex: 2 }} />
              <button onClick={() => removeLink(index)} className="action action-ghost" style={{ padding: "0 8px", color: "var(--destructive)" }}><Trash2 size={14} /></button>
            </div>
          ))}
          {links.length === 0 && <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Nenhum link adicionado.</p>}
        </div>
      </div>

      <div className="surface" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Projetos / Arsenal</p>
          <button onClick={addProject} className="action action-ghost" style={{ fontSize: 11, padding: "2px 8px" }}><Plus size={12} /> Add</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {projects.map((p, index) => (
            <div key={index} style={{ display: "flex", flexDirection: "column", gap: 6, padding: 12, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="field" placeholder="Nome do Projeto" value={p.title} onChange={(e) => updateProject(index, "title", e.target.value)} style={{ flex: 1 }} />
                <button onClick={() => removeProject(index)} className="action action-ghost" style={{ padding: "0 8px", color: "var(--destructive)" }}><Trash2 size={14} /></button>
              </div>
              <input className="field" placeholder="URL (opcional)" value={p.url} onChange={(e) => updateProject(index, "url", e.target.value)} />
              <textarea className="field" placeholder="Descrição curta..." value={p.description} onChange={(e) => updateProject(index, "description", e.target.value)} rows={2} style={{ resize: "none" }} />
            </div>
          ))}
          {projects.length === 0 && <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Nenhum projeto adicionado.</p>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div className="surface" style={{ padding: 16, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Skills</p>
            <button onClick={addSkill} className="action action-ghost" style={{ fontSize: 11, padding: "2px 8px" }}><Plus size={12} /></button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {skills.map((s, index) => (
              <div key={index} style={{ display: "flex", gap: 4 }}>
                <input className="field" placeholder="Ex: React, UX..." value={s} onChange={(e) => updateSkill(index, e.target.value)} />
                <button onClick={() => removeSkill(index)} className="action action-ghost" style={{ padding: "0 8px", color: "var(--destructive)" }}><Trash2 size={12} /></button>
              </div>
            ))}
            {skills.length === 0 && <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Nenhuma skill.</p>}
          </div>
        </div>

        <div className="surface" style={{ padding: 16, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Tags</p>
            <button onClick={addTag} className="action action-ghost" style={{ fontSize: 11, padding: "2px 8px" }}><Plus size={12} /></button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {tags.map((t, index) => (
              <div key={index} style={{ display: "flex", gap: 4 }}>
                <input className="field" placeholder="Ex: Founder, Dev..." value={t} onChange={(e) => updateTag(index, e.target.value)} />
                <button onClick={() => removeTag(index)} className="action action-ghost" style={{ padding: "0 8px", color: "var(--destructive)" }}><Trash2 size={12} /></button>
              </div>
            ))}
            {tags.length === 0 && <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Nenhuma tag.</p>}
          </div>
        </div>
      </div>

      <div className="surface" style={{ padding: 16, marginTop: 4 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>Segurança (2FA)</p>
        <p style={{ fontSize: 13, color: "var(--foreground)", marginBottom: 12 }}>
          {twoFactorEnabled ? "2FA está ativo para sua conta." : "Proteja sua conta com código de autenticação."}
        </p>
        {twoFactorSetupSecret ? (
          <div style={{ display: "grid", gap: 10 }}>
            {twoFactorOtpauthUrl && (
              <div style={{ display: "flex", justifyContent: "center", padding: 16, borderRadius: 16, background: "var(--background)" }}>
                <QRCode value={twoFactorOtpauthUrl} size={180} />
              </div>
            )}
            <div style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 12, background: "var(--background)" }}>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 6 }}>Código secreto</p>
              <p style={{ fontSize: 14, fontWeight: 600, wordBreak: "break-all" }}>{twoFactorSetupSecret}</p>
            </div>
            <input className="field" placeholder="Código 2FA" value={twoFactorOtp} onChange={(e) => setTwoFactorOtp(e.target.value)} />
            <button onClick={confirmTwoFactor} disabled={twoFactorLoading} className="action action-solid">
              {twoFactorLoading ? "Confirmando…" : "Confirmar 2FA"}
            </button>
            <p style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{twoFactorMessage}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={startTwoFactorSetup} disabled={twoFactorLoading} className="action action-outline">
              {twoFactorLoading ? "Carregando…" : twoFactorEnabled ? "Reconfigurar 2FA" : "Ativar 2FA"}
            </button>
            {twoFactorEnabled && (
              <button onClick={disableTwoFactor} disabled={twoFactorLoading} className="action action-ghost" style={{ color: "var(--destructive)" }}>
                Desativar 2FA
              </button>
            )}
          </div>
        )}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="action action-solid"
        style={{ width: "100%", padding: "12px", marginTop: 10 }}
      >
        {saving ? (
          <span className="spin" style={{ width: 13, height: 13, borderRadius: "50%", border: "1.5px solid var(--primary-foreground)", borderTopColor: "transparent", display: "inline-block" }} />
        ) : (
          <Save size={15} />
        )}
        {saving ? "Salvando…" : "Salvar Identidade"}
      </button>
    </div>
  );
}
