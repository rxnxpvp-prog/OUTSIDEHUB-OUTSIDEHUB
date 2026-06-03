export type RealtimeEvent =
  | { type: "posts:changed" }
  | { type: "feed:post"; postId: string; actorId: string; actorName: string; preview: string }
  | { type: "chat:changed"; channel?: string }
  | { type: "chat:message"; messageId: string; channel: string; actorId: string; actorName: string; preview: string }
  | { type: "admin:log"; logId: string; level: "auth" | "system" | "error" | "info"; action: string; description: string; actorName?: string }
  | { type: "channels:changed" }
  | { type: "users:changed"; userId?: string }
  | { type: "maintenance:changed" }
  | { type: "notifications:changed" }
  | { type: "sync" };

type Listener = (event: RealtimeEvent) => void;

const listeners = new Set<Listener>();
let source: EventSource | null = null;
let activeToken: string | null = null;
let fallbackInterval: number | null = null;
let lastEventAt = 0;

function ensureConnection() {
  const token = localStorage.getItem("outsidehub_token");
  if (!token) {
    source?.close();
    source = null;
    activeToken = null;
    return;
  }

  if (source && activeToken === token) return;

  source?.close();
  activeToken = token;
  source = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);
  source.addEventListener("outsidehub", (message) => {
    try {
      const event = JSON.parse((message as MessageEvent).data) as RealtimeEvent;
      lastEventAt = Date.now();
      listeners.forEach((listener) => listener(event));
    } catch {
      // Ignore malformed keepalive/proxy noise.
    }
  });
  source.onerror = () => {
    source?.close();
    source = null;
  };
}

export function subscribeRealtime(listener: Listener) {
  listeners.add(listener);
  ensureConnection();

  const reconnect = window.setInterval(ensureConnection, 5_000);
  if (fallbackInterval === null) {
    fallbackInterval = window.setInterval(() => {
      if (!localStorage.getItem("outsidehub_token")) return;
      const sseIsSilent = !lastEventAt || Date.now() - lastEventAt > 2_500;
      if (sseIsSilent) listeners.forEach((item) => item({ type: "sync" }));
    }, 1_000);
  }
  return () => {
    listeners.delete(listener);
    window.clearInterval(reconnect);
    if (listeners.size === 0) {
      source?.close();
      source = null;
      activeToken = null;
      if (fallbackInterval !== null) {
        window.clearInterval(fallbackInterval);
        fallbackInterval = null;
      }
    }
  };
}
