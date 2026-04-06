import { Link } from "react-router-dom";
import { useTheme } from "../ThemeContext";

const V = (name) => `var(${name})`;

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, color: "#CC3333", textTransform: "uppercase", letterSpacing: 2, marginBottom: 20, paddingBottom: 12, borderBottom: `1px solid ${V("--border-subtle")}` }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: V("--bg-card"), border: `1px solid ${V("--border-subtle")}`, borderRadius: 12, padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 32, fontWeight: 700, color: "#CC3333" }}>{value}</div>
      <div style={{ fontSize: 12, color: V("--text-muted"), marginTop: 6, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

function Card({ title, children, accent, rightAction }) {
  const style = accent ? { borderLeft: `3px solid ${accent}` } : {};
  return (
    <div style={{ background: V("--bg-card"), borderRadius: 12, padding: 28, ...style }}>
      <h3 style={{ fontSize: 17, fontWeight: 600, color: V("--text-primary"), margin: "0 0 8px" }}>{title}</h3>
      {children}
      {rightAction}
    </div>
  );
}

export default function AboutPage() {
  const { theme } = useTheme();
  const logoSrc = theme === "light" ? "/logo-light.png" : "/logo.png";

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "48px 0 56px" }}>
        <img src={logoSrc} alt="AUR" style={{ height: 112, width: "auto", margin: "0 auto 24px", display: "block" }} />
        <p style={{ fontSize: 24, fontWeight: 300, color: V("--text-heading"), letterSpacing: 4, textTransform: "uppercase" }}>Vamos descobrir a cidade</p>
      </div>

      {/* About */}
      <Section title="Quem Somos">
        <div style={{ background: V("--bg-card"), borderRadius: 12, padding: 32 }}>
          <p style={{ color: V("--text-primary"), lineHeight: 1.7, fontSize: 15, margin: 0 }}>
            Os Alverca Urban Runners sao um grupo de corrida informal, criado em 2014 em Alverca do Ribatejo.
            O slogan <em style={{ color: "#CC3333" }}>"Vamos descobrir a cidade"</em> traduz a vontade de explorar a regiao a correr.
            O lema <em style={{ color: "#CC3333" }}>"O mais importante e o ultimo"</em> reflete a essencia do grupo:
            correr juntos, sem deixar ninguem para tras.
          </p>
          <p style={{ color: V("--text-primary"), lineHeight: 1.7, fontSize: 15, marginTop: 16, marginBottom: 0 }}>
            O grupo criou um conjunto de circuitos identificados por linhas de cores — percursos circulares
            de diferentes niveis de dificuldade, adaptados a todos os niveis de condicao fisica.
            Desde iniciantes a runners experientes, todos sao bem-vindos.
          </p>
        </div>
      </Section>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 48 }}>
        <StatCard label="Fundacao" value="2014" />
        <StatCard label="Localizacao" value="Alverca" />
        <StatCard label="Membros (FB)" value="2.1k+" />
        <StatCard label="Tipo" value="Informal" />
      </div>

      {/* Equipment */}
      <Section title="Equipamento">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <Card title="Loja Oficial">
            <p style={{ fontSize: 14, color: V("--text-secondary"), lineHeight: 1.6, margin: "0 0 20px" }}>
              Camisolas de atletismo, tops de trail e opcoes para todos os membros.
              Disponivel atraves da UIN Sports.
            </p>
            <a href="https://www.uin-sports.pt/lojaonline/clubes/ps-alverca-urban-runners"
              target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-block", background: "#CC3333", color: "#fff", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
              Ver Equipamentos
            </a>
          </Card>
          <Card title="Cores do Grupo">
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: "#0D2137", border: `1px solid ${V("--border-subtle")}` }}></div>
                <span style={{ fontSize: 13, color: V("--text-secondary") }}>Navy</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: "#CC3333" }}></div>
                <span style={{ fontSize: 13, color: V("--text-secondary") }}>Vermelho</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: "#FFFFFF", border: `1px solid ${V("--border-subtle")}` }}></div>
                <span style={{ fontSize: 13, color: V("--text-secondary") }}>Branco</span>
              </div>
            </div>
          </Card>
        </div>
      </Section>

      {/* Routes */}
      <Section title="Percursos">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card title="Trilho" accent="#10b981">
            <p style={{ fontSize: 14, color: V("--text-secondary"), lineHeight: 1.6, margin: 0 }}>
              Caminhos naturais, terreno variado, maior desafio tecnico.
            </p>
          </Card>
          <Card title="Urbano" accent="#CC3333">
            <p style={{ fontSize: 14, color: V("--text-secondary"), lineHeight: 1.6, margin: 0 }}>
              Ruas e parques de Alverca, ritmo acessivel, foco na socializacao.
            </p>
          </Card>
        </div>
      </Section>

      {/* Where to find */}
      <Section title="Redes">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { name: "Facebook", handle: "alvercaurbanrunners", url: "https://www.facebook.com/alvercaurbanrunners/" },
            { name: "Instagram", handle: "@alvercaurbanrunners", url: "https://www.instagram.com/alvercaurbanrunners/" },
            { name: "Loja", handle: "UIN Sports", url: "https://www.uin-sports.pt/lojaonline/clubes/ps-alverca-urban-runners" },
            { name: "Website", handle: "alvercaurbanrunners.pt", url: "https://alvercaurbanrunners.pt/" },
            { name: "YouTube", handle: "Registos de eventos", url: "https://www.youtube.com/channel/UCSnjODnBA8M-K9z2wPwrPvg" },
          ].map((link) => (
            <a key={link.name} href={link.url}
              target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: V("--bg-card"), borderRadius: 10, padding: "18px 24px", textDecoration: "none", border: "1px solid transparent", transition: "border-color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = V("--border-subtle")}
              onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}>
              <span style={{ fontSize: 15, color: V("--text-primary"), fontWeight: 500 }}>{link.name}</span>
              <span style={{ fontSize: 13, color: V("--text-muted") }}>{link.handle}</span>
            </a>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "32px 0 48px" }}>
        <p style={{ fontSize: 15, color: V("--text-secondary"), marginBottom: 20 }}>Queres juntar-te a nos? Vem correr connosco.</p>
        <Link to="/"
          style={{ display: "inline-block", background: "#CC3333", color: "#fff", padding: "12px 32px", borderRadius: 8, textDecoration: "none", fontSize: 15, fontWeight: 500 }}>
          Ver Calendario de Eventos
        </Link>
      </div>
    </div>
  );
}
