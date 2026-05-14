"use strict";

const { app, BrowserWindow, shell, Tray, Menu, nativeImage, dialog } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");
const net = require("net");
const fs = require("fs");

// ── Instância única ────────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

let PORT = 3333;
let APP_URL = `http://localhost:${PORT}`;

let mainWindow = null;
let serverProcess = null;
let tray = null;
let isQuitting = false;

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// ── Encontrar porta livre ──────────────────────────────────────────────────
function findFreePort(start) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(start, "127.0.0.1", () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
    s.on("error", () => resolve(findFreePort(start + 1)));
  });
}

// ── Resolve caminhos ───────────────────────────────────────────────────────
function res(...parts) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, ...parts);
  }
  return path.join(__dirname, "..", ...parts);
}

// ── Arrancar servidor ──────────────────────────────────────────────────────
function startServer() {
  return new Promise((resolve, reject) => {
    const serverEntry = res("dist", "electron-server", "index.cjs");

    if (!fs.existsSync(serverEntry)) {
      return reject(new Error("Servidor não encontrado:\n" + serverEntry));
    }

    const dataDir = path.join(app.getPath("userData"), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      const srcData = res("data");
      if (fs.existsSync(srcData)) {
        try { fs.cpSync(srcData, dataDir, { recursive: true }); } catch (_) {}
      }
    }

    const staticPath = res("dist", "public");

    const env = Object.assign({}, process.env, {
      NODE_ENV: "production",
      PORT: String(PORT),
      DATA_DIR: dataDir,
      STATIC_PATH: staticPath,
      JWT_SECRET: "outsidehub-" + Buffer.from(dataDir).toString("base64url").slice(0, 24),
      CLIENT_URL: APP_URL,
      ELECTRON_RUN_AS_NODE: "1",
    });

    serverProcess = spawn(process.execPath, [serverEntry], {
      env,
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });

    let started = false;
    let errorOutput = "";

    serverProcess.stdout.on("data", (chunk) => {
      const line = chunk.toString().trim();
      console.log("[srv]", line);
      if (!started && (line.includes(String(PORT)) || line.includes("Backend") || line.includes("Admin"))) {
        started = true;
        resolve();
      }
    });

    serverProcess.stderr.on("data", (chunk) => {
      const line = chunk.toString().trim();
      if (line) {
        console.error("[srv:err]", line);
        errorOutput += line + "\n";
      }
    });

    serverProcess.on("exit", (code) => {
      console.log("[srv] exit", code);
      if (!started) {
        reject(new Error(`Servidor encerrou (código ${code}):\n${errorOutput || "Sem detalhes"}`));
      }
    });

    setTimeout(() => {
      if (!started) { started = true; resolve(); }
    }, 10000);
  });
}

// ── Aguardar HTTP ──────────────────────────────────────────────────────────
function waitForServer(maxAttempts, intervalMs) {
  maxAttempts = maxAttempts || 40;
  intervalMs = intervalMs || 500;
  return new Promise((resolve, reject) => {
    let n = 0;
    const try_ = () => {
      const req = http.get(APP_URL + "/api/health", (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        next();
      });
      req.on("error", next);
      req.setTimeout(800, () => { req.destroy(); next(); });
    };
    const next = () => {
      if (++n >= maxAttempts) return reject(new Error("Servidor não respondeu."));
      setTimeout(try_, intervalMs);
    };
    try_();
  });
}

