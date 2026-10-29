import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const V = (name) => `var(${name})`;
const RSVP_ORDER = { going: 0, maybe: 1 };

const timeOf = (iso) => new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

// Attendance of a training. Admins and organizers mark who showed up (built to be used
// on a phone at the training: big rows, one tap each); other members see the count and
// whether they were marked present.
export default function AttendancePanel({ eventId, rsvps, isStaff }) {
  const [state, setState] = useState(null);
  const [people, setPeople] = useState([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/api/attendance/events/${eventId}`).then((r) => r.json()).then(setState).catch(() => {});
  }, [eventId]);

  useEffect(() => {
    if (isStaff && state?.markingOpen) {
      api("/api/attendance/people").then((r) => r.json()).then((data) => Array.isArray(data) && setPeople(data)).catch(() => {});
    }
  }, [isStaff, state?.markingOpen]);

  const present = useMemo(() => new Set((state?.attendees || []).map((a) => a.userId)), [state]);

  // Who RSVP'd "Vou" first, then "Talvez", then anyone else already marked present.
  const rows = useMemo(() => {
    const byId = new Map();
    for (const r of rsvps) {
      if (r.status === "going" || r.status === "maybe") byId.set(r.userId, { user: r.user, status: r.status });
    }
    for (const a of state?.attendees || []) {
      if (!byId.has(a.userId)) byId.set(a.userId, { user: a.user, status: null });
    }
    return [...byId.entries()]
      .map(([userId, row]) => ({ userId, ...row }))
      .sort((a, b) => (RSVP_ORDER[a.status] ?? 2) - (RSVP_ORDER[b.status] ?? 2) || a.user.name.localeCompare(b.user.name, "pt"));
  }, [rsvps, state]);

  if (!state?.isTraining) return null;

  const toggle = async (userId, value) => {
    setBusy(userId);
    setError("");
    try {
      const res = await api(`/api/attendance/events/${eventId}/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify({ present: value }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Não foi possível guardar.");
      setState(data);
    } catch {
      setError("Sem ligação. Tenta outra vez.");
    } finally {
      setBusy(null);
    }
  };

  const card = { background: V("--bg-card"), borderRadius: 12, border: `1px solid ${V("--border-subtle")}`, padding: 16, marginBottom: 24 };
  const title = { fontSize: 18, fontWeight: 700, color: V("--text-heading"), margin: 0 };

  if (!isStaff) {
    return (
      <div style={card}>
        <h3 style={{ ...title, marginBottom: 8 }}>Presenças</h3>
        <p style={{ margin: 0, fontSize: 15, color: V("--text-primary") }}>
          {state.attended ? "✅ Estiveste neste treino. " : ""}
          {state.count === 1 ? "1 presença registada." : `${state.count} presenças registadas.`}
        </p>
      </div>
    );
  }

  if (!state.markingOpen) {
    return (
      <div style={card}>
        <h3 style={{ ...title, marginBottom: 8 }}>Presenças</h3>
        <p style={{ margin: 0, fontSize: 14, color: V("--text-secondary") }}>
          Podes marcar as presenças a partir das {timeOf(state.opensAt)} do dia do treino.
        </p>
      </div>
    );
  }

  const term = search.trim().toLowerCase();
  const listed = new Set(rows.map((r) => r.userId));
  const others = term
    ? people.filter((p) => !listed.has(p.id) && p.name.toLowerCase().includes(term)).slice(0, 8)
    : [];

  const rowStyle = (on) => ({
    display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 56, padding: "8px 12px",
    borderRadius: 10, border: `1px solid ${on ? "#059669" : V("--border-subtle")}`,
    background: on ? "rgba(5,150,105,0.15)" : V("--bg-input"), color: V("--text-primary"),
    fontSize: 16, textAlign: "left", cursor: "pointer", touchAction: "manipulation",
  });

  const personRow = (userId, user, note) => {
    const on = present.has(userId);
    return (
      <button key={userId} type="button" disabled={busy === userId} onClick={() => toggle(userId, !on)}
        aria-pressed={on} style={{ ...rowStyle(on), opacity: busy === userId ? 0.6 : 1 }}>
        <span aria-hidden style={{
          width: 28, height: 28, flexShrink: 0, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
          background: on ? "#059669" : "transparent", border: on ? "none" : `2px solid ${V("--border-input")}`, color: "#fff", fontSize: 18,
        }}>{on ? "✓" : ""}</span>
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</span>
        {note && <span style={{ fontSize: 12, color: V("--text-muted"), flexShrink: 0 }}>{note}</span>}
      </button>
    );
  };

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <h3 style={title}>Marcar presenças</h3>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#34d399" }}>{state.count} presentes</span>
      </div>
      {error && <p style={{ color: "#f87171", fontSize: 14, margin: "0 0 12px" }}>{error}</p>}

      {rows.length === 0 ? (
        <p style={{ fontSize: 14, color: V("--text-secondary"), margin: "0 0 12px" }}>Ninguém respondeu a este treino. Procura abaixo quem veio.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {rows.map((r) => personRow(r.userId, r.user, r.status === "going" ? "disse que vinha" : r.status === "maybe" ? "talvez" : null))}
        </div>
      )}

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Adicionar outra pessoa (nome)"
        autoComplete="off"
        style={{
          width: "100%", boxSizing: "border-box", minHeight: 48, padding: "10px 12px", borderRadius: 10, fontSize: 16,
          background: V("--bg-input"), border: `1px solid ${V("--border-input")}`, color: V("--text-primary"), outline: "none",
        }}
      />
      {others.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          {others.map((p) => personRow(p.id, p, null))}
        </div>
      )}
      {term && others.length === 0 && (
        <p style={{ fontSize: 13, color: V("--text-muted"), margin: "8px 0 0" }}>Sem resultados.</p>
      )}
    </div>
  );
}
