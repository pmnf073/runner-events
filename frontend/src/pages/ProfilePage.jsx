import { useEffect, useState } from "react";
import api, { openApiFile } from "../services/api";
import { displayDateForInput, formatCurrency, formatDate, MEMBERSHIP_STATUS, parseInputDateToYMD } from "../utils/format";

const V = (name) => `var(${name})`;

const MEMBER_STATUS = { active: "Ativo", suspended: "Suspenso", resigned: "Demitiu-se", excluded: "Excluído" };
const METHOD_LABELS = { transfer: "Transferência", cash: "Numerário", mbway: "MB WAY", card: "Cartão" };

// Address of the personal ICS feed. Without VITE_API_URL the API is on the same origin.
function calendarFeedUrl(token) {
  const base = import.meta.env.VITE_API_URL || window.location.origin;
  return `${base}/api/calendar/${token}.ics`;
}

export default function ProfilePage({ user, setUser }) {
  const [profile, setProfile] = useState(null);
  const [member, setMember] = useState(null);
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    const res = await api("/api/me/profile");
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Erro ao carregar o perfil.");
    setProfile(data.user);
    setMember(data.member);
    setForm({
      name: data.user.name || "",
      phone: data.user.phone || "",
      altContact: data.user.altContact || "",
      address: data.user.address || "",
      dob: data.user.dob ? data.user.dob.split("T")[0] : "",
      nif: data.user.nif || "",
      emailOptOut: data.user.emailOptOut,
    });
  };

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setSaving(true);
    try {
      const res = await api("/api/me/profile", { method: "PUT", body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Erro ao guardar.");
      setProfile(data.user);
      setUser?.((prev) => (prev ? { ...prev, name: data.user.name } : prev));
      setMessage("Dados guardados.");
    } catch {
      setError("Erro de ligação. Tenta outra vez.");
    } finally {
      setSaving(false);
    }
  };

  const createCalendarLink = async () => {
    if (profile.calendarToken && !confirm("O link atual deixa de funcionar. Continuar?")) return;
    const res = await api("/api/me/calendar-token", { method: "POST" });
    if (res.ok) setProfile({ ...profile, calendarToken: (await res.json()).calendarToken });
  };

  const removeCalendarLink = async () => {
    if (!confirm("Desativar o link? Os calendários que o usam deixam de atualizar.")) return;
    const res = await api("/api/me/calendar-token", { method: "DELETE" });
    if (res.ok) setProfile({ ...profile, calendarToken: null });
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Copia o link:", text);
    }
  };

  const openReceipt = (id) => openApiFile(`/api/me/payments/${id}/receipt`).catch((err) => alert(err.message));

  if (!user) return null;
  if (!form) {
    return <div style={{ textAlign: "center", padding: 80, color: V("--text-secondary") }}>{error || "A carregar..."}</div>;
  }

  const card = { background: V("--bg-card"), border: `1px solid ${V("--border-subtle")}`, borderRadius: 12, padding: 24, marginBottom: 24 };
  const h2 = { fontSize: 18, fontWeight: 700, color: V("--text-heading"), margin: "0 0 16px" };
  const inputStyle = { width: "100%", background: V("--bg-input"), border: `1px solid ${V("--border-input")}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, color: V("--text-primary"), outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontSize: 13, color: V("--text-muted"), marginBottom: 6 };
  const th = { textAlign: "left", padding: "8px 10px", fontSize: 12, color: V("--text-muted"), borderBottom: `1px solid ${V("--border-subtle")}`, fontWeight: 600 };
  const td = { padding: "10px", fontSize: 14, color: V("--text-primary"), borderBottom: `1px solid ${V("--border-subtle")}` };
  const button = { background: "#CC3333", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 14, fontWeight: 500, cursor: "pointer" };
  const secondaryButton = { ...button, background: V("--bg-input"), color: V("--text-primary"), border: `1px solid ${V("--border-input")}` };
  const field = (name, label, props = {}) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} style={inputStyle} {...props} />
    </div>
  );
  const feedUrl = profile.calendarToken ? calendarFeedUrl(profile.calendarToken) : null;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: V("--text-heading"), marginBottom: 4 }}>O meu perfil</h1>
      <p style={{ fontSize: 14, color: V("--text-muted"), marginBottom: 24 }}>{profile.email}</p>

      <form onSubmit={save} style={card}>
        <h2 style={h2}>Dados pessoais</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {field("name", "Nome", { required: true })}
          {field("phone", "Telefone", { type: "tel" })}
          {field("altContact", "Contacto alternativo")}
          <div>
            <label style={labelStyle}>Data de nascimento</label>
            <input value={displayDateForInput(form.dob)} onChange={(e) => setForm({ ...form, dob: parseInputDateToYMD(e.target.value) })} placeholder="dd/mm/aaaa" style={inputStyle} />
          </div>
          {field("nif", "NIF (para os recibos)", { inputMode: "numeric", maxLength: 9 })}
          <div style={{ gridColumn: "1 / -1" }}>{field("address", "Morada")}</div>
        </div>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 20, fontSize: 14, color: V("--text-primary"), cursor: "pointer" }}>
          <input type="checkbox" checked={form.emailOptOut} onChange={(e) => setForm({ ...form, emailOptOut: e.target.checked })} style={{ marginTop: 3 }} />
          <span>Não quero receber lembretes nem comunicações do clube por email
            <span style={{ display: "block", fontSize: 12, color: V("--text-muted") }}>Os emails de recuperação de password continuam a ser enviados.</span>
          </span>
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 20 }}>
          <button type="submit" disabled={saving} style={{ ...button, opacity: saving ? 0.5 : 1 }}>{saving ? "A guardar..." : "Guardar"}</button>
          {message && <span style={{ fontSize: 14, color: "#10b981" }}>{message}</span>}
          {error && <span style={{ fontSize: 14, color: "#f87171" }}>{error}</span>}
        </div>
      </form>

      <section style={card}>
        <h2 style={h2}>Sócio</h2>
        {!member ? (
          <p style={{ fontSize: 14, color: V("--text-secondary"), margin: 0 }}>Ainda não estás inscrito como sócio. Fala com a direção do clube.</p>
        ) : (
          <>
            <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginBottom: 20, fontSize: 14, color: V("--text-primary") }}>
              <div><div style={labelStyle}>Número</div><strong>#{member.memberNumber}</strong></div>
              <div><div style={labelStyle}>Estado</div><strong>{MEMBER_STATUS[member.status] || member.status}</strong></div>
              <div><div style={labelStyle}>Sócio desde</div><strong>{formatDate(member.joinedAt)}</strong></div>
              <div><div style={labelStyle}>Saldo</div><strong style={{ color: member.balance < 0 ? "#f87171" : "#10b981" }}>{formatCurrency(member.balance)}</strong></div>
            </div>

            <h3 style={{ fontSize: 15, fontWeight: 600, color: V("--text-heading"), margin: "0 0 8px" }}>Quotas</h3>
            {member.memberships.length === 0 ? (
              <p style={{ fontSize: 14, color: V("--text-secondary") }}>Sem quotas registadas.</p>
            ) : (
              <div style={{ overflowX: "auto", marginBottom: 24 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={th}>Ano</th><th style={th}>Valor</th><th style={th}>Desconto</th><th style={th}>Prazo</th><th style={th}>Estado</th></tr></thead>
                  <tbody>
                    {member.memberships.map((m) => (
                      <tr key={m.id}>
                        <td style={td}>{m.year}</td>
                        <td style={td}>{formatCurrency(m.amount)}</td>
                        <td style={td}>{m.discount ? formatCurrency(m.discount) : "—"}</td>
                        <td style={td}>{formatDate(m.dueDate)}</td>
                        <td style={td}>{MEMBERSHIP_STATUS[m.status] || m.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h3 style={{ fontSize: 15, fontWeight: 600, color: V("--text-heading"), margin: "0 0 8px" }}>Pagamentos</h3>
            {member.payments.length === 0 ? (
              <p style={{ fontSize: 14, color: V("--text-secondary"), margin: 0 }}>Sem pagamentos registados.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={th}>Data</th><th style={th}>Recibo</th><th style={th}>Descrição</th><th style={th}>Método</th><th style={th}>Valor</th><th style={th}></th></tr></thead>
                  <tbody>
                    {member.payments.map((p) => (
                      <tr key={p.id}>
                        <td style={td}>{formatDate(p.date)}</td>
                        <td style={{ ...td, fontFamily: "monospace" }}>{p.receiptNumber}</td>
                        <td style={td}>{p.membership ? `Quota ${p.membership.year}` : p.notes || "—"}</td>
                        <td style={td}>{METHOD_LABELS[p.method] || p.method}</td>
                        <td style={td}>{formatCurrency(p.paidAmount)}</td>
                        <td style={td}><button type="button" onClick={() => openReceipt(p.id)} style={{ ...secondaryButton, padding: "6px 10px", fontSize: 13 }}>Recibo PDF</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      <section style={card}>
        <h2 style={h2}>Calendário no telemóvel</h2>
        <p style={{ fontSize: 14, color: V("--text-secondary"), marginTop: 0 }}>
          Subscreve os eventos do clube no Google Calendar, Apple Calendar ou Outlook. O calendário atualiza sozinho.
          O link é pessoal: não o partilhes.
        </p>
        {feedUrl ? (
          <>
            <input readOnly value={feedUrl} onFocus={(e) => e.target.select()} style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12, marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => copy(feedUrl)} style={button}>{copied ? "Copiado" : "Copiar link"}</button>
              <a href={feedUrl.replace(/^https?:/, "webcal:")} style={{ ...secondaryButton, textDecoration: "none" }}>Abrir na app de calendário</a>
              <button type="button" onClick={createCalendarLink} style={secondaryButton}>Gerar novo link</button>
              <button type="button" onClick={removeCalendarLink} style={secondaryButton}>Desativar</button>
            </div>
            <p style={{ fontSize: 12, color: V("--text-muted"), marginBottom: 0 }}>
              Google Calendar: Outros calendários, "+", "A partir do URL", e cola o link.
            </p>
          </>
        ) : (
          <button type="button" onClick={createCalendarLink} style={button}>Criar link de subscrição</button>
        )}
      </section>
    </div>
  );
}
