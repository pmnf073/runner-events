import { useState, useRef } from "react";
import api from "../services/api";

const V = (name) => `var(${name})`;

export default function ImportPage({ user }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  if (!user || user.role !== "admin") {
    return <div style={{ textAlign: "center", padding: 80, color: V("--text-secondary") }}>Acesso restrito a administradores.</div>;
  }

  const handleFile = (f) => {
    if (f && (f.name.endsWith(".ics") || f.type === "text/calendar" || f.type === "text/plain")) {
      setFile(f);
      setResult(null);
    } else {
      alert("Por favor seleciona um ficheiro .ics valido");
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("icsFile", file);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/import-ics`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      alert("Erro na importacao: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ maxWidth: 672, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, color: V("--text-heading") }}>📥 Importar Ficheiro .ics</h1>

      <div style={{ background: V("--bg-card"), borderRadius: 12, border: `1px solid ${V("--border-subtle")}`, padding: 24, marginBottom: 24 }}>
        <p style={{ color: V("--text-secondary"), marginBottom: 20, lineHeight: 1.6 }}>
          Para importar eventos, exporta o calendario do TeamUp como ficheiro <strong style={{ color: V("--text-primary") }}>.ics</strong> e faz upload aqui.
        </p>

        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          style={{
            border: `2px dashed ${dragOver ? "#CC3333" : V("--border-subtle")}`,
            borderRadius: 12, padding: 40, textAlign: "center", cursor: "pointer",
            background: dragOver ? `${V("--hover-bg")}` : "transparent",
            transition: "all 0.2s"
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>{file ? "📄" : "📁"}</div>
          {file ? (
            <>
              <p style={{ color: V("--text-primary"), margin: "0 0 4px", fontWeight: 500 }}>{file.name}</p>
              <p style={{ color: V("--text-secondary"), margin: 0, fontSize: 13 }}>{(file.size / 1024).toFixed(1)} KB</p>
              <button onClick={(e) => { e.stopPropagation(); setFile(null); }}
                style={{ marginTop: 12, background: "none", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "4px 16px", color: V("--text-secondary"), cursor: "pointer", fontSize: 13 }}>
                Remover
              </button>
            </>
          ) : (
            <>
              <p style={{ color: V("--text-primary"), margin: "0 0 4px", fontWeight: 500 }}>Clica ou arrasta o ficheiro .ics aqui</p>
              <p style={{ color: V("--text-muted"), margin: 0, fontSize: 13 }}>Formato aceite: .ics (iCalendar)</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".ics,.calendar,text/calendar"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>

        <button
          onClick={handleImport}
          disabled={importing || !file}
          style={{ marginTop: 20, background: "#CC3333", opacity: importing || !file ? 0.5 : 1, cursor: importing || !file ? "not-allowed" : "pointer", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 500, color: "#fff", border: "none", width: "100%" }}
        >
          {importing ? "A importar..." : "Importar Eventos"}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div style={{ background: V("--bg-card"), borderRadius: 12, border: `1px solid ${V("--border-subtle")}`, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: result.imported > 0 ? "#22c55e" : V("--text-secondary"), margin: "0 0 8px" }}>
            {result.imported > 0 ? "✅ Importacao concluida!" : "⚠️ Nenhum evento importado"}
          </h3>
          <p style={{ fontSize: 14, color: V("--text-secondary"), margin: 0 }}>
            {result.imported} de {result.total} eventos importados com sucesso.
          </p>
          {result.errors?.length > 0 && (
            <div style={{ marginTop: 12, padding: 12, background: "rgba(248,113,113,0.1)", borderRadius: 8 }}>
              <p style={{ fontSize: 13, color: "#f87171", margin: "0 0 4px", fontWeight: 500 }}>Erros:</p>
              {result.errors.map((err, i) => <p key={i} style={{ fontSize: 12, color: V("--text-secondary"), margin: "2px 0" }}>{err}</p>)}
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div style={{ background: V("--bg-card"), borderRadius: 12, border: `1px solid ${V("--border-subtle")}`, padding: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: V("--text-heading"), margin: "0 0 12px" }}>Como Exportar do TeamUp</h3>
        <ol style={{ color: V("--text-secondary"), fontSize: 14, lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
          <li>Acede ao teu calendario no <strong style={{ color: V("--text-primary") }}>teamup.com</strong></li>
          <li>Clica em <strong style={{ color: V("--text-primary") }}>Settings</strong> ⚙️ → <strong style={{ color: V("--text-primary") }}>Calendar Feeds</strong></li>
          <li>Podes copiar o link do feed ou exportar diretamente como <strong style={{ color: V("--text-primary") }}>.ics</strong></li>
          <li>Se copiaste o link, cola no browser e descarrega o ficheiro .ics</li>
          <li>Faz upload do ficheiro aqui</li>
        </ol>
      </div>
    </div>
  );
}
