// OutsideHub Discord RPC Companion
const RPC = require('discord-rpc');
const axios = require('axios');

const serverUrl = "http://localhost:3333";
const rpcToken = "OH-RPC-CREMA-TOKEN-12345";

let currentClientId = "";
let rpc = null;
let isConnected = false;

console.log("=========================================");
console.log("  OUTSIDEHUB DISCORD RPC COMPANION  ");
console.log("=========================================");
console.log("Conectando ao servidor: " + serverUrl);

async function updatePresence() {
  try {
    const res = await axios.get(serverUrl + "/api/auth/rpc/status", {
      headers: { "X-RPC-Token": rpcToken }
    });
    
    const { online, username, rpcClientId, rpcDetails, rpcState } = res.data;

    if (!rpcClientId) {
      console.warn("Alerta: Discord Client ID nao configurado no painel da OutsideHub.");
      if (rpc) {
        rpc.destroy().catch(() => {});
        rpc = null;
        isConnected = false;
      }
      return;
    }

    if (rpcClientId !== currentClientId) {
      if (rpc) {
        await rpc.destroy().catch(() => {});
        rpc = null;
        isConnected = false;
      }
      currentClientId = rpcClientId;
      rpc = new RPC.Client({ transport: 'ipc' });
      rpc.on('ready', () => {
        console.log("Conectado ao Discord Client com sucesso!");
        isConnected = true;
      });
      rpc.on('disconnected', () => {
        console.log("Desconectado do Discord.");
        isConnected = false;
      });
      
      console.log("Tentando conectar ao Discord (App ID: " + rpcClientId + ")...");
      rpc.login({ clientId: rpcClientId }).catch(err => {
        console.error("Falha ao conectar no Discord. Certifique-se de que o Discord esta aberto.");
      });
    }

    if (online && isConnected && rpc) {
      rpc.setActivity({
        details: rpcDetails,
        state: rpcState,
        startTimestamp: new Date(res.data.lastSeen || Date.now()),
        largeImageKey: 'oni_logo',
        largeImageText: 'OUTSIDEHUB',
        instance: false,
      }).catch(err => {});
      console.log("[" + new Date().toLocaleTimeString() + "] RPC Atualizado: " + rpcDetails + " - " + rpcState);
    } else if (!online && isConnected && rpc) {
      rpc.clearActivity().catch(() => {});
      console.log("[" + new Date().toLocaleTimeString() + "] Silenciando RPC (Usuario offline no site).");
    }
  } catch (err) {
    console.error("[" + new Date().toLocaleTimeString() + "] Erro ao buscar status do servidor: " + (err.response?.data?.error || err.message));
  }
}

updatePresence();
setInterval(updatePresence, 15000);
