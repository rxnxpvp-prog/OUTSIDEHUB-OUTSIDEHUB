import React from "react";

export default function Builders() {
  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">Builders</h1>
        <p className="page-sub">Crie e gerencie seus projetos</p>
      </div>
      <div className="surface" style={{ padding: "48px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          Em desenvolvimento — disponível em breve.
        </p>
      </div>
    </div>
  );
}
