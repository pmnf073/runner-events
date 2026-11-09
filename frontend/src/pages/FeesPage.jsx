import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { formatDate } from "../utils/format";
import DateInput from "../components/DateInput";

export default function FeesPage({ user }) {
  const navigate = useNavigate();
  const [configurations, setConfigurations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit/Create form
  const [editYear, setEditYear] = useState("");
  const [editAmount, setEditAmount] = useState("15.00");
  const [editDueDate, setEditDueDate] = useState("");
  const [editEarlyDiscount, setEditEarlyDiscount] = useState("");
  const [editEarlyDeadline, setEditEarlyDeadline] = useState("");
  const [editError, setEditError] = useState("");
  const [editingYear, setEditingYear] = useState(null);
  const configFormRef = useRef(null);

  // Generate memberships
  const [generateYear, setGenerateYear] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState(null);

  // Members list for display
  const [members, setMembers] = useState([]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

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
        if (data && data.length > 0) {
          setGenerateYear(String(data[0].year));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  function loadMembers() {
    api("/api/members")
      .then(async (r) => {
        if (r.ok) setMembers(await r.json());
      })
      .catch(() => { });
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
      setEditingYear(null);
      setSuccess(
        data.membershipsUpdated
          ? `Anuidade de ${data.year} guardada. ${data.membershipsUpdated} quotas desse ano atualizadas.`
          : `Anuidade de ${data.year} guardada com sucesso!`
      );
      setTimeout(() => setSuccess(""), 5000);
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

  function cancelEdit() {
    setEditYear("");
    setEditAmount("15.00");
    setEditDueDate("");
    setEditEarlyDiscount("");
    setEditEarlyDeadline("");
    setEditError("");
    setEditingYear(null);
  }

  function fillConfigForEdit(cfg) {
    setEditYear(String(cfg.year));
    setEditAmount(String(parseFloat(cfg.amount)));
    setEditDueDate(cfg.dueDate.split("T")[0]);
    setEditEarlyDiscount(cfg.earlybirdDiscount ? String(parseFloat(cfg.earlybirdDiscount)) : "");
    setEditEarlyDeadline(cfg.earlybirdDeadline ? cfg.earlybirdDeadline.split("T")[0] : "");
    setEditingYear(cfg.year);
    requestAnimationFrame(() => configFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  // 16px on phones so iOS does not zoom into the field.
  const inputStyle = { ...baseInputStyle, fontSize: isMobile ? 16 : 14 };
  const cardStyle = { background: "var(--bg-card)", borderRadius: isMobile ? 12 : 16, border: "1px solid var(--border-subtle)", padding: isMobile ? 16 : 24, marginBottom: isMobile ? 12 : 24 };
  const h2Style = { fontSize: isMobile ? 16 : 18, fontWeight: 600, marginBottom: isMobile ? 12 : 16, color: "var(--text-heading)" };
  const labelText = { fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 };
  const fullOnMobile = isMobile ? { width: "100%" } : null;

  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = 2022; y <= currentYear + 1; y++) yearOptions.push(y);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2" style={{ borderColor: "#CC3333" }}></div>
      </div>
    );
  }

  return (
    // No telemóvel as configurações guardadas aparecem primeiro (é o que mais se consulta).
    <div style={{ display: "flex", flexDirection: "column" }}>
      <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: "var(--text-heading)", marginBottom: isMobile ? 12 : 24 }}>
        💶 Gestão de Anuidades
      </h1>

      {success && (
        <div style={{
          padding: "10px 16px", borderRadius: 10, background: "#22c55e18", border: "1px solid #22c55e44",
          color: "var(--c-success)", fontSize: 14, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <span>{success}</span>
          <button onClick={() => setSuccess("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-success)" }}>✕</button>
        </div>
      )}

      {/* Config Form */}
      <div ref={configFormRef} style={{ ...cardStyle, order: isMobile ? 2 : 0, scrollMarginTop: 80 }}>
        <h2 style={h2Style}>
          {editingYear ? `Editar Anuidade ${editingYear}` : "Configurar Anuidade"}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
          <label>
            <span style={labelText}>Ano</span>
            <select value={editYear} onChange={(e) => setEditYear(e.target.value)} style={inputStyle}>
              <option value="">{isMobile ? "Escolher" : "-- Selecione ano --"}</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
          <label>
            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Valor (€)</span>
            <input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)}
              placeholder="30.00" style={inputStyle} />
          </label>
          <label style={isMobile ? { gridColumn: "1 / -1" } : undefined}>
            <span style={labelText}>Data Limite</span>
            <DateInput value={editDueDate} onChange={setEditDueDate}
              style={inputStyle} />
          </label>
          <label>
            <span style={labelText}>{isMobile ? "Desconto early-bird (€)" : "Desconto Early-bird (€)"}</span>
            <input type="number" step="0.01" value={editEarlyDiscount} onChange={(e) => setEditEarlyDiscount(e.target.value)}
              placeholder="5.00" style={inputStyle} />
          </label>
          <label>
            <span style={labelText}>{isMobile ? "Prazo early-bird" : "Prazo Early-bird"}</span>
            <DateInput value={editEarlyDeadline} onChange={setEditEarlyDeadline}
              style={inputStyle} />
          </label>
        </div>
        {editError && <p style={{ color: "var(--c-danger)", fontSize: 13, marginBottom: 8 }}>{editError}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          {editingYear && (
            <button type="button" onClick={cancelEdit}
              style={{ padding: "10px 20px", background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)", borderRadius: 10, cursor: "pointer", fontSize: 14 }}>
              Cancelar
            </button>
          )}
          <button onClick={handleSaveConfig}
            style={{ padding: "10px 20px", background: "#CC3333", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14, ...(isMobile ? { flex: 1 } : null) }}>
            {editingYear ? "Guardar Alterações" : "Guardar Configuração"}
          </button>
        </div>
      </div>

      {/* Generate Memberships */}
      <div style={{ ...cardStyle, order: isMobile ? 3 : 0 }}>
        <h2 style={h2Style}>
          Gerar Quotas do Ano
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
          Cria entradas de anuidade pendentes para todos os sócios ativos. Já existentes são ignoradas.
        </p>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <label style={fullOnMobile}>
            <span style={labelText}>Ano</span>
            {configurations && configurations.length > 0 ? (
              <select value={generateYear} onChange={(e) => setGenerateYear(e.target.value)} style={inputStyle}>
                <option value="">-- Selecione uma configuração --</option>
                {configurations.map((cfg) => (
                  <option key={cfg.id} value={cfg.year}>{cfg.year} — {parseFloat(cfg.amount).toFixed(2)} €</option>
                ))}
              </select>
            ) : (
              <input type="number" value={generateYear} onChange={(e) => setGenerateYear(e.target.value)}
                placeholder={new Date().getFullYear().toString()} style={inputStyle} />
            )}
          </label>
          <button onClick={handleGenerateMemberships} disabled={generating}
            style={{ padding: "10px 20px", background: generating ? "#999" : "#3b82f6", color: "#fff", border: "none", borderRadius: 10, cursor: generating ? "wait" : "pointer", fontWeight: 600, fontSize: 14, ...fullOnMobile }}>
            {generating ? "A gerar..." : "Gerar Quotas"}
          </button>
        </div>
        {generateResult && (
          <div style={{
            marginTop: 12, padding: "10px 14px", borderRadius: 10, fontSize: 14,
            background: generateResult.error ? "#ef444418" : "#22c55e18",
            border: `1px solid ${generateResult.error ? "#ef444444" : "#22c55e44"}`,
            color: generateResult.error ? "var(--c-danger)" : "var(--c-success)"
          }}>
            {generateResult.error ||
              `✅ ${generateResult.created} quotas criadas · ${generateResult.skipped} ignoradas (já existem) · ${generateResult.total} sócios ativos`}
          </div>
        )}
      </div>

      {/* Configuration History */}
      <div style={{ background: "var(--bg-card)", borderRadius: isMobile ? 12 : 16, border: "1px solid var(--border-subtle)", overflow: "hidden", order: isMobile ? 1 : 0, marginBottom: isMobile ? 12 : 0 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, padding: isMobile ? "14px 16px 10px" : "16px 20px 12px", color: "var(--text-heading)", margin: 0 }}>
          Configurações Guardadas
        </h2>
        {configurations.map((cfg) => (
          isMobile ? (
            // Telemóvel: ano e valor à esquerda, prazo e early-bird por baixo, botão Editar com área de toque.
            <div key={cfg.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--border-subtle)",
              background: editingYear === cfg.year ? "var(--hover-bg)" : "transparent" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div>
                  <span style={{ fontWeight: 700, marginRight: 10 }}>{cfg.year}</span>
                  <span style={{ color: "var(--text-secondary)" }}>{parseFloat(cfg.amount).toFixed(2)} €</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Até {formatDate(cfg.dueDate)}
                  {cfg.earlybirdDiscount && (
                    <span style={{ color: "var(--c-success)" }}> · Early-bird −{parseFloat(cfg.earlybirdDiscount).toFixed(2)} €{cfg.earlybirdDeadline ? ` até ${formatDate(cfg.earlybirdDeadline)}` : ""}</span>
                  )}
                </div>
              </div>
              <button type="button" onClick={() => fillConfigForEdit(cfg)}
                style={{ padding: "6px 14px", minHeight: 34, borderRadius: 8, border: "1px solid var(--border-subtle)", background: "transparent", color: "var(--c-brand-text)", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                Editar
              </button>
            </div>
          ) : (
          <div key={cfg.id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 20px", borderBottom: "1px solid var(--border-subtle)"
          }}>
            <div>
              <span style={{ fontWeight: 700, marginRight: 12 }}>{cfg.year}</span>
              <span style={{ color: "var(--text-secondary)" }}>{parseFloat(cfg.amount).toFixed(2)} €</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {cfg.earlybirdDiscount && (
                <span style={{ fontSize: 11, color: "var(--c-success)" }}>Early-bird: {parseFloat(cfg.earlybirdDiscount).toFixed(2)} €</span>
              )}
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Até {formatDate(cfg.dueDate)}</span>
              <button type="button" onClick={() => fillConfigForEdit(cfg)}
                style={{ color: "#CC3333", background: "none", border: "none", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                Editar
              </button>
            </div>
          </div>
          )
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

const baseInputStyle = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  border: "1px solid var(--border-subtle)", background: "var(--bg-card)",
  color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box",
};
