import { useState, useRef } from "react";

const V = (name) => `var(${name})`;

export default function ImportPage({ user }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  if (!user || user.role !== "admin") {
    return <div style={{ textAlign: "center", padding: 80, color: V("--text-secondary") }}>Acesso restrito a administradores.</div>;
  }

  const pickFile = (f) => {
    if (f && (f.name.endsWith(".ics") || f.name.endsWith(".ical"))) {
      setFile(f);
      setResult(null);
    } else {
      alert("Seleciona um ficheiro .ics valido");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) pickFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    if (!file) return alert("Seleciona um ficheiro .ics");
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("icsFiles", file);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/import/import-ics`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
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
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, color: V("--text-heading") }}>📥 Importar Ficheiro .ics</h1>

      {/* Drop zone */}
      <div
        style={{
          border: `2px dashed ${dragOver ? V("--accent") : V("--border")}`,
          borderRadius: 12,
          padding: 32,
          textAlign: "center",
          background: dragOver ? `${V("--accent")}15` : V("--card-bg"),
          cursor: "pointer",
          marginBottom: 16,
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <p style={{ fontSize: 18, margin: 0, color: V("--text-heading") }}>Arrasta um ficheiro .ics aqui</p>
        <p style={{ color: V("--text-secondary"), margin: "8px 0 0" }}>ou clica para selecionar</p>
        <input ref={inputRef} type="file" accept=".ics,.ical" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])} />
      </div>

      {/* Selected file */}
      {file && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: V("--card-bg"), borderRadius: 8, marginBottom: 16, border: `1px solid ${V("--border")}` }}>
          <span style={{ fontWeight: 600, color: V("--text-heading") }}>📄 {file.name}</span>
          <button onClick={() => { setFile(null); setResult(null); }} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 18, color: V("--text-secondary") }}>✕</button>
        </div>
      )}

      {/* Import button */}
      <button onClick={handleImport} disabled={importing || !file} style={{
        background: importing || !file ? V("--text-muted") : "linear-gradient(135deg, #667eea, #764ba2)",
        color: "#fff", padding: "12px 28px", fontSize: 16, fontWeight: 600, borderRadius: 8, border: "none", cursor: importing || !file ? "not-allowed" : "pointer", width: "100%",
      }}>
        {importing ? "A importar..." : "Importar Eventos"}
      </button>

      {/* How to */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: V("--text-heading") }}>Como obter o ficheiro .ics do TeamUp</h2>
        <ol style={{ color: V("--text-secondary"), lineHeight: 1.7, paddingLeft: 20 }}>
          <li>Acede ao teu calendário em <strong>teamup.com</strong></li>
          <li>Vai a: <strong>Settings</strong> (⚙️) → <strong>Calendar Feeds</strong></li>
          <li>Seleciona o feed e faz download do ficheiro <code>.ics</code></li>
          <li>Arrasta o ficheiro para a zona acima e clica em <strong>Importar Eventos</strong></li>
        </ol>
        <p style={{ color: V("--text-secondary"), fontSize: 13 }}>💡 Podes repetir com vários ficheiros — duplicados são controlados automaticamente.</p>
      </div>

      {/* Result */}
      {result && (
        <div style={{ marginTop: 24, padding: 16, background: V("--card-bg"), borderRadius: 8, border: `1px solid ${V("--border")}` }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: V("--text-heading") }}>Resultado</h2>
          {result.message && <p style={{ color: V("--text-secondary"), fontStyle: "italic", marginBottom: 8 }}>{result.message}</p>}
          {result.imported != null && <p style={{ margin: "4px 0", color: V("--text-primary") }}><strong>Importados:</strong> {result.imported} / {result.total} eventos</p>}
          {result.skipped != null && <p style={{ margin: "4px 0", color: V("--text-secondary") }}><strong>Ignorados (duplicados):</strong> {result.skipped}</p>}
          {result.errors && result.errors.length > 0 && (
            <details>
              <summary style={{ cursor: "pointer", color: "#ff6b6b" }}>⚠️ {result.errors.length} erro(s)</summary>
              <ul>{result.errors.slice(0, 10).map((e, i) => <li key={i} style={{ fontSize: 13 }}>{e}</li>)}</ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
