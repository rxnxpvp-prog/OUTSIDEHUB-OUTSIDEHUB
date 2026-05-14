import React from "react";
import { useLocation } from "wouter";
import {
  Activity, Zap, FileText, Inbox, Users, Bot,
  Send, Search, Download, MessageSquare, Shield, MessageCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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
  { path: "/logs",      label: "Logs",      icon: FileText, adminOnly: true },
  { path: "/tempmail",  label: "TempMail",  icon: Inbox },
  { path: "/leads",     label: "Leads",     icon: Users },
  { path: "/scraper",   label: "Scraper",   icon: Bot },
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
        padding: isOpen ? "7px 12px" : "7px 0",
        margin: isOpen ? "1px 6px" : "1px auto",
        width: isOpen ? "calc(100% - 12px)" : 32,
      }}
    >
      <Icon size={14} style={{ flexShrink: 0 }} />
      {isOpen && (
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
  const { isAdmin } = useAuth();
  const [location, navigate] = useLocation();

  const go = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const visible = NAV.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside
      style={{
        width: isOpen ? 192 : 44,
        flexShrink: 0,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "width 220ms cubic-bezier(.4,0,.2,1)",
        background: "var(--background)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: 44,
          display: "flex",
          alignItems: "center",
          padding: "0 11px",
          flexShrink: 0,
          borderBottom: "1px solid var(--border)",
          gap: 9,
          overflow: "hidden",
          justifyContent: isOpen ? "flex-start" : "center",
        }}
      >
        <div style={{
          width: 24, height: 24,
          borderRadius: 7,
          overflow: "hidden",
          flexShrink: 0,
          boxShadow: "0 0 0 1px rgba(255,255,255,0.10), 0 4px 16px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}>
          <img src="/oni_creepy_v2_-_Editado.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        {isOpen && (
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "-0.04em", color: "var(--foreground)", whiteSpace: "nowrap" }}>
            OUTSIDE HUB
          </span>
        )}
      </div>

      {/* Nav */}
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
            <div style={{ height: 1, background: "var(--border)", margin: "6px 12px" }} />
            <NavBtn
              item={{ path: "/admin", label: "Admin", icon: Shield }}
              active={location === "/admin"}
              isOpen={isOpen}
              onClick={() => go("/admin")}
            />
            <style>{`
              aside button[title="Admin"] {
                background: rgba(220,38,38,0.12) !important;
                color: rgba(255, 100, 100, 0.4) !important;
                font-weight: 700 !important;
                border-color: rgba(220,38,38,0.2) !important;
              }
              aside button[title="Admin"]:hover {
                background: rgba(220,38,38,0.18) !important;
                border-color: rgba(220,38,38,0.3) !important;
                box-shadow: inset 0 1px 0 rgba(255,100,100,0.1), 0 2px 12px rgba(220,38,38,0.3) !important;
              }
            `}</style>
          </>
        )}
      </nav>
    </aside>
  );
}
