import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import QRCode from "react-qr-code";
import { Upload, Save, Link2, Copy, Check, Shield, Star } from "lucide-react";
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
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSetupSecret, setTwoFactorSetupSecret] = useState("");
  const [twoFactorOtpauthUrl, setTwoFactorOtpauthUrl] = useState("");
  const [twoFactorOtp, setTwoFactorOtp] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorMessage, setTwoFactorMessage] = useState("");

  if (!user) return null;

  const subdomain = (user as any).subdomain || user.username;
  const profileLink = `${window.location.protocol}//${subdomain}.${window.location.host.replace(/^[^.]+\./, "")}`;
  const fallbackLink = `${window.location.origin}/u/${subdomain}`;
  const displayLink = profileLink.includes("localhost") ? fallbackLink : profileLink;

  const copyLink = () => {
    navigator.clipboard.writeText(displayLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  useEffect(() => { loadTwoFactorStatus(); }, []);

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
    if (!twoFactorOtp.trim()) { toast.error("Digite o código 2FA"); return; }
    setTwoFactorLoading(true);
    try {
      await api.post("/auth/2fa/confirm", { otp: twoFactorOtp });
      setTwoFactorEnabled(true);
      setTwoFactorSetupSecret("");
      setTwoFactorOtp("");
      setTwoFactorMessage("");
      toast.success("2FA ativado.");
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
      await updateProfile({ name, bio, avatar });
      toast.success("Perfil atualizado");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  // ── Liquid Glass Card wrapper ──
  const GlassCard = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      backdropFilter: "blur(24px) saturate(1.8)",
      WebkitBackdropFilter: "blur(24px) saturate(1.8)",
      border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 16,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.35)",
      position: "relative",
      overflow: "hidden",
      ...style,
    }}>
      {/* Top shimmer */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "40%",
        background: "linear-gradient(180deg, rgba(255,255,255,0.035) 0%, transparent 100%)",
        pointerEvents: "none", borderRadius: "16px 16px 0 0",
      }} />
      {children}
    </div>
  );

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 5, letterSpacing: "0.1em", textTransform: "uppercase" }}>
      {children}
    </label>
  );

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14, paddingBottom: 32, animation: "fadeUp 200ms ease both" }}>
      <div>
        <h1 className="page-title">Perfil</h1>
        <p className="page-sub" style={{ fontSize: 12 }}>Personalize sua conta</p>
      </div>

      {/* ── Hero Avatar + Info ── */}
      <GlassCard style={{ padding: "28px 24px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              boxShadow: "0 0 0 2px rgba(255,255,255,0.1), 0 0 24px rgba(180,0,0,0.2)",
              overflow: "hidden", background: "rgba(255,255,255,0.05)",
            }}>
              <Avatar name={name} src={avatar || undefined} size={72} />
            </div>
            <label style={{
              position: "absolute", bottom: -4, right: -4,
              width: 24, height: 24, borderRadius: 8,
              background: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}>
              <Upload size={11} color="var(--foreground)" />
              <input type="file" accept="image/*" onChange={uploadAvatar} style={{ display: "none" }} />
            </label>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.04em" }}>
                {user.name}
              </span>
              {user.role === "admin" && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  padding: "1px 7px", borderRadius: 99,
                  background: "rgba(229,72,77,0.15)",
                  border: "1px solid rgba(229,72,77,0.3)",
                  fontSize: 10, fontWeight: 600, color: "#e5484d",
                  letterSpacing: "0.06em",
                }}>
                  <Shield size={9} /> ADMIN
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>@{user.username}</p>
            {(user as any).bio && (
              <p style={{ fontSize: 12, color: "var(--foreground)", marginTop: 6, lineHeight: 1.5, opacity: 0.75 }}>
                {(user as any).bio}
              </p>
            )}

            {/* Badges */}
            {user.badges?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                {user.badges.map((b) => (
                  <span key={b.id} style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "2px 8px", borderRadius: 99,
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    fontSize: 11, color: "var(--foreground)",
                  }}>
                    {b.image ? <img src={b.image} alt={b.name} style={{ width: 12, height: 12, borderRadius: "50%" }} /> : <span>{b.icon}</span>}
                    {b.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subdomain/invite link */}
        <div style={{
          marginTop: 20,
          padding: "10px 14px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <Link2 size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "var(--muted-foreground)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayLink}
          </span>
          <button
            onClick={copyLink}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 6, fontSize: 11,
              background: copied ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.07)",
              border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)"}`,
              color: copied ? "#4ade80" : "var(--foreground)",
              transition: "all 200ms",
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </GlassCard>

      {/* ── Edit Info ── */}
      <GlassCard style={{ padding: "20px 24px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
          Informações
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <Label>Nome</Label>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Bio</Label>
            <textarea
              className="field"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte algo sobre você…"
              rows={2}
              style={{ resize: "none" }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <Label>Username</Label>
              <input className="field" value={user.username} disabled />
            </div>
            <div>
              <Label>Cargo</Label>
              <input
                className="field"
                value={user.role === "admin" ? "Administrador" : ((user as any).customRoleId ? "Membro" : "Usuário")}
                disabled
              />
            </div>
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="action action-solid"
          style={{ width: "100%", padding: "9px 14px", fontSize: 13, fontWeight: 600, marginTop: 16 }}
        >
          {saving
            ? <span className="spin" style={{ width: 13, height: 13, borderRadius: "50%", border: "1.5px solid var(--primary-foreground)", borderTopColor: "transparent", display: "inline-block" }} />
            : <Save size={13} />}
          {saving ? "Salvando…" : "Salvar Alterações"}
        </button>
      </GlassCard>

      {/* ── 2FA ── */}
      <GlassCard style={{ padding: "20px 24px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
          Autenticação de dois fatores
        </p>
        <p style={{ fontSize: 13, color: "var(--foreground)", marginBottom: 14, opacity: 0.8 }}>
          {twoFactorEnabled ? "2FA está ativo na sua conta." : "Proteja sua conta com código de autenticação."}
        </p>

        {twoFactorSetupSecret ? (
          <div style={{ display: "grid", gap: 10 }}>
            {twoFactorOtpauthUrl && (
              <div style={{ display: "flex", justifyContent: "center", padding: 16, borderRadius: 12, background: "rgba(255,255,255,0.05)" }}>
                <QRCode value={twoFactorOtpauthUrl} size={160} />
              </div>
            )}
            <div style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 10, background: "rgba(255,255,255,0.03)" }}>
              <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 6 }}>Código secreto</p>
              <p style={{ fontSize: 13, fontWeight: 600, wordBreak: "break-all" }}>{twoFactorSetupSecret}</p>
            </div>
            <input className="field" placeholder="Código 2FA" value={twoFactorOtp} onChange={(e) => setTwoFactorOtp(e.target.value)} />
            <button onClick={confirmTwoFactor} disabled={twoFactorLoading} className="action action-solid">
              {twoFactorLoading ? "Confirmando…" : "Confirmar 2FA"}
            </button>
            <p style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{twoFactorMessage}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={startTwoFactorSetup} disabled={twoFactorLoading} className="action action-solid">
              {twoFactorLoading ? "Carregando…" : twoFactorEnabled ? "Reconfigurar 2FA" : "Ativar 2FA"}
            </button>
            {twoFactorEnabled && (
              <button onClick={disableTwoFactor} disabled={twoFactorLoading} className="action action-ghost">
                Desativar 2FA
              </button>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
