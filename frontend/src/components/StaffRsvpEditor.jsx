import { useEffect, useState } from "react";
import api from "../services/api";

const V = (name) => `var(${name})`;

// Admins and organizers add someone to an event as "Vou" (e.g. a member who
// confirmed by phone or WhatsApp). Removing is done from the list of who's going.
export default function StaffRsvpEditor({ eventId, rsvps, onChange }) {
  const [people, setPeople] = useState([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/attendance/people")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => Array.isArray(data) && setPeople(data))
      .catch(() => {});
  }, []);

  const going = new Set(rsvps.filter((r) => r.status === "going").map((r) => r.userId));
  const term = search.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const matches = term
    ? people
        .filter((p) => !going.has(p.id) && p.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(term))
        .slice(0, 8)
    : [];

  const add = async (person) => {
    setBusy(person.id);
    setError("");
    try {
      const res = await api(`/api/rsvps/${eventId}/users/${person.id}`, { method: "PUT", body: JSON.stringify({ status: "going" }) });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Não foi possível adicionar.");
      onChange((prev) => [...prev.filter((r) => r.userId !== person.id), data]);
      setSearch("");
    } catch {
      setError("Sem ligação. Tenta outra vez.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${V("--border-subtle")}` }}>
      <label htmlFor="staff-rsvp-search" style={{ display: "block", fontSize: 14, fontWeight: 600, color: V("--text-secondary"), marginBottom: 8 }}>
        Adicionar pessoa
      </label>
      <input
        id="staff-rsvp-search"
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Nome do sócio"
        autoComplete="off"
        style={{
          width: "100%", boxSizing: "border-box", minHeight: 48, padding: "10px 12px", borderRadius: 10, fontSize: 16,
          background: V("--bg-input"), border: `1px solid ${V("--border-input")}`, color: V("--text-primary"), outline: "none",
        }}
      />
      {error && <p style={{ color: "#f87171", fontSize: 14, margin: "8px 0 0" }}>{error}</p>}
      {matches.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          {matches.map((p) => (
            <button key={p.id} type="button" onClick={() => add(p)} disabled={busy === p.id}
              style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 52, padding: "8px 12px",
                borderRadius: 10, border: `1px solid ${V("--border-subtle")}`, background: V("--bg-input"),
                color: V("--text-primary"), fontSize: 16, textAlign: "left", cursor: "pointer", opacity: busy === p.id ? 0.6 : 1,
              }}>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#34d399", flexShrink: 0 }}>+ Vai</span>
            </button>
          ))}
        </div>
      )}
      {term && matches.length === 0 && (
        <p style={{ fontSize: 13, color: V("--text-muted"), margin: "8px 0 0" }}>Sem resultados (ou já está na lista).</p>
      )}
    </div>
  );
}
