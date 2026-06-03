const path = require("path");
const fs = require("fs");
const { app, BrowserWindow, Menu, shell, ipcMain, Notification, dialog } = require("electron");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const RPC = require("discord-rpc");

const ROOT = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT, "dist");
const STATIC_PATH = path.join(DIST_DIR, "public");
const SERVER_ENTRY = path.join(DIST_DIR, "electron-server", "index.cjs");
const PORT = process.env.PORT || "3335";
const LOCAL_CLIENT_URL = `http://127.0.0.1:${PORT}`;
const CLIENT_URL = process.env.OUTSIDEHUB_DESKTOP_URL || "https://outsidenetworking.com";
const USE_LOCAL_SERVER = process.env.OUTSIDEHUB_USE_LOCAL_SERVER === "1";

let mainWindow = null;
let rpcClient = null;
let rpcReady = false;
let desktopConfig = null;
let pendingUpdate = null;
let updateDownloadInProgress = false;

process.env.NODE_ENV = "production";
process.env.PORT = PORT;
process.env.STATIC_PATH = STATIC_PATH;
process.env.DATA_DIR = path.join(app.getPath("userData"), "data");

Menu.setApplicationMenu(null);

ipcMain.on("outsidehub:notify", (_event, payload) => {
  if (!Notification.isSupported()) return;
  const title = String(payload?.title || "OutsideHub").slice(0, 120);
  const body = String(payload?.body || "").slice(0, 240);
  new Notification({
    title,
    body,
    icon: path.join(ROOT, "outsidehub.ico"),
    silent: true,
  }).show();
});

async function startServer() {
  require(SERVER_ENTRY);
}

async function waitForServer() {
  const healthUrl = `${LOCAL_CLIENT_URL}/api/health`;
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(healthUrl);
      if (res.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("OutsideHub server did not start.");
}

function compareVersions(a, b) {
  const left = String(a || "0").split(".").map((part) => parseInt(part, 10) || 0);
  const right = String(b || "0").split(".").map((part) => parseInt(part, 10) || 0);
  const len = Math.max(left.length, right.length);
  for (let i = 0; i < len; i++) {
    if ((left[i] || 0) > (right[i] || 0)) return 1;
    if ((left[i] || 0) < (right[i] || 0)) return -1;
  }
  return 0;
}

async function fetchDesktopConfig() {
  try {
    const res = await fetch(`${CLIENT_URL}/api/admin/desktop/public`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function getAvailableUpdate(config) {
  if (!config?.downloadUrl || !config?.version) return;
  const currentVersion = app.getVersion();
  if (compareVersions(config.version, currentVersion) <= 0) return;
  return {
    version: String(config.version),
    currentVersion,
    downloadUrl: String(config.downloadUrl),
    notes: String(config.notes || "Nova versao do OutsideHub pronta para instalar."),
  };
}

function safeUpdateFileName(version) {
  const cleanVersion = String(version || "update").replace(/[^a-z0-9._-]/gi, "_");
  return `OutsideHub-Setup-${cleanVersion}.exe`;
}

function sendUpdateAvailable(update) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("outsidehub:update-available", update);
}

async function resolveUpdate() {
  if (pendingUpdate) return pendingUpdate;
  const freshConfig = await fetchDesktopConfig();
  desktopConfig = freshConfig || desktopConfig;
  const update = getAvailableUpdate(desktopConfig);
  pendingUpdate = update || null;
  return pendingUpdate;
}

async function downloadDesktopUpdate(update) {
  if (!update?.downloadUrl) throw new Error("Nenhum instalador configurado.");
  if (updateDownloadInProgress) throw new Error("Download da atualizacao ja esta em andamento.");

  updateDownloadInProgress = true;
  const targetPath = path.join(app.getPath("temp"), safeUpdateFileName(update.version));
  try {
    mainWindow?.setProgressBar(2);
    const res = await fetch(update.downloadUrl);
    if (!res.ok || !res.body) {
      throw new Error(`Falha ao baixar update (${res.status}).`);
    }
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(targetPath));
    mainWindow?.setProgressBar(-1);

    const result = await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "OutsideHub update",
      message: `OutsideHub ${update.version} baixado`,
      detail: "O instalador vai abrir agora. Feche o app para concluir a atualizacao.",
      buttons: ["Instalar agora", "Mostrar na pasta", "Depois"],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
    });

    if (result.response === 0) {
      await shell.openPath(targetPath);
      app.quit();
      return { ok: true, path: targetPath, action: "install" };
    }
    if (result.response === 1) {
      shell.showItemInFolder(targetPath);
    }
    return { ok: true, path: targetPath, action: "saved" };
  } finally {
    updateDownloadInProgress = false;
    mainWindow?.setProgressBar(-1);
  }
}

