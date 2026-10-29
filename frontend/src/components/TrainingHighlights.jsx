import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const V = (name) => `var(${name})`;
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

// Top of the calendar: for admins and organizers, a shortcut to mark attendance at the
// training happening now; for everyone, the club's attendance goal for the month.
export default function TrainingHighlights({ user }) {
  const isStaff = Boolean(user && ["admin", "organizer"].includes(user.role));
  const [current, setCurrent] = useState([]);
  const [goal, setGoal] = useState(null);
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/attendance/goal").then((r) => r.json()).then((data) => data.month && setGoal(data)).catch(() => {});
    if (isStaff) {
      api("/api/attendance/current").then((r) => r.json()).then((data) => Array.isArray(data) && setCurrent(data)).catch(() => {});
    }
  }, [isStaff]);

  const saveGoal = async (e) => {
    e.preventDefault();
    setError("");
    const res = await api("/api/attendance/goal", {
      method: "PUT",
      body: JSON.stringify({ month: goal.month, target: target === "" ? null : Number(target) }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Erro ao guardar a meta.");
    setGoal(data);
    setEditing(false);
  };

  const monthName = goal ? MONTHS[Number(goal.month.slice(5)) - 1] : "";
  const showGoal = goal && (goal.target || isStaff);
  if (!current.length && !showGoal) return null;

  const card = { background: V("--bg-card"), border: `1px solid ${V("--border-subtle")}`, borderRadius: 12, padding: 16, marginBottom: 16 };
  const pct = goal?.target ? Math.min(100, Math.round((goal.count / goal.target) * 100)) : 0;
  const smallButton = {
    background: "transparent", border: `1px solid ${V("--border-input")}`, color: V("--text-secondary"),
    borderRadius: 8, padding: "6px 10px", fontSize: 13, cursor: "pointer", minHeight: 36,
  };

  return (
    <div>
      {current.map((t) => (
        <Link key={t.id} to={`/event/${t.id}`} style={{
          ...card, display: "flex", alignItems: "center", gap: 12, textDecoration: "none",
          borderColor: "#f59e0b", background: "rgba(245,158,11,0.12)", minHeight: 56,
        }}>
          <span style={{ fontSize: 24 }} aria-hidden>📋</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontWeight: 700, fontSize: 16, color: V("--text-heading") }}>Marcar presenças ({t.count})</span>
            <span style={{ display: "block", fontSize: 13, color: V("--text-secondary"), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {t.title} · {new Date(t.date).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </span>
          <span style={{ fontSize: 22, color: "#f59e0b" }} aria-hidden>›</span>
        </Link>
      ))}

      {showGoal && (
        <div style={card}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: V("--text-heading") }}>Meta do clube em {monthName}</span>
            {goal.target ? (
              <span style={{ fontSize: 14, color: V("--text-secondary") }}><strong style={{ color: V("--text-primary") }}>{goal.count}</strong> de {goal.target} presenças nos treinos</span>
            ) : (
              <span style={{ fontSize: 14, color: V("--text-secondary") }}>{goal.count} presenças nos treinos, sem meta definida</span>
            )}
          </div>
          {goal.target && (
            <div role="progressbar" aria-valuemin={0} aria-valuemax={goal.target} aria-valuenow={goal.count}
              style={{ height: 12, borderRadius: 9999, background: V("--bg-input"), overflow: "hidden", marginTop: 10 }}>
              <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? "#059669" : "#f59e0b", transition: "width 0.4s" }} />
            </div>
          )}
          {goal.target && pct >= 100 && <p style={{ margin: "8px 0 0", fontSize: 14, color: "#34d399" }}>Meta atingida. Obrigado a todos!</p>}

          {isStaff && !editing && (
            <button type="button" style={{ ...smallButton, marginTop: 10 }} onClick={() => { setTarget(goal.target ?? ""); setEditing(true); }}>
              {goal.target ? "Alterar meta" : "Definir meta"}
            </button>
          )}
          {isStaff && editing && (
            <form onSubmit={saveGoal} style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input type="number" inputMode="numeric" min={1} value={target} onChange={(e) => setTarget(e.target.value)}
                placeholder="Presenças" aria-label="Meta de presenças no mês"
                style={{ width: 120, minHeight: 40, padding: "6px 10px", borderRadius: 8, fontSize: 16, background: V("--bg-input"), border: `1px solid ${V("--border-input")}`, color: V("--text-primary") }} />
              <button type="submit" style={{ ...smallButton, background: "#CC3333", color: "#fff", border: "none" }}>Guardar</button>
              <button type="button" style={smallButton} onClick={() => setEditing(false)}>Cancelar</button>
              {error && <span style={{ fontSize: 13, color: "#f87171", width: "100%" }}>{error}</span>}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
