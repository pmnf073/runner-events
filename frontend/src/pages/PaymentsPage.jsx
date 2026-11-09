import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { openApiFile } from "../services/api";
import { formatCurrency, formatDate, membershipStatusLabel } from "../utils/format";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import DateInput, { CalendarIcon } from "../components/DateInput";
import useBackToClose from "../hooks/useBackToClose";

// Payment date/time strings are "YYYY-MM-DDTHH:mm"; the picker works on a Date with the same wall-clock fields.
const strToDate = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s || "");
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5])) : null;
};
const dateToStr = (d) => (d ? format(d, "yyyy-MM-dd'T'HH:mm") : "");
const dateTimePickerProps = {
  locale: "pt", showTimeSelect: true, timeFormat: "HH:mm", timeIntervals: 5, timeCaption: "Hora",
  dateFormat: "dd/MM/yyyy HH:mm", placeholderText: "dd/mm/aaaa hh:mm",
  showIcon: true, icon: <CalendarIcon size={16} />, toggleCalendarOnIconClick: true,
};

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
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 16));
  const [formMethod, setFormMethod] = useState("transfer");
  const [formReference, setFormReference] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Edit payment modal
  const [editPayment, setEditPayment] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editMemberId, setEditMemberId] = useState("");
  const [editMembershipId, setEditMembershipId] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editMethod, setEditMethod] = useState("");
  const [editReference, setEditReference] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState("");

  // Stats
  const [stats, setStats] = useState({ total: 0, count: 0, avg: 0 });

  const [isMobile, setIsMobile] = useState(false);
  // "back" no telemóvel fecha a edição/janela aberta em vez de sair da página
  useBackToClose(showModal, () => setShowModal(false));
  useBackToClose(editPayment !== null, () => setEditPayment(null));
  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  // 16px on phones so iOS does not zoom into the field.
  const inputStyle = { ...baseInputStyle, fontSize: isMobile ? 16 : 14 };
  const filterStyle = { padding: "8px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: isMobile ? 16 : 14, boxSizing: "border-box", minWidth: 0 };
  const twoCols = isMobile ? "1fr" : "1fr 1fr";

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

  useEffect(() => {
    if (editPayment) {
      setEditAmount(editPayment.paidAmount != null ? String(editPayment.paidAmount) : "");
      setEditMemberId(editPayment.memberId);
      setEditMembershipId(editPayment.membershipId || "");
      setEditDate(editPayment.date || "");
      setEditMethod(editPayment.method || "");
      setEditReference(editPayment.reference || "");
      setEditNotes(editPayment.notes || "");
    } else {
      setEditAmount("");
      setEditDate("");
      setEditMethod("");
      setEditReference("");
      setEditNotes("");
    }
  }, [editPayment]);

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
          paidAmount: parseFloat(formAmount),
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
          paidAmount: parseFloat(editAmount),
          memberId: editMemberId,
          membershipId: editMembershipId || null,
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
      loadMembers();
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

  // Picking a member selects the oldest fee still open and fills in what is missing,
  // so the payment settles the fee instead of only crediting the account.
  function selectMember(memberId) {
    setFormMemberId(memberId);
    const open = loadMemberMemberships(memberId)
      .filter((ms) => ms.outstanding > 0)
      .sort((a, b) => a.year - b.year);
    selectMembership(memberId, open[0]?.id || "");
  }

  function selectMembership(memberId, membershipId) {
    setFormMembershipId(membershipId);
    const ms = loadMemberMemberships(memberId).find((m) => m.id === membershipId);
    setFormAmount(ms?.outstanding > 0 ? String(ms.outstanding) : "");
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "center" : "flex-start", flexWrap: "wrap", gap: isMobile ? 12 : 16, marginBottom: isMobile ? 12 : 24 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: "var(--text-heading)", margin: 0, lineHeight: 1.2 }}>
            💳 Pagamentos
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "4px 0 0" }}>
            {stats.count} registos · Total {formatCurrency(stats.total)}
          </p>
        </div>
        <button onClick={openNewPaymentModal}
          style={{ padding: isMobile ? "10px 14px" : "10px 20px", background: "#CC3333", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
          {isMobile ? "+ Registar" : "+ Registar Pagamento"}
        </button>
      </div>

      {/* Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, minmax(0, 1fr))" : "repeat(auto-fit, minmax(140px, 1fr))", gap: isMobile ? 8 : 12, marginBottom: isMobile ? 12 : 24 }}>
        <StatCard compact={isMobile} label={isMobile ? "Total" : "Total Recebido"} value={formatCurrency(stats.total)} color="var(--text-heading)" />
        <StatCard compact={isMobile} label={isMobile ? "Pagamentos" : "Nº Pagamentos"} value={stats.count} color="var(--c-info)" />
        <StatCard compact={isMobile} label={isMobile ? "Média" : "Média por Pagamento"} value={formatCurrency(stats.avg)} color="var(--c-success)" />
      </div>

      {/* Filters: no telemóvel, pesquisa numa linha, método + limpar noutra e as datas lado a lado. */}
      <div style={isMobile
        ? { display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 12 }
        : { display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <input type="text" placeholder="Pesquisar (nome, email, recibo, ref.)" value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ ...filterStyle, ...(isMobile ? { gridColumn: "1 / -1", width: "100%" } : { flex: 1, minWidth: 200 }) }} />
        <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} style={filterStyle}>
          <option value="">Todos os métodos</option>
          <option value="transfer">Transferência</option>
          <option value="cash">Numerário</option>
          <option value="mbway">MB Way</option>
          <option value="card">Cartão</option>
        </select>
        <div style={isMobile
          ? { gridColumn: "1 / -1", gridRow: 3, display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)", alignItems: "center", gap: 6 }
          : { display: "flex", alignItems: "center", gap: 6 }}>
          <DateInput value={dateFrom} onChange={setDateFrom} aria-label="Desde"
            style={{ ...filterStyle, width: isMobile ? "100%" : 150, padding: "8px" }} />
          <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>até</span>
          <DateInput value={dateTo} onChange={setDateTo} aria-label="Até"
            style={{ ...filterStyle, width: isMobile ? "100%" : 150, padding: "8px" }} />
        </div>
        <button onClick={() => { setSearch(""); setMethodFilter(""); setDateFrom(""); setDateTo(""); }}
          style={{ ...filterStyle, color: "var(--text-secondary)", cursor: "pointer", ...(isMobile ? { gridColumn: 2, gridRow: 2 } : null) }}>
          ✕ Limpar
        </button>
      </div>

      {error && <p style={{ color: "var(--c-danger)", fontSize: 14, marginBottom: 16 }}>{error}</p>}

      {/* Payments Table */}
      <div style={{ background: "var(--bg-card)", borderRadius: isMobile ? 12 : 16, border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
        {isMobile ? (
          <div>
            {filtered.map((p) => (
              <div key={p.id} style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontWeight: 600, color: "var(--text-heading)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.member.user.name}</span>
                  <span style={{ fontWeight: 700, color: "var(--c-success)", whiteSpace: "nowrap" }}>{formatCurrency(p.paidAmount)}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
                  {formatDate(p.date)} · <span style={{ fontFamily: "monospace" }}>{p.receiptNumber}</span> · {METHOD_ICONS[p.method]} {METHOD_LABELS[p.method] || p.method}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-primary)", marginTop: 2 }}>
                  {p.membership
                    ? `Quota ${p.membership.year} — ${formatCurrency(p.membership.amount)} (${membershipStatusLabel(p.membership.status)})`
                    : p.notes ? (p.notes.length > 80 ? p.notes.slice(0, 80) + "…" : p.notes) : "Outro pagamento"}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={() => openApiFile(`/api/payments/${p.id}/receipt`).catch((err) => alert(err.message))} style={mobileActionStyle}>Recibo</button>
                  <button onClick={() => setEditPayment(p)} style={{ ...mobileActionStyle, color: "var(--c-brand-text)" }}>Editar</button>
                  <button onClick={() => handleDelete(p.id)} aria-label="Eliminar pagamento" title="Eliminar" style={{ ...mobileActionStyle, marginLeft: "auto" }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <th style={thStyle}>Data</th>
              <th style={thStyle}>Recibo</th>
              <th style={thStyle}>Detalhe</th>
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
                <td style={tdStyle} title={p.membership ? `${p.membership.year} — ${formatCurrency(p.membership.amount)} (${membershipStatusLabel(p.membership.status)})` : (p.notes || "") }>
                  {p.membership ? (
                    `${p.membership.year} — ${formatCurrency(p.membership.amount)} (${membershipStatusLabel(p.membership.status)})`
                  ) : p.notes ? (
                    p.notes.length > 60 ? p.notes.slice(0, 60) + "…" : p.notes
                  ) : (
                    "—"
                  )}
                </td>
                <td style={tdStyle}>{p.member.user.name}</td>
                <td style={{ ...tdStyle, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{METHOD_ICONS[p.method]}</span>
                  {METHOD_LABELS[p.method] || p.method}
                </td>
                <td style={{ ...tdStyle, fontWeight: 600, color: "var(--c-success)" }}>{formatCurrency(p.paidAmount)}</td>
                <td style={tdStyle}>
                  {p.membership ? (
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 9999, background: "#3b82f622", color: "var(--c-info)" }}>
                      {p.membership.year}
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                  )}
                </td>
                <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                  <button onClick={() => openApiFile(`/api/payments/${p.id}/receipt`).catch((err) => alert(err.message))} title="Recibo em PDF" style={{ color: "var(--text-primary)", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                    Recibo
                  </button>
                  <span style={{ color: "var(--border-subtle)", margin: "0 8px" }}>|</span>
                  <button onClick={() => setEditPayment(p)} style={{ color: "#CC3333", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                    Editar
                  </button>
                  <span style={{ color: "var(--border-subtle)", margin: "0 8px" }}>|</span>
                  <button onClick={() => handleDelete(p.id)} style={{ color: "var(--c-danger)", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
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
          <div style={{ background: "var(--bg-modal)", borderRadius: 16, padding: isMobile ? 16 : 24, margin: isMobile ? 12 : 16, width: 460, maxWidth: "100%", maxHeight: "85vh", overflow: "auto", boxSizing: "border-box" }}
            onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: "var(--text-heading)" }}>Registar Pagamento</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: twoCols, gap: 12, marginBottom: 12 }}>
                <label>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Sócio</span>
                  <select value={formMemberId} onChange={(e) => selectMember(e.target.value)}
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
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Quota</span>
                    <select value={formMembershipId} onChange={(e) => selectMembership(formMemberId, e.target.value)}
                      style={inputStyle}>
                      {loadMemberMemberships(formMemberId).map((ms) => (
                        <option key={ms.id} value={ms.id}>
                          {ms.year} — {membershipStatusLabel(ms.status)}{ms.outstanding > 0 ? ` (falta ${formatCurrency(ms.outstanding)})` : ""}
                        </option>
                      ))}
                      <option value="">Outro pagamento (não é quota)</option>
                    </select>
                  </label>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: twoCols, gap: 12, marginBottom: 12 }}>
                <label>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Valor (€)</span>
                  <input type="number" step="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} required
                    style={inputStyle} />
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: twoCols, gap: 12, marginBottom: 12 }}>
                <label>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Data/Hora</span>
                  <DatePicker {...dateTimePickerProps} selected={strToDate(formDate)} onChange={(d) => setFormDate(dateToStr(d))} required
                    customInput={<input style={{ ...inputStyle, paddingLeft: 36 }} />} />
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
              {formError && <p style={{ color: "var(--c-danger)", fontSize: 13, marginBottom: 12 }}>{formError}</p>}
              {formSuccess && <p style={{ color: "var(--c-success)", fontSize: 13, marginBottom: 12 }}>{formSuccess}</p>}
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
          <div style={{ background: "var(--bg-modal)", borderRadius: 16, padding: isMobile ? 16 : 24, margin: isMobile ? 12 : 16, width: 420, maxWidth: "100%", maxHeight: "90vh", overflow: "auto", boxSizing: "border-box" }}
            onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: "var(--text-heading)" }}>Editar Pagamento {editPayment.receiptNumber}</h2>
            <div style={{ display: "grid", gridTemplateColumns: twoCols, gap: 12, marginBottom: 12 }}>
              <label>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Sócio</span>
                <select value={editMemberId} style={inputStyle}
                  onChange={(e) => {
                    // The fee list is the new member's: pre-select their oldest open fee.
                    setEditMemberId(e.target.value);
                    const open = loadMemberMemberships(e.target.value).filter((ms) => ms.outstanding > 0).sort((a, b) => a.year - b.year);
                    setEditMembershipId(open[0]?.id || "");
                  }}>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>#{m.memberNumber} {m.user.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Quota</span>
                <select value={editMembershipId} onChange={(e) => setEditMembershipId(e.target.value)} style={inputStyle}>
                  {loadMemberMemberships(editMemberId).map((ms) => (
                    <option key={ms.id} value={ms.id}>
                      {ms.year} — {membershipStatusLabel(ms.status)}{ms.outstanding > 0 ? ` (falta ${formatCurrency(ms.outstanding)})` : ""}
                    </option>
                  ))}
                  <option value="">Outro pagamento (não é quota)</option>
                </select>
              </label>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Valor (€)</label>
              <input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)}
                style={inputStyle} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Data/Hora</label>
              <DatePicker {...dateTimePickerProps} selected={strToDate(editDate)} onChange={(d) => setEditDate(dateToStr(d))}
                customInput={<input style={{ ...inputStyle, paddingLeft: 36 }} />} />
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
            {editError && <p style={{ color: "var(--c-danger)", fontSize: 13, marginBottom: 12 }}>{editError}</p>}
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

function StatCard({ label, value, color, compact = false }) {
  return (
    <div style={{ background: "var(--bg-card)", borderRadius: 12, padding: compact ? "10px 12px" : 16, border: "1px solid var(--border-subtle)", minWidth: 0 }}>
      <div style={{ fontSize: compact ? 11 : 12, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: compact ? 17 : 24, fontWeight: 700, color, whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

const thStyle = { padding: "10px 16px", fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 };
const tdStyle = { padding: "10px 16px" };
const mobileActionStyle = { padding: "6px 12px", minHeight: 34, borderRadius: 8, border: "1px solid var(--border-subtle)", background: "transparent", color: "var(--text-primary)", cursor: "pointer", fontSize: 13, fontWeight: 500 };
const baseInputStyle = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  border: "1px solid var(--border-subtle)", background: "var(--bg-card)",
  color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box",
};
