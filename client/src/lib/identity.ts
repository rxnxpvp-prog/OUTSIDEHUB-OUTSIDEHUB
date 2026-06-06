export function isSupremeUsername(username?: string) {
  return String(username || "").trim().toLowerCase() === "540";
}

export function roleLabel(role?: string, username?: string): string {
  if (isSupremeUsername(username)) return "CEO";
  if (role === "admin") return "Admin";
  if (role === "moderator") return "Moderador";
  return "Membro";
}

export function roleAccent(role?: string, username?: string): string {
  if (isSupremeUsername(username)) return "#ef4444";
  if (role === "admin") return "#f59e0b";
  if (role === "moderator") return "#a855f7";
  return "var(--muted-foreground)";
}

export function roleRank(role?: string, username?: string): number {
  if (isSupremeUsername(username)) return 0;
  if (role === "admin") return 1;
  if (role === "moderator") return 2;
  return 3;
}
