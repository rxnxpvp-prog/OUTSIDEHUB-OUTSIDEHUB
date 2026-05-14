import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Quando corre dentro do Electron, DATA_DIR é definido pelo main process
// apontando para AppData do utilizador. Caso contrário usa a pasta local.
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
  platform?: "Twitch" | "Kick" | "Outro";
  handle?: string;
  followers?: number;
  source?: "scraper" | "manual" | "import";
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
  leads: Lead[];
  notifications: Notification[];
  maintenance: MaintenanceItem[];
  smtpConfig: SMTPConfig;
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
    return JSON.parse(raw) as DB;
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
