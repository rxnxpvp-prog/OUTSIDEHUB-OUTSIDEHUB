import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [requires2fa, setRequires2fa] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const [, navigate] = useLocation();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Preencha todos os campos obrigatórios");
      return;
    }
    if (isRegister && !inviteCode.trim()) {
      setError("Código de convite é obrigatório");
      return;
    }
    
    setError("");
    setLoading(true);
    
    if (isRegister) {
      const r = await register(username, password, inviteCode.trim());
      if (r.success) {
        navigate("/");
      } else {
        setError(r.error || "Código inválido ou expirado");
      }
    } else {
      const r = await login(username, password, otp.trim() ? otp : undefined);
      if (r.success) {
        navigate("/");
      } else if (r.requires2fa) {
        setRequires2fa(true);
        setError(r.error || "Código 2FA necessário");
      } else {
        setError(r.error || "Credenciais inválidas");
      }
    }
    
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 16px",
        background: "var(--background)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow atrás do card */}
      <div style={{
        position: "absolute",
        width: 500, height: 500,
        borderRadius: "50%",
        background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 65%)",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        filter: "blur(60px)",
        opacity: 0.8,
      }} />

      {/* Card glass — premium liquid glass */}
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "rgba(255, 255, 255, 0.03)",
          backdropFilter: "blur(40px) saturate(1.6)",
          WebkitBackdropFilter: "blur(40px) saturate(1.6)",
          border: "1px solid var(--glass-border)",
          borderRadius: 20,
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 32px 80px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3)",
          padding: "48px 40px 40px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Shimmer line no topo */}
        <div style={{
          position: "absolute",
          top: 0, left: "15%", right: "15%",
          height: 1,
          background: "linear-gradient(90deg, transparent, var(--glass-shine), transparent)",
          opacity: 0.6,
          pointerEvents: "none",
        }} />

        {/* ── Liquid Glass Logo ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 36, gap: 16 }}>
          <div style={{
            width: 120, height: 120,
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
          }}>
            <img
              src="/logo_o.png"
              alt="OutsideHub"
              className="logo-pulse"
              style={{ 
                width: "100%", height: "100%", 
                objectFit: "contain", 
                mixBlendMode: "screen",
                filter: "var(--logo-filter)",
              }}
              onError={(e) => { 
                e.currentTarget.src = "/oni_creepy_v2_-_Editado.png";
                e.currentTarget.style.mixBlendMode = "normal";
                e.currentTarget.style.borderRadius = "20px";
              }}
            />
          </div>
          <img
            src="/logo_text.png"
            alt="OUTSIDE HUB"
            style={{
              height: 28,
              objectFit: "contain",
              mixBlendMode: "screen",
              filter: "var(--logo-filter)",
              opacity: 0.9,
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              if (e.currentTarget.nextElementSibling) {
                (e.currentTarget.nextElementSibling as HTMLElement).style.display = "block";
              }
            }}
          />
          <span style={{
            display: "none",
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            color: "var(--foreground)",
            opacity: 0.8,
          }}>
            OUTSIDE HUB
          </span>
        </div>

        {/* ── Form ── */}
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {isRegister && (
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 5, letterSpacing: "0.02em" }}>
                CÓDIGO DE CONVITE
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Ex: XXXX-XXXX"
                className="field"
                autoFocus={isRegister}
              />
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 5, letterSpacing: "0.02em" }}>
              USUÁRIO
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="seu_usuário"
              autoComplete="username"
              autoFocus={!isRegister}
              className="field"
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 5, letterSpacing: "0.02em" }}>
              SENHA
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={isRegister ? "new-password" : "current-password"}
              className="field"
            />
          </div>

          {!isRegister && (
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 5, letterSpacing: "0.02em" }}>
                CÓDIGO 2FA
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="000000"
                autoComplete="one-time-code"
                className="field"
              />
              <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 5, lineHeight: 1.4 }}>
                {requires2fa
                  ? "Insira o código do seu app de autenticação."
                  : "Deixe em branco se não usar 2FA."}
              </p>
            </div>
          )}

          {error && (
            <p style={{ fontSize: 12, color: "var(--destructive)", marginTop: -2 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="action action-solid"
            style={{ marginTop: 6, width: "100%", padding: "9px 14px", fontSize: 13, fontWeight: 600 }}
          >
            {loading && (
              <span className="spin" style={{
                width: 13, height: 13, borderRadius: "50%",
                border: "1.5px solid currentColor", borderTopColor: "transparent",
                display: "inline-block",
              }} />
            )}
            {loading
              ? (isRegister ? "Criando conta..." : (requires2fa ? "Validando…" : "Entrando…"))
              : (isRegister ? "Criar Conta" : (requires2fa ? "Entrar com 2FA" : "Entrar"))}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
              setRequires2fa(false);
            }}
            style={{
              marginTop: 8,
              fontSize: 12,
              color: "var(--muted-foreground)",
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {isRegister ? "Já tenho uma conta. Fazer login." : "Tenho um código de convite. Criar conta."}
          </button>
        </form>
      </div>
    </div>
  );
}
