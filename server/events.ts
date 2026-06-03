import type { Response } from "express";

export type RealtimeEvent =
  | { type: "posts:changed" }
  | { type: "feed:post"; postId: string; actorId: string; actorName: string; preview: string }
  | { type: "chat:changed"; channel?: string }
  | { type: "chat:message"; messageId: string; channel: string; actorId: string; actorName: string; preview: string }
  | { type: "admin:log"; logId: string; level: "auth" | "system" | "error" | "info"; action: string; description: string; actorName?: string }
  | { type: "channels:changed" }
  | { type: "users:changed"; userId?: string }
  | { type: "maintenance:changed" }
  | { type: "notifications:changed" };

const clients = new Set<Response>();

function send(res: Response, event: RealtimeEvent) {
  res.write(`event: outsidehub\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

export function addRealtimeClient(res: Response) {
  clients.add(res);
  send(res, { type: "posts:changed" });

  return () => {
    clients.delete(res);
  };
}

export function emitRealtime(event: RealtimeEvent) {
  for (const client of Array.from(clients)) {
    send(client, event);
  }
}

setInterval(() => {
  for (const client of Array.from(clients)) {
    client.write(`: heartbeat\n\n`);
  }
}, 25_000).unref();
