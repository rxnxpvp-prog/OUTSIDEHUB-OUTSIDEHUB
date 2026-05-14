import React, { useEffect, useState } from "react";
import { useRoute } from "wouter";
import api from "@/lib/api";
import Avatar from "@/components/Avatar";
import { ExternalLink, Globe, Instagram, Twitter, Github, Linkedin, MessageCircle, Mail, Shield, Lock, Activity, Link2, Code, Terminal } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";

interface PublicUser {
  id: string;
  name: string;
  username: string;
  role: string;
  avatar?: string;
  bio?: string;
  status?: string;
  skills?: string[];
  projects?: { title: string; description: string; url: string }[];
  tags?: string[];
  links?: { title: string; url: string }[];
  badges?: { id: string; name: string; icon: string; image?: string }[];
  isPublic?: boolean;
}

function getIconForUrl(url: string) {
  const lower = url.toLowerCase();
  if (lower.includes("instagram.com")) return <Instagram size={18} />;
  if (lower.includes("twitter.com") || lower.includes("x.com")) return <Twitter size={18} />;
  if (lower.includes("github.com")) return <Github size={18} />;
  if (lower.includes("linkedin.com")) return <Linkedin size={18} />;
  if (lower.includes("discord") || lower.includes("wa.me") || lower.includes("t.me")) return <MessageCircle size={18} />;
  if (lower.includes("mailto:")) return <Mail size={18} />;
  return <Globe size={18} />;
}

