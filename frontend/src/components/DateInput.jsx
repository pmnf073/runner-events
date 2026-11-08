import { useEffect, useState } from "react";
import { displayDateForInput } from "../utils/format";

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

// Text field for a date typed as dd/mm/aaaa. `value` and `onChange` use YYYY-MM-DD ("" when empty).
// The parent only receives complete, valid dates; an invalid entry reverts on blur.
export default function DateInput({ value, onChange, style, ...rest }) {
  const [text, setText] = useState(() => displayDateForInput(value));

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

  return (
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
      style={{ ...style, ...(invalid ? { borderColor: "var(--c-danger)" } : null) }}
    />
  );
}
