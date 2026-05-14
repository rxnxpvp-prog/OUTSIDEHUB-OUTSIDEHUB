import React, { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

export interface MaintenanceItem {
  id: string;
  name: string;
  status: "online" | "maintenance" | string;
  icon: string;
}

interface MaintenanceContextType {
  maintenance: MaintenanceItem[];
  loading: boolean;
  isOnline: (feature: string) => boolean;
  refresh: () => void;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMaintenance = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/maintenance/public");
      setMaintenance(res.data);
    } catch {
      setMaintenance([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenance();
    const handleUpdate = () => fetchMaintenance();
    window.addEventListener("maintenanceUpdated", handleUpdate);
    return () => window.removeEventListener("maintenanceUpdated", handleUpdate);
  }, []);

  const isOnline = (feature: string) => {
    const item = maintenance.find((m) => m.name.toLowerCase() === feature.toLowerCase());
    return item ? item.status !== "maintenance" : true;
  };

  return (
    <MaintenanceContext.Provider value={{ maintenance, loading, isOnline, refresh: fetchMaintenance }}>
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  const ctx = useContext(MaintenanceContext);
  if (!ctx) throw new Error("useMaintenance must be used within MaintenanceProvider");
  return ctx;
}
