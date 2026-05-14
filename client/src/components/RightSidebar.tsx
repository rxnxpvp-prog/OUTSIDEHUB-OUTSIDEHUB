import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import api from "@/lib/api";
import Avatar from "./Avatar";

export default function RightSidebar() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    api.get("/users").then((r) => setMembers(r.data)).catch(() => {});
  }, [user]);

  return (
    <aside
      style={{
        width: 168,
        flexShrink: 0,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--background)",
        borderLeft: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          flexShrink: 0,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "var(--muted-foreground)", textTransform: "uppercase" }}>
          Membros
        </span>
        <span style={{ fontSize: 11, color: "var(--muted-foreground)", background: "var(--accent)", padding: "1px 6px", borderRadius: 3 }}>
          {members.length}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {members.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", textAlign: "center", padding: "24px 12px" }}>
            Nenhum membro
          </p>
        ) : (
          members.map((m) => (
            <button
              key={m.id}
              onClick={() => navigate(`/u/${m.username}`)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                transition: "background 100ms",
                border: "none",
                background: "transparent",
                textAlign: "left",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ position: "relative", flexShrink: 0 }}>
                <Avatar name={m.name} src={m.avatar} size={28} />
                {m.badges && m.badges.length > 0 ? (
                  <div style={{ position: "absolute", bottom: -2, right: -2, background: "var(--background)", borderRadius: "50%", padding: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--background)" }} title={m.badges[0].name}>
                    {m.badges[0].image ? (
                      <img src={m.badges[0].image} alt={m.badges[0].name} style={{ width: 12, height: 12, borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 10, lineHeight: 1 }}>{m.badges[0].icon}</span>
                    )}
                  </div>
                ) : m.id === user?.id ? (
                  <div style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", background: "#22c55e", border: "2px solid var(--background)" }} />
                ) : null}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.1, marginBottom: 2 }}>
                  {m.name}
                </p>
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.1 }}>
                  {m.role === "admin" ? "Admin" : "Membro"}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
