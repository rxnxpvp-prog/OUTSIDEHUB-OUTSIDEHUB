import React from "react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, navigate] = useLocation();
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 72, fontWeight: 700, letterSpacing: "-0.06em", color: "var(--border)", lineHeight: 1, marginBottom: 16 }}>
          404
        </p>
        <p style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>
          Página não encontrada
        </p>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 24 }}>
          A rota que você acessou não existe.
        </p>
        <button onClick={() => navigate("/")} className="action action-solid">
          Voltar ao início
        </button>
      </div>
    </div>
  );
}
