import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const PAGE_LABELS: Record<string, string> = {
  "/": "Feed",
  "/feed": "Feed",
  "/chat": "Chat",
  "/builders": "Builders",
  "/sms": "Boxes",
  "/tempmail": "Boxes",
  "/leads": "Leads",
  "/email": "Dispair",
  "/search": "Search",
  "/discord": "Discord",
  "/profile": "Profile",
  "/privacy": "Privacy",
  "/logs": "Logs",
  "/admin": "Admin",
};

function pageLabel(path: string) {
  if (path.startsWith("/u/")) return "Perfil publico";
  return PAGE_LABELS[path] || path.replace(/^\//, "") || "Feed";
}

export default function DiscordPresence() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const page = useMemo(() => pageLabel(location), [location]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      document.title = "OUTSIDE HUB";
      return;
    }

    document.title = `OUTSIDE HUB - ${user.username} - ${page}`;

    const sendPresence = () => {
      api.post("/auth/presence", { page, path: location }).catch(() => {});
    };

    sendPresence();
    const timer = window.setInterval(sendPresence, 30_000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, user?.id, user?.username, page, location]);

  return null;
}
