import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Quando corre dentro do Electron, DATA_DIR Ã© definido pelo main process
// apontando para AppData do utilizador. Caso contrÃ¡rio usa a pasta local.
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  role: "admin" | "moderator" | "user";
  permissions?: Record<string, boolean>;
  customSubdomain?: string;
  avatar?: string;
  bio?: string;
  links?: { title: string; url: string }[];
  isPublic?: boolean;
  status?: string;
  skills?: string[];
  projects?: { title: string; description: string; url: string }[];
  tags?: string[];
  badges: Badge[];
  createdAt: string;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  twoFactorTempSecret?: string;
  discordId?: string;
  discordUsername?: string;
  discordDiscriminator?: string;
  discordAvatar?: string;
  discordAccessToken?: string;
  discordRefreshToken?: string;
  discordTokenExpiresAt?: string;
  currentPage?: string;
  currentPath?: string;
  lastSeen?: string;
  rpcToken?: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  image?: string;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  image?: string;
  likes: string[];
  comments: Comment[];
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
}

export interface Message {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  channel: string;
  replyTo?: string;
  attachments?: ChatAttachment[];
  reactions: Record<string, number>;
  createdAt: string;
}

export interface ChatAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  locked?: boolean;
  createdAt: string;
}

export interface Lead {
  id: string;
  email: string;
  name: string;
  niche: string;
  status: "novo" | "contatado" | "convertido";
  platform?: "Twitch" | "Kick" | "CNPJReceita" | "OpenStreetMap" | "Wikidata" | "WebBrasilIA" | "Outro";
  handle?: string;
  followers?: number;
  source?: "scraper" | "manual" | "import" | "api" | "public_api";
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

export interface MaintenanceItem {
  id: string;
  name: string;
  status: "online" | "maintenance";
  icon: string;
}

export interface SMTPConfig {
  host: string;
  port: string;
  email: string;
  password: string;
  fromName: string;
}

export interface DiscordConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  clientUrl: string;
  rpcDetails: string;
  rpcState: string;
}

export interface HostingerAliasConfig {
  domain: string;
  inboxEmail: string;
  inboxPassword: string;
  imapHost: string;
  imapPort: string;
}

export interface DesktopConfig {
  version: string;
  downloadUrl: string;
  loginUrl: string;
  notes: string;
}

export interface HostingerAlias {
  id: string;
  userId: string;
  address: string;
  createdAt: string;
}

export interface InviteCode {
  id: string;
  code: string;
  role: "admin" | "moderator" | "user";
  permissions: Record<string, boolean>;
  used: boolean;
  usedBy?: string;
  expiresAt: string;
  createdAt: string;
}

export interface DB {
  users: User[];
  invites: InviteCode[];
  posts: Post[];
  messages: Message[];
  chatChannels: ChatChannel[];
  leads: Lead[];
  notifications: Notification[];
  maintenance: MaintenanceItem[];
  smtpConfig: SMTPConfig;
  discordConfig: DiscordConfig;
  hostingerAliasConfig: HostingerAliasConfig;
  desktopConfig: DesktopConfig;
  hostingerAliases: HostingerAlias[];
  logoUrl: string;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getDefaultDB(): DB {
  return {
    users: [],
    invites: [],
    posts: [],
    messages: [],
    chatChannels: [
      { id: "general", name: "general", description: "Chat principal", locked: false, createdAt: new Date().toISOString() },
      { id: "random", name: "random", description: "Assuntos livres", locked: false, createdAt: new Date().toISOString() },
      { id: "announcements", name: "announcements", description: "Anuncios", locked: true, createdAt: new Date().toISOString() },
    ],
    leads: [],
    notifications: [],
    maintenance: [
      { id: "1", name: "Feed", status: "online", icon: "ðŸ“°" },
      { id: "2", name: "Chat", status: "online", icon: "ðŸ’¬" },
      { id: "3", name: "Search", status: "online", icon: "ðŸ”" },
      { id: "4", name: "Builders", status: "online", icon: "âš™ï¸" },
      { id: "5", name: "Logs", status: "online", icon: "ðŸ“‹" },
      { id: "6", name: "Scraper", status: "online", icon: "ðŸ•·ï¸" },
    ],
    smtpConfig: {
      host: "",
      port: "587",
      email: "",
      password: "",
      fromName: "",
    },
    discordConfig: {
      clientId: "",
      clientSecret: "",
      redirectUri: "",
      clientUrl: "",
      rpcDetails: "OutsideHub",
      rpcState: "Online",
    },
    hostingerAliasConfig: {
      domain: "",
      inboxEmail: "",
      inboxPassword: "",
      imapHost: "imap.hostinger.com",
      imapPort: "993",
    },
    desktopConfig: {
      version: "1.0.5",
      downloadUrl: "https://github.com/rxnxpvp-prog/OUTSIDEHUB-V1/releases/download/v1.0.5/OutsideHub-Setup-1.0.5.exe",
      loginUrl: "https://outsidenetworking.com/login",
      notes: "OutsideHub desktop update",
    },
    hostingerAliases: [],
    logoUrl: "",
  };
}

export function readDB(): DB {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const defaultDB = getDefaultDB();
    writeDB(defaultDB);
    return defaultDB;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const db = JSON.parse(raw) as DB;
    let changed = false;
    if (!db.chatChannels) {
      db.chatChannels = [
        { id: "general", name: "general", description: "Chat principal", locked: false, createdAt: new Date().toISOString() },
        { id: "random", name: "random", description: "Assuntos livres", locked: false, createdAt: new Date().toISOString() },
        { id: "announcements", name: "announcements", description: "Anuncios", locked: true, createdAt: new Date().toISOString() },
      ];
      changed = true;
    }
    if (!db.discordConfig) {
      db.discordConfig = {
        clientId: "",
        clientSecret: "",
        redirectUri: "",
        clientUrl: "",
        rpcDetails: "OutsideHub",
        rpcState: "Online",
      };
      changed = true;
    }
    if (!db.hostingerAliasConfig) {
      db.hostingerAliasConfig = {
        domain: "",
        inboxEmail: "",
        inboxPassword: "",
        imapHost: "imap.hostinger.com",
        imapPort: "993",
      };
      changed = true;
    }
    if (!db.hostingerAliases) {
      db.hostingerAliases = [];
      changed = true;
    }
    if (!db.desktopConfig) {
      db.desktopConfig = {
        version: "1.0.5",
        downloadUrl: "https://github.com/rxnxpvp-prog/OUTSIDEHUB-V1/releases/download/v1.0.5/OutsideHub-Setup-1.0.5.exe",
        loginUrl: "https://outsidenetworking.com/login",
        notes: "OutsideHub desktop update",
      };
      changed = true;
    }
    if (db.desktopConfig?.downloadUrl?.includes("OutsideHub.exe")) {
      db.desktopConfig.version = "1.0.5";
      db.desktopConfig.downloadUrl = "https://github.com/rxnxpvp-prog/OUTSIDEHUB-V1/releases/download/v1.0.5/OutsideHub-Setup-1.0.5.exe";
      changed = true;
    }
    if (changed) writeDB(db);
    return db;
  } catch {
    const defaultDB = getDefaultDB();
    writeDB(defaultDB);
    return defaultDB;
  }
}

export function writeDB(db: DB): void {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

export function getDB() {
  return readDB();
}

export function saveDB(db: DB) {
  writeDB(db);
}

