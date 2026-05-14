import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, CheckCircle } from "lucide-react";
import api from "@/lib/api";

interface Account { id: string; username: string; discriminator: string; avatar?: string; }

function DiscordIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export default function Discord() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await api.get("/auth/discord/status");
      if (res.data.connected) {
        setAccount({
          id: res.data.discordId,
          username: res.data.discordUsername,
          discriminator: res.data.discordDiscriminator,
          avatar: res.data.discordAvatar,
        });
      } else {
        setAccount(null);
      }
    } catch {
      setAccount(null);
    }
  };

  const connect = async () => {
    try {
      setLoading(true);
      const res = await api.get("/auth/discord/url");
      window.location.href = res.data.url;
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao iniciar conexão com Discord");
      setLoading(false);
    }
  };

  const disconnect = async () => {
    try {
      setLoading(true);
      await api.post("/auth/discord/disconnect");
      setAccount(null);
      toast.success("Discord desconectado");
    } catch {
      toast.error("Erro ao desconectar Discord");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "1") {
      toast.success("Discord conectado com sucesso");
      params.delete("connected");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">Discord</h1>
        <p className="page-sub">Conecte sua conta Discord à plataforma</p>
      </div>

      <div className="surface" style={{ overflow: "hidden" }}>
        <div style={{ height: 80, background: "#5865F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <DiscordIcon size={36} />
        </div>

        <div style={{ padding: 20 }}>
          {account ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "var(--radius)" }}>
                <CheckCircle size={14} style={{ color: "#22c55e", flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: "var(--foreground)" }}>Conta conectada</p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "var(--accent)", borderRadius: "var(--radius)" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#5865F2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <DiscordIcon size={18} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
                    {account.username}
                    {account.discriminator !== "0" && (
                      <span style={{ fontWeight: 400, color: "var(--muted-foreground)" }}>#{account.discriminator}</span>
                    )}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 1 }}>ID: {account.id}</p>
                </div>
              </div>

              <button
                onClick={disconnect}
                className="action action-outline"
                style={{ width: "100%", gap: 6 }}
              >
                <LogOut size={13} />
                Desconectar
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "center" }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>Conectar Discord</p>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                  Vincule sua conta para receber notificações e acessar canais exclusivos.
                </p>
              </div>

              <button
                onClick={connect}
                className="action"
                style={{ width: "100%", background: "#5865F2", color: "#fff", padding: "9px 12px", gap: 8 }}
              >
                <DiscordIcon size={16} />
                Conectar com Discord
              </button>

              <p style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                Ao conectar, você concorda com os termos do Discord.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
