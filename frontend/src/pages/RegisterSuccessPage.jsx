import { Link } from "react-router-dom";

const V = (name) => `var(${name})`;

export default function RegisterSuccessPage() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: 20 }}>
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>🎉</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: V("--text-heading"), marginBottom: 16 }}>Conta Criada!</h1>
        <p style={{ fontSize: 15, color: V("--text-secondary"), lineHeight: 1.6, marginBottom: 32 }}>
          O teu pedido de registo foi recebido e sera revisto por um administrador.
          Receberas uma notificacao quando a tua conta for ativada.
        </p>
        <Link to="/login"
          style={{ display: "inline-block", background: "#CC3333", color: "#fff", padding: "12px 32px", borderRadius: 8, textDecoration: "none", fontSize: 15, fontWeight: 500 }}>
          Ir para Login
        </Link>
      </div>
    </div>
  );
}
