import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const V = (name) => `var(${name})`;

export default function ChangePasswordPage({ user }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (form.newPassword.length < 8) return setError("Password deve ter pelo menos 8 caracteres");
    if (form.newPassword !== form.confirmPassword) return setError("As passwords novas nao coincidem");
    setLoading(true);
    try {
      const res = await api("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Erro ao alterar a password");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSuccess(true);
    } catch {
      setError("Erro de ligacao. Tenta outra vez.");
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = { background: V("--bg-header"), borderRadius: 16, border: `1px solid ${V("--border-subtle")}`, padding: 40, width: "100%", maxWidth: 420, transition: "background 0.3s ease" };
  const inputStyle = { width: "100%", background: V("--bg-input"), border: `1px solid ${V("--border-input")}`, borderRadius: 8, padding: "12px 14px", fontSize: 14, color: V("--text-primary"), outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontSize: 13, color: V("--text-muted"), marginBottom: 6 };

  if (!user) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: V("--text-secondary"), margin: 0 }}>
            Inicia sessao para alterar a password.{" "}
            <Link to="/login" style={{ color: "#CC3333", textDecoration: "none" }}>Entrar</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: V("--text-heading"), margin: "0 0 4px" }}>Alterar password</h1>
        <p style={{ fontSize: 14, color: V("--text-muted"), margin: "0 0 24px" }}>{user.email}</p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={labelStyle}>Password atual</label>
            <input type="password" name="currentPassword" value={form.currentPassword} onChange={handleChange} required autoComplete="current-password" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Nova password</label>
            <input type="password" name="newPassword" value={form.newPassword} onChange={handleChange} required minLength={8} autoComplete="new-password" placeholder="Minimo 8 caracteres" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Confirmar nova password</label>
            <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required minLength={8} autoComplete="new-password" style={inputStyle} />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: "#f87171", background: "rgba(248,113,113,0.1)", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(248,113,113,0.2)" }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ fontSize: 13, color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(16,185,129,0.2)" }}>
              Password alterada com sucesso.
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", background: "#CC3333", color: "#fff", padding: "12px", borderRadius: 8, fontSize: 15, fontWeight: 500, border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1 }}>
            {loading ? "A guardar..." : "Alterar password"}
          </button>
        </form>
      </div>
    </div>
  );
}
