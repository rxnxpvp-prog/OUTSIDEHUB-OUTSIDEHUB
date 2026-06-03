import React, { useState } from "react";
import { ArrowRight, KeyRound, LockKeyhole, ShieldCheck, Ticket, UserRound } from "lucide-react";
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
  const displayCode = isRegister
    ? (inviteCode.trim().toUpperCase() || "INVITE").slice(0, 10)
    : "LOGIN";

  const authMessage = (message: string | undefined, fallback: string) => {
    if (!message) return fallback;
    const normalized = message.toLowerCase();

    if (normalized.includes("2fa") && (normalized.includes("necess") || normalized.includes("required"))) {
      return "Authentication token required";
    }
    if (normalized.includes("2fa") && (normalized.includes("inv") || normalized.includes("invalid"))) {
      return "Invalid authentication token";
    }
    if (normalized.includes("convite") || normalized.includes("invite")) {
      return "Invalid or expired invite code";
    }
    if (normalized.includes("usu") || normalized.includes("senha")) {
      return "Access denied";
    }

    return message;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Fill in all required fields");
      return;
    }
    if (isRegister && !inviteCode.trim()) {
      setError("Invite code is required");
      return;
    }

    setError("");
    setLoading(true);

    if (isRegister) {
      const result = await register(username, password, inviteCode.trim());
      if (result.success) {
        navigate("/");
      } else {
        setError(authMessage(result.error, "Invalid or expired invite code"));
      }
    } else {
      const result = await login(username, password, otp.trim() ? otp : undefined);
      if (result.success) {
        navigate("/");
      } else if (result.requires2fa) {
        setRequires2fa(true);
        setError(authMessage(result.error, "Authentication token required"));
      } else {
        setError(authMessage(result.error, "Access denied"));
      }
    }

    setLoading(false);
  };

  const toggleMode = () => {
    setIsRegister((value) => !value);
    setError("");
    setRequires2fa(false);
  };

  return (
    <main className="login-page">
      <div className="login-backdrop" aria-hidden="true">
        <div className="login-refract login-refract-a" />
        <div className="login-refract login-refract-b" />
        <div className="login-refract login-refract-c" />
        <div className="login-scanline" />
      </div>

      <section className="login-stage">
        <div className="login-brand-panel">
          <div className="login-terminal" aria-hidden="true">
            <div className="login-terminal-header">
              <span />
              <span />
              <span />
              <strong>OH-ACCESS</strong>
            </div>
            <div className="login-terminal-body">
              <div className="login-command">
                <span>$</span>
                outsidehub --open-gate
              </div>
              <div className="login-access-mask">
                <span />
                <span />
                <span />
                <strong>{displayCode}</strong>
              </div>
              <div className="login-vault-row">
                <span>
                  USER
                  <b>REDACTED</b>
                </span>
                <span>
                  PERM
                  <b>USER</b>
                </span>
              </div>
              <div className="login-terminal-lines">
                <i />
                <i />
                <i />
              </div>
            </div>
            <img
              src="/outside_hub_oni_icon.png"
              alt=""
              className="login-card-flag"
              aria-hidden="true"
            />
          </div>

          <div className="login-node-panel" aria-hidden="true">
            <div className="login-node-status">
              <span>USER STATUS</span>
              <div className="login-status-row">
                <strong>AUTH</strong>
                <i />
                <b>VERIFIED</b>
              </div>
              <div className="login-status-row">
                <strong>CHANNEL</strong>
                <i />
                <b>ENCRYPTED</b>
              </div>
              <div className="login-status-row">
                <strong>CREW</strong>
                <i />
                <b>28 ACTIVE</b>
              </div>
              <div className="login-status-row">
                <strong>UPLINK</strong>
                <i />
                <b>STABLE</b>
              </div>
            </div>

            <div className="login-node-logs">
              <p>&gt; outsidehub profile initialized</p>
              <p>&gt; user access restored</p>
              <p>&gt; encrypted route stable</p>
            </div>

            <div className="login-node-tags">OFF-GRID • PRIVATE • INTERNAL</div>
          </div>

        </div>

        <form className="login-card" onSubmit={submit}>
          <div className="login-card-topline" aria-hidden="true" />

          <div className="login-form-header">
            <span className="login-kicker">{isRegister ? "RESTRICTED" : "PRIVATE ACCESS"}</span>
            <h2>{isRegister ? "ACTIVATE INVITE" : "ACCESS TERMINAL"}</h2>
            <p>{isRegister ? "Use private invitation to unlock access." : "Private user access for off-grid crews."}</p>
          </div>

          <div className="login-tabs" role="tablist" aria-label="Access mode">
            <button
              type="button"
              role="tab"
              aria-selected={!isRegister}
              className={!isRegister ? "active" : ""}
              onClick={() => {
                setIsRegister(false);
                setError("");
                setRequires2fa(false);
              }}
            >
              Operador
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isRegister}
              className={isRegister ? "active" : ""}
              onClick={() => {
                setIsRegister(true);
                setError("");
                setRequires2fa(false);
              }}
            >
              Convidado
            </button>
          </div>

          <div className="login-fields">
            {isRegister && (
              <label className="login-field">
                <span>
                  <Ticket size={13} />
                  Invite code
                </span>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Codigo gerado no painel"
                  className="field"
                  autoFocus={isRegister}
                />
                <small>Convidados entram sempre com permissao de usuario.</small>
              </label>
            )}

            <label className="login-field">
                <span>
                  <UserRound size={13} />
                  User
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus={!isRegister}
                className="field"
              />
            </label>

            <label className="login-field">
              <span>
                <LockKeyhole size={13} />
                Access key
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isRegister ? "new-password" : "current-password"}
                className="field"
              />
            </label>

            {!isRegister && (
              <label className="login-field">
                <span>
                  <KeyRound size={13} />
                  Auth token
                </span>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  className="field"
                />
                <small>
                  {requires2fa ? "Submit your current authentication token." : "Optional for users without 2FA."}
                </small>
              </label>
            )}
          </div>

          {error && (
            <div className="login-error" role="alert">
              <ShieldCheck size={14} />
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="action action-solid login-submit">
            {loading ? (
              <span className="spin login-spinner" />
            ) : (
              <ArrowRight size={16} />
            )}
            {loading ? (isRegister ? "ACTIVATING..." : "OPENING GATE...") : isRegister ? "ACTIVATE ACCESS" : "OPEN GATE"}
          </button>

          <button type="button" onClick={toggleMode} className="login-mode-toggle">
            {isRegister ? "Voltar para login do crema" : "Criar conta com codigo de convidado"}
          </button>
        </form>
      </section>
    </main>
  );
}
