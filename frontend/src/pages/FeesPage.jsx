import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "";

function getToken() {
  return localStorage.getItem("token");
}

function api(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(API_URL + path, { ...options, headers, credentials: "include" });
}

export default function FeesPage({ user }) {
  const navigate = useNavigate();
  const [configurations, setConfigurations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit/Create form
  const [editYear, setEditYear] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editEarlyDiscount, setEditEarlyDiscount] = useState("");
  const [editEarlyDeadline, setEditEarlyDeadline] = useState("");
  const [editError, setEditError] = useState("");

  // Generate memberships
  const [generateYear, setGenerateYear] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState(null);

  // Members list for display
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!user || !["admin", "organizer"].includes(user.role)) {
      navigate("/");
      return;
    }
    loadConfigurations();
    loadMembers();
  }, [user]);

  function loadConfigurations() {
    setLoading(true);
    setError("");
    api("/api/members/fees")
      .then(async (r) => {
        if (!r.ok) throw new Error("Falha ao carregar configurações");
        const data = await r.json();
        setConfigurations(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  function loadMembers() {
    api("/api/members")
      .then(async (r) => {
        if (r.ok) setMembers(await r.json());
      })
      .catch(() => {});
  }

  async function handleSaveConfig() {
    setEditError("");
    if (!editYear || !editAmount || !editDueDate) {
      setEditError("Ano, valor e data limite são obrigatórios.");
      return;
    }
    try {
      const r = await api("/api/members/fees", {
        method: "POST",
        body: JSON.stringify({
          year: parseInt(editYear),
          amount: editAmount,
          dueDate: new Date(editDueDate),
          earlybirdDiscount: editEarlyDiscount ? parseFloat(editEarlyDiscount) : null,
          earlybirdDeadline: editEarlyDeadline ? new Date(editEarlyDeadline) : null,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Erro ao guardar");
      setEditYear("");
      setEditAmount("");
      setEditDueDate("");
      setEditEarlyDiscount("");
      setEditEarlyDeadline("");
      setEditError("");
      setSuccess(`Anuidade de ${data.year} guardada com sucesso!`);
      setTimeout(() => setSuccess(""), 3000);
      loadConfigurations();
    } catch (err) {
      setEditError(err.message);
    }
  }

  async function handleGenerateMemberships() {
    if (!generateYear) return;
    setGenerating(true);
    setGenerateResult(null);
    try {
      const r = await api(`/api/members/fees/${generateYear}/generate-memberships`, {
        method: "POST",
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Erro ao gerar quotas");
      setGenerateResult(data);
      loadMembers(); // refresh membership status
    } catch (err) {
      setGenerateResult({ error: err.message });
    } finally {
      setGenerating(false);
    }
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("pt-PT");
  }

  function fillConfigForEdit(cfg) {
    setEditYear(cfg.year);
    setEditAmount(String(parseFloat(cfg.amount)));
    setEditDueDate(cfg.dueDate.split("T")[0]);
    setEditEarlyDiscount(cfg.earlybirdDiscount ? String(parseFloat(cfg.earlybirdDiscount)) : "");
    setEditEarlyDeadline(cfg.earlybirdDeadline ? cfg.earlybirdDeadline.split("T")[0] : "");
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2" style={{ borderColor: "#CC3333" }}></div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-heading)", marginBottom: 24 }}>
        💶 Gestão de Anuidades
      </h1>

      {success && (
        <div style={{ padding: "10px 16px", borderRadius: 10, background: "#22c55e18", border: "1px solid #22c55e44",
          color: "#22c55e", fontSize: 14, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{success}</span>
          <button onClick={() => setSuccess("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#22c55e" }}>✕</button>
        </div>
      )}

      {/* Config Form */}
      <div style={{ background: "var(--bg-card)", borderRadius: 16, border: "1px solid var(--border-subtle)", padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "var(--text-heading)" }}>
          Configurar Anuidade
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
          <label>
            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Ano</span>
            <input type="number" value={editYear} onChange={(e) => setEditYear(e.target.value)}
              placeholder="2026" style={inputStyle} />
          </label>
          <label>
            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Valor (€)</span>
            <input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)}
              placeholder="30.00" style={inputStyle} />
          </label>
          <label>
            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Data Limite</span>
            <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)}
              style={inputStyle} />
          </label>
          <label>
            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Desconto Early-bird (€)</span>
            <input type="number" step="0.01" value={editEarlyDiscount} onChange={(e) => setEditEarlyDiscount(e.target.value)}
              placeholder="5.00" style={inputStyle} />
          </label>
          <label>
            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Prazo Early-bird</span>
            <input type="date" value={editEarlyDeadline} onChange={(e) => setEditEarlyDeadline(e.target.value)}
              style={inputStyle} />
          </label>
        </div>
        {editError && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>{editError}</p>}
        <button onClick={handleSaveConfig}
          style={{ padding: "10px 20px", background: "#CC3333", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
          Guardar Configuração
        </button>
      </div>

      {/* Generate Memberships */}
      <div style={{ background: "var(--bg-card)", borderRadius: 16, border: "1px solid var(--border-subtle)", padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "var(--text-heading)" }}>
          Gerar Quotas do Ano
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
          Cria entradas de anuidade pendentes para todos os sócios ativos. Já existentes são ignoradas.
        </p>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <label>
            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Ano</span>
            <input type="number" value={generateYear} onChange={(e) => setGenerateYear(e.target.value)}
              placeholder={new Date().getFullYear().toString()} style={inputStyle} />
          </label>
          <button onClick={handleGenerateMemberships} disabled={generating}
            style={{ padding: "10px 20px", background: generating ? "#999" : "#3b82f6", color: "#fff", border: "none", borderRadius: 10, cursor: generating ? "wait" : "pointer", fontWeight: 600, fontSize: 14 }}>
            {generating ? "A gerar..." : "Gerar Quotas"}
          </button>
        </div>
        {generateResult && (
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, fontSize: 14,
            background: generateResult.error ? "#ef444418" : "#22c55e18",
            border: `1px solid ${generateResult.error ? "#ef444444" : "#22c55e44"}`,
            color: generateResult.error ? "#ef4444" : "#22c55e" }}>
            {generateResult.error ||
              `✅ ${generateResult.created} quotas criadas · ${generateResult.skipped} ignoradas (já existem) · ${generateResult.total} sócios ativos`}
          </div>
        )}
      </div>

      {/* Configuration History */}
      <div style={{ background: "var(--bg-card)", borderRadius: 16, border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, padding: "16px 20px 12px", color: "var(--text-heading)", margin: 0 }}>
          Configurações Guardadas
        </h2>
        {configurations.map((cfg) => (
          <div key={cfg.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 20px", borderBottom: "1px solid var(--border-subtle)", cursor: "pointer" }}
            onClick={() => fillConfigForEdit(cfg)}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <div>
              <span style={{ fontWeight: 700, marginRight: 12 }}>{cfg.year}</span>
              <span style={{ color: "var(--text-secondary)" }}>{parseFloat(cfg.amount).toFixed(2)} €</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {cfg.earlybirdDiscount && (
                <span style={{ fontSize: 11, color: "#22c55e" }}>Early-bird: {parseFloat(cfg.earlybirdDiscount).toFixed(2)} €</span>
              )}
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Até {formatDate(cfg.dueDate)}</span>
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Editar →</span>
            </div>
          </div>
        ))}
        {configurations.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            Nenhuma configuração guardada.
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  border: "1px solid var(--border-subtle)", background: "var(--bg-card)",
  color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box",
};
