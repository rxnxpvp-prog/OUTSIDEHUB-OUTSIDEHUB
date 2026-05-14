import React, { useState, useEffect } from "react";
import { toast } from "sonner";

interface Settings {
  showOnlineStatus: boolean;
  showActivity: boolean;
  allowMentions: boolean;
  receiveNotifications: boolean;
}

const DEFAULTS: Settings = {
  showOnlineStatus: true,
  showActivity: true,
  allowMentions: true,
  receiveNotifications: true,
};

function load(): Settings {
  try {
    const raw = localStorage.getItem("privacy_settings");
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch { return DEFAULTS; }
}

function Toggle({ label, description, value, onChange }: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>{label}</p>
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 32,
          height: 18,
          borderRadius: 9,
          background: value ? "var(--foreground)" : "var(--border)",
          position: "relative",
          flexShrink: 0,
          transition: "background 180ms",
        }}
      >
        <div style={{
          position: "absolute",
          top: 2,
          left: value ? 14 : 2,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: value ? "var(--background)" : "var(--muted-foreground)",
          transition: "left 180ms",
        }} />
      </button>
    </div>
  );
}

export default function Privacy() {
  const [s, setS] = useState<Settings>(load);

  useEffect(() => {
    localStorage.setItem("privacy_settings", JSON.stringify(s));
  }, [s]);

  const set = (key: keyof Settings) => (v: boolean) => {
    setS((p) => ({ ...p, [key]: v }));
    toast.success("Salvo");
  };

  const rows: { key: keyof Settings; label: string; description: string }[] = [
    { key: "showOnlineStatus", label: "Status online", description: "Outros usuários podem ver quando você está online." },
    { key: "showActivity", label: "Atividade", description: "Exibe sua atividade recente no feed." },
    { key: "allowMentions", label: "Menções", description: "Permite que te mencionem em posts e comentários." },
    { key: "receiveNotifications", label: "Notificações", description: "Receba notificações sobre atividades relevantes." },
  ];

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">Privacidade</h1>
        <p className="page-sub">Gerencie suas configurações de privacidade</p>
      </div>

      <div className="surface" style={{ padding: "0 16px" }}>
        {rows.map((r, i) => (
          <div key={r.key} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}>
            <Toggle
              label={r.label}
              description={r.description}
              value={s[r.key]}
              onChange={set(r.key)}
            />
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: "var(--muted-foreground)", textAlign: "center", marginTop: 16 }}>
        Salvo automaticamente no dispositivo.
      </p>
    </div>
  );
}
