import React, { useEffect, useRef } from "react";
import { Bell, FileText, MessageCircle, Radio } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeRealtime, type RealtimeEvent } from "@/lib/realtime";

type Notice = {
  key: string;
  title: string;
  body: string;
  route: string;
  kind: "feed" | "chat" | "log";
};

const ICONS = {
  feed: Radio,
  chat: MessageCircle,
  log: FileText,
};

function isDesktopApp() {
  return Boolean(window.outsidehubDesktop?.isDesktop) || navigator.userAgent.toLowerCase().includes("electron");
}

function playModernSoftSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const master = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const now = ctx.currentTime;

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800, now);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.045, now + 0.025);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    filter.connect(master);
    master.connect(ctx.destination);

    [523.25, 659.25, 783.99].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + index * 0.045);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.32 / (index + 1), now + 0.035 + index * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42 + index * 0.03);
      osc.connect(gain);
      gain.connect(filter);
      osc.start(now + index * 0.045);
      osc.stop(now + 0.62);
    });

    window.setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {
    // Audio is optional.
  }
}

function showSiteToast(notice: Notice, navigate: (to: string) => void) {
  const Icon = ICONS[notice.kind];
  toast.custom((id) => (
    <button
      onClick={() => {
        toast.dismiss(id);
        navigate(notice.route);
      }}
      style={{
        width: 330,
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        padding: 0,
        overflow: "hidden",
        textAlign: "left",
        color: "var(--foreground)",
        background: "linear-gradient(145deg, rgba(16,16,22,0.96), rgba(6,6,9,0.96))",
        boxShadow: "0 18px 60px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.06)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div style={{ display: "flex", gap: 12, padding: 14 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.055)",
            border: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <Icon size={18} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Bell size={12} style={{ color: "rgba(255,255,255,0.55)" }} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(255,255,255,0.52)" }}>
              OUTSIDEHUB
            </span>
          </div>
          <p style={{ fontSize: 13, fontWeight: 800, color: "var(--foreground)", marginBottom: 3 }}>
            {notice.title}
          </p>
          <p style={{ fontSize: 12, lineHeight: 1.35, color: "var(--muted-foreground)" }}>
            {notice.body}
          </p>
        </div>
      </div>
      <div style={{ height: 2, background: "linear-gradient(90deg, rgba(255,255,255,0.22), rgba(255,255,255,0.02))" }} />
    </button>
  ), { duration: 5200 });
}

function nativeNotify(notice: Notice) {
  if (window.outsidehubDesktop?.notify) {
    window.outsidehubDesktop.notify({ title: notice.title, body: notice.body });
    return;
  }
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(notice.title, { body: notice.body, silent: true });
  } else if (Notification.permission === "default") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") new Notification(notice.title, { body: notice.body, silent: true });
    });
  }
}

function toNotice(event: RealtimeEvent, isAdmin: boolean): Notice | null {
  if (event.type === "feed:post") {
    return {
      key: event.postId,
      title: "New feed post",
      body: `${event.actorName}: ${event.preview || "posted an update"}`,
      route: "/feed",
      kind: "feed",
    };
  }
  if (event.type === "chat:message") {
    return {
      key: event.messageId,
      title: `New message in #${event.channel}`,
      body: `${event.actorName}: ${event.preview || "sent a message"}`,
      route: "/chat",
      kind: "chat",
    };
  }
  if (event.type === "admin:log" && isAdmin) {
    return {
      key: event.logId,
      title: `Admin log: ${event.action}`,
      body: event.description,
      route: "/logs",
      kind: "log",
    };
  }
  return null;
}

export default function AppNotifications() {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [, navigate] = useLocation();
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    return subscribeRealtime((event) => {
      if ((event.type === "feed:post" || event.type === "chat:message") && event.actorId === user.id) return;
      const notice = toNotice(event, isAdmin);
      if (!notice || seen.current.has(notice.key)) return;
      seen.current.add(notice.key);

      const enabled = localStorage.getItem("notif_enabled") !== "false";
      if (!enabled) return;

      playModernSoftSound();
      if (isDesktopApp()) nativeNotify(notice);
      else showSiteToast(notice, navigate);
    });
  }, [isAuthenticated, isAdmin, navigate, user]);

  return null;
}
