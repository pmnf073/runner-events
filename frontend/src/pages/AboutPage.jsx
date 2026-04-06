import { Link } from "react-router-dom";
import { useTheme } from "../ThemeContext";

const V = (name) => `var(${name})`;

function Section({ id, title, children, accent }) {
  return (
    <section id={id} style={{ marginBottom: 48 }}>
      <h2 style={{
        fontSize: 14,
        fontWeight: 600,
        color: accent || "#CC3333",
        textTransform: "uppercase",
        letterSpacing: 2,
        marginBottom: 20,
        paddingBottom: 12,
        borderBottom: `1px solid ${V("--border-subtle")}`
      }}>
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

function Card({ title, children, icon, accent }) {
  return (
    <div style={{ background: V("--bg-card"), borderRadius: 12, padding: 28, border: `1px solid ${V("--border-subtle")}`, borderLeft: accent ? `4px solid ${accent}` : "4px solid transparent" }}>
      {icon && <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>}
      <h3 style={{ fontSize: 17, fontWeight: 600, color: V("--text-heading"), margin: "0 0 12px" }}>{title}</h3>
      {children}
    </div>
  );
}

function LemaCard({ text }) {
  return (
    <div style={{ background: V("--bg-card"), borderRadius: 12, padding: 32, textAlign: "center", border: `1px solid ${V("--border-subtle")}` }}>
      <p style={{ fontSize: 20, fontWeight: 600, color: "#CC3333", margin: 0, fontStyle: "italic" }}>"{text}"</p>
    </div>
  );
}

function Badge({ text }) {
  return (
    <span style={{ background: V("--hover-bg"), color: V("--text-secondary"), borderRadius: 9999, padding: "4px 14px", fontSize: 13, fontWeight: 500 }}>{text}</span>
  );
}

function ListItem({ text }) {
  return (
    <li style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, color: V("--text-secondary"), fontSize: 14, lineHeight: 1.5, listStyle: "none" }}>
      <span style={{ color: "#CC3333", marginTop: 4, fontSize: 8, flexShrink: 0 }}>●</span>
      <span>{text}</span>
    </li>
  );
}

function Quote({ text }) {
  return (
    <div style={{ background: V("--bg-card"), border: "1px solid var(--border-subtle)", borderLeft: "4px solid #CC3333", borderRadius: 8, padding: 24, margin: "16px 0" }}>
      <p style={{ fontSize: 15, fontWeight: 500, color: V("--text-heading"), margin: 0, fontStyle: "italic" }}>"{text}"</p>
    </div>
  );
}

