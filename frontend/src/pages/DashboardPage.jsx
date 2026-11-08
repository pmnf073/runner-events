import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { formatCurrency, formatDate } from "../utils/format";

const V = (name) => `var(${name})`;
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MEMBERSHIP_STATUS = { paid: "Pagas", discounted: "Com desconto", partial: "Pagas em parte", pending: "Por pagar", exempt: "Isentas" };

export default function DashboardPage({ user }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!user || !["admin", "organizer"].includes(user.role)) {
      navigate("/");
      return;
    }
    api("/api/dashboard")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Erro ao carregar o painel.");
        setData(body);
      })
      .catch((err) => setError(err.message));
  }, [user, navigate]);

  if (error) return <div style={{ textAlign: "center", padding: 80, color: "var(--c-danger)" }}>{error}</div>;
  if (!data) return <div style={{ textAlign: "center", padding: 80, color: V("--text-secondary") }}>A carregar...</div>;

  const card = { background: V("--bg-card"), border: `1px solid ${V("--border-subtle")}`, borderRadius: 12, padding: isMobile ? 14 : 20 };
  const gap = isMobile ? 12 : 24;
  const h2 = { fontSize: isMobile ? 15 : 16, fontWeight: 700, color: V("--text-heading"), margin: isMobile ? "0 0 10px" : "0 0 16px" };
  const th = { textAlign: "left", padding: isMobile ? "6px" : "8px 10px", fontSize: 12, color: V("--text-muted"), borderBottom: `1px solid ${V("--border-subtle")}`, fontWeight: 600 };
  const td = { padding: isMobile ? "8px 6px" : "10px", fontSize: isMobile ? 13 : 14, color: V("--text-primary"), borderBottom: `1px solid ${V("--border-subtle")}` };

  const activeMembers = data.members.active || 0;
  const membershipsTotal = Object.values(data.memberships).reduce((a, b) => a + b, 0);
  const membershipsSettled = (data.memberships.paid || 0) + (data.memberships.discounted || 0) + (data.memberships.exempt || 0);
  const feePct = data.fees.expected > 0 ? Math.min(100, Math.round((data.fees.received / data.fees.expected) * 100)) : 0;
  const maxRevenue = Math.max(...data.revenueByMonth.map((m) => m.total), 1);
  const yearRevenue = data.revenueByMonth.reduce((sum, m) => sum + m.total, 0);

  const tiles = [
    { label: "Sócios ativos", value: activeMembers, to: "/members" },
    { label: `Quotas ${data.year} regularizadas`, value: `${membershipsSettled} / ${membershipsTotal}`, to: "/fees" },
    { label: "Inscrições por aprovar", value: data.pendingRegistrations, to: user.role === "admin" ? "/admin/users" : null, alert: data.pendingRegistrations > 0 },
    { label: "Eventos nos próximos 30 dias", value: data.upcomingEvents, to: "/calendar" },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, color: V("--text-heading"), margin: isMobile ? "0 0 12px" : "0 0 24px" }}>Painel</h1>

      {/* Telemóvel: grelha 2x2 compacta; desktop mantém a grelha automática. */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(200px, 1fr))", gap: isMobile ? 10 : 16, marginBottom: gap }}>
        {tiles.map((t) => {
          const content = (
            <div style={{ ...card, padding: isMobile ? "12px 14px" : card.padding, height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ fontSize: isMobile ? 12 : 13, lineHeight: 1.3, color: V("--text-muted"), marginBottom: isMobile ? 6 : 8 }}>{t.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
                <span style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: t.alert ? V("--c-danger") : V("--text-heading") }}>{t.value}</span>
                {isMobile && t.to && <span aria-hidden="true" style={{ fontSize: 18, color: V("--text-muted") }}>›</span>}
              </div>
            </div>
          );
          return t.to
            ? <Link key={t.label} to={t.to} style={{ textDecoration: "none" }}>{content}</Link>
            : <div key={t.label}>{content}</div>;
        })}
      </div>

      <section style={{ ...card, marginBottom: gap }}>
        <h2 style={h2}>Quotas de {data.year}</h2>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "2px 12px", fontSize: isMobile ? 13 : 14, color: V("--text-primary"), marginBottom: 8 }}>
          <span>Recebido: <strong>{formatCurrency(data.fees.received)}</strong></span>
          <span style={{ color: V("--text-muted") }}>Esperado: {formatCurrency(data.fees.expected)} ({feePct}%)</span>
        </div>
        <div style={{ height: 10, borderRadius: 5, background: V("--bg-input"), overflow: "hidden" }}>
          <div style={{ width: `${feePct}%`, height: "100%", background: "#CC3333" }} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? "6px 14px" : "8px 20px", marginTop: isMobile ? 10 : 14, fontSize: 13, color: V("--text-secondary") }}>
          {Object.entries(MEMBERSHIP_STATUS).map(([status, label]) => (
            <span key={status}>{label}: <strong style={{ color: V("--text-primary") }}>{data.memberships[status] || 0}</strong></span>
          ))}
        </div>
      </section>

      <section style={{ ...card, marginBottom: gap }}>
        <h2 style={{ ...h2, marginBottom: 4 }}>Pagamentos recebidos por mês</h2>
        <p style={{ fontSize: 13, color: V("--text-muted"), margin: isMobile ? "0 0 10px" : "0 0 16px" }}>Últimos 12 meses: {formatCurrency(yearRevenue)}</p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: isMobile ? 3 : 6, height: isMobile ? 140 : 180 }} role="img"
          aria-label="Gráfico de barras com o total de pagamentos de cada um dos últimos 12 meses">
          {data.revenueByMonth.map((m) => {
            const [y, mo] = m.month.split("-");
            const height = m.total > 0 ? Math.max(2, (m.total / maxRevenue) * (isMobile ? 110 : 150)) : 0;
            return (
              <div key={m.month} title={`${MONTHS[Number(mo) - 1]} ${y}: ${formatCurrency(m.total)} (${m.count} pagamentos)`}
                style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                {m.total > 0 && (
                  <div style={{ fontSize: isMobile ? 9 : 10, color: V("--text-muted"), marginBottom: 4, whiteSpace: "nowrap" }}>{Math.round(m.total)}{isMobile ? "" : " €"}</div>
                )}
                <div style={{ width: "100%", maxWidth: 40, height, background: "#CC3333", borderRadius: "4px 4px 0 0" }} />
                <div style={{ fontSize: isMobile ? 10 : 11, color: V("--text-muted"), marginTop: 6 }}>{MONTHS[Number(mo) - 1]}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section style={card}>
        <h2 style={{ ...h2, marginBottom: 4 }}>Participação nos últimos eventos</h2>
        <p style={{ fontSize: 13, color: V("--text-muted"), margin: isMobile ? "0 0 8px" : "0 0 12px" }}>"Vou" e "Talvez" são respostas dadas antes do evento; "Presentes" são as presenças marcadas nos treinos.</p>
        {data.recentEvents.length === 0 ? (
          <p style={{ fontSize: 14, color: V("--text-secondary"), margin: 0 }}>Ainda não há eventos passados com respostas ou presenças.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr><th style={th}>Data</th><th style={th}>Evento</th><th style={th}>Vou</th><th style={th}>Talvez</th><th style={th}>Presentes</th></tr>
              </thead>
              <tbody>
                {data.recentEvents.map((e) => (
                  <tr key={e.id}>
                    <td style={td}>{formatDate(e.date)}</td>
                    <td style={td}><Link to={`/event/${e.id}`} style={{ color: V("--text-primary") }}>{e.title}</Link></td>
                    <td style={{ ...td, fontWeight: 600 }}>{e.going}</td>
                    <td style={td}>{e.maybe}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{e.attended || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
