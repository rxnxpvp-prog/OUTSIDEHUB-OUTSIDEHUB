import React, { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import api from "@/lib/api";
import { ExternalLink, Instagram, Lock, MessageCircle, Send, Terminal } from "lucide-react";
import { BadgeDisplay, nameColorFromBadges } from "@/components/BadgeIcon";
import { isSupremeUsername } from "@/lib/identity";

const MONO = "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace";

interface PublicUser {
  id: string;
  name: string;
  username: string;
  role: string;
  accessCode?: string;
  avatar?: string;
  bio?: string;
  tags?: string[];
  links?: { title: string; url: string }[];
  badges?: { id: string; name: string; icon: string; image?: string; color?: string }[];
  isPublic?: boolean;
}

function permissionLabel(role?: string, badges?: { icon: string }[]): string {
  if (role === "admin") return "***";
  if (badges?.some((b) => b.icon === "sys:developer")) return "DEVELOPER";
  if (role === "moderator") return "MODERADOR";
  if (badges?.some((b) => b.icon === "sys:premium")) return "PREMIUM";
  return "USER";
}

function linkIcon(title: string) {
  const key = title.toLowerCase();
  if (key.includes("instagram")) return Instagram;
  if (key.includes("telegram")) return Send;
  if (key.includes("discord")) return MessageCircle;
  return ExternalLink;
}

function isSocialLink(title: string) {
  const key = title.toLowerCase();
  return key.includes("instagram") || key.includes("telegram") || key.includes("discord");
}

function safeHref(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const card: React.CSSProperties = {
  background: `
    radial-gradient(ellipse at 18% 14%, rgba(255,255,255,0.11) 0%, transparent 22%),
    radial-gradient(ellipse at 82% 80%, rgba(255,255,255,0.06) 0%, transparent 18%),
    linear-gradient(135deg, rgba(255,255,255,0.072), rgba(255,255,255,0.012) 45%, rgba(255,255,255,0.032)),
    rgba(6,6,8,0.94)
  `,
  backdropFilter: "blur(40px) saturate(1.6)",
  WebkitBackdropFilter: "blur(40px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.095)",
  borderRadius: 18,
  overflow: "hidden",
  boxShadow: "0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.4)",
  position: "relative",
};

const PP_STYLES = `
@keyframes ppIn {
  from { opacity: 0; transform: scale(0.94) translateY(12px); filter: blur(8px); }
  to   { opacity: 1; transform: scale(1)    translateY(0);    filter: blur(0);   }
}
.pp-card { animation: ppIn 0.48s cubic-bezier(0.22, 1, 0.36, 1) both; }
`;

function WindowBar({ badge, onClose }: { badge: string; onClose?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderBottom: "1px solid rgba(255,255,255,0.055)", background: "rgba(255,255,255,0.018)" }}>
      <div style={{ display: "flex", gap: 5 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57", display: "inline-block" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e", display: "inline-block" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840", display: "inline-block" }} />
      </div>
      <strong style={{ flex: 1, textAlign: "center", fontSize: 10, fontFamily: MONO, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em" }}>{badge}</strong>
      {onClose && (
        <button onClick={onClose} aria-label="Fechar" style={{ width: 22, height: 22, borderRadius: 5, border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.32)", fontSize: 12, padding: 0, flexShrink: 0 }}>
          x
        </button>
      )}
    </div>
  );
}

function ProgressBar() {
  return <div style={{ height: 2, background: "linear-gradient(90deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.18) 70%, rgba(255,255,255,0.04) 100%)" }} />;
}

export default function PublicProfile({ identifierParam }: { identifierParam?: string }) {
  const [, params] = useRoute("/u/:identifier");
  const [, usersParams] = useRoute("/usuarios/:identifier");
  const [, rootParams] = useRoute("/:identifier");
  const identifier = identifierParam || params?.identifier || usersParams?.identifier || rootParams?.identifier;
  const [, navigate] = useLocation();

  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!identifier) return;
    api.get(`/users/profile/${identifier}`)
      .then((res) => setUser(res.data))
      .catch((err) => setError(err.response?.data?.error || "Operador nao localizado"))
      .finally(() => setLoading(false));
  }, [identifier]);

  const mainUrl = identifierParam
    ? window.location.protocol + "//" + window.location.hostname.split(".").slice(1).join(".")
    : null;
  const handleClose = () => mainUrl ? (window.location.href = mainUrl) : navigate("/");

  if (loading) {
    return (
      <div className="public-profile-page" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{PP_STYLES}</style>
        <div className="pp-card" style={{ ...card, width: "100%", maxWidth: 420 }}>
          <WindowBar badge="OH-ACCESS" />
          <div style={{ padding: "16px", display: "flex", gap: 14 }}>
            <div style={{ width: 80, height: 96, borderRadius: 8, background: "rgba(255,255,255,0.05)", flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, paddingTop: 6 }}>
              <div style={{ height: 9, width: "55%", borderRadius: 4, background: "rgba(255,255,255,0.05)" }} />
              <div style={{ height: 8, width: "38%", borderRadius: 4, background: "rgba(255,255,255,0.04)" }} />
              <div style={{ height: 8, width: "45%", borderRadius: 4, background: "rgba(255,255,255,0.04)" }} />
            </div>
          </div>
          <ProgressBar />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="public-profile-page" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
        <style>{PP_STYLES}</style>
        <Terminal size={40} style={{ color: "rgba(255,60,60,0.6)" }} />
        <h1 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.14em", fontFamily: MONO, color: "rgba(255,255,255,0.7)" }}>SISTEMA OFFLINE</h1>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: MONO }}>{error || "Identidade digital nao encontrada nos registros."}</p>
      </div>
    );
  }

  if (user.isPublic === false) {
    return (
      <div className="public-profile-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
        <style>{PP_STYLES}</style>
        <div className="pp-card" style={{ ...card, width: "100%", maxWidth: 360 }}>
          <WindowBar badge="OH-ACCESS // RESTRICTED" onClose={handleClose} />
          <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 18, textAlign: "center" }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: 70, height: 84, borderRadius: 8, background: "rgba(139,26,26,0.12)", border: "1.5px solid rgba(139,26,26,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontFamily: MONO, color: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
                {user.avatar
                  ? <img src={user.avatar} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(1) contrast(1.1)", opacity: 0.4 }} />
                  : user.username.charAt(0).toUpperCase()
                }
              </div>
              <div style={{ position: "absolute", bottom: -8, right: -8, background: "rgba(6,6,8,1)", borderRadius: "50%", padding: 4, border: "1px solid rgba(255,60,60,0.3)" }}>
                <Lock size={11} style={{ color: "#ff4444", display: "block" }} />
              </div>
            </div>
            <div>
              <p style={{ fontSize: 10, fontFamily: MONO, color: "rgba(255,60,60,0.75)", letterSpacing: "0.16em", marginBottom: 6 }}>ACCESS RESTRICTED</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: MONO }}>Este no esta em modo furtivo.</p>
            </div>
          </div>
          <ProgressBar />
        </div>
      </div>
    );
  }

  const nid = user.accessCode || "OH-000";
  const perm = isSupremeUsername(user.username) ? "CEO" : permissionLabel(user.role, user.badges);
  const allBadges = user.badges || [];
  const publicUrl = mainUrl ? `${mainUrl}/${user.username}` : `/${user.username}`;
  const visibleLinks = (user.links || [])
    .map((link) => ({ ...link, url: safeHref(link.url) }))
    .filter((link) => link.title.trim() && link.url && isSocialLink(link.title));

  return (
    <div className="public-profile-page" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "18px" }}>
      <style>{PP_STYLES}</style>
      <div className="profile-shadow-runner" aria-hidden="true" />
      <section className="op-card" aria-label="Public user profile">
        <div className="op-header">
          <div className="op-dots">
            <span /><span /><span />
          </div>
          <strong>OH-ACCESS</strong>
          <button className="op-close" onClick={handleClose} aria-label="Fechar">x</button>
        </div>

        <div className="op-body">
          <div className="op-photo" data-role={user.role ?? "user"}>
            {user.avatar ? <img src={user.avatar} alt={user.name} /> : user.username.charAt(0).toUpperCase()}
          </div>

          <div className="op-info">
            <div className="op-command">
              <span>$</span> outsidehub --peek
            </div>

            <div className="op-vault-row">
              <span>
                USER
                <b style={{ color: isSupremeUsername(user.username) ? "#ef4444" : nameColorFromBadges(user.badges) }}>{user.username || user.name}</b>
              </span>
              <span>
                TYPE
                <b style={{ color: isSupremeUsername(user.username) ? "#ef4444" : "inherit" }}>{perm}</b>
              </span>
            </div>

            {allBadges.length > 0 && (
              <div className="op-access-mask">
                {allBadges.map((b) => (
                  <span key={b.id} title={b.name}>
                    <BadgeDisplay badge={b as any} size={20} />
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {visibleLinks.length > 0 && (
          <div className="op-social-links">
            {visibleLinks.map((link) => {
              const Icon = linkIcon(link.title);
              return (
                <a
                  key={`${link.title}-${link.url}`}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="op-social-link"
                  aria-label={link.title}
                  title={link.title}
                >
                  <Icon size={15} />
                </a>
              );
            })}
          </div>
        )}

        <button className="op-view-btn" onClick={() => { window.location.href = publicUrl; }}>
          &gt; outsidehub/{user.username}
        </button>

        <strong className="op-corner-code">{nid}</strong>
        <div className="op-progress" />
      </section>
    </div>
  );
}
