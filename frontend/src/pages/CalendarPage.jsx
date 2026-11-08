import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { localDateKey } from "../utils/format";
import TrainingHighlights from "../components/TrainingHighlights";

const EVENT_COLORS = {
  trail: { border: "#10b981", bg: "rgba(16,185,129,0.1)", text: "#6ee7b7", dot: "#10b981" },
  urban: { border: "#3b82f6", bg: "rgba(59,130,246,0.12)", text: "#93c5fd", dot: "#3b82f6" },
  race: { border: "#CC3333", bg: "rgba(204,51,51,0.15)", text: "#E55555", dot: "#CC3333" },
  training: { border: "#f59e0b", bg: "rgba(245,158,11,0.1)", text: "#fcd34d", dot: "#f59e0b" },
  social: { border: "#a855f7", bg: "rgba(168,85,247,0.12)", text: "#d8b4fe", dot: "#a855f7" },
  meeting: { border: "#6b7280", bg: "rgba(107,114,128,0.1)", text: "#9ca3af", dot: "#6b7280" },
};

// How far back and ahead the search looks, and how many results each section shows.
const SEARCH_MONTHS_BACK = 12;
const SEARCH_MONTHS_AHEAD = 24;
const SEARCH_LIMIT = 50;

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MONTHS_LOWER = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const EVENT_LABELS = {
  trail: "Trilho",
  urban: "Urbano",
  race: "Prova",
  training: "Treino",
  social: "Social",
  meeting: "Reunião",
};

// "2026-11" -> first day of that month; anything else -> null.
function parseMonthParam(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(value || "");
  if (!match) return null;
  const m = Number(match[2]);
  if (m < 1 || m > 12) return null;
  return new Date(Number(match[1]), m - 1, 1);
}

const monthParam = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// The logged-in user's answer for an event: "going", "maybe" or null. Generated
// occurrences of a series (virtual ids "rec_...") carry the series' RSVP list,
// not their own; an RSVP turns an occurrence into a real row, so they have none.
function myRsvpStatus(event, user) {
  if (!user || String(event.id).startsWith("rec_")) return null;
  const rsvp = (event.rsvps || []).find((r) => r.userId === user.id || r.user?.id === user.id);
  return rsvp && ["going", "maybe"].includes(rsvp.status) ? rsvp.status : null;
}

function RsvpBadge({ status }) {
  if (!status) return null;
  const going = status === "going";
  return (
    <span className="calendar-rsvp-badge" style={{
      background: going ? "rgba(16,185,129,0.15)" : "transparent",
      color: going ? "#34d399" : "var(--text-muted)",
      border: going ? "1px solid rgba(16,185,129,0.4)" : "1px dashed var(--border-subtle)",
    }}>
      {going ? "✓ Vou" : "Talvez"}
    </span>
  );
}

