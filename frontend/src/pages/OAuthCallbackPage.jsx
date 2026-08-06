import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("Não foi possível concluir o início de sessão.");
      return;
    }
    localStorage.setItem("token", token);
    window.location.replace("/");
  }, [searchParams]);

  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center" }}>
      {error ? (
        <div>
          <p style={{ color: "var(--text-secondary)" }}>{error}</p>
          <Link to="/login" style={{ color: "#CC3333" }}>Voltar ao login</Link>
        </div>
      ) : <p style={{ color: "var(--text-secondary)" }}>A iniciar sessão...</p>}
    </div>
  );
}
