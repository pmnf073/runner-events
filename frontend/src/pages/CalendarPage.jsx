import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const EVENT_COLORS = {
  trail: { border: "#10b981", bg: "rgba(16,185,129,0.1)", text: "#6ee7b7", dot: "#10b981" },
  urban: { border: "#CC3333", bg: "rgba(204,51,51,0.1)", text: "#E55555", dot: "#CC3333" },
  race: { border: "#CC3333", bg: "rgba(204,51,51,0.15)", text: "#E55555", dot: "#CC3333" },
  training: { border: "#f59e0b", bg: "rgba(245,158,11,0.1)", text: "#fcd34d", dot: "#f59e0b" },
  social: { border: "#CC7777", bg: "rgba(204,119,119,0.1)", text: "#CC7777", dot: "#CC7777" },
  meeting: { border: "#6b7280", bg: "rgba(107,114,128,0.1)", text: "#9ca3af", dot: "#6b7280" },
};

const EVENT_LABELS = {
  trail: "Trilho",
  urban: "Urbano",
  race: "Prova",
  training: "Treino",
  social: "Social",
  meeting: "Reuniao",
};

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");

  useEffect(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();
    const params = new URLSearchParams({ start, end });
    if (filter !== "all") params.set("type", filter);
    api(`/api/events?${params}`)
      .then((r) => r.json())
      .then(setEvents)
      .finally(() => setLoading(false));
  }, [currentDate, filter]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const monthNames = [
    "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getEventsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.date.startsWith(dateStr));
  };

  const groupedEvents = events.reduce((acc, event) => {
    const dateKey = event.date.split("T")[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedEvents).sort();

  function formatDate(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return {
      day: d.getDate(),
      full: `${dd}/${mm}/${yyyy}`,
    };
  }

  function formatEventTime(isoStr) {
    const d = new Date(isoStr);
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${min}`;
  }

  const cssVar = (name) => `var(${name})`;

  const headerBtn = (active) => ({
    padding: "8px 14px",
    fontSize: 18,
    borderRadius: 6,
    border: `1px solid ${cssVar("--border-subtle")}`,
    background: active ? "#CC3333" : cssVar("--bg-header"),
    color: active ? "#fff" : cssVar("--text-secondary"),
    cursor: "pointer",
    fontWeight: 500,
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  });

  return (
    <div>
      {/* Title + Filter + View toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <h1 style={{ fontSize: 14, color: cssVar("--text-heading"), textTransform: "uppercase", letterSpacing: 2, margin: 0 }}>Calendario de Eventos</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", border: `1px solid ${cssVar("--border-subtle")}`, borderRadius: 8, overflow: "hidden" }}>
            <button onClick={() => setViewMode("grid")} style={headerBtn(viewMode === "grid")} title="Grelha">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </button>
            <button onClick={() => setViewMode("list")} style={{ ...headerBtn(viewMode === "list"), borderLeft: `1px solid ${cssVar("--border-subtle")}` }} title="Lista">&#9776;</button>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ background: cssVar("--bg-header"), border: `1px solid ${cssVar("--border-subtle")}`, borderRadius: 8, padding: "8px 12px", fontSize: 14, color: cssVar("--text-primary"), cursor: "pointer" }}
          >
            <option value="all">Todos os tipos</option>
            {Object.entries(EVENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Month navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={prevMonth}
          style={{ background: cssVar("--bg-header"), border: `1px solid ${cssVar("--border-subtle")}`, borderRadius: 8, padding: "8px 16px", fontSize: 18, color: cssVar("--text-primary"), cursor: "pointer" }}>&larr;</button>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: cssVar("--text-primary") }}>{monthNames[month]} {year}</h2>
        <button onClick={nextMonth}
          style={{ background: cssVar("--bg-header"), border: `1px solid ${cssVar("--border-subtle")}`, borderRadius: 8, padding: "8px 16px", fontSize: 18, color: cssVar("--text-primary"), cursor: "pointer" }}>&rarr;</button>
      </div>

      {/* GRID VIEW */}
      {viewMode === "grid" && (
        <div className="calendar-grid" style={{ border: `1px solid ${cssVar("--border-subtle")}` }}>
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].map((d) => (
            <div key={d} className="calendar-day-header">{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="calendar-day other-month" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            const dayEvents = getEventsForDay(day);
            return (
              <div key={day} className="calendar-day">
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, color: isToday ? "#CC3333" : cssVar("--text-secondary") }}>{day}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {dayEvents.slice(0, 3).map((event) => {
                    const ec = EVENT_COLORS[event.type] || EVENT_COLORS.meeting;
                    return (
                      <Link key={event.id} to={`/event/${event.id}`}
                        style={{ display: "block", fontSize: 12, padding: "4px 8px", borderRadius: 6, borderLeft: `3px solid ${ec.border}`, background: ec.bg, color: ec.text, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: 500 }}>{event.title}</span> {formatEventTime(event.date)}
                      </Link>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div style={{ fontSize: 12, color: cssVar("--text-muted") }}>+{dayEvents.length - 3} mais</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {sortedDates.filter(d => d.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, color: cssVar("--text-muted") }}>Sem eventos este mes</div>
          ) : (
            sortedDates
              .filter(d => d.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`))
              .map((dateStr) => {
                const info = formatDate(dateStr);
                return (
                  <div key={dateStr} style={{ background: cssVar("--bg-card"), borderRadius: 12, overflow: "hidden", border: `1px solid ${cssVar("--border-subtle")}` }}>
                    <div style={{ padding: "12px 20px", background: cssVar("--calendar-today-bg"), display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 28, fontWeight: 700, color: "#CC3333", minWidth: 36, textAlign: "center" }}>{info.full}</span>
                    </div>
                    {groupedEvents[dateStr].map((event) => {
                      const ec = EVENT_COLORS[event.type] || EVENT_COLORS.meeting;
                      return (
                        <Link key={event.id} to={`/event/${event.id}`}
                          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px 14px 72px", textDecoration: "none", borderBottom: `1px solid ${cssVar("--border-subtle")}`, transition: "background 0.2s" }}
                          onMouseEnter={e => e.currentTarget.style.background = cssVar("--hover-bg")}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: ec.dot, flexShrink: 0 }}></span>
                            <span style={{ fontSize: 15, color: cssVar("--text-primary") }}>{event.title}</span>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ fontSize: 13, color: cssVar("--text-secondary") }}>{formatEventTime(event.date)}</span>
                            <span style={{
                              fontSize: 11,
                              padding: "4px 10px",
                              borderRadius: 20,
                              background: ec.bg,
                              color: ec.text,
                              fontWeight: 500,
                            }}>
                              {EVENT_LABELS[event.type] || event.type}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: cssVar("--bg-header"), borderRadius: 12, padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div className="animate-spin" style={{ width: 32, height: 32, borderRadius: "50%", borderTop: "2px solid #CC3333" }}></div>
            <span style={{ fontSize: 14, color: cssVar("--text-secondary") }}>Carregando eventos...</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: cssVar("--text-muted") }}>
        {Object.entries(EVENT_LABELS).map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className={`event-dot ${k}`} /> {v}
          </div>
        ))}
      </div>
    </div>
  );
}
