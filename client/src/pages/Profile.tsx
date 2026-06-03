import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import QRCode from "react-qr-code";
import { Upload, Save, Eye, EyeOff, Plus, Trash2, ArrowLeft, ShieldCheck, ShieldOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { isSupremeUsername } from "@/lib/identity";

const MONO = "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace";

function permissionLabel(role: string, badges?: { icon: string }[]): string {
  if (role === "admin") return "***";
  if (badges?.some(b => b.icon === "sys:developer")) return "DEVELOPER";
  if (role === "moderator") return "MODERATOR";
  if (badges?.some(b => b.icon === "sys:premium")) return "PREMIUM";
  return "USER";
}

function roleColor(role: string): string {
  if (role === "admin") return "rgba(139,26,26,0.38)";
  if (role === "moderator") return "rgba(88,42,140,0.38)";
  return "rgba(26,61,92,0.38)";
}

/* ─── Shared styles ─────────────────────────────────── */

const card: React.CSSProperties = {
  background:
    "radial-gradient(circle at 12% 18%, rgba(255,255,255,0.07), transparent 18%), " +
    "linear-gradient(135deg, rgba(255,255,255,0.055), rgba(255,255,255,0.01) 42%, rgba(255,255,255,0.022)), " +
    "rgba(6,6,8,0.94)",
  border: "1px solid rgba(255,255,255,0.085)",
  borderRadius: 16,
  overflow: "hidden",
};

const inp: React.CSSProperties = {
  display: "block", width: "100%", padding: "8px 12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8, color: "#f0f0f0",
  fontSize: 13, fontFamily: "inherit",
  outline: "none", letterSpacing: "-0.01em",
  transition: "border-color 150ms",
  boxSizing: "border-box",
};

const btn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  gap: 6, padding: "8px 14px", borderRadius: 8, cursor: "pointer",
  fontSize: 11, fontWeight: 500, letterSpacing: "0.05em",
  fontFamily: "inherit",
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)",
  transition: "background 150ms, color 150ms",
};

const lbl: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, letterSpacing: "0.24em",
  textTransform: "uppercase", color: "rgba(255,255,255,0.28)",
  fontFamily: MONO, margin: "0 0 6px 0",
};

function WindowBar({ badge }: { badge: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "0 14px", height: 40, borderBottom: "1px solid rgba(255,255,255,0.065)" }}>
      <div style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.18)" }} />)}
      </div>
      <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 800, letterSpacing: "0.22em", color: "rgba(232,232,236,0.35)", fontFamily: MONO }}>
        {badge}
      </span>
    </div>
  );
}

function ProgressBar() {
  return <div style={{ height: 2, background: "linear-gradient(90deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.07) 55%, rgba(255,255,255,0.01) 100%)" }} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", fontFamily: MONO, margin: "0 0 14px" }}>
      {children}
    </p>
  );
}

/* ─── PROFILE PAGE ────────────────────────────────────── */

