import { useState, useEffect } from "react";
import api from "../services/api";
import DatePicker from "react-datepicker";
import { registerLocale, setDefaultLocale } from "react-datepicker";
import pt from "date-fns/locale/pt";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("pt", pt);
setDefaultLocale("pt");

const TYPES = [
  { value: "trail", label: "🏔️ Trilho" },
  { value: "urban", label: "🏙️ Urbano" },
  { value: "race", label: "🏅 Prova" },
  { value: "training", label: "💪 Treino" },
  { value: "social", label: "🎉 Social" },
  { value: "meeting", label: "📋 Reunião" },
];

/*
 * Timezone strategy: store Lisbon wall-clock as UTC in DB.
 * Example: user picks 08:30 Lisbon → stored as "2026-04-12T08:30:00.000Z"
 * On read back: extract UTC hours/minutes (= Lisbon time).
 * This means everyone sees "Europe/Lisbon" times regardless of their browser TZ.
 */

// Backend ISO → "YYYY-MM-DDTHH:mm" (Lisbon wall-clock via UTC getters)
const backendToForm = (val) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

// "YYYY-MM-DDTHH:mm" → Date for DatePicker (UTC-based)
const formToDate = (val) => {
  if (!val || typeof val !== "string" || val.length < 16) return null;
  const [dp, tp] = val.split("T");
  const [y, mo, d] = dp.split("-").map(Number);
  const [h, mi] = tp.split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi, 0, 0));
};

