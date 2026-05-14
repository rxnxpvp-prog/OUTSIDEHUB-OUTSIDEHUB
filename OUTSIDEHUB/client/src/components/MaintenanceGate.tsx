import React from "react";
import { useMaintenance } from "@/contexts/MaintenanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle } from "lucide-react";

export default function MaintenanceGate({
  feature,
  children,
}: {
  feature?: string;
  children: React.ReactNode;
}) {
  const { isOnline, loading } = useMaintenance();
  const { isAdmin } = useAuth();

  // sem feature definida ou admin sempre passa
  if (!feature || isAdmin) return <>{children}</>;
  if (loading) return <>{children}</>;

  if (!isOnline(feature)) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
          color: "var(--muted-foreground)",
        }}
      >
        <AlertCircle size={32} style={{ color: "#eab308" }} />
        <p style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)" }}>
          {feature} em manutenção
        </p>
        <p style={{ fontSize: 13 }}>
          Essa área está temporariamente indisponível. Tente novamente mais tarde.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
