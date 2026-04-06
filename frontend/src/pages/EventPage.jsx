import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";

const TYPE_LABELS = {
  trail: "🏔️ Trilho",
  urban: "🏙️ Urbano",
  race: "🏅 Prova",
  training: "💪 Treino",
  social: "🎉 Social",
  meeting: "📋 Reunião",
};

const V = (name) => `var(${name})`;

export default function EventPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [user, setUser] = useState(null);
  const [rsvpStatus, setRsvpStatus] = useState(null);
  const [rsvps, setRsvps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/api/events/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setEvent(data);
        setRsvps(data.rsvps || []);
      })
      .finally(() => setLoading(false));
    api("/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) setUser(data.user);
      });
  }, [id]);

  const handleRsvp = async (status) => {
    if (!user) return window.location.href = "/login";
    const res = await api("/api/rsvps", {
      method: "POST",
      body: JSON.stringify({ eventId: id, status }),
    });
    const data = await res.json();
    if (res.ok) {
      setRsvpStatus(status);
      setRsvps((prev) => {
        const others = prev.filter((r) => r.userId !== user.id);
        return [...others, data];
      });
    }
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><div className="animate-spin" style={{ width: 32, height: 32, borderRadius: "50%", borderTop: "2px solid #CC3333" }}></div></div>;
  if (!event) return <div style={{ textAlign: "center", padding: 48, color: V("--text-secondary") }}>Evento não encontrado</div>;

  const date = new Date(event.date);
  const endDate = event.endDate ? new Date(event.endDate) : null;
  const goingCount = rsvps.filter((r) => r.status === "going").length;
  const maybeCount = rsvps.filter((r) => r.status === "maybe").length;

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/" className="text-primary-light" style={{ fontSize: 14, marginBottom: 16, display: "inline-block", textDecoration: "none" }}
        onMouseEnter={e => e.target.style.textDecoration = "underline"}
        onMouseLeave={e => e.target.style.textDecoration = "none"}>← Voltar ao calendário</Link>

      {/* Event Header */}
      <div style={{ background: V("--bg-card"), borderRadius: 12, border: `1px solid ${V("--border-subtle")}`, padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 500, color: V("--text-secondary") }}>{TYPE_LABELS[event.type] || event.type}</span>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: V("--text-heading") }}>{event.title}</h1>
          </div>
          <span style={{ background: V("--hover-bg"), padding: "4px 12px", borderRadius: 9999, fontSize: 14, color: V("--text-secondary") }}>{event.club}</span>
        </div>

        {/* Event Image */}
        {event.imageUrl && (
          <div style={{ marginTop: 24 }}>
            <img src={event.imageUrl} alt={event.title} style={{ width: "100%", maxHeight: 384, objectFit: "contain", borderRadius: 8 }} onError={(e) => e.target.style.display = "none"} />
          </div>
        )}

        {/* Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>📅</span>
            <div>
              <div style={{ fontSize: 14, color: V("--text-secondary") }}>Data</div>
              <div style={{ fontWeight: 500, color: V("--text-primary") }}>{date.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
              <div style={{ fontSize: 14, color: V("--text-secondary") }}>
                {date.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                {endDate && ` — ${endDate.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`}
              </div>
            </div>
          </div>
          {event.location && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>📍</span>
              <div>
                <div style={{ fontSize: 14, color: V("--text-secondary") }}>Local</div>
                <div style={{ fontWeight: 500, color: V("--text-primary") }}>{event.location}</div>
              </div>
            </div>
          )}
          {event.distance && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>📏</span>
              <div>
                <div style={{ fontSize: 14, color: V("--text-secondary") }}>Distância</div>
                <div style={{ fontWeight: 500, color: V("--text-primary") }}>{event.distance} km</div>
              </div>
            </div>
          )}
          {event.elevation && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>⛰️</span>
              <div>
                <div style={{ fontSize: 14, color: V("--text-secondary") }}>Elevação</div>
                <div style={{ fontWeight: 500, color: V("--text-primary") }}>{event.elevation}m</div>
              </div>
            </div>
          )}
          {event.url && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>🔗</span>
              <div>
                <div style={{ fontSize: 14, color: V("--text-secondary") }}>URL</div>
                <a href={event.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 500, color: "#36C2CE", wordBreak: "break-all" }}>{event.url}</a>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <div style={{ marginTop: 24, padding: 16, background: `${V("--bg-card")}`, opacity: 0.5, borderRadius: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: V("--text-secondary"), marginBottom: 8 }}>Descrição</h3>
            <p style={{ color: V("--text-primary"), whiteSpace: "pre-line" }}>{event.description}</p>
          </div>
        )}
      </div>

      {/* RSVP Section */}
      <div style={{ background: V("--bg-card"), borderRadius: 12, border: `1px solid ${V("--border-subtle")}`, padding: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: V("--text-heading") }}>Participação</h3>

        {user ? (
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            {[
              { key: "going", label: "✅ Vou", active: "#059669" },
              { key: "maybe", label: "🤔 Talvez", active: "#d97706" },
              { key: "not_going", label: "❌ Não vou", active: "#dc2626" },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => handleRsvp(option.key)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  transition: "background 0.2s",
                  background: rsvpStatus === option.key ? option.active : V("--bg-input"),
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={e => { if (rsvpStatus !== option.key) e.target.style.background = V("--hover-bg"); }}
                onMouseLeave={e => { if (rsvpStatus !== option.key) e.target.style.background = V("--bg-input"); }}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 14, color: V("--text-secondary"), marginBottom: 16 }}>
            <Link to="/login" style={{ color: "#36C2CE", textDecoration: "none" }}>Inicia sessão</Link> para confirmar participação.
          </p>
        )}

        {/* RSVP Summary */}
        <div style={{ display: "flex", gap: 24, fontSize: 14, marginBottom: 16 }}>
          <span style={{ color: "#34d399", fontWeight: 500 }}>✅ {goingCount} vão</span>
          <span style={{ color: "#fbbf24", fontWeight: 500 }}>🤔 {maybeCount} talvez</span>
        </div>

        {/* Attendees List */}
        {rsvps.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rsvps.filter((r) => r.status === "going").map((rsvp) => (
              <div key={rsvp.userId} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14 }}>
                {rsvp.user.avatar && <img src={rsvp.user.avatar} alt="" style={{ width: 24, height: 24, borderRadius: "50%" }} />}
                <span style={{ color: V("--text-primary") }}>{rsvp.user.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
