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

const METHOD_LABELS = {
  transfer: "Transferência",
  cash: "Numerário",
  mbway: "MB Way",
  card: "Cartão",
};

const METHOD_ICONS = {
  transfer: "🏦",
  cash: "💵",
  mbway: "📱",
  card: "💳",
};

export default function PaymentsPage({ user }) {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [members, setMembers] = useState([]);

  // Filters
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modal: new payment
  const [showModal, setShowModal] = useState(false);
  const [formMemberId, setFormMemberId] = useState("");
  const [formMembershipId, setFormMembershipId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formPaidAmount, setFormPaidAmount] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 16));
  const [formMethod, setFormMethod] = useState("transfer");
  const [formReference, setFormReference] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Edit payment modal
  const [editPayment, setEditPayment] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editPaidAmount, setEditPaidAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editMethod, setEditMethod] = useState("");
  const [editReference, setEditReference] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState("");

  // Stats
  const [stats, setStats] = useState({ total: 0, count: 0, avg: 0 });

  useEffect(() => {
    if (!user || !["admin", "organizer"].includes(user.role)) {
      navigate("/");
      return;
    }
    loadPayments();
    loadMembers();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [payments, search, methodFilter, dateFrom, dateTo]);

  function loadPayments() {
    setLoading(true);
    setError("");
    api("/api/payments")
      .then(async (r) => {
        if (!r.ok) throw new Error("Falha ao carregar pagamentos");
        const data = await r.json();
        setPayments(data.payments);
        computeStats(data.payments);
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

  function computeStats(list) {
    const total = list.reduce((sum, p) => sum + Number(p.paidAmount || p.amount), 0);
    setStats({
      total,
      count: list.length,
      avg: list.length ? total / list.length : 0,
    });
  }

  function applyFilters() {
    let result = payments;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.member.user.name.toLowerCase().includes(s) ||
          p.member.user.email.toLowerCase().includes(s) ||
          (p.receiptNumber && p.receiptNumber.toLowerCase().includes(s)) ||
          (p.reference && p.reference.includes(s))
      );
    }
    if (methodFilter) {
      result = result.filter((p) => p.method === methodFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((p) => new Date(p.date) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((p) => new Date(p.date) <= to);
    }
    setFiltered(result);
  }

  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    applyFilters();
  }, [payments, search, methodFilter, dateFrom, dateTo]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    try {
      const r = await api("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          memberId: formMemberId,
          membershipId: formMembershipId || null,
          amount: parseFloat(formAmount),
          paidAmount: formPaidAmount ? parseFloat(formPaidAmount) : parseFloat(formAmount),
          date: formDate,
          method: formMethod,
          reference: formReference || null,
          notes: formNotes || null,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Erro ao registar");
      setShowModal(false);
      resetForm();
      setFormSuccess("Pagamento registado com sucesso!");
      setTimeout(() => setFormSuccess(""), 3000);
      loadPayments();
      loadMembers();
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function handleSaveEdit() {
    setEditError("");
    try {
      const r = await api(`/api/payments/${editPayment.id}`, {
        method: "PUT",
        body: JSON.stringify({
          amount: parseFloat(editAmount),
          paidAmount: parseFloat(editPaidAmount),
          date: editDate,
          method: editMethod,
          reference: editReference || null,
          notes: editNotes || null,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Erro ao atualizar");
      setEditPayment(null);
      loadPayments();
    } catch (err) {
      setEditError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Eliminar este pagamento?")) return;
    try {
      const r = await api(`/api/payments/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Erro ao eliminar");
      loadPayments();
    } catch (err) {
      alert(err.message);
    }
  }

  function resetForm() {
    setFormMemberId("");
    setFormMembershipId("");
    setFormAmount("");
    setFormPaidAmount("");
    setFormDate(new Date().toISOString().slice(0, 16));
    setFormMethod("transfer");
    setFormReference("");
    setFormNotes("");
    setFormError("");
  }

  function openNewPaymentModal() {
    resetForm();
    setShowModal(true);
  }

  function loadMemberMemberships(memberId) {
    const member = members.find((m) => m.id === memberId);
    return member?.memberships || [];
  }

  function formatCurrency(val) {
    return val != null ? Number(val).toFixed(2) + " €" : "0,00 €";
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("pt-PT");
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
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-heading)", margin: 0, lineHeight: 1.2 }}>
            💳 Pagamentos
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "4px 0 0" }}>
            {stats.count} registos · Total {formatCurrency(stats.total)}
          </p>
        </div>
        <button onClick={openNewPaymentModal}
          style={{ padding: "10px 20px", background: "#CC3333", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
          + Registar Pagamento
        </button>
      </div>

      {/* Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Recebido" value={formatCurrency(stats.total)} color="var(--text-heading)" />
        <StatCard label="Nº Pagamentos" value={stats.count} color="#3b82f6" />
        <StatCard label="Média por Pagamento" value={formatCurrency(stats.avg)} color="#22c55e" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <input type="text" placeholder="Pesquisar (nome, email, recibo, ref.)" value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: "8px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 14 }} />
        <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}
          style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 14 }}>
          <option value="">Todos métodos</option>
          <option value="transfer">Transferência</option>
          <option value="cash">Numerário</option>
          <option value="mbway">MB Way</option>
          <option value="card">Cartão</option>
        </select>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            style={{ padding: "8px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 14 }} />
          <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>até</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            style={{ padding: "8px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 14 }} />
        </div>
        <button onClick={() => { setSearch(""); setMethodFilter(""); setDateFrom(""); setDateTo(""); }}
          style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14 }}>
          ✕ Limpar
        </button>
      </div>

      {error && <p style={{ color: "#ef4444", fontSize: 14, marginBottom: 16 }}>{error}</p>}

      {/* Payments Table */}
      <div style={{ background: "var(--bg-card)", borderRadius: 16, border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <th style={thStyle}>Data</th>
              <th style={thStyle}>Recibo</th>
              <th style={thStyle}>Sócio</th>
              <th style={thStyle}>Método</th>
              <th style={thStyle}>Valor</th>
              <th style={thStyle}>Quota</th>
              <th style={thStyle}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <td style={tdStyle}>{formatDate(p.date)}</td>
                <td style={{ ...tdStyle, fontWeight: 600, fontFamily: "monospace" }}>{p.receiptNumber}</td>
                <td style={tdStyle}>{p.member.user.name}</td>
                <td style={{ ...tdStyle, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{METHOD_ICONS[p.method]}</span>
                  {METHOD_LABELS[p.method] || p.method}
                </td>
                <td style={{ ...tdStyle, fontWeight: 600, color: "#22c55e" }}>{formatCurrency(p.paidAmount)}</td>
                <td style={tdStyle}>
                  {p.membership ? (
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 9999, background: "#3b82f622", color: "#3b82f6" }}>
                      {p.membership.year}
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                  )}
                </td>
                <td style={tdStyle}>
                  <button onClick={() => setEditPayment(p)} style={{ color: "#CC3333", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                    Editar
                  </button>
                  <span style={{ color: "var(--border-subtle)", margin: "0 8px" }}>|</span>
                  <button onClick={() => handleDelete(p.id)} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            Nenhum pagamento encontrado para os filtros atuais.
          </div>
        )}
        {filtered.length !== payments.length && (
          <div style={{ padding: "8px 16px", fontSize: 12, color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)" }}>
            Mostrando {filtered.length} de {payments.length} pagamentos
          </div>
        )}
      </div>

      {/* New Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowModal(false)}>
          <div style={{ background: "var(--bg-modal)", borderRadius: 16, padding: 24, margin: 16, width: 460, maxHeight: "85vh", overflow: "auto" }}
            onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: "var(--text-heading)" }}>Registar Pagamento</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <label>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Sócio</span>
                  <select value={formMemberId} onChange={(e) => { setFormMemberId(e.target.value); setFormMembershipId(""); }}
                    required style={inputStyle}>
                    <option value="">Selecionar sócio...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        #{m.memberNumber} {m.user.name} ({m.user.email})
                      </option>
                    ))}
                  </select>
                </label>
                {formMemberId && (
                  <label>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Quota (opcional)</span>
                    <select value={formMembershipId} onChange={(e) => setFormMembershipId(e.target.value)}
                      style={inputStyle}>
                      <option value="">Pagamento geral (sem quota)</option>
                      {loadMemberMemberships(formMemberId).map((ms) => (
                        <option key={ms.id} value={ms.id}>
                          {ms.year} — {formatCurrency(ms.amount)} ({ms.status})
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <label>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Valor Total</span>
                  <input type="number" step="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} required
                    style={inputStyle} />
                </label>
                <label>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Valor Pago (opcional)</span>
                  <input type="number" step="0.01" value={formPaidAmount} onChange={(e) => setFormPaidAmount(e.target.value)}
                    placeholder={formAmount} style={inputStyle} />
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <label>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Data/Hora</span>
                  <input type="datetime-local" value={formDate} onChange={(e) => setFormDate(e.target.value)} required
                    style={inputStyle} />
                </label>
                <label>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Método</span>
                  <select value={formMethod} onChange={(e) => setFormMethod(e.target.value)} required style={inputStyle}>
                    <option value="transfer">Transferência</option>
                    <option value="cash">Numerário</option>
                    <option value="mbway">MB Way</option>
                    <option value="card">Cartão</option>
                  </select>
                </label>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Referência (opcional)</span>
                  <input type="text" value={formReference} onChange={(e) => setFormReference(e.target.value)}
                    placeholder="Ex: IBAN, comprovativo..." style={inputStyle} />
                </label>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Notas</span>
                  <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2}
                    style={{ ...inputStyle, resize: "vertical" }} />
                </label>
              </div>
              {formError && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{formError}</p>}
              {formSuccess && <p style={{ color: "#22c55e", fontSize: 13, marginBottom: 12 }}>{formSuccess}</p>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-secondary)", cursor: "pointer" }}>
                  Cancelar
                </button>
                <button type="submit"
                  style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#CC3333", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {editPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setEditPayment(null)}>
          <div style={{ background: "var(--bg-modal)", borderRadius: 16, padding: 24, margin: 16, width: 420 }}
            onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: "var(--text-heading)" }}>Editar Pagamento {editPayment.receiptNumber}</h2>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Valor Total</label>
              <input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)}
                style={inputStyle} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Valor Pago</label>
              <input type="number" step="0.01" value={editPaidAmount} onChange={(e) => setEditPaidAmount(e.target.value)}
                style={inputStyle} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Data/Hora</label>
              <input type="datetime-local" value={editDate.slice(0, 16)} onChange={(e) => setEditDate(e.target.value)}
                style={inputStyle} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Método</label>
              <select value={editMethod} onChange={(e) => setEditMethod(e.target.value)} style={inputStyle}>
                <option value="transfer">Transferência</option>
                <option value="cash">Numerário</option>
                <option value="mbway">MB Way</option>
                <option value="card">Cartão</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Referência</label>
              <input type="text" value={editReference} onChange={(e) => setEditReference(e.target.value)}
                style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Notas</label>
              <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2}
                style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            {editError && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{editError}</p>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setEditPayment(null)}
                style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-secondary)", cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handleSaveEdit}
                style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#CC3333", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: "var(--bg-card)", borderRadius: 12, padding: 16, border: "1px solid var(--border-subtle)" }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

const thStyle = { padding: "10px 16px", fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 };
const tdStyle = { padding: "10px 16px" };
const inputStyle = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  border: "1px solid var(--border-subtle)", background: "var(--bg-card)",
  color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box",
};
