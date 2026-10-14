import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const V = (name) => `var(${name})`;

const AUDIENCES = {
  members_active: "Sócios ativos",
  fees_overdue: "Sócios com quota em atraso",
  users_active: "Todos os utilizadores ativos",
};

export default function AnnouncementsPage({ user }) {
  const navigate = useNavigate();
  const [audience, setAudience] = useState("members_active");
  const [info, setInfo] = useState(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/");
      return;
    }
    setInfo(null);
    api(`/api/announcements/audience?audience=${audience}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao contar os destinatários.");
        setInfo(data);
      })
      .catch((err) => setError(err.message));
  }, [user, navigate, audience]);

  const send = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    if (!confirm(`Enviar "${subject}" a ${info.recipients} pessoas? Não é possível cancelar depois.`)) return;
    setSending(true);
    try {
      const res = await api("/api/announcements", { method: "POST", body: JSON.stringify({ audience, subject, body }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar.");
      setMessage(`A enviar para ${data.recipients} pessoas. O resultado fica registado na auditoria.`);
      setSubject("");
      setBody("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const card = { background: V("--bg-card"), border: `1px solid ${V("--border-subtle")}`, borderRadius: 12, padding: 24 };
  const inputStyle = { width: "100%", background: V("--bg-input"), border: `1px solid ${V("--border-input")}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, color: V("--text-primary"), outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
  const labelStyle = { display: "block", fontSize: 13, color: V("--text-muted"), marginBottom: 6 };
  const canSend = info && info.emailConfigured && info.recipients > 0 && subject.trim() && body.trim() && !sending;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: V("--text-heading"), marginBottom: 4 }}>Comunicações</h1>
      <p style={{ fontSize: 14, color: V("--text-muted"), marginBottom: 20 }}>Email da direção para os sócios. Quem desativou os emails no perfil não recebe.</p>

      {info && !info.emailConfigured && (
        <div style={{ ...card, padding: 16, marginBottom: 16, borderColor: "#f59e0b", color: V("--text-primary"), fontSize: 14 }}>
          O envio de email não está configurado no servidor (RESEND_API_KEY e EMAIL_FROM). Podes escrever a mensagem, mas não é possível enviá-la.
        </div>
      )}

      <form onSubmit={send} style={card}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Destinatários</label>
          <select value={audience} onChange={(e) => setAudience(e.target.value)} style={inputStyle}>
            {Object.entries(AUDIENCES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <div style={{ fontSize: 13, color: V("--text-secondary"), marginTop: 6 }}>
            {info ? `${info.recipients} destinatários${info.optedOut ? ` (${info.optedOut} não querem receber emails)` : ""}` : "A contar..."}
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Assunto</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} required style={inputStyle} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Mensagem</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} required style={{ ...inputStyle, resize: "vertical" }} />
          <div style={{ fontSize: 12, color: V("--text-muted"), marginTop: 6 }}>Texto simples. É acrescentada no fim uma nota com o link para deixar de receber.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <button type="submit" disabled={!canSend}
            style={{ background: "#CC3333", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 14, fontWeight: 500, cursor: canSend ? "pointer" : "default", opacity: canSend ? 1 : 0.5 }}>
            {sending ? "A enviar..." : "Enviar"}
          </button>
          {message && <span style={{ fontSize: 14, color: "#10b981" }}>{message}</span>}
          {error && <span style={{ fontSize: 14, color: "#f87171" }}>{error}</span>}
        </div>
      </form>
    </div>
  );
}
