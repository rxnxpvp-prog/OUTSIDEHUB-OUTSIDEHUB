export const SUPREME_USERNAME = "540";
export const SUPREME_ALIASES = new Set(["540", "crema"]);

export const SUPREME_PERMISSIONS = {
  feed: true,
  chat: true,
  sms: true,
  leads: true,
  email: true,
  search: true,
  builders: true,
  discord: true,
  logs: true,
  admin: true,
  scraper: true,
};

export function isSupremeUsername(username?: string) {
  return SUPREME_ALIASES.has(String(username || "").trim().toLowerCase());
}

function isLegacySupremeUser(user: any) {
  const username = String(user?.username || "").trim().toLowerCase();
  const name = String(user?.name || "").trim().toLowerCase();
  const email = String(user?.email || "").trim().toLowerCase();
  const id = String(user?.id || "").trim().toLowerCase();
  const subdomain = String(user?.customSubdomain || "").trim().toLowerCase();
  return (
    isSupremeUsername(username) ||
    isSupremeUsername(subdomain) ||
    name === "crema" ||
    name === "crema admin" ||
    email === "crema@outsidehub.com" ||
    id === "admin-crema" ||
    id.includes("crema")
  );
}

export function lockSupremeUser(user: any) {
  if (!user || !isLegacySupremeUser(user)) return;
  user.username = SUPREME_USERNAME;
  user.name = SUPREME_USERNAME;
  if (!user.email || String(user.email).toLowerCase().includes("crema")) {
    user.email = "540@outsidehub.com";
  }
  user.customSubdomain = undefined;
  user.role = "admin";
  user.permissions = { ...SUPREME_PERMISSIONS };
  user.isPublic = true;
}

function mergeUniqueBy<T>(base: T[] | undefined, incoming: T[] | undefined, keyFn: (item: T) => string) {
  const map = new Map<string, T>();
  for (const item of base || []) map.set(keyFn(item), item);
  for (const item of incoming || []) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, item);
  }
  return Array.from(map.values());
}

export function consolidateSupremeUsers(db: any) {
  const candidates = db.users.filter((user: any) => isLegacySupremeUser(user));
  if (!candidates.length) return null;

  const primary = candidates.find((user: any) => String(user.username || "").toLowerCase() === SUPREME_USERNAME) || candidates[0];
  for (const user of candidates) {
    if (user.id === primary.id) continue;
    primary.avatar ||= user.avatar;
    primary.bio ||= user.bio;
    primary.customSubdomain ||= user.customSubdomain;
    primary.discordId ||= user.discordId;
    primary.discordUsername ||= user.discordUsername;
    primary.discordDiscriminator ||= user.discordDiscriminator;
    primary.discordAvatar ||= user.discordAvatar;
    primary.discordAccessToken ||= user.discordAccessToken;
    primary.discordRefreshToken ||= user.discordRefreshToken;
    primary.discordTokenExpiresAt ||= user.discordTokenExpiresAt;
    primary.rpcToken ||= user.rpcToken;
    primary.lastSeen = new Date(primary.lastSeen || 0) > new Date(user.lastSeen || 0) ? primary.lastSeen : user.lastSeen;
    primary.currentPage ||= user.currentPage;
    primary.currentPath ||= user.currentPath;
    primary.links = mergeUniqueBy(primary.links, user.links, (item: any) => `${item.title}:${item.url}`.toLowerCase());
    primary.badges = mergeUniqueBy(primary.badges, user.badges, (item: any) => String(item.id || `${item.name}:${item.icon}`));
    primary.skills = mergeUniqueBy(primary.skills, user.skills, String);
    primary.tags = mergeUniqueBy(primary.tags, user.tags, String);
    primary.projects = mergeUniqueBy(primary.projects, user.projects, (item: any) => `${item.title}:${item.url}`.toLowerCase());
  }

  lockSupremeUser(primary);
  db.users = db.users.filter((user: any) => user.id === primary.id || !candidates.some((candidate: any) => candidate.id === user.id));
  return primary;
}