// ── Loading window ─────────────────────────────────────────────────────────
function createLoadingWindow() {
  const win = new BrowserWindow({
    width: 360,
    height: 240,
    frame: false,
    resizable: false,
    center: true,
    backgroundColor: "#09090b",
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  const html = encodeURIComponent(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#09090b;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:14px}
    h1{font-size:24px;font-weight:700;letter-spacing:-.5px}
    p{font-size:12px;color:#52525b}
    .spin{width:26px;height:26px;border:2px solid #27272a;border-top-color:#fff;
      border-radius:50%;animation:s .7s linear infinite}
    @keyframes s{to{transform:rotate(360deg)}}
  </style></head><body>
    <div class="spin"></div><h1>OutsideHub</h1><p>A iniciar servidor...</p>
  </body></html>`);

  win.loadURL("data:text/html;charset=utf-8," + html);
  return win;
}

// ── Janela principal ───────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: "OutsideHub",
    backgroundColor: "#09090b",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.loadURL(APP_URL);

  // Atualizar Rich Presence conforme a página
  mainWindow.webContents.on("did-navigate-in-page", (_, url) => {
    const pageMap = {
      "/feed": "Feed",
      "/chat": "Chat",
      "/leads": "Leads",
      "/email": "Disparo de Email",
      "/tempmail": "TempMail",
      "/scraper": "Scraper",
      "/search": "Search",
      "/downloads": "Downloads",
      "/builders": "Builders",
      "/logs": "Logs",
      "/discord": "Discord",
      "/admin": "Painel Admin",
      "/profile": "Perfil",
    };
    const urlPath = new URL(url).pathname;
    const page = pageMap[urlPath] || "OutsideHub";
    setActivity(page);
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

// ── Tray ───────────────────────────────────────────────────────────────────
function createTray() {
  const iconFile = path.join(__dirname, "icons", "icon.png");
  const icon = fs.existsSync(iconFile)
    ? nativeImage.createFromPath(iconFile).resize({ width: 16, height: 16 })
    : nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip("OutsideHub");
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: "Abrir OutsideHub",
      click: () => {
        if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
        else createMainWindow();
      }
    },
    { type: "separator" },
    { label: "Encerrar", click: () => { isQuitting = true; app.quit(); } },
  ]));
  tray.on("double-click", () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
    else createMainWindow();
  });
}

// ── Rich Presence Discord ──────────────────────────────────────────────────
const DISCORD_CLIENT_ID = "1466718050303868959";
let rpc = null;
let rpcReady = false;
const startTimestamp = new Date();

function initRichPresence() {
  try {
    const DiscordRPC = require("discord-rpc");
    DiscordRPC.register(DISCORD_CLIENT_ID);
    rpc = new DiscordRPC.Client({ transport: "ipc" });

    rpc.on("ready", () => {
      rpcReady = true;
      console.log("[rpc] Discord Rich Presence ativo");
      setActivity("Feed");
    });

    rpc.login({ clientId: DISCORD_CLIENT_ID }).catch((err) => {
      console.warn("[rpc] Discord não disponível:", err.message);
    });
  } catch (err) {
    console.warn("[rpc] discord-rpc não disponível:", err.message);
  }
}

function setActivity(page) {
  if (!rpc || !rpcReady) return;
  try {
    rpc.setActivity({
      details: "OutsideHub Platform",
      state: page || "OutsideHub",
      startTimestamp,
      largeImageKey: "outsidehub",
      largeImageText: "OutsideHub",
      instance: false,
    });
  } catch (err) {
    console.warn("[rpc] setActivity erro:", err.message);
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Encontrar porta livre antes de arrancar
  PORT = await findFreePort(3333);
  APP_URL = `http://localhost:${PORT}`;
  console.log("[main] Usando porta", PORT);

  const loading = createLoadingWindow();

  try {
    await startServer();
    await waitForServer();
    loading.destroy();
    createMainWindow();
    createTray();
    initRichPresence();
  } catch (err) {
    loading.destroy();
    await dialog.showErrorBox("OutsideHub — Erro ao iniciar", String(err.message));
    isQuitting = true;
    app.quit();
  }
});

app.on("window-all-closed", () => { /* manter no tray */ });
app.on("activate", () => {
  if (!mainWindow) createMainWindow();
  else { mainWindow.show(); mainWindow.focus(); }
});
app.on("before-quit", () => {
  isQuitting = true;
  if (rpc) { try { rpc.destroy(); } catch (_) {} rpc = null; }
  if (serverProcess) { serverProcess.kill(); serverProcess = null; }
});
