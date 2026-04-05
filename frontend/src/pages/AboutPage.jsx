import { Link } from "react-router-dom";

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, color: "#CC3333", textTransform: "uppercase", letterSpacing: 2, marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid #1B3A5C" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: "#0D1520", border: "1px solid #1B3A5C", borderRadius: 12, padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 32, fontWeight: 700, color: "#CC3333" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "48px 0 56px" }}>
        <img src="/logo.png" alt="AUR" style={{ height: 112, width: "auto", margin: "0 auto 24px", display: "block" }} />
        <p style={{ fontSize: 24, fontWeight: 300, color: "#FFFFFF", letterSpacing: 4, textTransform: "uppercase" }}>Vamos descobrir a cidade</p>
      </div>

      {/* About */}
      <Section title="Quem Somos">
        <div style={{ background: "#0D2137", borderRadius: 12, padding: 32 }}>
          <p style={{ color: "#c9d1d9", lineHeight: 1.7, fontSize: 15, margin: 0 }}>
            Os Alverca Urban Runners sao um grupo de corrida informal, criado em 2014 em Alverca do Ribatejo.
            O slogan <em style={{ color: "#CC3333" }}>"Vamos descobrir a cidade"</em> traduza a vontade de explorar a regiao a correr.
            O lema <em style={{ color: "#CC3333" }}>"O mais importante e o ultimo"</em> reflete a essencia do grupo:
            correr juntos, sem deixar ninguem para tras.
          </p>
          <p style={{ color: "#c9d1d9", lineHeight: 1.7, fontSize: 15, marginTop: 16, marginBottom: 0 }}>
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
          <div style={{ background: "#0D2137", borderRadius: 12, padding: 28 }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: "#e8ecef", margin: "0 0 8px" }}>Loja Oficial</h3>
            <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6, margin: "0 0 20px" }}>
              Camisolas de atletismo, tops de trail e opcoes para todos os membros.
              Disponivel atraves da UIN Sports.
            </p>
            <a href="https://www.uin-sports.pt/lojaonline/clubes/ps-alverca-urban-runners"
              target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-block", background: "#CC3333", color: "#fff", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
              Ver Equipamentos
            </a>
          </div>
          <div style={{ background: "#0D2137", borderRadius: 12, padding: 28 }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: "#e8ecef", margin: "0 0 8px" }}>Cores do Grupo</h3>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: "#0D2137", border: "1px solid #1B3A5C" }}></div>
                <span style={{ fontSize: 13, color: "#9ca3af" }}>Navy</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: "#CC3333" }}></div>
                <span style={{ fontSize: 13, color: "#9ca3af" }}>Vermelho</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: "#FFFFFF", border: "1px solid #1B3A5C" }}></div>
                <span style={{ fontSize: 13, color: "#9ca3af" }}>Branco</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Routes */}
      <Section title="Percursos">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "#0D2137", borderRadius: 12, padding: 24, borderLeft: "3px solid #10b981" }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#10b981", margin: "0 0 8px" }}>Trilho</h3>
            <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6, margin: 0 }}>
              Caminhos naturais, terreno variado, maior desafio tecnico.
            </p>
          </div>
          <div style={{ background: "#0D2137", borderRadius: 12, padding: 24, borderLeft: "3px solid #CC3333" }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#CC3333", margin: "0 0 8px" }}>Urbano</h3>
            <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6, margin: 0 }}>
              Ruas e parques de Alverca, ritmo acessivel, foco na socializacao.
            </p>
          </div>
        </div>
      </Section>

      {/* Where to find */}
      <Section title="Redes">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <a href="https://www.facebook.com/alvercaurbanrunners/"
            target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0D2137", borderRadius: 10, padding: "18px 24px", textDecoration: "none", border: "1px solid transparent", transition: "border-color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#1B3A5C"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}>
            <span style={{ fontSize: 15, color: "#e8ecef", fontWeight: 500 }}>Facebook</span>
            <span style={{ fontSize: 13, color: "#6b7280" }}>alvercaurbanrunners</span>
          </a>
          <a href="https://www.instagram.com/alvercaurbanrunners/"
            target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0D2137", borderRadius: 10, padding: "18px 24px", textDecoration: "none", border: "1px solid transparent", transition: "border-color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#1B3A5C"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}>
            <span style={{ fontSize: 15, color: "#e8ecef", fontWeight: 500 }}>Instagram</span>
            <span style={{ fontSize: 13, color: "#6b7280" }}>@alvercaurbanrunners</span>
          </a>
          <a href="https://www.uin-sports.pt/lojaonline/clubes/ps-alverca-urban-runners"
            target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0D2137", borderRadius: 10, padding: "18px 24px", textDecoration: "none", border: "1px solid transparent", transition: "border-color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#1B3A5C"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}>
            <span style={{ fontSize: 15, color: "#e8ecef", fontWeight: 500 }}>Loja</span>
            <span style={{ fontSize: 13, color: "#6b7280" }}>UIN Sports</span>
          </a>
          <a href="https://alvercaurbanrunners.pt/"
            target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0D2137", borderRadius: 10, padding: "18px 24px", textDecoration: "none", border: "1px solid transparent", transition: "border-color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#1B3A5C"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}>
            <span style={{ fontSize: 15, color: "#e8ecef", fontWeight: 500 }}>Website</span>
            <span style={{ fontSize: 13, color: "#6b7280" }}>alvercaurbanrunners.pt</span>
          </a>
          <a href="https://www.youtube.com/channel/UCSnjODnBA8M-K9z2wPwrPvg"
            target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0D2137", borderRadius: 10, padding: "18px 24px", textDecoration: "none", border: "1px solid transparent", transition: "border-color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#1B3A5C"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}>
            <span style={{ fontSize: 15, color: "#e8ecef", fontWeight: 500 }}>YouTube</span>
            <span style={{ fontSize: 13, color: "#6b7280" }}>Registos de eventos</span>
          </a>
        </div>
      </Section>

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "32px 0 48px" }}>
        <p style={{ fontSize: 15, color: "#9ca3af", marginBottom: 20 }}>Queres juntar-te a nos? Vem correr connosco.</p>
        <Link to="/"
          style={{ display: "inline-block", background: "#CC3333", color: "#fff", padding: "12px 32px", borderRadius: 8, textDecoration: "none", fontSize: 15, fontWeight: 500 }}>
          Ver Calendario de Eventos
        </Link>
      </div>
    </div>
  );
}
