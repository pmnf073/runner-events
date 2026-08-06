import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useTheme } from "../ThemeContext";

const API_URL = import.meta.env.VITE_API_URL || "";
const V = (name) => `var(${name})`;

export default function LoginPage({ setUser }) {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(() => {
    if (searchParams.get("oauthError") === "account-unavailable") return "A tua conta não está disponível. Contacta o administrador.";
    if (searchParams.get("oauthError")) return "Não foi possível concluir o início de sessão. Tenta novamente.";
    return "";
  });
  const [loading, setLoading] = useState(false);
  const [pendingDialog, setPendingDialog] = useState(null);

  const startOAuth = (provider) => {
    window.location.assign(`${API_URL}/auth/${provider}`);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.status === 403 && data.status === "pending") {
        return setPendingDialog({ visible: true, email });
      }
      if (res.status === 403 && data.status === "banned") {
        return setError("A tua conta foi banida. Contacta o administrador.");
      }
      if (res.status === 403 && data.status === "inactive") {
        return setError("A tua conta esta desativada. Contacta o administrador.");
      }
      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        setUser(data.user);
        window.location.href = "/";
      } else {
        setError(data.error || "Erro ao fazer login");
      }
    } catch {
      setError("Erro de conexao com o servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ background: V("--bg-header"), borderRadius: 16, border: `1px solid ${V("--border-subtle")}`, padding: 40, width: "100%", maxWidth: 420, transition: "background 0.3s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src={theme === "light" ? "/logo-light.png" : "/logo.png"} alt="AUR" style={{ height: 64, width: "auto", margin: "0 auto 16px", display: "block" }} />
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#CC3333", margin: "0 0 4px" }}>Alverca Urban Runners</h1>
          <p style={{ fontSize: 14, color: V("--text-muted"), marginTop: 8 }}>Inicia sessao para confirmar presenca nos eventos</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, color: V("--text-muted"), marginBottom: 6 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@exemplo.com"
              style={{ width: "100%", background: V("--bg-input"), border: `1px solid ${V("--border-input")}`, borderRadius: 8, padding: "12px 14px", fontSize: 14, color: V("--text-primary"), outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, color: V("--text-muted"), marginBottom: 6 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
              style={{ width: "100%", background: V("--bg-input"), border: `1px solid ${V("--border-input")}`, borderRadius: 8, padding: "12px 14px", fontSize: 14, color: V("--text-primary"), outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: "#f87171", background: "rgba(248,113,113,0.1)", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(248,113,113,0.2)" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", background: "#CC3333", color: "#fff", padding: "12px", borderRadius: 8, fontSize: 15, fontWeight: 500, border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1 }}>
            {loading ? "A entrar..." : "Entrar"}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
          <div style={{ flex: 1, height: 1, background: V("--border-subtle") }} />
          <span style={{ fontSize: 12, color: V("--text-muted") }}>ou</span>
          <div style={{ flex: 1, height: 1, background: V("--border-subtle") }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button type="button" onClick={() => startOAuth("google")}
            title="Continuar com Google" aria-label="Continuar com Google"
            style={{ width: "100%", background: "var(--bg-input)", border: `1px solid ${V("--border-input")}`, padding: "10px", borderRadius: 8, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M21.35 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.51h3.14c1.84-1.69 2.91-4.19 2.91-7.28Z" />
              <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.35l-3.14-2.51c-.87.58-1.99.92-3.31.92-2.54 0-4.69-1.71-5.46-4.01H3.3v2.59A9.75 9.75 0 0 0 12 21.75Z" />
              <path fill="#FBBC05" d="M6.54 13.8a5.87 5.87 0 0 1 0-3.6V7.61H3.3a9.75 9.75 0 0 0 0 8.78l3.24-2.59Z" />
              <path fill="#EA4335" d="M12 6.19c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.84 3.27 14.63 2.25 12 2.25A9.75 9.75 0 0 0 3.3 7.61l3.24 2.59C7.31 7.9 9.46 6.19 12 6.19Z" />
            </svg>
          </button>
          <button type="button" onClick={() => startOAuth("facebook")}
            title="Continuar com Facebook" aria-label="Continuar com Facebook"
            style={{ width: "100%", background: "#1877F2", color: "#fff", border: "none", padding: "10px", borderRadius: 8, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M13.8 21v-8.2h2.75l.41-3.2H13.8V7.56c0-.93.26-1.56 1.59-1.56h1.7V3.14a22.7 22.7 0 0 0-2.48-.14c-2.45 0-4.13 1.5-4.13 4.24V9.6H7.7v3.2h2.78V21h3.32Z" />
            </svg>
          </button>
        </div>

        <p style={{ fontSize: 13, color: V("--text-secondary"), textAlign: "center", marginTop: 20 }}>
          Nao tens conta?{" "}
          <Link to="/register" style={{ color: "#CC3333", textDecoration: "none" }}>
            Criar conta
          </Link>
        </p>

        {/* Pending Dialog */}
        {pendingDialog && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
            <div style={{ background: V("--bg-header"), borderRadius: 12, padding: 24, maxWidth: 400, width: "100%" }}>
              <div style={{ fontSize: 48, textAlign: "center", marginBottom: 12 }}>⏳</div>
              <h2 style={{ fontSize: 20, color: V("--text-heading"), textAlign: "center", marginBottom: 8 }}>A tua conta esta pendente</h2>
              <p style={{ fontSize: 14, color: V("--text-secondary"), textAlign: "center", marginBottom: 20, lineHeight: 1.5 }}>
                O teu pedido de registo sera revisto por um administrador. Receberas uma notificacao quando a conta for ativada.
              </p>
              <button
                onClick={() => setPendingDialog({ visible: false })}
                style={{ display: "block", width: "100%", padding: "12px 0", background: "#CC3333", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
