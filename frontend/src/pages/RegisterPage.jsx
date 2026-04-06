import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "";
const V = (name) => `var(${name})`;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "",
    altContact: "", address: "", dob: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.password) return setError("Nome, email e password sao obrigatorios");
    if (form.password.length < 8) return setError("Password deve ter pelo menos 8 caracteres");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Erro ao criar conta");
      navigate("/register-success", { state: { email: form.email } });
    } catch {
      setError("Erro de ligacao. Tenta outra vez.");
    } finally { setLoading(false); }
  };

  const inputStyle = {
    width: "100%", padding: "10px 12px",
    background: V("--bg-input"), border: `1px solid ${V("--border-input")}`,
    borderRadius: 8, color: V("--text-primary"), fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  const labelStyle = { fontSize: 13, color: V("--text-secondary") };

  return (
    <div style={{ minHeight: "100vh", background: V("--bg-page"), color: V("--text-primary"), display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 480, width: "100%" }}>
        <h1 style={{ fontSize: 28, color: "#CC3333", textAlign: "center", marginBottom: 4 }}>ALVERCA URBAN RUNNERS</h1>
        <p style={{ fontSize: 14, color: V("--text-secondary"), textAlign: "center", marginBottom: 24 }}>Criar conta — Junta-te ao grupo</p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Nome completo *</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required placeholder="O teu nome" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email *</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="email@exemplo.com" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Password * (min 8 caracteres)</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} required placeholder="A tua password" style={inputStyle} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Telefone *</label>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} required placeholder="912345678" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Contacto alternativo</label>
              <input type="text" name="altContact" value={form.altContact} onChange={handleChange} placeholder="Opcional" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>Morada *</label>
              <input type="text" name="address" value={form.address} onChange={handleChange} required placeholder="Rua, CP, Localidade" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Data de nascimento</label>
              <input type="date" name="dob" value={form.dob} onChange={handleChange} style={{ ...inputStyle, color: V("--text-primary") }} />
            </div>
          </div>

          {error && <p style={{ color: "#ef4444", fontSize: 14, textAlign: "center", margin: 0 }}>{error}</p>}

          <button type="submit" disabled={loading} style={{ padding: "12px 0", background: "#CC3333", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "A criar conta..." : "Criar Conta"}
          </button>
        </form>

        <div style={{ marginTop: 20 }}>
          <div style={{ borderTop: `1px solid ${V("--border-subtle")}`, margin: "16px 0", position: "relative" }}>
            <span style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: V("--bg-page"), padding: "0 16px", color: V("--text-muted"), fontSize: 13 }}>ou</span>
          </div>
          <button disabled style={{ ...inputStyle, cursor: "not-allowed", opacity: 0.4, fontSize: 13, color: V("--text-muted"), background: V("--bg-input"), textAlign: "center" }}>🔵 Continuar com Google (em breve)</button>
          <button disabled style={{ ...inputStyle, cursor: "not-allowed", opacity: 0.4, fontSize: 13, color: V("--text-muted"), background: V("--bg-input"), textAlign: "center", marginTop: 8 }}>🔐 Continuar com Facebook (em breve)</button>
        </div>

        <p style={{ fontSize: 13, color: V("--text-secondary"), textAlign: "center", marginTop: 20 }}>
          Ja tens conta?{" "}
          <Link to="/login" style={{ color: "#CC3333", textDecoration: "none" }}>Entrar</Link>
        </p>
      </div>
    </div>
  );
}