function SocialLink({ name, url, icon }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      style={{ display: "flex", alignItems: "center", gap: 14, background: V("--bg-card"), borderRadius: 10, padding: "16px 20px", textDecoration: "none", border: `1px solid ${V("--border-subtle")}`, transition: "border-color 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "#CC3333"}
      onMouseLeave={e => e.currentTarget.style.borderColor = V("--border-subtle")}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span style={{ fontSize: 15, color: V("--text-primary"), fontWeight: 500 }}>{name}</span>
    </a>
  );
}

export default function AboutPage() {
  const { theme } = useTheme();
  const logoSrc = theme === "light" ? "/logo-light.png" : "/logo.png";

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>

      {/* ── Hero ── */}
      <div style={{ textAlign: "center", padding: "48px 0 56px" }}>
        <img src={logoSrc} alt="AUR" style={{ height: 112, width: "auto", margin: "0 auto 24px", display: "block" }} />
        <p style={{ fontSize: 24, fontWeight: 300, color: V("--text-heading"), letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>Vamos descobrir a cidade</p>
        <p style={{ fontSize: 15, color: V("--text-secondary"), maxWidth: 640, margin: "0 auto", lineHeight: 1.7 }}>
          Os Alverca Urban Runners sao um grupo de corrida comunitario sediado em Alverca do Ribatejo,
          dedicado a promocao da atividade fisica, da convivencia e da descoberta da cidade atraves da corrida e do trail.
          O grupo reune pessoas de diferentes niveis de experiencia, com o principio de que todos podem participar
          e ninguem fica para tras.
        </p>
      </div>

      {/* ── Valores + Stats ── */}
      <Section title="Valores">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
          {["Comunidade", "Inclusao", "Saude e bem-estar", "Descoberta da cidade", "Espirito de equipa"].map((v) => (
            <span key={v} style={{ background: V("--bg-card"), border: `1px solid ${V("--border-subtle")}`, borderRadius: 9999, padding: "8px 18px", fontSize: 13, color: V("--text-primary"), fontWeight: 500 }}>{v}</span>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          <StatCard label="Fundacao" value="2014" />
          <StatCard label="Localizacao" value="Alverca" />
          <StatCard label="Treinos/Semana" value="3" />
          <StatCard label="Tipo" value="Comunitario" />
        </div>
      </Section>

      {/* ── Lemas ── */}
      <Section title="Os Nossos Lemas" id="lemas">
        <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
          <LemaCard text="Ninguem fica para tras." />
          <LemaCard text="O ultimo e o mais importante." />
        </div>
        <p style={{ fontSize: 14, color: V("--text-secondary"), lineHeight: 1.7, margin: 0 }}>
          Estes principios refletem a filosofia inclusiva do grupo, onde o foco esta no espirito de equipa e nao na competicao.
        </p>
      </Section>

      {/* ── Historia ── */}
      <Section title="A Nossa Historia" id="historia">
        <div style={{ background: V("--bg-card"), borderRadius: 12, padding: 32, border: `1px solid ${V("--border-subtle")}` }}>
          <p style={{ color: V("--text-primary"), lineHeight: 1.7, fontSize: 15, margin: "0 0 16px" }}>
            Os Alverca Urban Runners surgirarm a partir da iniciativa de um pequeno grupo de amigos com o objetivo de promover a corrida e a atividade fisica na comunidade local.
          </p>
          <p style={{ color: V("--text-primary"), lineHeight: 1.7, fontSize: 15, margin: "0 0 16px" }}>
            O projeto comecou com treinos informais e caminhadas mensais, que rapidamente comecaram a atrair cada vez mais participantes interessados em descobrir novos percursos na cidade e arredores.
          </p>
          <p style={{ color: V("--text-primary"), lineHeight: 1.7, fontSize: 15, margin: 0 }}>
            Com o crescimento do grupo, a atividade expandiu-se para treinos regulares, participacao em provas e organizacao de eventos desportivos, tornando-se uma referencia local na promocao do desporto.
          </p>
        </div>
      </Section>

      {/* ── Missao ── */}
      <Section title="Missao" id="missao">
        <Quote text="Promover um estilo de vida ativo e saudavel atraves da corrida, incentivando a participacao de pessoas de todas as idades e niveis de experiencia." />
      </Section>

      {/* ── Associacao ── */}
      <Section title="A Associacao" id="associacao">
        <div style={{ background: V("--bg-card"), borderRadius: 12, padding: 32, border: `1px solid ${V("--border-subtle")}`, marginBottom: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 600, color: V("--text-heading"), margin: "0 0 8px" }}>DestinOlimpico</h3>
          <p style={{ color: V("--text-secondary"), fontSize: 15, lineHeight: 1.6, margin: 0 }}>
            Associacao de Desportos Urbanos de Alverca — os Alverca Urban Runners estao integrados nesta associacao que promove diversas modalidades desportivas urbanas.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
          <Card title="Urban Runners" icon="🏃" accent="#CC3333">
            <p style={{ fontSize: 14, color: V("--text-secondary"), margin: 0 }}>Corrida e caminhada</p>
          </Card>
          <Card title="Urban Bikers" icon="🚴" accent="#3b82f6">
            <p style={{ fontSize: 14, color: V("--text-secondary"), margin: 0 }}>Ciclismo e BTT</p>
          </Card>
          <Card title="Urban Warriors" icon="💪" accent="#f59e0b">
            <p style={{ fontSize: 14, color: V("--text-secondary"), margin: 0 }}>Treino funcional em espacos publicos</p>
          </Card>
        </div>
        <div style={{ background: V("--bg-card"), borderRadius: 12, padding: 24, border: `1px solid ${V("--border-subtle")}` }}>
          <h4 style={{ fontSize: 14, color: V("--text-heading"), margin: "0 0 12px", fontWeight: 600 }}>Estrutura Organizativa</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["Assembleia Geral", "Direcao", "Conselho Fiscal"].map((r) => (
              <Badge key={r} text={r} />
            ))}
          </div>
        </div>
      </Section>

      {/* ── Treinos ── */}
      <Section title="Treinos" id="treinos">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
          <div>
            <h4 style={{ fontSize: 14, color: V("--text-heading"), margin: "0 0 12px", fontWeight: 600 }}>Dias de Treino</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <ListItem text="Tercas-feiras" />
              <ListItem text="Quintas-feiras" />
              <ListItem text="Domingos" />
            </ul>
          </div>
          <div>
            <h4 style={{ fontSize: 14, color: V("--text-heading"), margin: "0 0 12px", fontWeight: 600 }}>Tipos de Treino</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <ListItem text="Corrida em estrada" />
              <ListItem text="Trail running" />
              <ListItem text="Treinos de grupo" />
              <ListItem text="Reconhecimento de percursos" />
              <ListItem text="Treinos de convivencia" />
            </ul>
          </div>
        </div>

        <h4 style={{ fontSize: 14, color: V("--text-heading"), margin: "0 0 12px", fontWeight: 600 }}>Filosofia dos Treinos</h4>
        <ul style={{ listStyle: "none", padding: 0, marginBottom: 16 }}>
          <ListItem text="Ritmos diferentes sao respeitados" />
          <ListItem text="O grupo mantem-se unido" />
          <ListItem text="Os mais rapidos regressam para acompanhar quem vem atras" />
        </ul>
        <Quote text="Os mais rapidos regressam para acompanhar quem vem atras." />
      </Section>

      {/* ── Comunidade ── */}
      <Section title="Comunidade" id="comunidade">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
          <div style={{ background: V("--bg-card"), borderRadius: 12, padding: 24, border: `1px solid ${V("--border-subtle")}` }}>
            <h4 style={{ fontSize: 14, color: V("--text-heading"), margin: "0 0 16px", fontWeight: 600 }}>Quem Pode Participar</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <ListItem text="Iniciantes" />
              <ListItem text="Corredores experientes" />
              <ListItem text="Caminhantes" />
              <ListItem text="Amantes do trail" />
            </ul>
          </div>
          <div style={{ background: V("--bg-card"), borderRadius: 12, padding: 24, border: `1px solid ${V("--border-subtle")}` }}>
            <h4 style={{ fontSize: 14, color: V("--text-heading"), margin: "0 0 16px", fontWeight: 600 }}>Filosofia</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <ListItem text="Participacao aberta" />
              <ListItem text="Partilha de experiencias" />
              <ListItem text="Convivio" />
              <ListItem text="Dezenas de participantes regulares" />
            </ul>
          </div>
        </div>
      </Section>

      {/* ── Eventos ── */}
      <Section title="Eventos e Iniciativas" id="eventos">
        <div style={{ marginBottom: 20 }}>
          <Card title="Trail Encostas de Xira (TEX)" icon="🏔️" accent="#10b981">
            <p style={{ fontSize: 14, color: V("--text-secondary"), lineHeight: 1.7 }}>
              Um dos eventos mais marcantes associados ao grupo. Uma prova de trail running organizada pelos Alverca Urban Runners com apoio de entidades locais, que atrai centenas de participantes e promove os trilhos naturais da regiao.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {["Trail running", "Caminhada", "Natureza", "Patrimonio local"].map((t) => <Badge key={t} text={t} />)}
            </div>
          </Card>
        </div>
        <Card title="Sao Silvestre Pirata de Alverca" icon="🎭" accent="#CC3333">
          <p style={{ fontSize: 14, color: V("--text-secondary"), lineHeight: 1.7 }}>
            Uma iniciativa tradicional — um treino especial realizado no final do ano pelas ruas da cidade.
            Um evento informal de cariz solidario com participacao da comunidade local.
          </p>
        </Card>
      </Section>

      {/* ── Provas ── */}
      <Section title="Participacao em Provas" id="provas">
        <div style={{ background: V("--bg-card"), borderRadius: 12, padding: 32, border: `1px solid ${V("--border-subtle")}` }}>
          <p style={{ color: V("--text-secondary"), fontSize: 14, lineHeight: 1.7, margin: "0 0 16px" }}>
            O grupo participa regularmente em diversas competicoes:
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
            <Badge text="Corridas de estrada" />
            <Badge text="Provas de trail running" />
            <Badge text="Eventos nacionais e internacionais" />
          </div>
          <p style={{ color: V("--text-secondary"), fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            Alem da vertente competitiva, o grupo valoriza sobretudo o convivencia e a experiencia coletiva.
          </p>
        </div>
      </Section>

      {/* ── Descobrir Alverca ── */}
      <Section title="Descobrir Alverca a Correr" id="descobrir">
        <div style={{ background: V("--bg-card"), borderRadius: 12, padding: 32, border: `1px solid ${V("--border-subtle")}` }}>
          <p style={{ color: V("--text-primary"), fontSize: 15, lineHeight: 1.7, margin: "0 0 16px" }}>
            Uma das ideias centrais do grupo e explorar a cidade atraves da corrida. Os treinos percorrem zonas urbanas, trilhos naturais, bairros da cidade e areas envolventes de Alverca.
          </p>
          <Quote text="A cidade e o nosso ginásio ao ar livre." />
        </div>
      </Section>

      {/* ── Destaques ── */}
      <Section title="Destaques" id="destaques">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <Card title="Treinos Semanais" icon="📅">
            <p style={{ fontSize: 14, color: V("--text-secondary"), margin: 0 }}>Terca, quinta e domingo</p>
          </Card>
          <Card title="Eventos e Provas" icon="🏅">
            <p style={{ fontSize: 14, color: V("--text-secondary"), margin: 0 }}>Organizacao e participacao regular</p>
          </Card>
          <Card title="Comunidade" icon="👥">
            <p style={{ fontSize: 14, color: V("--text-secondary"), margin: 0 }}>Dezenas de participantes regulares</p>
          </Card>
          <Card title="Noticias e Fotos" icon="📸">
            <p style={{ fontSize: 14, color: V("--text-secondary"), margin: 0 }}>Registos dos treinos e eventos</p>
          </Card>
        </div>
      </Section>

      {/* ── Contactos ── */}
      <Section title="Contactos" id="contactos">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
          <div style={{ background: V("--bg-card"), borderRadius: 12, padding: 24, border: `1px solid ${V("--border-subtle")}`, textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📍</div>
            <h4 style={{ fontSize: 14, color: V("--text-heading"), margin: "0 0 4px", fontWeight: 600 }}>Localizacao</h4>
            <p style={{ fontSize: 14, color: V("--text-secondary"), margin: 0 }}>Alverca do Ribatejo, concelho de Vila Franca de Xira</p>
          </div>
          <div style={{ background: V("--bg-card"), borderRadius: 12, padding: 24, border: `1px solid ${V("--border-subtle")}`, textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✉️</div>
            <h4 style={{ fontSize: 14, color: V("--text-heading"), margin: "0 0 4px", fontWeight: 600 }}>Email</h4>
            <a href="mailto:alvercaurbanrunners@gmail.com" style={{ fontSize: 14, color: "#36C2CE", textDecoration: "none" }}>alvercaurbanrunners@gmail.com</a>
          </div>
        </div>
      </Section>

      {/* ── Presenca Online ── */}
      <Section title="Presenca Online" id="online">
        <p style={{ color: V("--text-secondary"), fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
          Nos nossos canais sao partilhadas fotos dos treinos, convites para eventos, resultados de provas e noticias do grupo.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <SocialLink name="Website" url="https://alvercaurbanrunners.pt/" icon="🌐" />
          <SocialLink name="Facebook" url="https://www.facebook.com/alvercaurbanrunners/" icon="📘" />
          <SocialLink name="Instagram" url="https://www.instagram.com/alvercaurbanrunners/" icon="📷" />
          <SocialLink name="YouTube" url="https://www.youtube.com/channel/UCSnjODnBA8M-K9z2wPwrPvg" icon="📺" />
          <SocialLink name="Loja UIN Sports" url="https://www.uin-sports.pt/lojaonline/clubes/ps-alverca-urban-runners" icon="👕" />
        </div>
      </Section>

      {/* ── CTA ── */}
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