export default function CalendarPage({ user }) {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  // Month, type filter and search live in the address (?mes=2026-12&tipo=trail&q=...),
  // so going back from an event returns to the same view.
  const [searchParams, setSearchParams] = useSearchParams();
  const currentDate = parseMonthParam(searchParams.get("mes")) || new Date();
  const monthKey = monthParam(currentDate);
  const filter = EVENT_LABELS[searchParams.get("tipo")] ? searchParams.get("tipo") : "all";
  const updateParams = (changes) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      return next;
    }, { replace: true });
  };
  const setFilter = (value) => updateParams({ tipo: value === "all" ? null : value });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [showPastDays, setShowPastDays] = useState(false);
  const [pendingScrollDay, setPendingScrollDay] = useState(null);
  const touchStart = useRef(null);
  const dayStripRef = useRef(null);
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [isMobile, setIsMobile] = useState(false);
  const [search, setSearchState] = useState(() => searchParams.get("q") || "");
  const setSearch = (value) => {
    setSearchState(value);
    updateParams({ q: value.trim().length >= 2 ? value : null });
  };
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const searchQuery = search.trim();
  const isSearching = searchQuery.length >= 2;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const updateIsMobile = () => setIsMobile(media.matches);
    updateIsMobile();
    media.addEventListener("change", updateIsMobile);
    return () => media.removeEventListener("change", updateIsMobile);
  }, []);

  useEffect(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
    // Up to the last millisecond of the month, so events on the last day are included.
    const end = new Date(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1).getTime() - 1).toISOString();
    const params = new URLSearchParams({ start, end });
    if (filter !== "all") params.set("type", filter);
    // Ignore answers for a month or filter that is no longer selected.
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    api(`/api/events?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (cancelled) return;
        if (!Array.isArray(data)) throw new Error("Resposta inesperada");
        setEvents(data);
      })
      .catch(() => { if (!cancelled) { setEvents([]); setLoadError(true); } })
      .finally(() => { if (!cancelled) { setLoading(false); setFirstLoadDone(true); } });
    return () => { cancelled = true; };
  }, [monthKey, filter, reloadKey]);

  // Search across months, independently of the month being shown. Debounced so
  // that typing does not fire one request per key; stale answers are ignored.
  useEffect(() => {
    if (!isSearching) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - SEARCH_MONTHS_BACK, 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() + SEARCH_MONTHS_AHEAD + 1, 1).toISOString();
      const params = new URLSearchParams({ start, end, q: searchQuery });
      if (filter !== "all") params.set("type", filter);
      api(`/api/events?${params}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => { if (!cancelled) setSearchResults(Array.isArray(data) ? data : []); })
        .catch(() => { if (!cancelled) setSearchResults([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQuery, isSearching, filter]);

  const nowMs = Date.now();
  const upcomingResults = (searchResults || []).filter((e) => new Date(e.endDate || e.date).getTime() >= nowMs);
  const pastResults = (searchResults || []).filter((e) => new Date(e.endDate || e.date).getTime() < nowMs).reverse();

  const effectiveViewMode = isMobile ? "list" : viewMode;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const goToMonth = (d) => {
    setShowPastDays(false);
    // The current month is the default, so it is left out of the address.
    updateParams({ mes: monthParam(d) === monthParam(new Date()) ? null : monthParam(d) });
  };
  const prevMonth = () => goToMonth(new Date(year, month - 1, 1));
  const nextMonth = () => goToMonth(new Date(year, month + 1, 1));

  const handleDayClick = (day) => {
    if (!user || !["admin", "organizer"].includes(user.role)) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    navigate(`/admin?date=${dateStr}`);
  };

  const getEventsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => localDateKey(e.date) === dateStr);
  };

  const groupedEvents = events.reduce((acc, event) => {
    const dateKey = localDateKey(event.date);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedEvents).sort();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthDates = sortedDates.filter((d) => d.startsWith(monthPrefix));
  // In the current month, days already gone are folded away so the list opens on today.
  const isCurrentMonth = todayStr.startsWith(monthPrefix);
  const pastDates = isCurrentMonth ? monthDates.filter((d) => d < todayStr) : [];
  const pastEventCount = pastDates.reduce((n, d) => n + groupedEvents[d].length, 0);
  const visibleDates = showPastDays ? monthDates : monthDates.filter((d) => !pastDates.includes(d));
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const tomorrowStr = localDateKey(tomorrow);

  // Day strip (mobile): tap a day to jump to it in the list.
  const jumpToDay = (dateStr) => {
    if (pastDates.includes(dateStr) && !showPastDays) setShowPastDays(true);
    setPendingScrollDay(dateStr);
  };
  useEffect(() => {
    if (!pendingScrollDay) return;
    document.getElementById(`dia-${pendingScrollDay}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setPendingScrollDay(null);
  }, [pendingScrollDay, showPastDays]);
  // Keep today (or the 1st) in view in the strip when the month changes.
  useEffect(() => {
    const strip = dayStripRef.current;
    if (!strip) return;
    const target = strip.querySelector(".is-today") || strip.firstElementChild;
    if (target) strip.scrollLeft = Math.max(0, target.offsetLeft - strip.offsetLeft - 8);
  }, [monthKey, isMobile]);

  // Swipe left/right on the list (mobile) to change month. Mostly-horizontal
  // swipes only, so scrolling the page up and down never changes the month.
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return;
    if (dx < 0) nextMonth();
    else prevMonth();
  };

  function formatDate(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return {
      day: d.getDate(),
      full: `${dd}/${mm}/${yyyy}`,
      // "Terça, 10 de novembro"
      long: `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS_LOWER[d.getMonth()]}`,
      // "Ter, 10/11/2026"
      short: `${WEEKDAYS[d.getDay()].slice(0, 3)}, ${dd}/${mm}/${yyyy}`,
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
      <TrainingHighlights user={user} />

      {/* Title + Filter + View toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <h1 style={{ fontSize: 14, color: cssVar("--text-heading"), textTransform: "uppercase", letterSpacing: 2, margin: 0 }}>Calendário de Eventos</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: isMobile ? "nowrap" : "wrap", width: isMobile ? "100%" : "auto" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center", flex: isMobile ? "1 1 auto" : "0 0 auto", minWidth: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: "absolute", left: 10, color: cssVar("--text-muted"), pointerEvents: "none" }} aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setSearch(""); }}
              placeholder={isMobile ? "Pesquisar..." : "Pesquisar eventos..."}
              aria-label="Pesquisar eventos por nome, local ou data"
              maxLength={100}
              style={{ background: cssVar("--bg-header"), border: `1px solid ${cssVar("--border-subtle")}`, borderRadius: 8, padding: "8px 12px 8px 32px", fontSize: isMobile ? 16 : 14, color: cssVar("--text-primary"), width: isMobile ? "100%" : 240, minWidth: 0, minHeight: 40, boxSizing: "border-box" }}
            />
          </div>
          {!isMobile && (
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
          )}
          {!isMobile && (
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filtrar por tipo de evento"
            style={{ background: cssVar("--bg-header"), border: `1px solid ${cssVar("--border-subtle")}`, borderRadius: 8, padding: "8px 12px", fontSize: isMobile ? 16 : 14, color: cssVar("--text-primary"), cursor: "pointer", minHeight: 40, flex: "0 0 auto" }}
          >
            <option value="all">Todos os tipos</option>
            {Object.entries(EVENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          )}
        </div>
        {isMobile && (
          <div className="calendar-type-chips" role="group" aria-label="Filtrar por tipo de evento">
            {[["all", "Todos"], ...Object.entries(EVENT_LABELS)].map(([k, v]) => {
              const active = filter === k;
              return (
                <button key={k} type="button" aria-pressed={active} onClick={() => setFilter(k)}
                  style={{
                    background: active ? "#CC3333" : cssVar("--bg-header"),
                    color: active ? "#fff" : cssVar("--text-secondary"),
                    border: `1px solid ${active ? "#CC3333" : cssVar("--border-subtle")}`,
                  }}>
                  {k !== "all" && <span className={`event-dot ${k}`} style={{ boxShadow: active ? "0 0 0 1px #fff" : "none" }} />}
                  {v}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* SEARCH RESULTS */}
      {isSearching && (
        <div className="calendar-search-results">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, color: cssVar("--text-secondary") }}>
              {searching || searchResults === null
                ? "A pesquisar..."
                : `${searchResults.length} ${searchResults.length === 1 ? "resultado" : "resultados"} para "${searchQuery}"`}
            </span>
            <button onClick={() => setSearch("")}
              style={{ background: cssVar("--bg-header"), border: `1px solid ${cssVar("--border-subtle")}`, borderRadius: 8, padding: "6px 12px", fontSize: 13, color: cssVar("--text-primary"), cursor: "pointer" }}>
              Limpar pesquisa
            </button>
          </div>
          {!searching && searchResults !== null && searchResults.length === 0 && (
            <div style={{ textAlign: "center", padding: 48, color: cssVar("--text-muted") }}>
              Nenhum evento encontrado entre os últimos {SEARCH_MONTHS_BACK} meses e os próximos {SEARCH_MONTHS_AHEAD} meses
            </div>
          )}
          {!searching && [
            { key: "upcoming", label: "Próximos", items: upcomingResults },
            { key: "past", label: "Anteriores", items: pastResults },
          ].filter((section) => section.items.length > 0).map((section) => (
            <div key={section.key} style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 12, color: cssVar("--text-heading"), textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 8px" }}>
                {section.label} ({section.items.length})
              </h3>
              <div className="calendar-list-day" style={{ background: cssVar("--bg-card"), border: `1px solid ${cssVar("--border-subtle")}` }}>
                {section.items.slice(0, SEARCH_LIMIT).map((event) => {
                  const ec = EVENT_COLORS[event.type] || EVENT_COLORS.meeting;
                  return (
                    <Link key={event.id} to={`/event/${event.id}`}
                      className="calendar-list-event"
                      style={{ textDecoration: "none", borderBottom: `1px solid ${cssVar("--border-subtle")}`, transition: "background 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.background = cssVar("--hover-bg")}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div className="calendar-list-event-main">
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: ec.dot, flexShrink: 0 }}></span>
                        <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                          <span className="calendar-list-event-title" style={{ color: cssVar("--text-primary") }}>{event.title} <RsvpBadge status={myRsvpStatus(event, user)} /></span>
                          {event.location && <span style={{ fontSize: 12, color: cssVar("--text-muted") }}>{event.location}</span>}
                        </span>
                      </div>
                      <div className="calendar-list-event-meta">
                        <span style={{ fontSize: 13, color: cssVar("--text-secondary") }}>{formatDate(localDateKey(event.date)).short} {formatEventTime(event.date)}</span>
                        <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: ec.bg, color: ec.text, fontWeight: 500 }}>
                          {EVENT_LABELS[event.type] || event.type}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
              {section.items.length > SEARCH_LIMIT && (
                <div style={{ fontSize: 12, color: cssVar("--text-muted"), marginTop: 8 }}>
                  A mostrar {SEARCH_LIMIT} de {section.items.length}. Escreva mais palavras para refinar a pesquisa.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isSearching && (<>
      {/* Month navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={prevMonth} aria-label="Mês anterior"
          style={{ background: cssVar("--bg-header"), border: `1px solid ${cssVar("--border-subtle")}`, borderRadius: 8, padding: "8px 16px", fontSize: 18, color: cssVar("--text-primary"), cursor: "pointer" }}>&larr;</button>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: cssVar("--text-primary") }}>{monthNames[month]} {year}</h2>
        <button onClick={nextMonth} aria-label="Mês seguinte"
          style={{ background: cssVar("--bg-header"), border: `1px solid ${cssVar("--border-subtle")}`, borderRadius: 8, padding: "8px 16px", fontSize: 18, color: cssVar("--text-primary"), cursor: "pointer" }}>&rarr;</button>
      </div>

      {/* DAY STRIP (mobile) */}
      {isMobile && effectiveViewMode === "list" && !loadError && (
        <div className="calendar-day-strip" ref={dayStripRef} role="group" aria-label="Saltar para um dia">
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${monthPrefix}-${String(day).padStart(2, "0")}`;
            const dayEvents = groupedEvents[dateStr] || [];
            const has = dayEvents.length > 0;
            const isToday = dateStr === todayStr;
            const weekday = WEEKDAYS[new Date(year, month, day).getDay()].slice(0, 3);
            return (
              <button key={dateStr} type="button" disabled={!has} onClick={() => jumpToDay(dateStr)}
                className={`${isToday ? "is-today" : ""}${has ? " has-events" : ""}${dateStr < todayStr ? " is-past" : ""}`}
                aria-label={`${formatDate(dateStr).long}${has ? `, ${dayEvents.length} ${dayEvents.length === 1 ? "evento" : "eventos"}` : ", sem eventos"}`}>
                <span className="calendar-day-strip-weekday">{weekday}</span>
                <span className="calendar-day-strip-number">{day}</span>
                <span className="calendar-day-strip-dots" aria-hidden="true">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <span key={ev.id} style={{ background: (EVENT_COLORS[ev.type] || EVENT_COLORS.meeting).dot }} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* GRID VIEW */}
      {effectiveViewMode === "grid" && loadError && (
        <div style={{ marginBottom: 12, color: cssVar("--text-muted"), display: "flex", gap: 12, alignItems: "center" }}>
          <span>Não foi possível carregar os eventos.</span>
          <button onClick={() => setReloadKey((k) => k + 1)}
            style={{ background: cssVar("--bg-header"), border: `1px solid ${cssVar("--border-subtle")}`, borderRadius: 8, padding: "6px 12px", fontSize: 13, color: cssVar("--text-primary"), cursor: "pointer" }}>
            Tentar novamente
          </button>
        </div>
      )}
      {effectiveViewMode === "grid" && (
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
            const isStaff = user && ["admin", "organizer"].includes(user.role);
            return (
              <div key={day} className="calendar-day">
                <div onClick={() => handleDayClick(day)} style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, color: isToday ? "#CC3333" : cssVar("--text-secondary"), cursor: isStaff ? "pointer" : "default" }} title={isStaff ? "Novo registo" : ""}>{day}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {dayEvents.map((event) => {
                    const ec = EVENT_COLORS[event.type] || EVENT_COLORS.meeting;
                    return (
                      <Link key={event.id} to={`/event/${event.id}`}
                        style={{ display: "block", fontSize: 12, padding: "4px 8px", borderRadius: 6, borderLeft: `3px solid ${ec.border}`, background: ec.bg, color: ec.text, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {myRsvpStatus(event, user) === "going" && <span title="Vou">✓ </span>}<span style={{ fontWeight: 500 }}>{event.title}</span> {formatEventTime(event.date)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {effectiveViewMode === "list" && (
        <div className="calendar-list" style={{ opacity: loading ? 0.5 : 1, transition: "opacity 0.2s" }}
          onTouchStart={isMobile ? onTouchStart : undefined} onTouchEnd={isMobile ? onTouchEnd : undefined}>
          {loadError ? (
            <div style={{ textAlign: "center", padding: 32, color: cssVar("--text-muted"), display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <span>Não foi possível carregar os eventos.</span>
              <button onClick={() => setReloadKey((k) => k + 1)}
                style={{ background: cssVar("--bg-header"), border: `1px solid ${cssVar("--border-subtle")}`, borderRadius: 8, padding: "8px 16px", fontSize: 14, color: cssVar("--text-primary"), cursor: "pointer", minHeight: 40 }}>
                Tentar novamente
              </button>
            </div>
          ) : monthDates.length === 0 ? (
            !loading && <div style={{ textAlign: "center", padding: 48, color: cssVar("--text-muted") }}>Sem eventos este mês</div>
          ) : (<>
            {pastEventCount > 0 && (
              <button type="button" className="calendar-past-toggle" onClick={() => setShowPastDays((v) => !v)}
                style={{ background: "transparent", border: `1px dashed ${cssVar("--border-subtle")}`, color: cssVar("--text-secondary") }}>
                {showPastDays
                  ? "Esconder eventos anteriores"
                  : `Mostrar ${pastEventCount} ${pastEventCount === 1 ? "evento anterior" : "eventos anteriores"} deste mês`}
              </button>
            )}
            {visibleDates.length === 0 && (
              <div style={{ textAlign: "center", padding: 32, color: cssVar("--text-muted") }}>Sem mais eventos este mês</div>
            )}
            {visibleDates.map((dateStr) => {
                const info = formatDate(dateStr);
                const isToday = dateStr === todayStr;
                const isPast = dateStr < todayStr;
                const relative = isToday ? "Hoje" : dateStr === tomorrowStr ? "Amanhã" : null;
                return (
                  <div key={dateStr} id={`dia-${dateStr}`} className={`calendar-list-day${isPast ? " is-past" : ""}`}
                    style={{ background: cssVar("--bg-card"), border: `1px solid ${isToday ? "#CC3333" : cssVar("--border-subtle")}` }}>
                    <div className="calendar-list-date" style={{ background: cssVar("--calendar-today-bg") }}>
                      <span>{info.long}</span>
                      {relative && <em className="calendar-list-relative">{relative}</em>}
                    </div>
                    {groupedEvents[dateStr].map((event) => {
                      const ec = EVENT_COLORS[event.type] || EVENT_COLORS.meeting;
                      return (
                        <Link key={event.id} to={`/event/${event.id}`}
                          className="calendar-list-event"
                          style={{ textDecoration: "none", borderBottom: `1px solid ${cssVar("--border-subtle")}`, transition: "background 0.2s" }}
                          onMouseEnter={e => e.currentTarget.style.background = cssVar("--hover-bg")}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <div className="calendar-list-event-main">
                            <span className="calendar-list-event-time" style={{ color: cssVar("--text-secondary") }}>{formatEventTime(event.date)}</span>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: ec.dot, flexShrink: 0, marginTop: 6 }}></span>
                            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                              <span className="calendar-list-event-title" style={{ color: cssVar("--text-primary") }}>{event.title} <RsvpBadge status={myRsvpStatus(event, user)} /></span>
                              {event.location && <span style={{ fontSize: 12, color: cssVar("--text-muted") }}>{event.location}</span>}
                            </span>
                          </div>
                          <div className="calendar-list-event-meta">
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
              })}
          </>)}
        </div>
      )}

      </>)}

      {/* Loading overlay */}
      {loading && !firstLoadDone && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: cssVar("--bg-header"), borderRadius: 12, padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div className="animate-spin" style={{ width: 32, height: 32, borderRadius: "50%", borderTop: "2px solid #CC3333" }}></div>
            <span style={{ fontSize: 14, color: cssVar("--text-secondary") }}>Carregando eventos...</span>
          </div>
        </div>
      )}

      {/* Legend (on mobile the type buttons already show the colours) */}
      {!isMobile && <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: cssVar("--text-muted") }}>
        {Object.entries(EVENT_LABELS).map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className={`event-dot ${k}`} /> {v}
          </div>
        ))}
      </div>}
    </div>
  );
}
