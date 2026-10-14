import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";

const V = (name) => `var(${name})`;

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) return setError("A password deve ter pelo menos 8 caracteres.");
    if (form.password !== form.confirm) return setError("As passwords não coincidem.");
    setLoading(true);
    try {
      const res = await api("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password: form.password }) });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Erro ao definir a password.");
      setDone(data.status);
    } catch {
      setError("Erro de ligação. Tenta outra vez.");
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = { background: V("--bg-header"), borderRadius: 16, border: `1px solid ${V("--border-subtle")}`, padding: 40, width: "100%", maxWidth: 420 };
  const inputStyle = { width: "100%", background: V("--bg-input"), border: `1px solid ${V("--border-input")}`, borderRadius: 8, padding: "12px 14px", fontSize: 14, color: V("--text-primary"), outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontSize: 13, color: V("--text-muted"), marginBottom: 6 };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: V("--text-heading"), margin: "0 0 24px" }}>Definir nova password</h1>

        {!token ? (
          <p style={{ fontSize: 14, color: V("--text-secondary") }}>Link inválido. <Link to="/forgot-password" style={{ color: "#CC3333" }}>Pede um novo</Link>.</p>
        ) : done ? (
          <div style={{ fontSize: 14, color: "#10b981" }}>
            Password definida.{" "}
            {done === "pending"
              ? "A tua conta ainda aguarda aprovação de um administrador."
              : <Link to="/login" style={{ color: "#CC3333", textDecoration: "none" }}>Entrar</Link>}
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={labelStyle}>Nova password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} autoComplete="new-password" placeholder="Mínimo 8 caracteres" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Confirmar password</label>
              <input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required minLength={8} autoComplete="new-password" style={inputStyle} />
            </div>
            {error && <div style={{ fontSize: 13, color: "#f87171" }}>{error}{error.includes("expirou") && <> <Link to="/forgot-password" style={{ color: "#CC3333" }}>Pedir novo link</Link></>}</div>}
            <button type="submit" disabled={loading}
              style={{ width: "100%", background: "#CC3333", color: "#fff", padding: 12, borderRadius: 8, fontSize: 15, fontWeight: 500, border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1 }}>
              {loading ? "A guardar..." : "Guardar password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
