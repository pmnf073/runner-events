import { useState } from "react";
import api from "../services/api";

export default function ImportPage({ user }) {
  const [feedUrl, setFeedUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  if (!user || user.role !== "admin") {
    return <div className="text-center py-20 text-gray-400">Acesso restrito a administradores.</div>;
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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📥 Importar do TeamUp</h1>
      
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <p className="text-gray-400 mb-4">
          Para importar eventos do TeamUp, precisas do link do feed iCal.
          Podes obter este link nas definições do calendário TeamUp.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">URL do Feed iCal</label>
            <input
              type="url"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              placeholder="https://teamup.com/api/ical/..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          
          <button
            onClick={handleImport}
            disabled={importing || !feedUrl}
            className="bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 rounded-lg text-sm font-medium transition"
          >
            {importing ? "A importar..." : "Importar Eventos"}
          </button>
        </div>
        
        {result && (
          <div className="mt-6 p-4 bg-gray-800 rounded-lg">
            <p className="text-green-400">
              ✅ Importação concluída!
            </p>
            <p className="text-gray-400 mt-2">
              Eventos importados: {result.imported} de {result.total}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
