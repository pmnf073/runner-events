import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "../ThemeContext";
import SocialLoginButtons from "../components/SocialLoginButtons";
import DateInput from "../components/DateInput";

const API_URL = import.meta.env.VITE_API_URL || "";
const V = (name) => `var(${name})`;

export default function RegisterPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "",
    altContact: "", address: "", dob: "", nif: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.password) return setError("Nome, email e password são obrigatórios");
    if (form.password.length < 8) return setError("A password deve ter pelo menos 8 caracteres");
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
      setError("Erro de ligação. Tenta outra vez.");
    } finally { setLoading(false); }
  };

  const inputStyle = {
    width: "100%", padding: "11px 12px",
    background: V("--bg-input"), border: `1px solid ${V("--border-input")}`,
    borderRadius: 8, color: V("--text-primary"), fontSize: 15, outline: "none", boxSizing: "border-box",
  };

  const labelStyle = { display: "block", fontSize: 13, fontWeight: 500, color: V("--text-secondary"), marginBottom: 6 };
  const startOAuth = (provider) => window.location.assign(`${API_URL}/auth/${provider}`);

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 24px" }}>
      <div style={{ background: V("--bg-header"), borderRadius: 16, border: `1px solid ${V("--border-subtle")}`, padding: "28px 22px", width: "100%", maxWidth: 480, boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src={theme === "light" ? "/logo-light.png" : "/logo.png"} alt="AUR" style={{ height: 56, width: "auto", margin: "0 auto 12px", display: "block" }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--c-brand-text)", margin: "0 0 4px" }}>Alverca Urban Runners</h1>
          <p style={{ fontSize: 14, color: V("--text-secondary"), margin: "6px 0 0" }}>Criar conta: junta-te ao grupo</p>
        </div>

        <SocialLoginButtons onSelect={startOAuth} />

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, background: V("--border-subtle") }} />
          <span style={{ fontSize: 13, color: V("--text-secondary") }}>ou com o teu email</span>
          <div style={{ flex: 1, height: 1, background: V("--border-subtle") }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label htmlFor="reg-name" style={labelStyle}>Nome completo *</label>
            <input id="reg-name" type="text" name="name" value={form.name} onChange={handleChange} required autoComplete="name" placeholder="O teu nome" style={inputStyle} />
          </div>
          <div>
            <label htmlFor="reg-email" style={labelStyle}>Email *</label>
            <input id="reg-email" type="email" name="email" value={form.email} onChange={handleChange} required autoComplete="email" placeholder="email@exemplo.com" style={inputStyle} />
          </div>
          <div>
            <label htmlFor="reg-password" style={labelStyle}>Password * (mínimo 8 caracteres)</label>
            <input id="reg-password" type="password" name="password" value={form.password} onChange={handleChange} required minLength={8} autoComplete="new-password" placeholder="A tua password" style={inputStyle} />
          </div>
          <div className="register-row">
            <div>
              <label htmlFor="reg-phone" style={labelStyle}>Telefone *</label>
              <input id="reg-phone" type="tel" name="phone" value={form.phone} onChange={handleChange} required autoComplete="tel" placeholder="912345678" style={inputStyle} />
            </div>
            <div>
              <label htmlFor="reg-alt" style={labelStyle}>Contacto alternativo</label>
              <input id="reg-alt" type="text" name="altContact" value={form.altContact} onChange={handleChange} placeholder="Opcional" style={inputStyle} />
            </div>
          </div>
          <div>
            <label htmlFor="reg-address" style={labelStyle}>Morada *</label>
            <input id="reg-address" type="text" name="address" value={form.address} onChange={handleChange} required autoComplete="street-address" placeholder="Rua, código postal, localidade" style={inputStyle} />
          </div>
          <div className="register-row">
            <div>
              <label htmlFor="reg-dob" style={labelStyle}>Data de nascimento</label>
              <DateInput id="reg-dob" birthDate value={form.dob} onChange={(dob) => setForm((f) => ({ ...f, dob }))} autoComplete="bday" style={inputStyle} />
            </div>
            <div>
              <label htmlFor="reg-nif" style={labelStyle}>NIF</label>
              <input id="reg-nif" type="text" name="nif" value={form.nif} onChange={handleChange} inputMode="numeric" maxLength={9} placeholder="Opcional" style={inputStyle} />
            </div>
          </div>
          <p style={{ fontSize: 12, color: V("--text-secondary"), margin: "-6px 0 0" }}>O NIF só é usado nos recibos das quotas.</p>

          {error && <p role="alert" style={{ color: "var(--c-danger)", fontSize: 14, textAlign: "center", margin: 0 }}>{error}</p>}

          <button type="submit" disabled={loading} style={{ padding: "13px 0", background: "#CC3333", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "A criar conta..." : "Criar conta"}
          </button>
        </form>

        <p style={{ fontSize: 14, color: V("--text-secondary"), textAlign: "center", marginTop: 20, marginBottom: 0 }}>
          Já tens conta?{" "}
          <Link to="/login" style={{ color: "var(--c-brand-text)", fontWeight: 600, textDecoration: "none" }}>Entrar</Link>
        </p>
      </div>
      <style>{`
        .register-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 420px) { .register-row { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
