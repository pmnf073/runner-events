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

const STATUS_LABELS = {
  active: "Ativo",
  suspended: "Suspenso",
  resigned: "Demitiu-se",
  excluded: "Excluído",
};

const STATUS_COLORS = {
  active: "#22c55e",
  suspended: "#f59e0b",
  resigned: "#6b7280",
  excluded: "#ef4444",
};

const POSITION_LABELS = {
  "direcao": "Direção",
  "fiscal": "Conselho Fiscal",
  "assembleia": "Mesa da Assembleia",
};

export default function MembersPage({ user }) {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersError, setUsersError] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Modal: convert user to member
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertUserId, setConvertUserId] = useState("");
  const [convertNotes, setConvertNotes] = useState("");
  const [convertError, setConvertError] = useState("");

  // Modal: edit member
  const [editMember, setEditMember] = useState(null);
  const [editStatus, setEditStatus] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState("");

  // Detail view
  const [detailId, setDetailId] = useState(null);
  const [detailData, setDetailData] = useState(null);

  useEffect(() => {
    if (!user || !["admin", "organizer"].includes(user.role)) {
      navigate("/");
      return;
    }
    loadMembers();
    loadStats();
    loadStaffUsers();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [members, search, statusFilter, showInactive]);

  function loadMembers() {
    setLoading(true);
    setError("");
    api("/api/members")
      .then(async (r) => {
        if (!r.ok) throw new Error("Falha ao carregar sócios");
        const data = await r.json();
        setMembers(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  function loadStats() {
    api("/api/members/stats")
      .then(async (r) => {
        if (r.ok) setStats(await r.json());
      })
      .catch(() => {});
  }

  function loadStaffUsers() {
    api("/api/admin/users")
      .then(async (r) => {
        if (r.ok) {
          setUsers(await r.json());
          setUsersError("");
        } else {
          setUsersError(`Erro ${r.status}: ${r.statusText}`);
        }
      })
      .catch((err) => {
        setUsersError(err.message);
      });
  }

  function applyFilters() {
    let result = members;
    if (!showInactive) {
      result = result.filter((m) => m.status === "active");
    }
    if (statusFilter) {
      result = result.filter((m) => m.status === statusFilter);
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.user.name.toLowerCase().includes(s) ||
          m.user.email.toLowerCase().includes(s) ||
          (m.user.phone && m.user.phone.includes(s)) ||
          (m.memberNumber && String(m.memberNumber).includes(s))
      );
    }
    setFiltered(result);
  }

  async function handleConvertUser() {
    setConvertError("");
    try {
      const r = await api("/api/members", {
        method: "POST",
        body: JSON.stringify({ userId: convertUserId, notes: convertNotes }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Erro ao ativar sócio");
      setShowConvertModal(false);
      setConvertUserId("");
      setConvertNotes("");
      loadMembers();
    } catch (err) {
      setConvertError(err.message);
    }
  }

  async function handleSaveEdit() {
    setEditError("");
    try {
      const body = { status: editStatus, notes: editNotes };
      if (editPosition) body.position = editPosition;
      const r = await api(`/api/members/${editMember.id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Erro ao atualizar");
      setEditMember(null);
      loadMembers();
    } catch (err) {
      setEditError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Tem a certeza que quer eliminar este sócio?")) return;
    try {
      const r = await api(`/api/members/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Erro ao eliminar");
      loadMembers();
      if (detailId === id) {
        setDetailId(null);
        setDetailData(null);
      }
    } catch (err) {
      alert(err.message);
    }
  }

  async function loadDetail(id) {
    try {
      const r = await api(`/api/members/${id}`);
      const data = await r.json();
      setDetailId(id);
      setDetailData(data);
    } catch {}
  }

  function formatCurrency(val) {
    return val != null ? Number(val).toFixed(2) + " €" : "0,00 €";
  }

  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("pt-PT");
  }

  /* ── Detail Modal ── */
  function renderDetailModal() {
    if (!detailData) return null;
    const m = detailData;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={() => { setDetailId(null); setDetailData(null); }}>
        <div className="max-w-2xl w-full"
          style={{ background: "var(--bg-modal)", borderRadius: 16, padding: 24, maxHeight: "85vh", overflow: "auto", margin: 16 }}
          onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-heading)" }}>
              Sócio #{m.memberNumber}
            </h2>
            <button onClick={() => { setDetailId(null); setDetailData(null); }}
              style={{ background: "var(--bg-card)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: "var(--text-secondary)" }}>
              ✕
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Nome</div>
              <div style={{ fontWeight: 600 }}>{m.user.name}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Email</div>
              <div>{m.user.email}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Telefone</div>
              <div>{m.user.phone || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>NIF</div>
              <div>{m.user.nif || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Estado</div>
              <span style={{ padding: "2px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 600,
                background: STATUS_COLORS[m.status] + "22", color: STATUS_COLORS[m.status] }}>
                {STATUS_LABELS[m.status]}
              </span>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Posição</div>
              <div>{POSITION_LABELS[m.position] || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Data de adesão</div>
              <div>{formatDate(m.joinedAt)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Saldo</div>
              <div style={{ fontWeight: 600, color: m.balance >= 0 ? "#22c55e" : "#ef4444" }}>
                {formatCurrency(m.balance)}
              </div>
            </div>
          </div>

          {/* Memberships */}
          {m.memberships && m.memberships.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--text-heading)" }}>Anuidades</h3>
              {m.memberships.map((ms) => (
                <div key={ms.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0",
                  borderBottom: "1px solid var(--border-subtle)", fontSize: 14 }}>
                  <span>{ms.year}</span>
                  <span>{formatCurrency(ms.amount)}</span>
                  <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 600,
                    background: ms.status === "paid" ? "#22c55e22" : ms.status === "pending" ? "#f59e0b22" : "#6b728022",
                    color: ms.status === "paid" ? "#22c55e" : ms.status === "pending" ? "#f59e0b" : "#6b7280" }}>
                    {ms.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Recent Payments */}
          {m.payments && m.payments.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--text-heading)" }}>Últimos Pagamentos</h3>
              {m.payments.slice(0, 5).map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0",
                  borderBottom: "1px solid var(--border-subtle)", fontSize: 14 }}>
                  <span>{formatDate(p.date)}</span>
                  <span>{p.method}</span>
                  <span style={{ fontWeight: 600, color: "#22c55e" }}>{formatCurrency(p.paidAmount)}</span>
                  {p.receiptNumber && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>🧾 {p.receiptNumber}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => { setEditMember(m); setEditStatus(m.status); setEditPosition(m.position || ""); setEditNotes(m.notes || ""); }}
              style={{ padding: "8px 16px", background: "#CC3333", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 500 }}>
              Editar
            </button>
            <button onClick={() => handleDelete(m.id)}
              style={{ padding: "8px 16px", background: "var(--bg-card)", color: "#ef4444", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 500 }}>
              Eliminar
            </button>
          </div>
        </div>
      </div>
    );
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
            ⚡ Gestão de Sócios
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "4px 0 0" }}>
            {stats && `${stats.activeMembers} ativos · ${stats.totalMembers} total`}
          </p>
        </div>
        <button onClick={loadMembers}
          style={{ padding: "8px 16px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 8, cursor: "pointer", color: "var(--text-primary)", fontWeight: 500 }}>
          ↻ Atualizar
        </button>
      </div>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
          <StatCard label="Total Sócios" value={stats.totalMembers} color="var(--text-heading)" />
          <StatCard label="Ativos" value={stats.activeMembers} color="#22c55e" />
          <StatCard label={`Quotas ${stats.currentYear}`} value={`${stats.paidThisYear} pagas`} color="#3b82f6" />
          <StatCard label={`Por pagar ${stats.currentYear}`} value={stats.pendingThisYear} color="#f59e0b" />
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <input type="text" placeholder="Pesquisar por nome, email, telefone..." value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: "8px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 14 }} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 14 }}>
          <option value="">Todos os estados</option>
          <option value="active">Ativo</option>
          <option value="suspended">Suspenso</option>
          <option value="resigned">Demitiu-se</option>
          <option value="excluded">Excluído</option>
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--text-secondary)", cursor: "pointer" }}>
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Incluir inativos
        </label>
        <button onClick={() => { setSearch(""); setStatusFilter(""); setShowInactive(false); }}
          style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14 }}>
          ✕ Limpar
        </button>
      </div>

      <button onClick={() => setShowConvertModal(true)}
        style={{ marginBottom: 16, padding: "8px 16px", background: "#CC3333", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 500, fontSize: 14 }}>
        + Ativar novo sócio
      </button>

      {error && <p style={{ color: "#ef4444", fontSize: 14, marginBottom: 16 }}>{error}</p>}

      {/* Members Table */}
      <div style={{ background: "var(--bg-card)", borderRadius: 16, border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <th style={{ ...thStyle, textAlign: "left" }}>Nº</th>
              <th style={{ ...thStyle, textAlign: "left" }}>Nome</th>
              <th style={{ ...thStyle, textAlign: "left" }}>Email</th>
              <th style={thStyle}>Anuidade<br/>{new Date().getFullYear()}</th>
              <th style={thStyle}>Saldo</th>
              <th style={thStyle}>Estado</th>
              <th style={thStyle}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const currentMembership = m.memberships?.find(
                (ms) => ms.year === new Date().getFullYear()
              );
              const memStatus = currentMembership
                ? currentMembership.status === "paid"
                  ? "✅"
                  : currentMembership.status === "partial"
                  ? "◐"
                  : "⏳"
                : "—";

              return (
                <tr key={m.id} style={{ borderBottom: "1px solid var(--border-subtle)", cursor: "pointer" }}
                  onClick={() => loadDetail(m.id)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>#{m.memberNumber}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{m.user.name}</td>
                  <td style={tdStyle}>{m.user.email}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{memStatus}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 600, color: m.balance >= 0 ? "#22c55e" : "#ef4444" }}>
                    {m.balance != null ? m.balance.toFixed(2) + " €" : "—"}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <span style={{ padding: "2px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 600,
                      background: STATUS_COLORS[m.status] + "22", color: STATUS_COLORS[m.status] }}>
                      {STATUS_LABELS[m.status]}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <span onClick={(e) => { e.stopPropagation(); loadDetail(m.id); }} style={{ color: "#CC3333", cursor: "pointer" }}>Ver</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            {search || statusFilter ? "Nenhum sócio encontrado para os filtros atuais." : "Nenhum sócio registado."}
          </div>
        )}
        {filtered.length !== members.length && (
          <div style={{ padding: "8px 16px", fontSize: 12, color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)" }}>
            Mostrando {filtered.length} de {members.length} sócios
          </div>
        )}
      </div>

      {/* Convert User Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowConvertModal(false)}>
          <div style={{ background: "var(--bg-modal)", borderRadius: 16, padding: 24, margin: 16, width: 400 }}
            onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: "var(--text-heading)" }}>Ativar novo sócio</h2>
            <label style={{ display: "block", marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Utilizador</span>
              <select value={convertUserId} onChange={(e) => setConvertUserId(e.target.value)} required
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 14 }}>
                <option value="">Selecionar utilizador...</option>
                {users.filter(u => !members.find(m => m.userId === u.id)).map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email}) — {u.role}</option>
                ))}
              </select>
              {users.filter(u => !members.find(m => m.userId === u.id)).length === 0 && (
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, marginBottom: 0 }}>
                  Todos os utilizadores já são sócios.
                </p>
              )}
            </label>
            <label style={{ display: "block", marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Notas (opcional)</span>
              <textarea value={convertNotes} onChange={(e) => setConvertNotes(e.target.value)} rows={2}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 14, resize: "vertical" }} />
            </label>
            {convertError && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{convertError}</p>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowConvertModal(false)}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-secondary)", cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handleConvertUser}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#CC3333", color: "#fff", cursor: "pointer", fontWeight: 500 }}>
                Ativar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setEditMember(null)}>
          <div style={{ background: "var(--bg-modal)", borderRadius: 16, padding: 24, margin: 16, width: 420 }}
            onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: "var(--text-heading)" }}>
              Editar Sócio #{editMember.memberNumber}
            </h2>
            <label style={{ display: "block", marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Estado</span>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 14 }}>
                <option value="active">Ativo</option>
                <option value="suspended">Suspenso</option>
                <option value="resigned">Demitiu-se</option>
                <option value="excluded">Excluído</option>
              </select>
            </label>
            <label style={{ display: "block", marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Posição nos Orgãos Sociais</span>
              <select value={editPosition} onChange={(e) => setEditPosition(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 14 }}>
                <option value="">— —</option>
                <option value="direcao">Direção</option>
                <option value="fiscal">Conselho Fiscal</option>
                <option value="assembleia">Mesa da Assembleia</option>
              </select>
            </label>
            <label style={{ display: "block", marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Notas</span>
              <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 14, resize: "vertical" }} />
            </label>
            {editError && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{editError}</p>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setEditMember(null)}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-secondary)", cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handleSaveEdit}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#CC3333", color: "#fff", cursor: "pointer", fontWeight: 500 }}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {renderDetailModal()}
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
