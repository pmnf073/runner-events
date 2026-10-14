import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const V = (name) => `var(${name})`;
const PAGE_SIZE = 50;

const ACTIONS = {
  "payment.create": "Registou pagamento",
  "payment.update": "Alterou pagamento",
  "payment.delete": "Apagou pagamento",
  "member.create": "Criou sócio",
  "member.update": "Alterou sócio",
  "member.delete": "Apagou sócio",
  "fee.configure": "Configurou anuidade",
  "membership.generate": "Gerou quotas",
  "registration.approve": "Aprovou inscrição",
  "registration.reject": "Rejeitou inscrição",
  "user.update": "Alterou utilizador",
  "user.delete": "Apagou utilizador",
  "announcement.send": "Enviou comunicação",
};

const ENTITIES = {
  Payment: "Pagamentos",
  Member: "Sócios",
  User: "Utilizadores",
  AnnualFeeConfig: "Anuidades",
  Membership: "Quotas",
  Announcement: "Comunicações",
};

const FIELDS = {
  receiptNumber: "Recibo", memberNumber: "Sócio n.º", user: "Nome", email: "Email", amount: "Valor",
  paidAmount: "Valor pago", date: "Data", method: "Método", reference: "Referência", notes: "Notas",
  membershipId: "Quota", memberId: "Sócio", year: "Ano", status: "Estado", role: "Papel", reason: "Motivo",
  subject: "Assunto", audience: "Destinatários", recipients: "Destinatários (n.º)", sent: "Enviados",
  failed: "Falhados", skipped: "Ignorados", created: "Criadas", phone: "Telefone", nif: "NIF", name: "Nome",
};
const fieldLabel = (key) => FIELDS[key] || key;

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" });
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

// Audit details as short "field: value" lines; "changes" shows before → after.
function Details({ details }) {
  if (!details) return null;
  const { changes, ...rest } = details;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {Object.entries(rest).map(([key, value]) => (
        <span key={key}><span style={{ color: V("--text-muted") }}>{fieldLabel(key)}:</span> {formatValue(value)}</span>
      ))}
      {changes && Object.entries(changes).map(([key, { before, after }]) => (
        <span key={`c-${key}`}><span style={{ color: V("--text-muted") }}>{fieldLabel(key)}:</span> {formatValue(before)} → {formatValue(after)}</span>
      ))}
    </div>
  );
}

export default function AuditPage({ user }) {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [entity, setEntity] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/");
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ limit: PAGE_SIZE, offset });
    if (entity) params.set("entity", entity);
    api(`/api/dashboard/audit?${params}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Erro ao carregar o registo.");
        setEntries(body.entries);
        setTotal(body.total);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, navigate, offset, entity]);

  const th = { textAlign: "left", padding: "8px 10px", fontSize: 12, color: V("--text-muted"), borderBottom: `1px solid ${V("--border-subtle")}`, fontWeight: 600 };
  const td = { padding: "10px", fontSize: 13, color: V("--text-primary"), borderBottom: `1px solid ${V("--border-subtle")}`, verticalAlign: "top" };
  const button = { background: V("--bg-input"), color: V("--text-primary"), border: `1px solid ${V("--border-input")}`, borderRadius: 8, padding: "8px 14px", fontSize: 14, cursor: "pointer" };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: V("--text-heading"), marginBottom: 4 }}>Auditoria</h1>
      <p style={{ fontSize: 14, color: V("--text-muted"), marginBottom: 20 }}>Quem alterou sócios, pagamentos, quotas e utilizadores, e quando.</p>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <select value={entity} onChange={(e) => { setEntity(e.target.value); setOffset(0); }}
          style={{ ...button, cursor: "pointer" }}>
          <option value="">Tudo</option>
          {Object.entries(ENTITIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <span style={{ fontSize: 13, color: V("--text-muted") }}>{total} registos</span>
      </div>

      {error && <div style={{ color: "#f87171", marginBottom: 16 }}>{error}</div>}

      <div style={{ background: V("--bg-card"), border: `1px solid ${V("--border-subtle")}`, borderRadius: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr><th style={th}>Data</th><th style={th}>Quem</th><th style={th}>Ação</th><th style={th}>Detalhes</th></tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td style={{ ...td, whiteSpace: "nowrap" }}>{new Date(e.createdAt).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}</td>
                <td style={td}>{e.actorName || "—"}</td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>{ACTIONS[e.action] || e.action}</td>
                <td style={td}><Details details={e.details} /></td>
              </tr>
            ))}
            {!loading && entries.length === 0 && (
              <tr><td colSpan={4} style={{ ...td, textAlign: "center", color: V("--text-muted"), padding: 32 }}>Sem registos.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {total > PAGE_SIZE && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 16 }}>
          <button style={{ ...button, opacity: offset === 0 ? 0.5 : 1 }} disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Anteriores</button>
          <span style={{ fontSize: 13, color: V("--text-muted") }}>{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} de {total}</span>
          <button style={{ ...button, opacity: offset + PAGE_SIZE >= total ? 0.5 : 1 }} disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>Seguintes</button>
        </div>
      )}
    </div>
  );
}