export default function PublicProfile({ identifierParam }: { identifierParam?: string }) {
  const [match, params] = useRoute("/u/:identifier");
  const identifier = identifierParam || params?.identifier;
  
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!identifier) return;
    api.get(`/users/profile/${identifier}`)
      .then((res) => setUser(res.data))
      .catch((err) => setError(err.response?.data?.error || "Operador não localizado"))
      .finally(() => setLoading(false));
  }, [identifier]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <div style={{ width: "100%", maxWidth: 460, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <Skeleton style={{ width: 120, height: 120, borderRadius: "50%", margin: "0 auto" }} />
          <Skeleton style={{ width: 200, height: 28, margin: "0 auto" }} />
          <Skeleton style={{ width: 120, height: 16, margin: "0 auto" }} />
          <Skeleton style={{ width: "100%", height: 60, marginTop: 20 }} />
          <Skeleton style={{ width: "100%", height: 48 }} />
          <Skeleton style={{ width: "100%", height: 48 }} />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)", color: "var(--foreground)", flexDirection: "column", gap: 16 }}>
        <div style={{ color: "var(--destructive)", opacity: 0.8 }}>
          <Terminal size={48} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.04em" }}>SISTEMA OFFLINE</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>{error || "Identidade digital não encontrada nos registros."}</p>
      </div>
    );
  }

  // PRIVATE STATE
  if (user.isPublic === false) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "40px 16px", background: "var(--background)", position: "relative", overflow: "hidden"
      }}>
        <div className="glow-pulse" style={{
          position: "absolute", width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255, 60, 60, 0.05) 0%, transparent 70%)",
          top: "50%", left: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none", filter: "blur(60px)",
        }} />

        <div className="surface" style={{
          width: "100%", maxWidth: 400, padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center",
          gap: 24, textAlign: "center", border: "1px solid rgba(255, 60, 60, 0.15)",
          boxShadow: "0 20px 80px rgba(255, 0, 0, 0.05), inset 0 1px 0 rgba(255,255,255,0.05)"
        }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: -8, borderRadius: "50%", border: "1px dashed rgba(255, 60, 60, 0.4)", animation: "spin 10s linear infinite" }} />
            <Avatar name={user.name} src={user.avatar} size={100} style={{ filter: "grayscale(1) contrast(1.2)" }} />
            <div style={{ position: "absolute", bottom: 0, right: 0, background: "var(--background)", borderRadius: "50%", padding: 6 }}>
              <Lock size={18} color="#ff4444" />
            </div>
          </div>

          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.04em", marginBottom: 4 }}>
              OPERADOR {user.username.toUpperCase()}
            </h1>
            <p style={{ fontSize: 12, color: "#ff4444", fontWeight: 600, letterSpacing: "0.1em" }}>ACCESS RESTRICTED</p>
          </div>

          <div style={{ background: "rgba(255, 0, 0, 0.05)", border: "1px solid rgba(255, 0, 0, 0.1)", borderRadius: 12, padding: "16px", width: "100%" }}>
            <p style={{ fontSize: 13, color: "var(--foreground)", opacity: 0.8, lineHeight: 1.5 }}>
              Este perfil está em modo furtivo. As credenciais operacionais não são públicas no momento.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // PUBLIC STATE (OPERATOR CARD)
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center",
      padding: "60px 16px", background: "var(--background)", position: "relative", overflowX: "hidden"
    }}>
      {/* Glow ambiental premium */}
      <div style={{
        position: "absolute", width: "80vw", height: "80vh", borderRadius: "50%",
        background: "radial-gradient(ellipse, var(--accent-glow) 0%, transparent 60%)",
        top: 0, left: "50%", transform: "translate(-50%, -20%)", pointerEvents: "none", filter: "blur(100px)", opacity: 0.6
      }} />

      <div className="surface" style={{
        width: "100%", maxWidth: 480, padding: "40px 24px", position: "relative", zIndex: 10,
        display: "flex", flexDirection: "column", gap: 32, borderRadius: 32,
        boxShadow: "inset 0 1px 1px rgba(255,255,255,0.08), 0 40px 100px rgba(0,0,0,0.5)"
      }}>
        
        {/* Header: Avatar + Identity */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16 }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: -4, borderRadius: "50%", background: "linear-gradient(135deg, var(--glass-shine), transparent)", zIndex: 0, opacity: 0.5 }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <Avatar name={user.name} src={user.avatar} size={110} />
            </div>
            {/* Status Indicator */}
            <div style={{ 
              position: "absolute", bottom: 2, right: 2, zIndex: 2,
              width: 24, height: 24, borderRadius: "50%", background: "var(--background)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: user.status ? "#22c55e" : "var(--muted-foreground)", boxShadow: user.status ? "0 0 10px rgba(34, 197, 94, 0.6)" : "none" }} />
            </div>
          </div>

          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.04em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {user.name}
              {user.role === "admin" && <Shield size={18} style={{ color: "var(--glass-shine)" }} />}
            </h1>
            <p style={{ fontSize: 14, color: "var(--muted-foreground)", fontWeight: 500 }}>@{user.username}</p>
            
            {user.status && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, padding: "4px 12px", background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.2)", borderRadius: 999 }}>
                <Activity size={12} color="#22c55e" />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#22c55e" }}>{user.status}</span>
              </div>
            )}
          </div>

          {user.bio && (
            <p style={{ fontSize: 15, color: "var(--foreground)", opacity: 0.9, lineHeight: 1.6, marginTop: 8, padding: "0 10px" }}>
              {user.bio}
            </p>
          )}

          {/* Badges */}
          {user.badges && user.badges.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 4 }}>
              {user.badges.map(b => (
                <div key={b.id} title={b.name} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%", background: "var(--accent)", border: "1px solid var(--border)", fontSize: 16 }}>
                  {b.image ? <img src={b.image} alt={b.name} style={{ width: 20, height: 20, borderRadius: "50%" }} /> : b.icon}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Arsenal / External Links */}
        {user.links && user.links.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--muted-foreground)", textTransform: "uppercase", paddingLeft: 4 }}>Presença Digital</p>
            {user.links.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, color: "var(--foreground)", textDecoration: "none", transition: "all 0.2s cubic-bezier(.22,1,.36,1)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "var(--glass-border)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
              >
                <div style={{ color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", width: 24 }}>
                  {getIconForUrl(link.url)}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{link.title}</span>
                <ExternalLink size={14} style={{ color: "var(--muted-foreground)", opacity: 0.5 }} />
              </a>
            ))}
          </div>
        )}

        {/* Projects */}
        {user.projects && user.projects.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--muted-foreground)", textTransform: "uppercase", paddingLeft: 4 }}>Projetos Operacionais</p>
            {user.projects.map((p, i) => {
              const Tag = p.url ? "a" : "div";
              const props = p.url ? { href: p.url, target: "_blank", rel: "noopener noreferrer" } : {};
              return (
                <Tag key={i} {...props} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "16px 20px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 16, textDecoration: "none", color: "inherit", transition: "all 0.2s ease" }}
                  onMouseEnter={(e) => p.url && (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  onMouseLeave={(e) => p.url && (e.currentTarget.style.background = "rgba(0,0,0,0.2)")}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>{p.title}</span>
                    {p.url && <Link2 size={14} style={{ color: "var(--muted-foreground)" }} />}
                  </div>
                  {p.description && <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>{p.description}</p>}
                </Tag>
              )
            })}
          </div>
        )}

        {/* Skills & Tags */}
        {( (user.skills && user.skills.length > 0) || (user.tags && user.tags.length > 0) ) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, borderTop: "1px solid var(--border)", paddingTop: 24 }}>
            {user.skills && user.skills.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <Code size={12} /> Capabilities
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {user.skills.map((s, i) => (
                    <span key={i} style={{ padding: "4px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)", borderRadius: 8, fontSize: 12, fontWeight: 500, color: "var(--foreground)" }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {user.tags && user.tags.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 10 }}>Tags</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {user.tags.map((t, i) => (
                    <span key={i} style={{ padding: "2px 8px", background: "transparent", border: "1px dashed var(--muted-foreground)", borderRadius: 6, fontSize: 11, color: "var(--muted-foreground)" }}>
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      <div style={{ marginTop: 40, opacity: 0.5, display: "flex", alignItems: "center", gap: 8 }}>
        <img src="/liquid_glass_final.ico" alt="OutsideHub" style={{ width: 16, height: 16, filter: "grayscale(1) invert(1)" }} />
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", color: "var(--foreground)" }}>OUTSIDEHUB</span>
      </div>
    </div>
  );
}
