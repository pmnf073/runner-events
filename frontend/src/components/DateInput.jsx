import { useEffect, useRef, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { pt } from "date-fns/locale/pt";
import "react-datepicker/dist/react-datepicker.css";
import "../datepicker.css";
import { displayDateForInput } from "../utils/format";

registerLocale("pt", pt);

export function CalendarIcon({ size = 18, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="4.5" width="18" height="17" rx="2" />
      <path d="M16 2.5v4M8 2.5v4M3 10h18" />
    </svg>
  );
}

// "YYYY-MM-DD" <-> Date at local midnight, for the calendar only.
const ymdToDate = (ymd) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd || "");
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
const dateToYmd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// "05/03/1990" or "5/3/1990" -> "1990-03-05"; null when incomplete or not a real date.
export function parseTypedDate(text) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Digits typed without slashes (phone numeric keypads have no "/") become dd/mm/aaaa as they are typed.
function autoFormat(raw) {
  const parts = raw.split("/");
  const typedOwnSlashes = parts.slice(0, -1).some((p) => p.length !== 2);
  if (!/^[\d/]*$/.test(raw) || typedOwnSlashes) return raw;
  const d = raw.replace(/\D/g, "").slice(0, 8);
  return d.slice(0, 2) + (d.length > 2 ? "/" + d.slice(2, 4) : "") + (d.length > 4 ? "/" + d.slice(4) : "");
}

// Date field: type dd/mm/aaaa or pick it on the calendar (icon on the right).
// `value` and `onChange` use YYYY-MM-DD ("" when empty).
// The parent only receives complete, valid dates; an invalid typed entry reverts on blur.
// `birthDate` opens the calendar on month/year selectors and stops at today.
export default function DateInput({ value, onChange, style, birthDate = false, ...rest }) {
  const [text, setText] = useState(() => displayDateForInput(value));
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (d) => {
    setOpen(false);
    if (!d) return;
    const ymd = dateToYmd(d);
    setText(displayDateForInput(ymd));
    onChange(ymd);
  };

  useEffect(() => {
    const current = text.trim() === "" ? "" : parseTypedDate(text);
    const incoming = (value || "").split("T")[0];
    if (incoming !== current) setText(displayDateForInput(incoming));
    // Only react to changes coming from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e) => {
    const next = autoFormat(e.target.value);
    setText(next);
    if (next.trim() === "") return onChange("");
    const ymd = parseTypedDate(next);
    if (ymd) onChange(ymd);
  };

  const handleBlur = (e) => {
    if (text.trim() !== "" && !parseTypedDate(text)) setText(displayDateForInput(value));
    rest.onBlur?.(e);
  };

  const invalid = /\/\d{4}$/.test(text.trim()) && !parseTypedDate(text);

  const selected = ymdToDate(value);

  return (
    <div ref={boxRef} style={{ position: "relative", width: style?.width ?? "100%" }}>
      <input
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        maxLength={10}
        {...rest}
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-invalid={invalid || undefined}
        style={{ ...style, width: "100%", boxSizing: "border-box", paddingRight: 38, ...(invalid ? { borderColor: "var(--c-danger)" } : null) }}
      />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Escolher data no calendário"
        aria-expanded={open}
        title="Escolher data no calendário"
        style={{ position: "absolute", top: 0, right: 0, height: "100%", width: 38, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: 0 }}>
        <CalendarIcon />
      </button>
      {open && (
        <div className="date-input-pop">
          <DatePicker
            inline
            locale="pt"
            selected={selected}
            openToDate={selected || (birthDate ? new Date(new Date().getFullYear() - 30, 0, 1) : undefined)}
            onChange={pick}
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            minDate={birthDate ? new Date(1920, 0, 1) : undefined}
            maxDate={birthDate ? new Date() : undefined}
          />
        </div>
      )}
      {open && <div className="date-input-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}
    </div>
  );
}
