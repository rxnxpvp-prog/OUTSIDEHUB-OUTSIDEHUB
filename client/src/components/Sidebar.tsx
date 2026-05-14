import React from "react";
import { useLocation } from "wouter";
import {
  Activity, Zap, FileText, Inbox, Users, Bot,
  Send, Search, Download, MessageSquare, Shield, MessageCircle,
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
  { path: "/tempmail",  label: "TempMail",  icon: Inbox },
  { path: "/leads",     label: "Leads",     icon: Users },
  { path: "/scrapper",  label: "Scrapper",  icon: Bot },
  { path: "/email",     label: "Email",     icon: Send },
  { path: "/search",    label: "Search",    icon: Search },
  { path: "/downloads", label: "Downloads", icon: Download },
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

  const go = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const visible = NAV.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (isAdmin) return true;
    
    const featureName = item.path.replace('/', '');
    if (user?.permissions) {
      if (!user.permissions[featureName]) return false;
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
        background: "rgba(8, 8, 12, 0.72)",
        backdropFilter: "blur(40px) saturate(1.6)",
        WebkitBackdropFilter: "blur(40px) saturate(1.6)",
        borderRight: "1px solid var(--glass-border)",
        boxShadow: "1px 0 20px rgba(0,0,0,0.3)",
      }}
    >
      {/* ── Logo Section ── */}
      <div
        style={{
          height: 72, // Increased from 56
          display: "flex",
          alignItems: "center",
          padding: isOpen ? "0 10px" : "0",
          flexShrink: 0,
          borderBottom: "1px solid var(--glass-border)",
          gap: 10,
          justifyContent: "center", // Forced center
          position: "relative",
        }}
      >
        {/* Linha luminosa no topo da sidebar */}
        <div style={{
          position: "absolute",
          top: 0, left: "10%", right: "10%",
          height: 1,
          background: "linear-gradient(90deg, transparent, var(--glass-shine), transparent)",
          opacity: 0.5,
        }} />

        {isOpen ? (
          <div style={{ display: "flex", alignItems: "center", overflow: "hidden" }}>
            <img 
              src="/logo_text.png"
              alt="OUTSIDE HUB"
              className="logo-pulse"
              style={{ 
                height: 64, // Increased from 56
                objectFit: "contain", 
                mixBlendMode: "screen",
                filter: "var(--logo-filter)",
                transition: "transform 0.4s cubic-bezier(.22,1,.36,1), filter 0.4s ease",
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.04)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              onError={(e) => { 
                 e.currentTarget.style.display = "none"; 
                 if (e.currentTarget.nextElementSibling) {
                     (e.currentTarget.nextElementSibling as HTMLElement).style.display = "block";
                 }
              }}
            />
            <span style={{ 
              display: "none", 
              fontSize: 15, 
              fontWeight: 800, 
              letterSpacing: "-0.04em", 
              color: "var(--foreground)", 
              whiteSpace: "nowrap",
              opacity: 0.9,
            }}>
              OUTSIDE HUB
            </span>
          </div>
        ) : (
          <img 
            src="/logo_o.png" 
            alt="O" 
            className="logo-pulse"
            style={{ 
              height: 36, 
              width: 36, 
              objectFit: "contain",
              mixBlendMode: "screen",
              filter: "var(--logo-filter)",
            }} 
            onError={(e) => { 
              e.currentTarget.style.display = "none";
            }}
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
    </aside>
  );
}
