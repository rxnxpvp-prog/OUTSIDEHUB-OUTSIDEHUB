import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

type Screen = "invite" | "register" | "admin-login";

export default function Login() {
  const [screen, setScreen] = useState<Screen>("invite");

  // Invite screen
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [validatedInvite, setValidatedInvite] = useState<{ id: string; code: string; note?: string } | null>(null);

  // Register screen
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  // Admin login
  const [username, setUsername] = useState("crema");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [requires2fa, setRequires2fa] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const { login } = useAuth();
  const [, navigate] = useLocation();

  // ── Step 1: validate invite code ──
  const validateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) { setInviteError("Insira seu código de convite"); return; }
    setInviteError("");
    setInviteLoading(true);
    try {
      const res = await api.post("/invites/validate", { code: inviteCode.trim() });
      setValidatedInvite(res.data.invite);
      setScreen("register");
    } catch (err: any) {
      setInviteError(err.response?.data?.error || "Código inválido");
    } finally {
      setInviteLoading(false);
    }
  };

  // ── Step 2: register with invite ──
  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regPassword.trim()) { setRegError("Preencha todos os campos"); return; }
    setRegError("");
    setRegLoading(true);
    try {
      const res = await api.post("/invites/register", {
        code: validatedInvite!.code,
        username: regUsername.trim(),
        password: regPassword,
      });
      localStorage.setItem("outsidehub_token", res.data.token);
      window.location.href = "/";
    } catch (err: any) {
      setRegError(err.response?.data?.error || "Erro ao criar conta");
    } finally {
      setRegLoading(false);
    }
  };

  // ── Admin login ──
  const adminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setLoginError("Preencha todos os campos"); return; }
    setLoginError("");
    setLoginLoading(true);
    const r = await login(username, password, otp.trim() ? otp : undefined);
    if (r.success) {
      navigate("/");
    } else if (r.requires2fa) {
      setRequires2fa(true);
      setLoginError(r.error || "Código 2FA necessário");
    } else {
      setLoginError(r.error || "Credenciais inválidas");
    }
    setLoginLoading(false);
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
      {/* Ambient glow */}
      <div style={{
        position: "absolute",
        width: 700, height: 700,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(180,0,0,0.06) 0%, transparent 70%)",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        filter: "blur(60px)",
      }} />

      {/* Liquid glass card */}
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "rgba(255,255,255,0.048)",
          backdropFilter: "blur(40px) saturate(2.0)",
          WebkitBackdropFilter: "blur(40px) saturate(2.0)",
          border: "1px solid rgba(255,255,255,0.11)",
          borderRadius: 24,
          boxShadow: "inset 0 1px 1px rgba(255,255,255,0.08), 0 40px 100px rgba(0,0,0,0.6), 0 12px 32px rgba(0,0,0,0.4), inset 0 0 80px rgba(255,255,255,0.02)",
          padding: "44px 40px 40px",
          position: "relative",
          overflow: "hidden",
          animation: "fadeUp 300ms ease both",
        }}
      >
        {/* Top shimmer */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "50%",
          background: "linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 30%, transparent 100%)",
          borderRadius: "24px 24px 0 0",
          pointerEvents: "none",
        }} />

        {/* Logo + title */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32, gap: 16 }}>
          <div style={{
            width: 90, height: 90,
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.12), 0 0 40px rgba(180,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.08)",
            flexShrink: 0,
            background: "rgba(255,255,255,0.03)",
          }}>
            <img
              src="/oni_creepy_v2_-_Editado.png"
              alt="OutsideHub"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
          <div style={{ textAlign: "center" }}>
            <h1 style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.06em",
              color: "var(--foreground)",
              margin: 0,
              lineHeight: 1,
            }}>
              OUTSIDE HUB
            </h1>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 6, lineHeight: 1.4 }}>
              {screen === "invite" && "Acesso por convite"}
              {screen === "register" && "Crie sua conta"}
              {screen === "admin-login" && "Acesso administrativo"}
            </p>
          </div>
        </div>

        {/* ── INVITE SCREEN ── */}
        {screen === "invite" && (
          <form onSubmit={validateInvite} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 5, letterSpacing: "0.08em" }}>
                CÓDIGO DE CONVITE
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX"
                autoFocus
                className="field"
                style={{ letterSpacing: "0.12em", textAlign: "center", fontWeight: 600 }}
              />
            </div>

            {inviteError && (
              <p style={{ fontSize: 12, color: "var(--destructive)", marginTop: -6 }}>{inviteError}</p>
            )}

            <button
              type="submit"
              disabled={inviteLoading}
              className="action action-solid"
              style={{ marginTop: 4, width: "100%", padding: "10px 14px", fontSize: 13, fontWeight: 600 }}
            >
              {inviteLoading
                ? <span className="spin" style={{ width: 13, height: 13, borderRadius: "50%", border: "1.5px solid currentColor", borderTopColor: "transparent", display: "inline-block" }} />
                : null}
              {inviteLoading ? "Validando…" : "Entrar com Convite"}
            </button>

            <button
              type="button"
              onClick={() => setScreen("admin-login")}
              className="action action-ghost"
              style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: -4 }}
            >
              Acesso admin
            </button>
          </form>
        )}

        {/* ── REGISTER SCREEN ── */}
        {screen === "register" && validatedInvite && (
          <form onSubmit={register} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{
              padding: "8px 12px",
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.2)",
              borderRadius: 10,
              fontSize: 12,
              color: "#4ade80",
            }}>
              ✓ Convite válido{validatedInvite.note ? ` — ${validatedInvite.note}` : ""}
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 5, letterSpacing: "0.08em" }}>
                USUÁRIO
              </label>
              <input
                type="text"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="seu_usuario"
                autoFocus
                autoComplete="username"
                className="field"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 5, letterSpacing: "0.08em" }}>
                SENHA
              </label>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="field"
              />
            </div>

            {regError && (
              <p style={{ fontSize: 12, color: "var(--destructive)", marginTop: -6 }}>{regError}</p>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setScreen("invite")}
                className="action action-outline"
                style={{ flex: 1, padding: "9px 14px", fontSize: 13 }}
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={regLoading}
                className="action action-solid"
                style={{ flex: 2, padding: "9px 14px", fontSize: 13, fontWeight: 600 }}
              >
                {regLoading
                  ? <span className="spin" style={{ width: 13, height: 13, borderRadius: "50%", border: "1.5px solid currentColor", borderTopColor: "transparent", display: "inline-block" }} />
                  : null}
                {regLoading ? "Criando…" : "Criar Conta"}
              </button>
            </div>
          </form>
        )}

        {/* ── ADMIN LOGIN SCREEN ── */}
        {screen === "admin-login" && (
          <form onSubmit={adminLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 5, letterSpacing: "0.08em" }}>
                USUÁRIO ADMIN
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="crema"
                autoFocus
                autoComplete="username"
                className="field"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 5, letterSpacing: "0.08em" }}>
                SENHA
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="field"
              />
            </div>

            {requires2fa && (
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 5, letterSpacing: "0.08em" }}>
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
              </div>
            )}

            {loginError && (
              <p style={{ fontSize: 12, color: "var(--destructive)", marginTop: -2 }}>{loginError}</p>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setScreen("invite")}
                className="action action-outline"
                style={{ flex: 1, padding: "9px 14px", fontSize: 13 }}
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loginLoading}
                className="action action-solid"
                style={{ flex: 2, padding: "9px 14px", fontSize: 13, fontWeight: 600 }}
              >
                {loginLoading
                  ? <span className="spin" style={{ width: 13, height: 13, borderRadius: "50%", border: "1.5px solid currentColor", borderTopColor: "transparent", display: "inline-block" }} />
                  : null}
                {loginLoading ? "Entrando…" : "Entrar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
