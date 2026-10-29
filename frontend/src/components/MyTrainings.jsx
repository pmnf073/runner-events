import { useEffect, useState } from "react";
import api from "../services/api";

const V = (name) => `var(${name})`;

const BADGE_ICONS = {
  first: "👟", "total-10": "🥉", "total-25": "🥈", "total-50": "🥇", "total-100": "🏆",
  "streak-4": "🔥", "streak-8": "🔥", "streak-12": "🔥", "full-weeks": "📅", winter: "❄️",
};

// "Os meus treinos" on the profile: attendance marked by the staff, weekly streak and badges.
export default function MyTrainings({ card, h2 }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api("/api/attendance/me").then((r) => r.json()).then((data) => data.badges && setStats(data)).catch(() => {});
  }, []);

  if (!stats) return null;

  const tile = (label, value, hint) => (
    <div style={{ flex: "1 1 120px", background: V("--bg-input"), borderRadius: 10, padding: 12, minWidth: 0 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: V("--text-heading"), lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 13, color: V("--text-secondary"), marginTop: 4 }}>{label}</div>
      {hint && <div style={{ fontSize: 12, color: V("--text-muted"), marginTop: 2 }}>{hint}</div>}
    </div>
  );

  const streakHint = stats.currentStreak > 0 && !stats.trainedThisWeek ? "Vem esta semana para não perderes" : null;
  const next = stats.nextBadge;

  return (
    <section style={card}>
      <h2 style={h2}>Os meus treinos</h2>
      {stats.total === 0 && (
        <p style={{ fontSize: 14, color: V("--text-secondary"), marginTop: 0 }}>
          Ainda não tens presenças registadas. As presenças nos treinos de terça e quinta são marcadas pelo responsável do treino.
        </p>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        {tile("semanas seguidas", `🔥 ${stats.currentStreak}`, streakHint)}
        {tile("treinos este mês", stats.thisMonth)}
        {tile("treinos este ano", stats.thisYear)}
        {tile("melhor sequência", `${stats.bestStreak} sem.`)}
      </div>

      {next && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: V("--text-primary"), marginBottom: 6 }}>
            Próxima medalha: <strong>{BADGE_ICONS[next.id]} {next.label}</strong>. Faltam {next.remaining}.
          </div>
          <div style={{ height: 10, borderRadius: 9999, background: V("--bg-input"), overflow: "hidden" }}>
            <div style={{ width: `${Math.round((next.progress / next.goal) * 100)}%`, height: "100%", background: "#f59e0b" }} />
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
        {stats.badges.map((b) => (
          <div key={b.id} title={b.description} style={{
            borderRadius: 10, padding: 10, textAlign: "center",
            border: `1px solid ${b.earned ? "#f59e0b" : V("--border-subtle")}`,
            background: b.earned ? "rgba(245,158,11,0.10)" : "transparent",
            opacity: b.earned ? 1 : 0.55,
          }}>
            <div style={{ fontSize: 28, filter: b.earned ? "none" : "grayscale(1)" }} aria-hidden>{BADGE_ICONS[b.id]}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: V("--text-heading"), marginTop: 4 }}>{b.label}</div>
            <div style={{ fontSize: 11, color: V("--text-muted"), marginTop: 2 }}>{b.earned ? b.description : `${b.progress} de ${b.goal}`}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
