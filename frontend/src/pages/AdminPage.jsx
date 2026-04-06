import { useState, useEffect } from "react";
import api from "../services/api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const TYPES = [
  { value: "trail", label: "🏔️ Trilho" },
  { value: "urban", label: "🏙️ Urbano" },
  { value: "race", label: "🏅 Prova" },
  { value: "training", label: "💪 Treino" },
  { value: "social", label: "🎉 Social" },
  { value: "meeting", label: "📋 Reunião" },
];

function AdminEventForm({ event, onSubmit, onCancel }) {
  const [form, setForm] = useState(event || {
    title: "", description: "", date: "", endDate: "", location: "", type: "training",
    club: "Alverca Urban Runners", distance: "", elevation: "", url: "", imageUrl: "",
  });
  const [extracting, setExtracting] = useState(false);

  const handleChange = (f, v) => setForm((p) => ({ ...p, [f]: v }));

  // Convert "YYYY-MM-DDTHH:mm" from datetime-local to Date object
  const parseLocalDate = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };
  // Convert Date object to "YYYY-MM-DDTHH:mm" for storage
  const formatLocalDate = (d) => {
    if (!d || isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

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

  const localToUTC = (localStr) => {
    if (!localStr) return null;
    // "2026-04-12T09:00" means 09:00 in the user's browser timezone
    const d = new Date(localStr + ":00");
    // d now represents 09:00 in local timezone, converted to internal UTC value
    // Convert back to correct UTC by adding the timezone offset
    const utcMs = d.getTime() + d.getTimezoneOffset() * 60 * 1000;
    return new Date(utcMs).toISOString();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      date: localToUTC(form.date),
      endDate: form.endDate ? localToUTC(form.endDate) : null,
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
            selected={parseLocalDate(form.date)}
            onChange={(d) => handleChange("date", formatLocalDate(d))}
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
            selected={parseLocalDate(form.endDate)}
            onChange={(d) => handleChange("endDate", d ? formatLocalDate(d) : "")}
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
              className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-lg text-sm whitespace-nowrap">
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
        .react-datepicker__day--today { font-weight: bold; color: #CC3333 !important; }
        .react-datepicker__current-month { color: #e8ecef !important; }
        .react-datepicker__day-name { color: #9ca3af !important; }
        /* Time container */
        .react-datepicker__time-container { background-color: #0a1a2d !important; border-color: #1B3A5C !important; width: 90px !important; }
        .react-datepicker__header--time { background-color: #0a1a2d !important; border-color: #1B3A5C !important; }
        .react-datepicker__header--time span { color: #e8ecef !important; }
        .react-datepicker__time { background-color: #0a1a2d !important; }
        .react-datepicker__time-box { background-color: #0a1a2d !important; }
        .react-datepicker__time-list { background-color: #0a1a2d !important; }
        .react-datepicker__time-list-item { color: #e8ecef !important; background-color: #0a1a2d !important; font-size: 13px !important; }
        .react-datepicker__time-list-item:hover { background-color: #1a3a52 !important; color: #fff !important; }
        .react-datepicker__time-list-item--selected { background-color: #CC3333 !important; color: #fff !important; }
        /* Selected time header */
        .react-datepicker-time__header { color: #e8ecef !important; }
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
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">Cancelar</button>
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
            className="text-gray-400 hover:text-white text-sm">
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
          className="bg-primary hover:bg-primary-dark px-4 py-2 rounded-lg text-sm font-medium transition">
          + Novo Evento
        </button>
      </div>

      {loading && <div className="text-center py-12 text-gray-400">Carregando...</div>}

      <div className="mt-6 space-y-3">
        {events.map((ev) => {
          const d = new Date(ev.date);
          return (
            <div key={ev.id} className="bg-gray-900 rounded-lg border border-gray-800 p-4 flex justify-between items-center flex-wrap gap-3">
              <div>
                <h3 className="font-medium">{ev.title}</h3>
                <p className="text-sm text-gray-400">{d.toLocaleDateString("pt-PT")} • {ev.location || "Sem local"} • {ev.type}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(ev); setShowForm(true); }}
                  className="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded transition">Editar</button>
                <button onClick={() => handleDelete(ev.id)}
                  className="text-sm bg-red-900/50 hover:bg-red-900 px-3 py-1.5 rounded text-red-400 transition">Eliminar</button>
              </div>
            </div>
          );
        })}
        {!loading && events.length === 0 && <p className="text-gray-500 text-center py-8">Nenhum evento criado.</p>}
      </div>
    </div>
  );
}
