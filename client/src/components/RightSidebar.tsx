import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import Avatar from "./Avatar";
import OperatorProfileCard from "./OperatorProfileCard";
import { BadgeDisplay, nameColorFromBadges } from "./BadgeIcon";
import { onUserUpdated } from "@/lib/userEvents";
import { isSupremeUsername, roleAccent, roleLabel } from "@/lib/identity";

function operatorNameColor(_role?: string, badges?: { icon: string; color?: string }[]): string {
  return nameColorFromBadges(badges, "var(--foreground)");
}

export default function RightSidebar() {
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [viewProfile, setViewProfile] = useState<string | null>(null);
  const nodeStates = ["online", "idle", "encrypted", "ghost mode"];

  useEffect(() => {
    if (!user) return;
    const loadMembers = () => api.get("/users").then((r) => setMembers(r.data)).catch(() => {});
    loadMembers();
    const interval = setInterval(loadMembers, 15000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    return onUserUpdated<any>((payload) => {
      setMembers((current) =>
        current.map((member) =>
          member.id === payload.userId
            ? { ...member, ...payload.user, badges: payload.user.badges || [] }
            : member
        )
      );
    });
  }, []);

  return (
    <aside
      style={{
        width: 168,
        flexShrink: 0,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "rgba(10, 10, 14, 0.96)",
        borderLeft: "1px solid rgba(255,255,255,0.07)",
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
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--muted-foreground)", textTransform: "uppercase" }}>
          ACTIVE USERS
        </span>
        <span style={{ fontSize: 11, color: "var(--muted-foreground)", background: "var(--accent)", padding: "1px 6px", borderRadius: 3 }}>
          {members.length}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {members.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", textAlign: "center", padding: "24px 12px" }}>
            No active users
          </p>
        ) : (
          members.map((m, index) => {
            const status = nodeStates[index % nodeStates.length];
            return (
            <button
              key={m.id}
              onClick={() => setViewProfile(m.id)}
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
                <span
                  title={status}
                  className={`operator-dot operator-dot--${status.replace(" ", "-")}`}
                />
                {m.badges && m.badges.length > 0 ? (
                  <div style={{ position: "absolute", bottom: -3, right: -3, display: "flex", alignItems: "center", justifyContent: "center" }} title={m.badges[0].name}>
                    <BadgeDisplay badge={m.badges[0]} size={15} />
                  </div>
                ) : null}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <p style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.1, marginBottom: 2, color: isSupremeUsername(m.username) ? "#ef4444" : operatorNameColor(m.role, m.badges) }}>
                  {m.name}
                </p>
                <p style={{ fontSize: 11, color: isSupremeUsername(m.username) ? "#ef4444" : roleAccent(m.role, m.username), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.1, fontWeight: isSupremeUsername(m.username) ? 700 : 500 }}>
                  {roleLabel(m.role, m.username)}
                </p>
              </div>
            </button>
          );})
        )}
      </div>
      <OperatorProfileCard userId={viewProfile} onClose={() => setViewProfile(null)} />
    </aside>
  );
}
