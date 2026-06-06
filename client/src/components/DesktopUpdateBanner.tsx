import React, { useEffect, useState } from "react";
import { Download, Loader2, X } from "lucide-react";

type DesktopUpdateInfo = {
  version: string;
  currentVersion: string;
  notes?: string;
  downloadUrl?: string;
};

type DesktopUpdateResult = {
  ok?: boolean;
  error?: string;
  path?: string;
  action?: string;
};

function isDesktopApp() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator?.userAgent?.toLowerCase() || "";
  return Boolean(window.outsidehubDesktop?.isDesktop) || ua.includes("electron");
}

export default function DesktopUpdateBanner() {
  const [update, setUpdate] = useState<DesktopUpdateInfo | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isDesktopApp() || !window.outsidehubDesktop?.updates) return;
    let alive = true;
    const removeListener = window.outsidehubDesktop.updates.onAvailable((next) => {
      if (!alive) return;
      setError("");
      setUpdate(next);
    });
    window.outsidehubDesktop.updates.check()
      .then((next) => {
        if (alive && next) setUpdate(next);
      })
      .catch(() => {});
    return () => {
      alive = false;
      removeListener?.();
    };
  }, []);

  if (!update || dismissedVersion === update.version) return null;

  const installUpdate = async () => {
    setDownloading(true);
    setError("");
    try {
      const result = await window.outsidehubDesktop?.updates?.download();
      if (!result?.ok) {
        throw new Error(result?.error || "Falha ao baixar update");
      }
    } catch (err: any) {
      setError(err?.message || "Falha ao baixar update");
      setDownloading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        width: "min(620px, calc(100vw - 28px))",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 8,
        background: "linear-gradient(145deg, rgba(15,15,20,0.98), rgba(8,8,12,0.98))",
        color: "var(--foreground)",
        boxShadow: "0 18px 55px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.08)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <Download size={15} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800 }}>
            Atualizacao {update.version} disponivel
          </p>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 11.5,
              lineHeight: 1.35,
              color: error ? "var(--destructive)" : "var(--muted-foreground)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={error || update.notes || undefined}
          >
            {error || update.notes || `Instalado: ${update.currentVersion}`}
          </p>
        </div>
        <button
          onClick={installUpdate}
          disabled={downloading}
          className="action action-solid"
          style={{
            height: 30,
            padding: "0 12px",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            opacity: downloading ? 0.72 : 1,
            flexShrink: 0,
          }}
        >
          {downloading ? <Loader2 size={13} className="spin" /> : <Download size={13} />}
          {downloading ? "Baixando" : "Atualizar"}
        </button>
        <button
          onClick={() => setDismissedVersion(update.version)}
          className="hdr-btn"
          style={{ width: 30, height: 30, flexShrink: 0 }}
          title="Fechar"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
