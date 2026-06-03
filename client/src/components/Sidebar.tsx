import React from "react";
import { useLocation } from "wouter";
import {
  Activity, Zap, FileText, Boxes, Users,
  Send, Search, MessageSquare, Shield, MessageCircle,
  Download,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { path: "/feed",      label: "Feed",      icon: Activity },
  { path: "/chat",      label: "Chat",      icon: MessageCircle },
  { path: "/builders",  label: "Builders",  icon: Zap },
  { path: "/sms",       label: "Boxes",    icon: Boxes },
  { path: "/leads",     label: "Leads",     icon: Users },
  { path: "/email",     label: "Dispair",   icon: Send },
  { path: "/search",    label: "Search",    icon: Search },
  { path: "/discord",   label: "Discord",   icon: MessageSquare },
];

function NavBtn({
  item, active, isOpen, onClick,
}: {
  item: NavItem; active: boolean; isOpen: boolean; onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      title={!isOpen ? item.label : undefined}
      className={`nav-btn${active ? " active" : ""}`}
      style={{
        justifyContent: isOpen ? "flex-start" : "center",
        padding: isOpen ? "8px 12px" : "8px 0",
        margin: isOpen ? "1px 6px" : "1px auto",
        width: isOpen ? "calc(100% - 12px)" : 36,
      }}
    >
      <Icon size={17} style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }} />
      {isOpen && (
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13.5 }}>
          {item.label}
        </span>
      )}
    </button>
  );
}

function isDesktopApp() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator?.userAgent?.toLowerCase() || "";
  return Boolean(window.outsidehubDesktop?.isDesktop) || ua.includes("electron");
}

export default function Sidebar({
  isOpen,
  onNavigate,
}: {
  isOpen: boolean;
  onNavigate?: () => void;
}) {
  const { isAdmin, user } = useAuth();
  const { theme } = useTheme();
  const [location, navigate] = useLocation();
  const showDownload = !isDesktopApp();

  const go = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const visible = NAV.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (isAdmin) return true;
    
    const featureName = item.path.replace('/', '');
    if (user?.permissions) {
      if (user.permissions[featureName] === false) return false;
    }
    return true;
  });

  return (
    <aside
      style={{
        width: isOpen ? 210 : 52,
        flexShrink: 0,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "width 220ms cubic-bezier(.22,1,.36,1)",
        background: "rgba(10, 10, 14, 0.96)",
        backdropFilter: "blur(20px) saturate(1.15)",
        WebkitBackdropFilter: "blur(20px) saturate(1.15)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "1px 0 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* ── Logo Section ── */}
      <div
        style={{
          height: isOpen ? 110 : 68,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
          background: "rgba(8, 8, 12, 0.98)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.03)",
        }}
      >

        {isOpen ? (
          /* ── Sidebar aberta: TENET card ── */
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            width: "160%",
            height: "160%",
            textAlign: "center",
          }}>
            <span style={{
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: "rgba(255, 255, 255, 0)",
              fontFamily: "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace",
              lineHeight: 2,
              textTransform: "uppercase",
            }}>
              0.0.3&nbsp;&nbsp;4s
            </span>

            <span style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "rgba(255,255,255,0.92)",
              lineHeight: 1.15,
            }}>
              THE MASK,<br />NOT THE FACE
            </span>

            <span style={{
              fontSize: 8,
              fontWeight: 400,
              letterSpacing: "0.10em",
              color: "rgba(255,255,255,0.28)",
              lineHeight: -1,
            }}>
              仮面 · 顔ではな
            </span>
          </div>
        ) : (
          /* ── Sidebar fechada: máscara oni ── */
          <img
            src="/oni_creepy_v2_-_Editado.png"
            alt="oni"
            style={{
              width: 52,
              height: 100,
              objectFit: "contain",
              objectPosition: "top center",
              marginTop: 55,
              mixBlendMode: "screen",
              opacity: 0.88,
              transition: "opacity 0.3s ease, transform 0.35s cubic-bezier(.22,1,.36,1)",
              cursor: "default",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1.06)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "scale(1)"; }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        )}
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
        {visible.map((item) => (
          <NavBtn
            key={item.path}
            item={item}
            active={location === item.path || (item.path === "/feed" && location === "/")}
            isOpen={isOpen}
            onClick={() => go(item.path)}
          />
        ))}

        {isAdmin && (
          <>
            <div style={{ 
              height: 1, 
              background: "linear-gradient(90deg, transparent, var(--glass-border), transparent)", 
              margin: "8px 14px" 
            }} />
            <NavBtn
              item={{ path: "/admin", label: "Admin", icon: Shield }}
              active={location === "/admin"}
              isOpen={isOpen}
              onClick={() => go("/admin")}
            />
            <NavBtn
              item={{ path: "/logs", label: "Logs", icon: FileText }}
              active={location === "/logs"}
              isOpen={isOpen}
              onClick={() => go("/logs")}
            />
          </>
        )}
      </nav>

      {showDownload && (
        <div
          style={{
            flexShrink: 0,
            padding: isOpen ? "8px 6px 12px" : "8px 0 12px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(8, 8, 12, 0.68)",
          }}
        >
          <a
            href="/download"
            target="_blank"
            rel="noreferrer"
            title={!isOpen ? "Download" : undefined}
            className="nav-btn"
            style={{
              justifyContent: isOpen ? "flex-start" : "center",
              padding: isOpen ? "8px 12px" : "8px 0",
              margin: isOpen ? "0" : "0 auto",
              width: isOpen ? "100%" : 36,
              textDecoration: "none",
            }}
          >
            <Download size={17} style={{ flexShrink: 0, opacity: 0.72 }} />
            {isOpen && (
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13.5 }}>
                Download
              </span>
            )}
          </a>
        </div>
      )}
    </aside>
  );
}
