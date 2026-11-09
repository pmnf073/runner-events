import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import DatePicker from "react-datepicker";
import { registerLocale, setDefaultLocale } from "react-datepicker";
import pt from "date-fns/locale/pt";
import "react-datepicker/dist/react-datepicker.css";
import "../datepicker.css";
import { CalendarIcon } from "../components/DateInput";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";

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

const WEEK_DAYS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
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

const MAX_LOCAL_IMAGE_BYTES = 2 * 1024 * 1024;

async function localImageToDataUrl(file) {
  if (!file.type.startsWith("image/")) throw new Error("Seleciona um ficheiro de imagem.");

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Não foi possível ler esta imagem."));
      img.src = sourceUrl;
    });
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) throw new Error("Não foi possível preparar esta imagem.");
    if (blob.size > MAX_LOCAL_IMAGE_BYTES) {
      throw new Error("A imagem é demasiado grande. Escolhe uma imagem mais pequena.");
    }

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Não foi possível preparar esta imagem."));
      reader.readAsDataURL(blob);
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function AdminEventForm({ event, onSubmit, onCancel, initialDate, isMobile = false }) {
  // Blocks a second submit while the first is still being saved (double clicks created duplicate events).
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    title: event?.title || "",
    description: event?.description || "",
    date: event ? backendToForm(event?.date) : (initialDate ? `${initialDate}T10:00` : ""),
    endDate: backendToForm(event?.endDate) || "",
    location: event?.location || "",
    type: event?.type || "training",
    club: "Alverca Urban Runners",
    distance: event?.distance || "",
    elevation: event?.elevation || "",
    url: event?.url || "",
    imageUrl: event?.imageUrl || "",
    recurrenceType: event?.recurrenceType || "",
    recurrenceDaysOfWeek: event?.recurrenceDaysOfWeek ? JSON.parse(event.recurrenceDaysOfWeek) : [],
    recurrenceEndDate: event?.recurrenceEndDate ? backendToForm(event.recurrenceEndDate) : "",
    recurrenceScope: event?.isRecurrenceInstance ? "single" : "all",
  }));
  const [extracting, setExtracting] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [localImageName, setLocalImageName] = useState("");

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

  const [searchingPR, setSearchingPR] = useState(false);
  const handlePortugalRunning = async () => {
    if (!form.title) return;
    setSearchingPR(true);
    try {
      const res = await api("/api/events/portugal-running-image", {
        method: "POST",
        body: JSON.stringify({ title: form.title, date: form.date || undefined }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setForm((p) => ({ ...p, imageUrl: data.imageUrl, url: p.url || data.pageUrl }));
      } else {
        alert("Não foi encontrada no Portugal Running uma prova com este nome.");
      }
    } catch (error) {
      console.error("Error searching Portugal Running:", error);
      alert("Erro ao procurar no Portugal Running.");
    } finally {
      setSearchingPR(false);
    }
  };

  const handleLocalImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessingImage(true);
    try {
      const imageUrl = await localImageToDataUrl(file);
      setForm((p) => ({ ...p, imageUrl }));
      setLocalImageName(file.name);
    } catch (error) {
      alert(error.message || "Não foi possível preparar esta imagem.");
    } finally {
      setProcessingImage(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((form.recurrenceType === "weekly" || form.recurrenceType === "biweekly") && form.recurrenceDaysOfWeek.length === 0) {
      alert("Seleciona pelo menos um dia da semana para a recorrência.");
      return;
    }
    if (form.recurrenceType && form.recurrenceEndDate && form.date && form.recurrenceEndDate < form.date.slice(0, 10)) {
      alert("A data fim da recorrência não pode ser anterior ao início.");
      return;
    }
    const payload = {
      ...form,
      date: formToBackend(form.date),
      endDate: form.endDate ? formToBackend(form.endDate) : null,
      recurrenceEndDate: form.recurrenceEndDate ? formToBackend(form.recurrenceEndDate) : null,
      recurrenceDaysOfWeek: form.recurrenceDaysOfWeek.length > 0 ? JSON.stringify(form.recurrenceDaysOfWeek) : null,
      recurrenceScope: form.recurrenceScope,
    };
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await onSubmit(payload);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  // Form input styles with theme-aware colors (16px no telemóvel para o iOS não fazer zoom)
  const fs = isMobile ? 16 : 14;
  const formInput = { width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "8px 12px", fontSize: fs, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" };
  const formLabel = { display: "block", fontSize: isMobile ? 13 : 14, color: "var(--text-secondary)", marginBottom: 4 };
  const smallBtn = { padding: "6px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border-input)", color: "var(--text-secondary)", background: "transparent", cursor: "pointer" };
  const secondaryBtn = { background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "8px 12px", fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" };
  const pair = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
  const sectionTitle = { fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--text-muted)", margin: 0 };
  // Uma imagem escolhida no dispositivo fica guardada como data: URL; não a mostramos no campo de texto.
  const isLocalImage = (form.imageUrl || "").startsWith("data:");
  const datePickerCommon = { style: { cursor: "pointer" }, showIcon: true, icon: <CalendarIcon size={16} />, toggleCalendarOnIconClick: true, popperClassName: "z-50" };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: isMobile ? 14 : 20, background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border-subtle)", padding: isMobile ? 14 : 24 }}>
      {event?.isRecurrenceInstance && (
        <div>
          <label style={formLabel}>Aplicar alterações a</label>
          <select value={form.recurrenceScope} onChange={(e) => handleChange("recurrenceScope", e.target.value)} style={formInput}>
            <option value="single">Apenas este evento</option>
            <option value="future">Este e futuros</option>
            <option value="all">Todos os eventos</option>
          </select>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 3fr) minmax(0, 2fr)", gap: isMobile ? 14 : 28, alignItems: "start" }}>
        {/* Detalhes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <p style={sectionTitle}>Detalhes</p>
          <div>
            <label style={formLabel}>Título *</label>
            <input type="text" value={form.title} onChange={(e) => handleChange("title", e.target.value)} required style={formInput} />
          </div>
          <div style={pair}>
            <div style={{ minWidth: 0 }}>
              <label style={formLabel}>Tipo</label>
              <select value={form.type} onChange={(e) => handleChange("type", e.target.value)} style={formInput}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={formLabel}>Recorrência</label>
              <select value={form.recurrenceType} onChange={(e) => handleChange("recurrenceType", e.target.value)} style={formInput}>
                <option value="">Não repete</option>
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quinzenal</option>
                <option value="monthly">Mensal</option>
              </select>
            </div>
          </div>
          <div style={isMobile ? { display: "flex", flexDirection: "column", gap: 14 } : pair}>
            <div style={{ minWidth: 0 }}>
              <label style={formLabel}>Data e hora *</label>
              <DatePicker
                {...datePickerCommon}
                selected={formToDate(form.date)}
                onChange={(d) => handleChange("date", dateToForm(d))}
                showTimeSelect
                timeFormat="HH:mm"
                timeCaption="Hora"
                timeIntervals={5}
                dateFormat="dd/MM/yyyy HH:mm"
                placeholderText="dd/mm/aaaa hh:mm"
                required
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={formLabel}>Data fim (opcional)</label>
              <DatePicker
                {...datePickerCommon}
                selected={formToDate(form.endDate)}
                onChange={(d) => handleChange("endDate", d ? dateToForm(d) : "")}
                showTimeSelect
                timeFormat="HH:mm"
                timeCaption="Hora"
                timeIntervals={5}
                dateFormat="dd/MM/yyyy HH:mm"
                placeholderText="dd/mm/aaaa hh:mm"
                isClearable
              />
            </div>
          </div>
          {form.recurrenceType && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 12, borderRadius: 8, border: "1px dashed var(--border-input)" }}>
              {(form.recurrenceType === "weekly" || form.recurrenceType === "biweekly") && (
                <div>
                  <label style={formLabel}>Dias da semana</label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {WEEK_DAYS.map((day) => {
                      const on = form.recurrenceDaysOfWeek.includes(day.value);
                      return (
                        <label key={day.value} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, padding: "4px 8px", borderRadius: 6, cursor: "pointer",
                          border: `1px solid ${on ? "var(--c-accent)" : "var(--border-input)"}`, color: on ? "var(--text-heading)" : "var(--text-secondary)" }}>
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={(e) => {
                              const days = e.target.checked
                                ? [...form.recurrenceDaysOfWeek, day.value]
                                : form.recurrenceDaysOfWeek.filter(d => d !== day.value);
                              handleChange("recurrenceDaysOfWeek", days);
                            }}
                          />
                          {day.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              <div>
                <label style={formLabel}>Data fim da recorrência</label>
                <DatePicker
                  {...datePickerCommon}
                  selected={formToDate(form.recurrenceEndDate)}
                  onChange={(d) => handleChange("recurrenceEndDate", d ? dateToForm(d) : "")}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="dd/mm/aaaa"
                  isClearable
                />
              </div>
            </div>
          )}
          <div>
            <label style={formLabel}>Localização</label>
            <input type="text" value={form.location} onChange={(e) => handleChange("location", e.target.value)} placeholder="Morada, local ou link" style={formInput} />
          </div>
          <div style={pair}>
            <div style={{ minWidth: 0 }}>
              <label style={formLabel}>Distância (km)</label>
              <input type="number" inputMode="decimal" step="0.1" value={form.distance || ""} onChange={(e) => handleChange("distance", e.target.value || null)} style={formInput} />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={formLabel}>Elevação (m)</label>
              <input type="number" inputMode="numeric" value={form.elevation || ""} onChange={(e) => handleChange("elevation", e.target.value || null)} style={formInput} />
            </div>
          </div>
          <div>
            <label style={formLabel}>Descrição</label>
            <textarea value={form.description} onChange={(e) => handleChange("description", e.target.value)} rows={isMobile ? 5 : 6}
              style={{ ...formInput, minHeight: 100, resize: "vertical", lineHeight: 1.45 }} />
          </div>
        </div>

        {/* Ligações e imagem */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <p style={sectionTitle}>Ligação e imagem</p>
          <div>
            <label style={formLabel}>URL do evento</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="url" value={form.url || ""} onChange={(e) => handleChange("url", e.target.value)}
                placeholder="https://..." style={{ ...formInput, flex: 1, minWidth: 0 }} />
              <button type="button" onClick={handleUrlExtract} disabled={extracting || !form.url} title="Extrair a imagem desta página"
                style={{ ...secondaryBtn, cursor: extracting || !form.url ? "not-allowed" : "pointer", opacity: extracting || !form.url ? 0.5 : 1 }}>
                {extracting ? "⏳..." : "📷 Extrair"}
              </button>
            </div>
          </div>
          <div>
            <label style={formLabel}>Imagem</label>
            {form.imageUrl && (
              <img src={form.imageUrl} alt="Pré-visualização" style={{ display: "block", width: "100%", aspectRatio: "16 / 9", maxHeight: 220, objectFit: "cover", borderRadius: 8, marginBottom: 8, background: "var(--bg-input)" }}
                onError={(e) => e.target.style.display = "none"} />
            )}
            <input type="url" value={isLocalImage ? "" : (form.imageUrl || "")} onChange={(e) => { handleChange("imageUrl", e.target.value); setLocalImageName(""); }}
              placeholder={isLocalImage ? `Imagem do dispositivo${localImageName ? `: ${localImageName}` : ""}` : "Link da imagem (https://...)"} style={formInput} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              <button type="button" onClick={handlePortugalRunning} disabled={searchingPR || !form.title}
                style={{ ...smallBtn, cursor: searchingPR || !form.title ? "not-allowed" : "pointer", opacity: searchingPR || !form.title ? 0.5 : 1 }}>
                {searchingPR ? "⏳ A procurar..." : "🔎 Portugal Running"}
              </button>
              <label style={{ ...smallBtn, cursor: processingImage ? "wait" : "pointer", opacity: processingImage ? 0.5 : 1 }}>
                {processingImage ? "⏳ A preparar..." : isMobile ? "📁 Do telemóvel" : "📁 Do computador"}
                <input type="file" accept="image/*" onChange={handleLocalImage} disabled={processingImage} style={{ display: "none" }} />
              </label>
              {form.imageUrl && (
                <button type="button" onClick={() => { handleChange("imageUrl", ""); setLocalImageName(""); }} style={smallBtn}>
                  ✕ Remover
                </button>
              )}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
              Imagens do dispositivo são otimizadas antes de guardar (máx. 2 MB).
            </div>
          </div>
        </div>
      </div>
      {/* Datepicker theme overrides */}
      <style>{`
        .react-datepicker-wrapper { width: 100%; display: block; }
        .react-datepicker__input-container input { width: 100%; background: var(--bg-input) !important; border: 1px solid var(--border-input) !important; border-radius: 8px; padding: 8px 12px; font-size: 14px; color: var(--text-primary) !important; outline: none; box-sizing: border-box; cursor: pointer; }
        @media (max-width: 768px) { .react-datepicker__input-container input { font-size: 16px; } }
      `}
      </style>

      <div style={isMobile
        ? { position: "sticky", bottom: 0, display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, margin: "0 -14px -14px", padding: "10px 14px", background: "var(--bg-card)", borderTop: "1px solid var(--border-subtle)", borderRadius: "0 0 12px 12px", zIndex: 5 }
        : { display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} style={{ ...secondaryBtn, padding: isMobile ? "10px 12px" : "8px 16px" }}>Cancelar</button>
        <button type="submit" disabled={saving} style={{ padding: isMobile ? "10px 12px" : "8px 24px", fontSize: isMobile ? 15 : 14, borderRadius: 8, fontWeight: 600, background: "#CC3333", color: "#fff", border: "none", cursor: saving ? "wait" : "pointer", opacity: saving ? 0.6 : 1, transition: "background 0.2s" }}
          onMouseEnter={e => e.target.style.background = "#be0000"}
          onMouseLeave={e => e.target.style.background = "#CC3333"}>
          {saving ? "A guardar..." : event ? "Guardar" : "Criar evento"}
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

const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.value, t.label]));

// Imported events sometimes carry a URL as their location: show only the site name.
const displayLocation = (loc) => {
  if (!loc) return "Sem local";
  if (/^https?:\/\//i.test(loc)) {
    try { return "🔗 " + new URL(loc).hostname.replace(/^www\./, ""); } catch { return loc; }
  }
  return loc;
};

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
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get("date");
  // O formulário aberto a partir da lista fica no endereço (?editar=<id> ou ?novo=1),
  // para o "back" do telemóvel fechar o formulário em vez de sair da página.
  const editParam = searchParams.get("editar");
  const newParam = searchParams.has("novo");
  const { events, loading, fetchEvents } = useEvents();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const targetId = id || editParam;
    if (targetId) {
      const eventToEdit = events.find(ev => ev.id === targetId);
      if (eventToEdit) {
        setEditing(eventToEdit);
        setShowForm(true);
      }
    } else if (dateParam || newParam) {
      // New event (with pre-filled date when it comes from the calendar)
      setEditing(null);
      setShowForm(true);
    } else {
      setEditing(null);
      setShowForm(false);
    }
  }, [id, editParam, newParam, events, dateParam]);

  // Fecha o formulário voltando à entrada anterior do histórico (lista, página do evento ou
  // calendário), para não acumular entradas. Sem histórico na app (link aberto diretamente),
  // vai para o destino por omissão.
  const closeForm = () => {
    if (location.key !== "default") navigate(-1);
    else navigate(id ? `/event/${id}` : dateParam ? "/" : "/admin", { replace: true });
  };

  const handleDelete = async (event) => {
    let scope = "all";
    if (event.isRecurrenceInstance) {
      const choice = prompt(
        "Eliminar recorrência:\n1 - Apenas este evento\n2 - Este e futuros\n3 - Todos os eventos",
        "1"
      );
      if (choice === null) return;
      if (choice === "1") scope = "single";
      else if (choice === "2") scope = "future";
      else if (choice === "3") scope = "all";
      else return alert("Escolha inválida.");
    } else if (!confirm("Eliminar este evento?")) {
      return;
    }
    await api(`/api/events/${event.id}?scope=${scope}`, { method: "DELETE" });
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
        // Back to where the form was opened from (event page, calendar or admin list)
        closeForm();
        if (!id && !dateParam) fetchEvents();
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: isMobile ? 12 : 24 }}>
          <h1 style={{ fontSize: isMobile ? 22 : 24, fontWeight: 700, margin: 0, color: "var(--text-heading)" }}>{editing ? "Editar evento" : "Novo evento"}</h1>
          <button onClick={closeForm}
            style={{ fontSize: 14, color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", padding: "6px 0", whiteSpace: "nowrap" }}>
            ← Voltar
          </button>
        </div>
        <AdminEventForm key={editing?.id || "novo"} event={editing} onSubmit={handleSubmit} onCancel={closeForm} initialDate={dateParam} isMobile={isMobile} />
      </div>
    );
  }

  // Filter events by search text and/or type
  const filtered = events.filter((ev) => {
    const matchSearch = !search ||
      ev.title.toLowerCase().includes(search.toLowerCase()) ||
      (ev.location || "").toLowerCase().includes(search.toLowerCase()) ||
      (ev.description || "").toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || ev.type === filterType;
    return matchSearch && matchType;
  });

  const clearFilters = () => { setSearch(""); setFilterType(""); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: isMobile ? 12 : 24 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 24, fontWeight: 700, margin: 0, color: "var(--text-heading)" }}>
          {isMobile ? "⚙️ Gerir eventos" : "⚙️ Admin - Gerir Eventos"}
        </h1>
        <button onClick={() => navigate("/admin?novo=1")}
          className="px-4 py-2 rounded-lg text-sm font-medium transition" style={{ background: "#22c55e", color: "#fff", whiteSpace: "nowrap" }}
          onMouseEnter={e => e.target.style.background = "#16a34a"}
          onMouseLeave={e => e.target.style.background = "#22c55e"}>
          {isMobile ? "+ Novo" : "+ Novo Evento"}
        </button>
      </div>

      {/* Search bar: no telemóvel a pesquisa ocupa a linha e o tipo (+ limpar) fica por baixo. */}
      <div style={isMobile
        ? { display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 12 }
        : { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={isMobile ? { gridColumn: "1 / -1" } : { flex: 1, minWidth: 200 }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isMobile ? "🔍 Pesquisar eventos..." : "🔍 Pesquisar por título, local, descrição..."}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-input)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: isMobile ? 16 : 14, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div style={isMobile ? { minWidth: 0, gridColumn: (search || filterType) ? "auto" : "1 / -1" } : { minWidth: 160 }}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-input)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: isMobile ? 16 : 14, outline: "none" }}
          >
            <option value="">Todos os tipos</option>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        {(search || filterType) && (
          <button onClick={clearFilters}
            style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14, whiteSpace: "nowrap" }}>
            ✕ Limpar
          </button>
        )}
      </div>
      {filtered.length < events.length && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -8, marginBottom: 8 }}>
          Mostrando {filtered.length} de {events.length} eventos
        </p>
      )}

      {loading && <div className="text-center py-12" style={{ color: "var(--text-secondary)" }}>A carregar...</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 8 : 12, marginTop: isMobile ? 12 : 24 }}>
        {filtered.map((ev) => (
          <div key={ev.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: isMobile ? "10px 12px" : 16,
            display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: isMobile ? "nowrap" : "wrap", gap: isMobile ? 10 : 12 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h3 style={{ fontWeight: 600, margin: 0, color: "var(--text-heading)", fontSize: isMobile ? 15 : 16 }}>{ev.title}</h3>
              {isMobile ? (
                <>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {formatEventDate(ev.date)} • {TYPE_LABEL[ev.type] || ev.type}
                  </p>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "1px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {displayLocation(ev.location)}
                  </p>
                </>
              ) : (
                <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "2px 0 0" }}>
                  {formatEventDate(ev.date)} • {TYPE_LABEL[ev.type] || ev.type} • {displayLocation(ev.location)}
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: isMobile ? 6 : 8, flexShrink: 0 }}>
              <button onClick={() => navigate(`/admin?editar=${encodeURIComponent(ev.id)}`)}
                style={{ fontSize: 14, padding: isMobile ? "6px 12px" : "6px 12px", minHeight: isMobile ? 36 : undefined, borderRadius: 6, border: "1px solid var(--border-subtle)", background: "var(--bg-input)", color: "var(--text-primary)", cursor: "pointer" }}>
                Editar
              </button>
              <button onClick={() => handleDelete(ev)} aria-label="Eliminar evento" title="Eliminar"
                style={{ fontSize: 14, padding: "6px 12px", minHeight: isMobile ? 36 : undefined, borderRadius: 6, border: "none", background: "#CC3333", color: "#fff", cursor: "pointer" }}>
                {isMobile ? "🗑️" : "Eliminar"}
              </button>
            </div>
          </div>
        ))}
        {filtered.length > 0 || loading || null}
        {!loading && filtered.length === 0 && (
          <p className="text-center py-8" style={{ color: "var(--text-muted)" }}>
            {events.length === 0 ? "Nenhum evento criado." : "Nenhum evento corresponde à pesquisa."}
          </p>
        )}
      </div>
    </div>
  );
}
