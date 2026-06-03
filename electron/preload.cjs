const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("outsidehubDesktop", {
  isDesktop: true,
  notify: (payload) => ipcRenderer.send("outsidehub:notify", {
    title: String(payload?.title || "OutsideHub").slice(0, 120),
    body: String(payload?.body || "").slice(0, 240),
  }),
  updates: {
    onAvailable: (callback) => {
      const handler = (_event, update) => callback(update);
      ipcRenderer.on("outsidehub:update-available", handler);
      return () => ipcRenderer.removeListener("outsidehub:update-available", handler);
    },
    check: () => ipcRenderer.invoke("outsidehub:update:check"),
    download: () => ipcRenderer.invoke("outsidehub:update:download"),
  },
});
