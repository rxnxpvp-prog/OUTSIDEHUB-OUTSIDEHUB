// Preload script — ponte segura entre o renderer e o main process
// Por agora não expõe nada extra, a app usa apenas HTTP para comunicar com o servidor
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  version: process.env.npm_package_version || "1.0.0",
});
