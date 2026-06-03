import React, { useState } from "react";
import { Database, Users } from "lucide-react";
import Leads from "./Leads";
import Scraper from "./Scraper";

export default function LeadOps() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-sub">Coleta por APIs free e base no formato email:nome</p>
        </div>
        <div style={{ display: "flex", gap: 8, color: "var(--muted-foreground)", fontSize: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Database size={13} /> APIs Free
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Users size={13} /> Base
          </span>
        </div>
      </div>

      <div className="stack-mobile" style={{ display: "grid", gridTemplateColumns: "minmax(320px, 0.82fr) minmax(0, 1.18fr)", gap: 14, alignItems: "start" }}>
        <Scraper embedded onComplete={() => setRefreshKey((value) => value + 1)} />
        <Leads embedded refreshKey={refreshKey} />
      </div>
    </div>
  );
}
