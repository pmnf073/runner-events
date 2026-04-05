import { useState } from "react";

export default function LoginPage({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
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
      <div style={{ background: "#0D2137", borderRadius: 16, border: "1px solid #1B3A5C", padding: 40, width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo.png" alt="AUR" style={{ height: 64, width: "auto", margin: "0 auto 16px", display: "block" }} />
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#CC3333", margin: "0 0 4px" }}>Alverca Urban Runners</h1>
          <p style={{ fontSize: 14, color: "#6b7280", marginTop: 8 }}>Inicia sessao para confirmar presenca nos eventos</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@exemplo.com"
              style={{ width: "100%", background: "#0D1520", border: "1px solid #1B3A5C", borderRadius: 8, padding: "12px 14px", fontSize: 14, color: "#e8ecef", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
              style={{ width: "100%", background: "#0D1520", border: "1px solid #1B3A5C", borderRadius: 8, padding: "12px 14px", fontSize: 14, color: "#e8ecef", outline: "none", boxSizing: "border-box" }}
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
          <div style={{ flex: 1, height: 1, background: "#1B3A5C" }} />
          <span style={{ fontSize: 12, color: "#6b7280" }}>ou</span>
          <div style={{ flex: 1, height: 1, background: "#1B3A5C" }} />
        </div>

        <div style={{ opacity: 0.4, textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Google e Facebook em breve</p>
        </div>
      </div>
    </div>
  );
}
