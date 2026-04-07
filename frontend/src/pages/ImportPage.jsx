import { useState, useRef } from "react";

const V = (name) => `var(${name})`;

export default function ImportPage({ user }) {
  const [files, setFiles] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  if (!user || user.role !== "admin") {
    return <div style={{ textAlign: "center", padding: 80, color: V("--text-secondary") }}>Acesso restrito a administradores.</div>;
  }

  const addFiles = (fileList) => {
    const newFiles = Array.from(fileList).filter(f => f.name.endsWith(".ics") || f.name.endsWith(".ical"));
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name + f.size));
      return [...prev, ...newFiles.filter(f => !existingNames.has(f.name + f.size))];
    });
    setResult(null);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const handleImport = async () => {
    if (files.length === 0) return alert("Seleciona pelo menos um ficheiro .ics");
    setImporting(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append("icsFiles", f));
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/import/import-ics`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });
      const data = await res.json();
      setResult(data);
      if (data.imported > 0) setFiles([]);
    } catch (err) {
      alert("Erro na importação: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ maxWidth: 672, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, color: V("--text-heading") }}>📥 Importar Ficheiros .ics</h1>

      <div
        style={{
          border: `2px dashed ${dragOver ? V("--accent") : V("--border")}`,
          borderRadius: 12,
          padding: 32,
          textAlign: "center",
          background: dragOver ? `${V("--accent")}15` : V("--card-bg"),
          cursor: "pointer",
          marginBottom: 20,
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <p style={{ fontSize: 18, margin: 0, color: V("--text-heading") }}>Arrasta ficheiros .ics aqui</p>
        <p style={{ color: V("--text-secondary"), margin: "8px 0 0" }}>ou clica para selecionar</p>
        <input ref={inputRef} type="file" multiple accept=".ics,.ical" style={{ display: "none" }} onChange={(e) => e.target.files && addFiles(e.target.files)} />
      </div>

      {files.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: V("--card-bg"), borderRadius: 8, marginBottom: 6, border: `1px solid ${V("--border")}` }}>
              <span style={{ fontWeight: 600, color: V("--text-heading") }}>{f.name}</span>
              <button onClick={() => removeFile(i)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 18, color: V("--text-secondary") }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <button onClick={handleImport} disabled={importing || files.length === 0} style={{
        background: importing || files.length === 0 ? V("--text-muted") : "linear-gradient(135deg, #667eea, #764ba2)",
        color: "#fff", padding: "12px 28px", fontSize: 16, fontWeight: 600, borderRadius: 8, border: "none", cursor: importing || files.length === 0 ? "not-allowed" : "pointer", width: "100%",
      }}>
        {importing ? "A importar..." : `Importar ${files.length} ficheiro(s)`}
      </button>

      {result && (
        <div style={{ marginTop: 24, padding: 16, background: V("--card-bg"), borderRadius: 8, border: `1px solid ${V("--border")}` }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: V("--text-heading") }}>Resultado</h2>
          <p style={{ margin: "4px 0", color: V("--text-primary") }}><strong>Importados:</strong> {result.imported} / {result.total} eventos</p>
          {result.skipped != null && <p style={{ margin: "4px 0", color: V("--text-secondary") }}><strong>Ignorados (duplicados):</strong> {result.skipped}</p>}
          {result.errors && result.errors.length > 0 && <details><summary style={{ cursor: "pointer", color: "#ff6b6b" }}>⚠️ {result.errors.length} erro(s)</summary><ul>{result.errors.slice(0, 10).map((e, i) => <li key={i} style={{ fontSize: 13 }}>{e}</li>)}</ul></details>}
        </div>
      )}
    </div>
  );
}
