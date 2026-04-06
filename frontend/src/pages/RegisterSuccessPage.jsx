import { useLocation, Link } from "react-router-dom";

export default function RegisterSuccessPage() {
  const location = useLocation();
  const email = location.state?.email || "o teu email";

  return (
    <div style={{ minHeight: "100vh", background: "#081420", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>⏳</div>
        <h1 style={{ fontSize: 24, color: "#CC3333", marginBottom: 12 }}>
          Registo Pendente
        </h1>
        <p style={{ fontSize: 15, color: "#e5e7eb", lineHeight: 1.6, marginBottom: 24 }}>
          A tua conta foi criada com sucesso <strong>{email}</strong>.
          <br /><br />
          O teu registo sera revisto por um administrador do grupo.
          Receberas uma notificacao quando a conta for ativada.
        </p>
        <Link
          to="/login"
          style={{
            display: "inline-block",
            padding: "12px 32px",
            background: "#CC3333",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          Voltar ao Login
        </Link>
      </div>
    </div>
  );
}
