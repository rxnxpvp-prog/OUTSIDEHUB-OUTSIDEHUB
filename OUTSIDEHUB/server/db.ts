import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Quando corre dentro do Electron, DATA_DIR é definido pelo main process
// apontando para AppData do utilizador. Caso contrário usa a pasta local.
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

export interface Permission {
  canAccessChat: boolean;
  canAccessFeed: boolean;
  canAccessLeads: boolean;
  canAccessScraper: boolean;
  canAccessTempMail: boolean;
  canAccessDownloads: boolean;
  canAccessBuilders: boolean;
  canAccessLogs: boolean;
  canAccessEmail: boolean;
  canAccessSearch: boolean;
  showLeftSidebar: boolean;
  showRightSidebar: boolean;
}

export const DEFAULT_PERMISSIONS: Permission = {
  canAccessChat: true,
  canAccessFeed: true,
  canAccessLeads: false,
  canAccessScraper: false,
  canAccessTempMail: true,
  canAccessDownloads: true,
  canAccessBuilders: false,
  canAccessLogs: false,
  canAccessEmail: false,
  canAccessSearch: true,
  showLeftSidebar: true,
  showRightSidebar: true,
};

export interface CustomRole {
  id: string;
  name: string;
  color: string;
  permissions: Permission;
  createdAt: string;
}

export interface InviteCode {
  id: string;
  code: string;
  createdBy: string;
  usedBy?: string;
  usedAt?: string;
  expiresAt?: string;
  roleId?: string;
  customPermissions?: Partial<Permission>;
  note?: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  role: "admin" | "user";
  customRoleId?: string;
  permissions?: Partial<Permission>;
  subdomain?: string;
  avatar?: string;
  bio?: string;
  badges: Badge[];
  createdAt: string;
  inviteCode?: string;
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
  reactions: Record<string, number>;
  createdAt: string;
}

export interface Lead {
  id: string;
  email: string;
  name: string;
  niche: string;
  status: "novo" | "contatado" | "convertido";
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

export interface DB {
  users: User[];
  posts: Post[];
  messages: Message[];
  leads: Lead[];
  notifications: Notification[];
  maintenance: MaintenanceItem[];
  smtpConfig: SMTPConfig;
  logoUrl: string;
  invites: InviteCode[];
  customRoles: CustomRole[];
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getDefaultDB(): DB {
  return {
    users: [],
    posts: [],
    messages: [],
    leads: [
      {
        id: "lead-1",
        email: "joao@example.com",
        name: "João Silva",
        niche: "Marketing Digital",
        status: "novo",
        createdAt: new Date().toISOString(),
      },
      {
        id: "lead-2",
        email: "maria@example.com",
        name: "Maria Santos",
        niche: "E-commerce",
        status: "contatado",
        createdAt: new Date().toISOString(),
      },
    ],
    notifications: [],
    maintenance: [
      { id: "1", name: "Feed", status: "online", icon: "📰" },
      { id: "2", name: "Chat", status: "online", icon: "💬" },
      { id: "3", name: "Search", status: "online", icon: "🔍" },
      { id: "4", name: "Builders", status: "online", icon: "⚙️" },
      { id: "5", name: "Logs", status: "online", icon: "📋" },
      { id: "6", name: "Scraper", status: "online", icon: "🕷️" },
    ],
    smtpConfig: {
      host: "",
      port: "587",
      email: "",
      password: "",
      fromName: "",
    },
    logoUrl: "",
    invites: [],
    customRoles: [],
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
    const parsed = JSON.parse(raw) as DB;
    // migrate: ensure new fields exist
    if (!parsed.invites) parsed.invites = [];
    if (!parsed.customRoles) parsed.customRoles = [];
    return parsed;
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
