import React, { useState, useEffect, useRef } from "react";
import { Moon, Sun, Bell, User, LogOut, Settings, ChevronDown, Menu, X } from "lucide-react";
import { useLocation } from "wouter";
import Sidebar from "./Sidebar";
import RightSidebar from "./RightSidebar";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

function useBreakpoint() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return { isMobile: w < 768, isTablet: w >= 768 && w < 1024, isDesktop: w >= 1920 };
}

const menuItem: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "7px 14px",
  fontSize: 13,
  color: "var(--foreground)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
  transition: "background 150ms, color 150ms",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isMobile, isTablet } = useBreakpoint();

  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [notifOn, setNotifOn] = useState(() => localStorage.getItem("notif_enabled") !== "false");

  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout, isAdmin } = useAuth();
  const [, navigate] = useLocation();
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
    else if (!isTablet) setSidebarOpen(true);
  }, [isMobile, isTablet]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const load = () => api.get("/notifications").then((r) => setNotifications(r.data)).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [isAuthenticated]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUser(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleNotif = () => {
    const next = !notifOn;
    setNotifOn(next);
    localStorage.setItem("notif_enabled", String(next));
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--background)", color: "var(--foreground)", position: "relative" }}>

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 40,
            backdropFilter: "blur(4px)",
          }}
        />
      )}

      {/* Sidebar */}
      <div
        style={{
          position: isMobile ? "fixed" : "relative",
          top: 0, left: 0,
          height: "100vh",
          zIndex: isMobile ? 50 : "auto",
          transform: isMobile && !sidebarOpen ? "translateX(-100%)" : "translateX(0)",
          transition: "transform 220ms cubic-bezier(.4,0,.2,1)",
          flexShrink: 0,
        }}
      >
        <Sidebar isOpen={isMobile ? true : sidebarOpen} onNavigate={() => isMobile && setSidebarOpen(false)} />
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* ── Header ── */}
        <header
          style={{
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 14px",
            flexShrink: 0,
            borderBottom: "1px solid var(--glass-border)",
            background: "rgba(8, 8, 12, 0.6)",
            backdropFilter: "blur(40px) saturate(1.4)",
            WebkitBackdropFilter: "blur(40px) saturate(1.4)",
            position: "relative",
            zIndex: 10,
          }}
        >
          {/* Menu toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="hdr-btn"
            >
              {isMobile && sidebarOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>

          {/* Wordmark center — premium liquid glass */}
          <div style={{ 
            position: "absolute", 
            left: "50%", 
            top: "50%", 
            transform: "translate(-50%, -50%)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            zIndex: 100,
          }}>
            {/* Brilho refrativo atrás do logo principal */}
            <div style={{
              position: "absolute",
              width: 200,
              height: 100,
              background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)",
              opacity: 0.5,
              pointerEvents: "none",
              zIndex: -1,
              filter: "blur(20px)",
            }} />
            
            <img 
              src="/logo_text.png"
              alt="OUTSIDE HUB"
              className="logo-pulse"
              style={{ 
                height: 130, // Ajustado para ser grande mas harmônico
                objectFit: "contain", 
                mixBlendMode: "screen",
                filter: "var(--logo-filter)",
                transition: "transform 0.4s cubic-bezier(.22,1,.36,1), filter 0.4s ease",
                transform: "scale(1)",
                cursor: "pointer",
                marginTop: 25, // Invasão sutil no conteúdo
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.08)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              onError={(e) => { 
                e.currentTarget.style.display = "none"; 
                if (e.currentTarget.nextElementSibling) {
                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
                }
              }}
            />
            {/* Fallback texto caso a imagem não exista */}
            <span 
              style={{
                display: "none",
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: "-0.04em",
                color: "var(--foreground)",
                whiteSpace: "nowrap",
                opacity: 0.85,
              }}
            >
              OUTSIDE HUB
            </span>
          </div>

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>

            {/* Theme */}
            <button onClick={toggleTheme} className="hdr-btn">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Bell — amarelinho sutil */}
            <div style={{ position: "relative" }} ref={notifRef}>
              <button
                onClick={() => { setShowNotif(!showNotif); setShowUser(false); }}
                className="hdr-btn"
                style={{ position: "relative" }}
              >
                <Bell size={16} style={{ color: notifications.length > 0 ? "rgba(255, 200, 0, 0.64)" : "inherit" }} />
                {notifications.length > 0 && notifOn && (
                  <span style={{ position: "absolute", top: 6, right: 6, width: 5, height: 5, borderRadius: "50%", background: "rgba(255,200,0,0.8)", boxShadow: "0 0 8px rgba(255,200,0,0.5)" }} />
                )}
              </button>

              {showNotif && (
                <div className="glass-dropdown drop-in" style={{
                  position: "absolute", right: 0, top: 42,
                  width: isMobile ? "calc(100vw - 24px)" : 280,
                  maxWidth: 320, zIndex: 50,
                }}>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--muted-foreground)" }}>Notificações</span>
                  </div>
                  <div style={{ maxHeight: 280, overflowY: "auto" }}>
                    {notifications.length > 0 ? notifications.map((n: any) => (
                      <div key={n.id} style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>{n.title}</p>
                        <p style={{ fontSize: 12, marginTop: 2, color: "var(--muted-foreground)" }}>{n.message}</p>
                      </div>
                    )) : (
                      <div style={{ padding: "28px 14px", textAlign: "center" }}>
                        <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Nenhuma notificação</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User */}
            <div style={{ position: "relative", marginLeft: 2 }} ref={userRef}>
              <button
                onClick={() => { setShowUser(!showUser); setShowNotif(false); }}
                className="hdr-btn"
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px" }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: "var(--glass-bg)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--foreground)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 600, flexShrink: 0, overflow: "hidden",
                }}>
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    user?.name?.charAt(0).toUpperCase()
                  )}
                </div>
                {!isMobile && <ChevronDown size={15} style={{ color: "var(--muted-foreground)" }} />}
              </button>

              {showUser && (
                <div className="glass-dropdown drop-in" style={{
                  position: "absolute", right: 0, top: 42,
                  width: 210, zIndex: 50,
                }}>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name}</p>
                    <p style={{ fontSize: 11, marginTop: 2, color: "var(--muted-foreground)" }}>{user?.role === "admin" ? "Admin" : "Membro"}</p>
                  </div>

                  <div style={{ padding: "4px 0" }}>
                    {[
                      { label: "Meu Perfil", icon: User, action: () => { setShowUser(false); navigate("/profile"); } },
                      { label: "Privacidade", icon: Settings, action: () => { setShowUser(false); navigate("/privacy"); } },
                    ].map(({ label, icon: Icon, action }) => (
                      <button key={label} style={menuItem} onClick={action}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-bg)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <Icon size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                        {label}
                      </button>
                    ))}

                    {/* Admin button */}
                    {isAdmin && (
                      <button
                        style={{
                          ...menuItem,
                          color: "var(--glass-shine)",
                          fontWeight: 600,
                          fontSize: 12,
                          letterSpacing: "0.02em",
                        }}
                        onClick={() => { setShowUser(false); navigate("/admin"); }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <Settings size={13} style={{ flexShrink: 0 }} />
                        ADMIN PANEL
                      </button>
                    )}

                    {/* Toggle notificações */}
                    <button style={{ ...menuItem, justifyContent: "space-between", borderTop: isAdmin ? "1px solid var(--border)" : "none" }} onClick={toggleNotif}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-bg)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Bell size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                        Notificações
                      </div>
                      <div style={{
                        width: 28, height: 16, borderRadius: 8,
                        background: notifOn ? "var(--foreground)" : "var(--border)",
                        position: "relative", flexShrink: 0,
                        transition: "background 200ms",
                      }}>
                        <div style={{
                          position: "absolute", top: 2,
                          left: notifOn ? 12 : 2,
                          width: 12, height: 12, borderRadius: "50%",
                          background: notifOn ? "var(--background)" : "var(--muted-foreground)",
                          transition: "left 200ms",
                        }} />
                      </div>
                    </button>
                  </div>

                  <div style={{ borderTop: "1px solid var(--border)" }} />

                  <div style={{ padding: "4px 0" }}>
                    <button
                      style={{ ...menuItem, color: "var(--destructive)" }}
                      onClick={() => { setShowUser(false); logout(); }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(229,72,77,0.08)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <LogOut size={13} style={{ flexShrink: 0 }} />
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ padding: isMobile ? "16px 12px" : 20, maxWidth: 1280, margin: "0 auto" }}>
            {children}
          </div>
        </main>
      </div>

      {/* Right sidebar */}
      {!isMobile && !isTablet && <RightSidebar />}
    </div>
  );
}
