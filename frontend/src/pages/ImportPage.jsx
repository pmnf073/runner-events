import { useState } from "react";
import api from "../services/api";

const V = (name) => `var(${name})`;

export default function ImportPage({ user }) {
  const [feedUrl, setFeedUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  if (!user || user.role !== "admin") {
    return <div style={{ textAlign: "center", padding: 80, color: V("--text-secondary") }}>Acesso restrito a administradores.</div>;
  }

  const handleImport = async () => {
    if (!feedUrl) return alert("Insere o URL do feed iCal");
    setImporting(true);
    setResult(null);
    try {
      const res = await api("/api/import-teamup", {
        method: "POST",
        body: JSON.stringify({ feedUrl }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      alert("Erro na importação: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ maxWidth: 672, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, color: V("--text-heading") }}>📥 Importar do TeamUp</h1>

      <div style={{ background: V("--bg-card"), borderRadius: 12, border: `1px solid ${V("--border-subtle")}`, padding: 24 }}>
        <p style={{ color: V("--text-secondary"), marginBottom: 16 }}>
          Para importar eventos do TeamUp, precisas do link do feed iCal.
          Podes obter este link nas definições do calendário TeamUp.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 14, color: V("--text-secondary"), marginBottom: 4 }}>URL do Feed iCal</label>
            <input
              type="url"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              placeholder="https://teamup.com/api/ical/..."
              style={{ width: "100%", background: V("--bg-input"), border: `1px solid ${V("--border-input")}`, borderRadius: 8, padding: "8px 12px", fontSize: 14, color: V("--text-primary"), outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <button
            onClick={handleImport}
            disabled={importing || !feedUrl}
            style={{ background: "#CC3333", opacity: importing || !feedUrl ? 0.5 : 1, cursor: importing || !feedUrl ? "not-allowed" : "pointer", padding: "8px 24px", borderRadius: 8, fontSize: 14, fontWeight: 500, color: "#fff", border: "none" }}
          >
            {importing ? "A importar..." : "Importar Eventos"}
          </button>
        </div>

        {result && (
          <div style={{ marginTop: 24, padding: 16, background: V("--bg-input"), borderRadius: 8 }}>
            <p style={{ color: "#22c55e", margin: 0 }}>✅ Importação concluída!</p>
            <p style={{ color: V("--text-secondary"), marginTop: 8 }}>Eventos importados: {result.imported} de {result.total}</p>
          </div>
        )}
      </div>
    </div>
  );
}