async function checkForDesktopUpdate(config) {
  const update = getAvailableUpdate(config);
  if (!update) return;
  pendingUpdate = update;
  sendUpdateAvailable(update);
}

ipcMain.handle("outsidehub:update:check", async () => {
  const update = await resolveUpdate();
  if (update) sendUpdateAvailable(update);
  return update;
});

ipcMain.handle("outsidehub:update:download", async () => {
  try {
    const update = await resolveUpdate();
    if (!update) return { ok: false, error: "Nenhuma atualizacao disponivel." };
    return await downloadDesktopUpdate(update);
  } catch (error) {
    return { ok: false, error: error?.message || "Falha ao baixar update." };
  }
});

async function fetchRpcStatus() {
  try {
    const win = mainWindow;
    if (!win || win.isDestroyed()) return null;
    const token = await win.webContents.executeJavaScript("localStorage.getItem('outsidehub_token')", true);
    if (!token) return null;
    const res = await fetch(`${CLIENT_URL}/api/auth/discord/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function updateRpc() {
  const status = await fetchRpcStatus();
  if (!status?.clientId) return;

  if (!rpcClient) {
    rpcClient = new RPC.Client({ transport: "ipc" });
    rpcClient.on("ready", () => {
      rpcReady = true;
      updateRpc().catch(() => {});
    });
    rpcClient.on("disconnected", () => {
      rpcReady = false;
      rpcClient = null;
    });
    rpcClient.login({ clientId: status.clientId }).catch(() => {
      rpcReady = false;
      rpcClient = null;
    });
    return;
  }

  if (!rpcReady) return;
  const rpcUser = status.rpcUser || status.discordUsername || "OutsideHub";
  const rpcRole = status.rpcRole || "USUARIO";
  rpcClient.setActivity({
    details: rpcUser,
    state: rpcRole,
    largeImageKey: "outsidehub",
    largeImageText: status.rpcName || "OUTSIDE HUB",
    smallImageKey: "online",
    smallImageText: status.rpcPage || "Online",
    startTimestamp: Date.now(),
    instance: false,
  }).catch(() => {});
}

async function createWindow() {
  desktopConfig = await fetchDesktopConfig();
  const launchUrl = desktopConfig?.loginUrl || CLIENT_URL;

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    title: "OutsideHub",
    icon: path.join(ROOT, "outsidehub.ico"),
    autoHideMenuBar: true,
    backgroundColor: "#07070a",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.removeMenu();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  await mainWindow.loadURL(launchUrl);
  setTimeout(() => checkForDesktopUpdate(desktopConfig).catch(() => {}), 1800);
  setInterval(() => updateRpc().catch(() => {}), 15_000);
  mainWindow.webContents.on("did-navigate", () => updateRpc().catch(() => {}));
  mainWindow.webContents.on("did-navigate-in-page", () => updateRpc().catch(() => {}));
}

app.whenReady().then(async () => {
  if (USE_LOCAL_SERVER) {
    await startServer();
    await waitForServer();
  }
  await createWindow();
});

app.on("window-all-closed", () => {
  if (rpcClient) rpcClient.destroy().catch(() => {});
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow().catch(() => {});
});