export default function Profile() {
  const { user, updateProfile, logout } = useAuth();
  const [, navigate] = useLocation();
  const goBack = () => window.history.length > 1 ? window.history.back() : navigate("/");

  const [name,            setName]            = useState(user?.name ?? "");
  const [bio,             setBio]             = useState(user?.bio ?? "");
  const [avatar,          setAvatar]          = useState(user?.avatar ?? "");
  const [customSubdomain, setCustomSubdomain] = useState(user?.customSubdomain ?? "");
  const [links,           setLinks]           = useState<{ title: string; url: string }[]>(user?.links ?? []);
  const [isPublic,        setIsPublic]        = useState(user?.isPublic !== false);
  const [status,          setStatus]          = useState(user?.status ?? "");
  const [tags,            setTags]            = useState<string[]>(user?.tags ?? []);
  const [saving,          setSaving]          = useState(false);

  const [tfaEnabled, setTfaEnabled] = useState(false);
  const [tfaSecret,  setTfaSecret]  = useState("");
  const [tfaUrl,     setTfaUrl]     = useState("");
  const [tfaOtp,     setTfaOtp]     = useState("");
  const [tfaLoading, setTfaLoading] = useState(false);
  const [tfaMsg,     setTfaMsg]     = useState("");

  useEffect(() => {
    api.get("/auth/2fa/status").then((r) => setTfaEnabled(Boolean(r.data.twoFactorEnabled))).catch(() => {});
  }, []);

  if (!user) return null;

  const nid       = user.accessCode || "OH-000";
  const perm = isSupremeUsername(user.username) ? "CEO" : permissionLabel(user.role, user.badges);
  const photoColor = roleColor(user.role);
  const src = avatar || user.avatar;

  const uploadAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8_000_000) { toast.error("Max 8MB"); return; }
    const r = new FileReader();
    r.onload = (ev) => setAvatar(ev.target?.result as string);
    r.readAsDataURL(f);
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ name, bio, avatar, customSubdomain: customSubdomain.trim(), links, isPublic, status, tags });
      toast.success("Profile updated");
    } catch (err: any) { toast.error(err.response?.data?.error || "Failed to save"); }
    finally { setSaving(false); }
  };

  const startTfa = async () => {
    setTfaLoading(true);
    try {
      const r = await api.post("/auth/2fa/setup");
      setTfaSecret(r.data.secret); setTfaUrl(r.data.otpauthUrl || "");
      setTfaMsg("Use an authenticator app and enter the code below.");
    } catch { toast.error("Failed to start 2FA"); }
    finally { setTfaLoading(false); }
  };

  const confirmTfa = async () => {
    if (!tfaOtp.trim()) { toast.error("Enter your 2FA code"); return; }
    setTfaLoading(true);
    try {
      await api.post("/auth/2fa/confirm", { otp: tfaOtp });
      setTfaEnabled(true); setTfaSecret(""); setTfaOtp(""); setTfaMsg("");
      toast.success("2FA activated. Please log in again."); logout(); navigate("/login");
    } catch (err: any) { toast.error(err.response?.data?.error || "Failed to confirm"); }
    finally { setTfaLoading(false); }
  };

  const disableTfa = async () => {
    const pw = window.prompt("Enter your password to disable 2FA");
    if (!pw) return;
    setTfaLoading(true);
    try {
      await api.post("/auth/2fa/disable", { password: pw });
      setTfaEnabled(false); setTfaSecret(""); setTfaOtp(""); setTfaMsg("");
      toast.success("2FA disabled");
    } catch (err: any) { toast.error(err.response?.data?.error || "Failed to disable"); }
    finally { setTfaLoading(false); }
  };

  const addLink    = () => setLinks([...links, { title: "", url: "" }]);
  const updateLink = (i: number, k: "title" | "url", v: string) => { const l = [...links]; l[i][k] = v; setLinks(l); };
  const removeLink = (i: number) => setLinks(links.filter((_, x) => x !== i));

  const addTag    = () => setTags([...tags, ""]);
  const updateTag = (i: number, v: string) => { const t = [...tags]; t[i] = v; setTags(t); };
  const removeTag = (i: number) => setTags(tags.filter((_, x) => x !== i));

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <button
          onClick={goBack}
          style={{ ...btn, padding: "5px 9px" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; e.currentTarget.style.color = "#f0f0f0"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
        >
          <ArrowLeft size={11} />
        </button>
        <div>
          <h1 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.04em", color: "#f0f0f0", margin: 0 }}>profile</h1>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", margin: "2px 0 0", fontFamily: MONO }}>user identity</p>
        </div>
        <button
          onClick={() => navigate(`/u/${user.username}`)}
          style={{ ...btn, marginLeft: "auto", fontSize: 10 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; e.currentTarget.style.color = "#f0f0f0"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
        >
          view public profile
        </button>
      </div>

      {/* ══ IDENTITY CARD ══════════════════════════════════ */}
      <div style={card}>
        <WindowBar badge="OH-ACCESS" />

        <div style={{ padding: "20px 20px 0", display: "flex", gap: 16, alignItems: "flex-start" }}>

          {/* Photo LEFT — ID card style */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{
              width: 70, height: 86, borderRadius: 8,
              border: `1px solid ${photoColor}`,
              background: "rgba(255,255,255,0.04)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.22)",
              overflow: "hidden", fontFamily: MONO,
            }}>
              {src
                ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : user.username.charAt(0).toUpperCase()
              }
            </div>
            <label style={{
              position: "absolute", bottom: -7, right: -7,
              width: 20, height: 20, borderRadius: "50%",
              background: "rgba(6,6,8,0.95)",
              border: "1px solid rgba(255,255,255,0.14)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}>
              <Upload size={9} style={{ color: "rgba(255,255,255,0.45)" }} />
              <input type="file" accept="image/*" onChange={uploadAvatar} style={{ display: "none" }} />
            </label>
          </div>

          {/* Right */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)", fontFamily: MONO, marginBottom: 13, lineHeight: 1.3 }}>
              <span style={{ color: "rgba(255,255,255,0.38)" }}>$</span>{" "}outsidehub --identify
            </div>

            {/* Pills */}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 15, fontFamily: MONO }}>
              <span style={{ display: "inline-flex", alignItems: "center", height: 18, borderRadius: 999, minWidth: 52, justifyContent: "center", background: "linear-gradient(90deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04))", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)" }} />
              <span style={{ display: "inline-flex", alignItems: "center", height: 18, borderRadius: 999, minWidth: 52, justifyContent: "center", background: "linear-gradient(90deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04))", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)" }} />
              <span style={{ display: "inline-flex", alignItems: "center", height: 18, borderRadius: 999, padding: "0 8px", justifyContent: "center", color: "rgba(255,255,255,0.72)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", fontSize: 9, fontWeight: 800, letterSpacing: "0.14em" }}>
                {nid}
              </span>
            </div>

            {/* Vault row */}
            <div style={{ display: "flex", gap: 24, fontFamily: MONO }}>
              <div>
                <p style={lbl}>USER</p>
                <p style={{ fontSize: 11, fontWeight: 800, color: isSupremeUsername(user.username) ? "#ef4444" : "rgba(232,232,236,0.82)", letterSpacing: "0.05em", margin: 0 }}>
                  {name || user.username}
                </p>
              </div>
              <div>
                <p style={lbl}>PERM</p>
                <p style={{ fontSize: 11, fontWeight: 800, color: isSupremeUsername(user.username) ? "#ef4444" : "rgba(232,232,236,0.82)", letterSpacing: "0.05em", margin: 0 }}>
                  {perm}
                </p>
              </div>
              <div>
                <p style={lbl}>VIS</p>
                <p style={{ fontSize: 11, fontWeight: 800, color: isPublic ? "rgba(45,106,63,0.9)" : "rgba(232,232,236,0.4)", letterSpacing: "0.05em", margin: 0 }}>
                  {isPublic ? "PUBLIC" : "GHOST"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsPublic(!isPublic)}
          style={{ display: "block", width: "100%", padding: "10px 20px", background: "transparent", border: "none", cursor: "pointer", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", fontFamily: MONO, textAlign: "left", transition: "color 150ms, background 150ms" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.22)"; e.currentTarget.style.background = "transparent"; }}
        >
          {isPublic ? "> mode: public — click to enable ghost" : "> mode: ghost — click to make public"}
        </button>
        <ProgressBar />
      </div>

      {/* EDIT PROFILE */}
      <div style={card}>
        <WindowBar badge="EDIT-PROFILE" />
        <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 13 }}>
          <SectionLabel>user data</SectionLabel>

          <div><p style={lbl}>name / codename</p>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="your name" style={inp} />
          </div>

          <div><p style={lbl}>status / current mission</p>
            <input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Ex: Building the future..." style={inp} />
          </div>

          <div><p style={lbl}>bio</p>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Summary of your journey..." rows={3} style={{ ...inp, resize: "none" }} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <p style={lbl}>username</p>
              <input value={user.username} disabled style={{ ...inp, opacity: 0.38, cursor: "not-allowed" }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={lbl}>email</p>
              <input value={user.email} disabled style={{ ...inp, opacity: 0.38, cursor: "not-allowed" }} />
            </div>
          </div>

          <div><p style={lbl}>subdomain (optional)</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input value={customSubdomain} onChange={(e) => setCustomSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="seu-nome" style={{ ...inp, flex: 1 }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontFamily: MONO, whiteSpace: "nowrap" }}>.outsidehub.com</span>
            </div>
          </div>
        </div>
        <ProgressBar />
      </div>

      {/* ══ LINKS ══════════════════════════════════════════ */}
      <div style={card}>
        <WindowBar badge="LINKS" />
        <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <SectionLabel>official links</SectionLabel>
            <button onClick={addLink} style={{ ...btn, padding: "3px 10px", fontSize: 10, marginBottom: 14 }}>
              <Plus size={10} /> add
            </button>
          </div>
          {links.map((link, i) => (
            <div key={i} style={{ display: "flex", gap: 8 }}>
              <input className="field" placeholder="Título" value={link.title} onChange={(e) => updateLink(i, "title", e.target.value)} style={{ ...inp, flex: 1 }} />
              <input className="field" placeholder="URL" value={link.url} onChange={(e) => updateLink(i, "url", e.target.value)} style={{ ...inp, flex: 2 }} />
              <button onClick={() => removeLink(i)} style={{ ...btn, padding: "0 8px", color: "rgba(229,72,77,0.6)", borderColor: "transparent" }}><Trash2 size={12} /></button>
            </div>
          ))}
          {links.length === 0 && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", fontFamily: MONO }}>&rsaquo; no links</p>}
        </div>
        <ProgressBar />
      </div>

      {/* TAGS */}
      <div style={card}>
        <WindowBar badge="TAGS" />
        <div style={{ padding: "14px 14px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={addTag} style={{ ...btn, padding: "2px 8px", fontSize: 10 }}><Plus size={9} /></button>
          </div>
          {tags.map((v, i) => (
            <div key={i} style={{ display: "flex", gap: 5 }}>
              <input style={{ ...inp, flex: 1, fontSize: 11 }} placeholder="Ex: Founder, Dev..." value={v} onChange={(e) => updateTag(i, e.target.value)} />
              <button onClick={() => removeTag(i)} style={{ ...btn, padding: "0 6px", color: "rgba(229,72,77,0.6)", borderColor: "transparent" }}><Trash2 size={10} /></button>
            </div>
          ))}
          {tags.length === 0 && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", fontFamily: MONO }}>empty</p>}
        </div>
        <ProgressBar />
      </div>

      {/* ══ SEC-AUTH ═══════════════════════════════════════ */}
      <div style={card}>
        <WindowBar badge="SEC-AUTH" />
        <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 13 }}>
          <SectionLabel>two-factor authentication</SectionLabel>

          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.6, margin: 0, fontFamily: MONO }}>
            {tfaEnabled ? "> 2FA active — account secured." : "> Protect your account with two-factor authentication."}
          </p>

          {tfaSecret ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {tfaUrl && (
                <div style={{ display: "flex", justifyContent: "center", padding: 16, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <QRCode value={tfaUrl} size={148} bgColor="rgba(6,6,8,1)" fgColor="#f0f0f0" />
                </div>
              )}
              <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9 }}>
                <p style={{ ...lbl, marginBottom: 5 }}>SECRET KEY</p>
                <div style={{ fontSize: 12, fontWeight: 600, wordBreak: "break-all", color: "#f0f0f0", letterSpacing: "0.06em", fontFamily: MONO }}>{tfaSecret}</div>
              </div>
              {tfaMsg && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontFamily: MONO, margin: 0 }}>› {tfaMsg}</p>}
              <input placeholder="2FA code" value={tfaOtp} onChange={(e) => setTfaOtp(e.target.value)} style={{ ...inp, fontFamily: MONO }} />
              <button onClick={confirmTfa} disabled={tfaLoading} style={{ ...btn, width: "100%", background: "rgba(255,255,255,0.06)", color: "#f0f0f0" }}>
                <ShieldCheck size={11} />
                {tfaLoading ? "confirming..." : "confirm 2FA"}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={startTfa} disabled={tfaLoading} style={{ ...btn, width: "100%", background: "rgba(255,255,255,0.06)", color: "#f0f0f0" }}
                onMouseEnter={(e) => { if (!tfaLoading) e.currentTarget.style.background = "rgba(255,255,255,0.11)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              >
                <ShieldCheck size={11} />
                {tfaLoading ? "loading..." : tfaEnabled ? "reconfigure 2FA" : "enable 2FA"}
              </button>
              {tfaEnabled && (
                <button onClick={disableTfa} disabled={tfaLoading} style={{ ...btn, width: "100%", color: "rgba(229,72,77,0.6)", borderColor: "rgba(229,72,77,0.18)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(229,72,77,0.07)"; e.currentTarget.style.color = "rgba(229,72,77,0.9)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(229,72,77,0.6)"; }}
                >
                  <ShieldOff size={11} />
                  disable 2FA
                </button>
              )}
            </div>
          )}
        </div>
        <ProgressBar />
      </div>

      {/* Save */}
      <button
        onClick={save} disabled={saving}
        style={{ ...btn, width: "100%", padding: "12px", marginTop: 6, background: "rgba(255,255,255,0.07)", color: saving ? "rgba(255,255,255,0.3)" : "#f0f0f0", borderColor: "rgba(255,255,255,0.13)", fontSize: 12 }}
        onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
      >
        {saving ? <span style={{ width: 12, height: 12, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.25)", borderTopColor: "transparent", display: "inline-block" }} /> : <Save size={12} />}
        {saving ? "saving..." : "save identity"}
      </button>
    </div>
  );
}
