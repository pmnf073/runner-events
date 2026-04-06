import { useEffect, useState, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "";
const V = (name) => `var(${name})`;

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
      return (u.name || "").toLowerCase().includes(s) || (u.email || "").toLowerCase().includes(s) || (u.phone || "").includes(s);
    }
    return true;
  });

  const doAction = async (userId, action, reason) => {
    setActionLoading(userId);
    try {
      const body = { action };
      if (reason) body.reason = reason;
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/registration`, {
        method: "PUT", headers, body: JSON.stringify(body),
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
        method: "PUT", headers, body: JSON.stringify(editForm),
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

  const doDelete = async (userId) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: "DELETE", headers,
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erro ao eliminar");
        return;
      }
      fetchData();
    } catch (e) {
      alert("Erro de ligacao");
    } finally {
      setActionLoading(null);
    }
  };

  const openEdit = (user) => {
    setEditId(user.id);
    setEditForm({
      name: user.name, email: user.email, role: user.role, status: user.status,
      phone: user.phone || "", altContact: user.altContact || "",
      address: user.address || "", dob: user.dob ? user.dob.split("T")[0] : "",
      notes: user.notes || "",
    });
  };

  const inputStyle = { width: "100%", padding: "8px 10px", background: V("--bg-input"), border: `1px solid ${V("--border-input")}`, borderRadius: 6, color: V("--text-primary"), fontSize: 13, outline: "none", boxSizing: "border-box" };
  const selectStyle = { padding: "8px 10px", background: V("--bg-input"), border: `1px solid ${V("--border-input")}`, borderRadius: 6, color: V("--text-primary"), fontSize: 13, outline: "none" };
  const labelStyle = { fontSize: 11, color: V("--text-secondary"), marginBottom: 2, display: "block" };
  const actionBtn = { padding: "6px 12px", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 };
  const badgeStyle = (c) => ({ padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text, textTransform: "uppercase" });

  return (
    <div style={{ padding: "20px 0" }}>
      <h1 style={{ fontSize: 18, color: V("--text-heading"), margin: "0 0 20px" }}>Gestao de Utilizadores</h1>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total", val: stats.total || 0, color: "#60a5fa" },
          { label: "Pendentes", val: stats.pending || 0, color: "#eab308" },
          { label: "Ativos", val: stats.active || 0, color: "#22c55e" },
          { label: "Inativos", val: stats.inactive || 0, color: V("--text-secondary") },
        ].map((s) => (
          <div key={s.label} style={{ background: V("--bg-card"), borderRadius: 8, border: `1px solid ${V("--border-subtle")}`, padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 12, color: V("--text-secondary") }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <input
          placeholder="Pesquisar nome, email, telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "8px 12px", background: V("--bg-input"), border: `1px solid ${V("--border-input")}`, borderRadius: 6, color: V("--text-primary"), fontSize: 14, flex: "1 1 200px", outline: "none" }}
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
        <p style={{ color: V("--text-secondary"), textAlign: "center", padding: 40 }}>A carregar...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: V("--text-secondary"), textAlign: "center", padding: 40 }}>Sem resultados.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((user) => (
            <div key={user.id} style={{ background: V("--bg-card"), borderRadius: 8, border: `1px solid ${V("--border-subtle")}`, padding: "12px 16px" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: V("--border-subtle"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: V("--text-primary"), flexShrink: 0 }}>
                  {user.avatar
                    ? <img src={user.avatar} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                    : (user.name || "U").charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: V("--text-heading"), marginBottom: 2 }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: V("--text-secondary") }}>
                    {user.email}{user.phone ? ` · ${user.phone}` : ""}
                  </div>
                  {user._count?.rsvps > 0 && (
                    <div style={{ fontSize: 11, color: "#60a5fa" }}>{user._count.rsvps} RSVPs</div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={badgeStyle(ROLE_COLORS[user.role] || ROLE_COLORS.member)}>{user.role}</span>
                  <span style={badgeStyle(STATUS_COLORS[user.status] || STATUS_COLORS.pending)}>{user.status}</span>
                </div>

                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {user.status === "pending" || user.status === "inactive" ? (
                    <button onClick={() => doAction(user.id, "approve")} disabled={actionLoading === user.id} title="Ativar" style={{ ...actionBtn, background: "#22c55e", color: "#fff" }}>✅</button>
                  ) : null}
                  {user.status === "active" ? (
                    <button onClick={() => { setRejectId(user.id); }} disabled={actionLoading === user.id} title="Desativar" style={{ ...actionBtn, background: "#6b7280", color: "#fff" }}>⏸</button>
                  ) : null}
                  <button onClick={() => { if (editId === user.id) setEditId(null); else openEdit(user); }} title="Editar" style={{ ...actionBtn, background: V("--border-subtle"), color: V("--text-primary") }}>✏️</button>
                  {user.status === "pending" ? (
                    <button onClick={() => { if (confirm(`Eliminar ${user.name}? Esta acao nao pode ser desfeita.`)) doDelete(user.id); }} disabled={actionLoading === user.id} title="Eliminar" style={{ ...actionBtn, background: "#ef4444", color: "#fff" }}>🗑️</button>
                  ) : null}
                </div>
              </div>

              {/* Reject panel */}
              {rejectId === user.id && (
                <div style={{ background: V("--bg-input"), borderRadius: 8, padding: 16, marginTop: 12 }}>
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
                <div style={{ background: V("--bg-input"), borderRadius: 8, padding: 16, marginTop: 12, display: "grid", gap: "8px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div><label style={labelStyle}>Nome</label><input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Email</label><input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Role</label><select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} style={selectStyle}><option value="member">Membro</option><option value="organizer">Organizador</option><option value="admin">Admin</option></select></div>
                    <div><label style={labelStyle}>Status</label><select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} style={selectStyle}><option value="pending">Pendente</option><option value="active">Ativo</option><option value="inactive">Inativo</option><option value="banned">Banido</option></select></div>
                    <div><label style={labelStyle}>Telefone</label><input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Contacto Alternativo</label><input value={editForm.altContact} onChange={(e) => setEditForm({ ...editForm, altContact: e.target.value })} style={inputStyle} /></div>
                    <div style={{ gridColumn: "span 2" }}><label style={labelStyle}>Morada</label><input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Data de Nascimento</label><input type="date" value={editForm.dob} onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })} style={inputStyle} /></div>
                    <div style={{ gridColumn: "span 2" }}><label style={labelStyle}>Notas</label><textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} /></div>
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
