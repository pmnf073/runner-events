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

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div></div>;
  if (!event) return <div className="text-center py-12 text-gray-400">Evento não encontrado</div>;

  const date = new Date(event.date);
  const endDate = event.endDate ? new Date(event.endDate) : null;
  const goingCount = rsvps.filter((r) => r.status === "going").length;
  const maybeCount = rsvps.filter((r) => r.status === "maybe").length;

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/" className="text-primary-light hover:underline text-sm mb-4 inline-block">← Voltar ao calendário</Link>

      {/* Event Header */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <span className="text-sm font-medium text-gray-400">{TYPE_LABELS[event.type] || event.type}</span>
            <h1 className="text-2xl font-bold mt-1">{event.title}</h1>
          </div>
          <span className="bg-gray-800 px-3 py-1 rounded-full text-sm text-gray-300">{event.club}</span>
        </div>

        {/* Event Image */}
        {event.imageUrl && (
          <div className="mt-6">
            <img src={event.imageUrl} alt={event.title} className="w-full max-h-96 object-contain rounded-lg" onError={(e) => e.target.style.display = "none"} />
          </div>
        )}

        {/* Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="flex items-center gap-3">
            <span className="text-xl">📅</span>
            <div>
              <div className="text-sm text-gray-400">Data</div>
              <div className="font-medium">{date.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
              <div className="text-sm text-gray-400">
                {date.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                {endDate && ` — ${endDate.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`}
              </div>
            </div>
          </div>
          {event.location && (
            <div className="flex items-center gap-3">
              <span className="text-xl">📍</span>
              <div>
                <div className="text-sm text-gray-400">Local</div>
                <div className="font-medium">{event.location}</div>
              </div>
            </div>
          )}
          {event.distance && (
            <div className="flex items-center gap-3">
              <span className="text-xl">📏</span>
              <div>
                <div className="text-sm text-gray-400">Distância</div>
                <div className="font-medium">{event.distance} km</div>
              </div>
            </div>
          )}
          {event.elevation && (
            <div className="flex items-center gap-3">
              <span className="text-xl">⛰️</span>
              <div>
                <div className="text-sm text-gray-400">Elevação</div>
                <div className="font-medium">{event.elevation}m</div>
              </div>
            </div>
          )}
          {event.url && (
            <div className="flex items-center gap-3">
              <span className="text-xl">🔗</span>
              <div>
                <div className="text-sm text-gray-400">URL</div>
                <a href={event.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary-light hover:underline break-all">
                  {event.url}
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Descrição</h3>
            <p className="text-gray-300 whitespace-pre-line">{event.description}</p>
          </div>
        )}
      </div>

      {/* RSVP Section */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h3 className="text-lg font-bold mb-4">Participação</h3>

        {user ? (
          <div className="flex gap-3 mb-6 flex-wrap">
            {[
              { key: "going", label: "✅ Vou", color: "bg-emerald-600 hover:bg-emerald-700" },
              { key: "maybe", label: "🤔 Talvez", color: "bg-amber-600 hover:bg-amber-700" },
              { key: "not_going", label: "❌ Não vou", color: "bg-red-600 hover:bg-red-700" },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => handleRsvp(option.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${rsvpStatus === option.key ? option.color : "bg-gray-800 hover:bg-gray-700"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-4">
            <Link to="/login" className="text-primary-light hover:underline">Inicia sessão</Link> para confirmar participação.
          </p>
        )}

        {/* RSVP Summary */}
        <div className="flex gap-6 text-sm mb-4">
          <span className="text-emerald-400 font-medium">✅ {goingCount} vão</span>
          <span className="text-amber-400 font-medium">🤔 {maybeCount} talvez</span>
        </div>

        {/* Attendees List */}
        {rsvps.length > 0 && (
          <div className="space-y-2">
            {rsvps.filter((r) => r.status === "going").map((rsvp) => (
              <div key={rsvp.userId} className="flex items-center gap-3 text-sm">
                {rsvp.user.avatar && <img src={rsvp.user.avatar} alt="" className="w-6 h-6 rounded-full" />}
                <span className="text-gray-300">{rsvp.user.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
