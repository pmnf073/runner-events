import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const V = (name) => `var(${name})`;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Erro ao enviar o pedido.");
      setMessage(data.message);
    } catch {
      setError("Erro de ligação. Tenta outra vez.");
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = { background: V("--bg-header"), borderRadius: 16, border: `1px solid ${V("--border-subtle")}`, padding: 40, width: "100%", maxWidth: 420 };
  const inputStyle = { width: "100%", background: V("--bg-input"), border: `1px solid ${V("--border-input")}`, borderRadius: 8, padding: "12px 14px", fontSize: 14, color: V("--text-primary"), outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: V("--text-heading"), margin: "0 0 4px" }}>Recuperar password</h1>
        <p style={{ fontSize: 14, color: V("--text-muted"), margin: "0 0 24px" }}>Indica o email da tua conta e enviamos um link para definires uma nova password.</p>

        {message ? (
          <div style={{ fontSize: 14, color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "12px 14px", borderRadius: 8, border: "1px solid rgba(16,185,129,0.2)" }}>{message}</div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="email@exemplo.pt" style={inputStyle} />
            {error && <div style={{ fontSize: 13, color: "#f87171" }}>{error}</div>}
            <button type="submit" disabled={loading}
              style={{ width: "100%", background: "#CC3333", color: "#fff", padding: 12, borderRadius: 8, fontSize: 15, fontWeight: 500, border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1 }}>
              {loading ? "A enviar..." : "Enviar link"}
            </button>
          </form>
        )}

        <p style={{ fontSize: 14, color: V("--text-muted"), marginTop: 24, textAlign: "center" }}>
          <Link to="/login" style={{ color: "#CC3333", textDecoration: "none" }}>Voltar ao login</Link>
        </p>
      </div>
    </div>
  );
}