// Date from DatePicker OR raw text → "YYYY-MM-DDTHH:mm" (UTC getters = Lisbon wall-clock)
const dateToForm = (d) => {
  if (!d) return "";
  if (d instanceof Date) {
    if (isNaN(d.getTime())) return "";
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const min = String(d.getUTCMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }
  // Manual text input — pass through if it looks valid
  return typeof d === "string" && d.length >= 16 ? d : "";
};

// "YYYY-MM-DDTHH:mm" → ISO for DB — store exactly as shown, no conversion
const formToBackend = (localStr) => {
  if (!localStr) return null;
  return localStr + ":00.000Z";
};

function AdminEventForm({ event, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => ({
    title: event?.title || "",
    description: event?.description || "",
    date: backendToForm(event?.date),
    endDate: backendToForm(event?.endDate),
    location: event?.location || "",
    type: event?.type || "training",
    club: "Alverca Urban Runners",
    distance: event?.distance || "",
    elevation: event?.elevation || "",
    url: event?.url || "",
    imageUrl: event?.imageUrl || "",
  }));
  const [extracting, setExtracting] = useState(false);

  const handleChange = (f, v) => setForm((p) => ({ ...p, [f]: v }));

  // Patch "Time" → "Hora"
  useEffect(() => {
    const timer = setInterval(() => {
      document.querySelectorAll('.react-datepicker__header--time .react-datepicker-time__header')
        .forEach(el => { if (el.textContent === 'Time') el.textContent = 'Hora'; });
    }, 500);
    return () => clearInterval(timer);
  }, [form.date]);

  const handleUrlExtract = async () => {
    if (!form.url) return;
    setExtracting(true);
    try {
      const res = await api("/api/events/extract-image", {
        method: "POST",
        body: JSON.stringify({ url: form.url }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setForm((p) => ({ ...p, imageUrl: data.imageUrl }));
      } else {
        alert("Não foi possível extrair a imagem. Insere manualmente.");
      }
    } catch (error) {
      console.error("Error extracting image:", error);
      alert("Erro ao extrair imagem.");
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      date: formToBackend(form.date),
      endDate: form.endDate ? formToBackend(form.endDate) : null,
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-gray-900 rounded-xl border border-gray-800 p-6">
      <h3 className="text-lg font-bold">{event ? "Editar Evento" : "Novo Evento"}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Título *</label>
          <input type="text" value={form.title} onChange={(e) => handleChange("title", e.target.value)} required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Tipo</label>
          <select value={form.type} onChange={(e) => handleChange("type", e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Data e hora *</label>
          <DatePicker
            selected={formToDate(form.date)}
            onChange={(d) => handleChange("date", dateToForm(d))}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={5}
            dateFormat="dd/MM/yyyy HH:mm"
            placeholderText="dd/mm/aaaa hh:mm"
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white cursor-pointer"
            calendarClassName="bg-gray-900 border border-gray-700 rounded-lg"
            popperClassName="z-50"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Data fim (opcional)</label>
          <DatePicker
            selected={formToDate(form.endDate)}
            onChange={(d) => handleChange("endDate", d ? dateToForm(d) : "")}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={5}
            dateFormat="dd/MM/yyyy HH:mm"
            placeholderText="dd/mm/aaaa hh:mm"
            isClearable
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white cursor-pointer"
            calendarClassName="bg-gray-900 border border-gray-700 rounded-lg text-gray-100"
            popperClassName="z-50"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Localização</label>
          <input type="text" value={form.location} onChange={(e) => handleChange("location", e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">URL do Evento</label>
          <div className="flex gap-2">
            <input type="url" value={form.url || ""} onChange={(e) => handleChange("url", e.target.value)}
              placeholder="https://example.com/event"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
            <button type="button" onClick={handleUrlExtract} disabled={extracting || !form.url}
              className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-lg text-sm whitespace-nowrap" style={{ color: "#fff" }}>
              {extracting ? "⏳..." : "📷 Extrair"}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Imagem do Evento</label>
          <input type="url" value={form.imageUrl || ""} onChange={(e) => handleChange("imageUrl", e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
          {form.imageUrl && (
            <div className="mt-2">
              <img src={form.imageUrl} alt="Preview" className="w-full h-32 object-cover rounded-lg" onError={(e) => e.target.style.display = "none"} />
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Distância (km)</label>
            <input type="number" step="0.1" value={form.distance || ""} onChange={(e) => handleChange("distance", e.target.value || null)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Elevação (m)</label>
            <input type="number" value={form.elevation || ""} onChange={(e) => handleChange("elevation", e.target.value || null)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
      </div>
      {/* Dark theme overrides for react-datepicker */}
      <style>{`
        .react-datepicker { background-color: #0D2137 !important; border-color: #1B3A5C !important; color: #e8ecef !important; font-family: inherit; }
        .react-datepicker__header { background-color: #0a1a2d !important; border-color: #1B3A5C !important; }
        .react-datepicker__day { color: #e8ecef !important; }
        .react-datepicker__day:hover { background-color: #1a3a52 !important; }
        .react-datepicker__day--selected { background-color: #CC3333 !important; color: #fff !important; }
        .react-datepicker__day--today { font-weight: normal; color: #CC3333 !important; }
        .react-datepicker__current-month { color: #e8ecef !important; }
        .react-datepicker__day-name { color: #9ca3af !important; }
        .react-datepicker__time-container { background-color: #0a1a2d !important; border-color: #1B3A5C !important; width: 90px !important; }
        .react-datepicker__header--time { background-color: #0a1a2d !important; border-color: #1B3A5C !important; }
        .react-datepicker__header--time span { color: #e8ecef !important; }
        .react-datepicker__time { background-color: #0a1a2d !important; }
        .react-datepicker__time-box { background-color: #0a1a2d !important; }
        .react-datepicker__time-list { background-color: #0a1a2d !important; }
        .react-datepicker__time-list-item { color: #e8ecef !important; background-color: #0a1a2d !important; font-size: 13px !important; }
        .react-datepicker__time-list-item:hover { background-color: #1a3a52 !important; color: #fff !important; }
        .react-datepicker__time-list-item--selected { background-color: #CC3333 !important; color: #fff !important; }
        .react-datepicker__header--time { font-weight: normal !important; }
        .react-datepicker__header--time span { font-weight: normal !important; }
        .react-datepicker-time__header { color: #e8ecef !important; font-weight: normal !important; }
        .react-datepicker__triangle path:first-child { fill: #0D2137 !important; }
        .react-datepicker__triangle path:last-child { stroke: #1B3A5C !important; }
        .react-datepicker-popper { z-index: 9999 !important; }
      `}
      </style>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Descrição</label>
        <textarea value={form.description} onChange={(e) => handleChange("description", e.target.value)} rows={2}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition" style={{ color: "#e8ecef" }}>Cancelar</button>
        <button type="submit" className="bg-primary hover:bg-primary-dark px-6 py-2 rounded-lg text-sm font-medium transition">
          {event ? "Guardar" : "Criar Evento"}
        </button>
      </div>
    </form>
  );
}

function useEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchEvents = () => api("/api/events").then((r) => r.json()).then(setEvents).finally(() => setLoading(false));
  useEffect(() => { fetchEvents(); }, []);
  return { events, loading, fetchEvents };
}

// Format DB UTC date for list display (Lisbon wall-clock)
const formatEventDate = (isoStr) => {
  const d = new Date(isoStr);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
};

export default function AdminPage({ user }) {
  const { events, loading, fetchEvents } = useEvents();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const handleDelete = async (id) => {
    if (!confirm("Eliminar este evento?")) return;
    await api(`/api/events/${id}`, { method: "DELETE" });
    fetchEvents();
  };

  const handleSubmit = async (form) => {
    try {
      const payload = {
        ...form,
        distance: form.distance ? parseFloat(form.distance) : null,
        elevation: form.elevation ? parseInt(form.elevation, 10) : null,
        lat: form.lat ? parseFloat(form.lat) : null,
        lng: form.lng ? parseFloat(form.lng) : null,
      };
      const method = editing ? "PUT" : "POST";
      const url = editing ? `/api/events/${editing.id}` : "/api/events";
      const res = await api(url, { method, body: JSON.stringify(payload) });
      if (res.ok) {
        setShowForm(false);
        setEditing(null);
        fetchEvents();
      } else {
        const error = await res.json();
        alert("Erro ao guardar: " + (error.error || "Erro desconhecido"));
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao guardar: " + err.message);
    }
  };

  if (!user || user.role !== "admin") {
    return <div className="text-center py-20 text-gray-400">Acesso restrito a administradores.</div>;
  }

  if (showForm) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{editing ? "Editar Evento" : "Novo Evento"}</h1>
          <button onClick={() => { setShowForm(false); setEditing(null); }}
            className="text-gray-400 hover:text-white text-sm" style={{ color: "#9ca3af" }}>
            ← Voltar à lista
          </button>
        </div>
        <AdminEventForm event={editing} onSubmit={handleSubmit} onCancel={() => { setShowForm(false); setEditing(null); }} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">⚙️ Admin - Gerir Eventos</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-primary hover:bg-primary-dark px-4 py-2 rounded-lg text-sm font-medium transition" style={{ color: "#fff" }}>
          + Novo Evento
        </button>
      </div>

      {loading && <div className="text-center py-12 text-gray-400">Carregando...</div>}

      <div className="mt-6 space-y-3">
        {events.map((ev) => (
          <div key={ev.id} className="bg-gray-900 rounded-lg border border-gray-800 p-4 flex justify-between items-center flex-wrap gap-3">
            <div>
              <h3 className="font-medium">{ev.title}</h3>
              <p className="text-sm text-gray-400">{formatEventDate(ev.date)} • {ev.location || "Sem local"} • {ev.type}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(ev); setShowForm(true); }}
                className="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded transition" style={{ color: "#fff" }}>Editar</button>
              <button onClick={() => handleDelete(ev.id)}
                className="text-sm bg-red-900/50 hover:bg-red-900 px-3 py-1.5 rounded text-red-400 transition" style={{ color: "#f87171" }}>Eliminar</button>
            </div>
          </div>
        ))}
        {!loading && events.length === 0 && <p className="text-gray-500 text-center py-8">Nenhum evento criado.</p>}
      </div>
    </div>
  );
}
