import { useEffect, useState, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "";

const STATUS_COLORS = {
  pending: { bg: "rgba(234,179,8,0.15)", text: "#eab308" },
  active: { bg: "rgba(34,197,94,0.15)", text: "#22c55e" },
  inactive: { bg: "rgba(156,163,175,0.15)", text: "#9ca3af" },
  banned: { bg: "rgba(239,68,68,0.15)", text: "#ef4444" },
};

const ROLE_COLORS = {
  admin: { bg: "rgba(239,68,68,0.15)", text: "#ef4444" },
  organizer: { bg: "rgba(59,130,246,0.15)", text: "#3b82f6" },
  member: { bg: "rgba(156,163,175,0.15)", text: "#9ca3af" },
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  const token = localStorage.getItem("token") || "";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/users`, { headers }).then((r) => r.json()),
        fetch(`${API_URL}/api/admin/users/stats`, { headers }).then((r) => r.json()),
      ]);
      setUsers(usersRes);
      setStats(statsRes);
    } catch (e) {
      console.error("Failed to fetch data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = users.filter((u) => {
    if (filter !== "all" && u.status !== filter) return false;
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || (u.phone || "").includes(s);
    }
    return true;
  });

  const doAction = async (userId, action, reason) => {
    setActionLoading(userId);
    try {
      const body = { action };
      if (reason) body.reason = reason;

      const res = await fetch(`${API_URL}/api/admin/users/${userId}/registration`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erro ao processar");
        return;
      }

      setRejectId(null);
      setRejectReason("");
      setActionLoading(null);
      fetchData();
    } catch (e) {
      alert("Erro de ligacao");
      setActionLoading(null);
    }
  };

  const doSaveEdit = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erro ao atualizar");
        return;
      }
      setEditId(null);
      fetchData();
    } catch (e) {
      alert("Erro de ligacao");
    }
  };

  const openEdit = (user) => {
    setEditId(user.id);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      phone: user.phone || "",
      altContact: user.altContact || "",
      address: user.address || "",
      dob: user.dob ? user.dob.split("T")[0] : "",
      notes: user.notes || "",
    });
  };

  return (
    <div style={{ padding: "20px 0" }}>
      <h1 style={{ fontSize: 18, color: "#fff", margin: "0 0 20px" }}>Gestao de Utilizadores</h1>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total", val: stats.total || 0, color: "#60a5fa" },
          { label: "Pendentes", val: stats.pending || 0, color: "#eab308" },
          { label: "Ativos", val: stats.active || 0, color: "#22c55e" },
          { label: "Inativos", val: stats.inactive || 0, color: "#9ca3af" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#0D2137", borderRadius: 8, padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <input
          placeholder="Pesquisar nome, email, telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "8px 12px", background: "#0D2137", border: "1px solid #1B3A5C", borderRadius: 6, color: "#fff", fontSize: 14, flex: "1 1 200px", outline: "none" }}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={selectStyle}>
          <option value="all">Todos Status</option>
          <option value="pending">⏳ Pendentes</option>
          <option value="active">✅ Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="banned">🚫 Banidos</option>
        </select>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={selectStyle}>
          <option value="all">Todos Roles</option>
          <option value="admin">Admin</option>
          <option value="organizer">Organizador</option>
          <option value="member">Membro</option>
        </select>
      </div>

      {loading ? (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>A carregar...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>Sem resultados.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((user) => (
            <div key={user.id} style={{ background: "#0D2137", borderRadius: 8, padding: "12px 16px" }}>
              {/* User row */}
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", background: "#1B3A5C",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 600, color: "#e5e7eb", flexShrink: 0
                }}>
                  {user.avatar
                    ? <img src={user.avatar} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                    : user.name.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#fff", marginBottom: 2 }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    {user.email}{user.phone ? ` · ${user.phone}` : ""}
                  </div>
                  {user._count?.rsvps > 0 && (
                    <div style={{ fontSize: 11, color: "#60a5fa" }}>{user._count.rsvps} RSVPs</div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={badge(ROLE_COLORS[user.role] || ROLE_COLORS.member)}>{user.role}</span>
                  <span style={badge(STATUS_COLORS[user.status] || STATUS_COLORS.pending)}>{user.status}</span>
                </div>

                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {user.status === "pending" || user.status === "inactive" ? (
                    <button onClick={() => doAction(user.id, "approve")} disabled={actionLoading === user.id} style={{ ...actionBtn, background: "#22c55e", color: "#fff" }}>
                      ✅
                    </button>
                  ) : null}
                  {user.status === "active" ? (
                    <button onClick={() => doAction(user.id, "reject")} disabled={actionLoading === user.id} style={{ ...actionBtn, background: "#6b7280", color: "#fff" }}>
                      ⏸
                    </button>
                  ) : null}
                  <button onClick={() => { if (editId === user.id) setEditId(null); else openEdit(user); }} style={{ ...actionBtn, background: "#1B3A5C", color: "#e5e7eb" }}>
                    ✏️
                  </button>
                </div>
              </div>

              {/* Reject panel */}
              {rejectId === user.id && (
                <div style={{ background: "#111827", borderRadius: 8, padding: 16, marginTop: 12 }}>
                  <p style={{ color: "#f87171", fontSize: 14, margin: "0 0 8px" }}>Desativar utilizador — {user.name}</p>
                  <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Motivo (opcional)" style={{ ...inputStyle, marginBottom: 8 }} />
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => { setRejectId(null); setRejectReason(""); }} style={{ ...actionBtn, background: "#374151", color: "#e5e7eb" }}>Cancelar</button>
                    <button onClick={() => doAction(user.id, "reject", rejectReason)} style={{ ...actionBtn, background: "#ef4444", color: "#fff" }}>Desativar</button>
                  </div>
                </div>
              )}

              {/* Edit panel */}
              {editId === user.id && (
                <div style={{ background: "#111827", borderRadius: 8, padding: 16, marginTop: 12, display: "grid", gap: "8px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <label style={labelStyle}>Nome</label>
                      <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Role</label>
                      <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} style={selectStyle}>
                        <option value="member">Membro</option>
                        <option value="organizer">Organizador</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Status</label>
                      <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} style={selectStyle}>
                        <option value="pending">Pendente</option>
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                        <option value="banned">Banido</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Telefone</label>
                      <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Contacto Alternativo</label>
                      <input value={editForm.altContact} onChange={(e) => setEditForm({ ...editForm, altContact: e.target.value })} style={inputStyle} />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={labelStyle}>Morada</label>
                      <input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Data de Nascimento</label>
                      <input type="date" value={editForm.dob} onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })} style={{ ...inputStyle }} />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={labelStyle}>Notas</label>
                      <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                    <button onClick={() => setEditId(null)} style={{ ...actionBtn, background: "#374151", color: "#e5e7eb" }}>Cancelar</button>
                    <button onClick={() => doSaveEdit(user.id)} style={{ ...actionBtn, background: "#CC3333", color: "#fff" }}>Guardar</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputStyle = { width: "100%", padding: "8px 10px", background: "#0D2137", border: "1px solid #1B3A5C", borderRadius: 6, color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" };
const selectStyle = { padding: "8px 10px", background: "#0D2137", border: "1px solid #1B3A5C", borderRadius: 6, color: "#fff", fontSize: 13, outline: "none" };
const labelStyle = { fontSize: 11, color: "#9ca3af", marginBottom: 2, display: "block" };
const actionBtn = { padding: "6px 12px", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 };
const badge = (color) => ({ padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: color.bg, color: color.text, textTransform: "uppercase" });
