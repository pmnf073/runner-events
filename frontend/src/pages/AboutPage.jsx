import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../ThemeContext";

const V = (name) => `var(${name})`;

function Reveal({ children, delay = 0 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 650ms ease, transform 650ms ease",
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ tag, title, subtitle }) {
  return (
    <div style={{ marginBottom: 34 }}>
      <p
        style={{
          margin: 0,
          color: "#CC3333",
          textTransform: "uppercase",
          letterSpacing: 1.6,
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        {tag}
      </p>
      <h2
        style={{
          margin: "12px 0 12px",
          color: V("--text-heading"),
          lineHeight: 1.12,
          fontSize: "clamp(30px, 5vw, 46px)",
          fontWeight: 800,
          letterSpacing: -0.8,
          fontFamily: "Oswald, Inter, system-ui, sans-serif",
        }}
      >
        {title}
      </h2>
      {subtitle ? (
        <p
          style={{
            margin: 0,
            color: V("--text-secondary"),
            lineHeight: 1.72,
            maxWidth: 760,
            fontSize: "clamp(16px, 2.4vw, 18px)",
          }}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function ActionButton({ children, ...props }) {
  return (
    <a
      {...props}
      style={{
        textDecoration: "none",
        padding: "13px 24px",
        borderRadius: 999,
        fontWeight: 800,
        transition: "transform 200ms ease, border-color 200ms ease, background 200ms ease",
        ...props.style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        if (props.onMouseEnter) props.onMouseEnter(e);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        if (props.onMouseLeave) props.onMouseLeave(e);
      }}
    >
      {children}
    </a>
  );
}

export default function AboutPage() {
  const { theme } = useTheme();
  const logoSrc = theme === "light" ? "/logo-light.png" : "/logo.png";

  const feed = useMemo(
    () => [
      "Terca de series progressivas com 30+ atletas em pista.",
      "Nova estreia em 10K: celebracao total na meta.",
      "Trail de domingo com sunrise run e cafe de equipa no final.",
    ],
    [],
  );

  return (
    <div
      style={{
        marginTop: -24,
        marginLeft: -32,
        width: "calc(100% + 64px)",
        overflow: "hidden",
        background: V("--bg-page"),
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes moveGrid {
          0% { background-position: 0 0; }
          100% { background-position: 180px 0; }
        }
        @keyframes pulseBar {
          0% { opacity: 0.35; transform: scaleY(1); }
          50% { opacity: 0.75; transform: scaleY(1.08); }
          100% { opacity: 0.35; transform: scaleY(1); }
        }
        @media (max-width: 860px) {
          .about-wrapper {
            margin-left: -16px;
            width: calc(100% + 32px);
          }
          .about-section {
            padding: 62px 18px;
          }
        }
      `}</style>

      <section
        className="about-wrapper"
        style={{
          position: "relative",
          minHeight: "88vh",
          padding: "90px 24px 80px",
          display: "flex",
          alignItems: "center",
          background:
            "linear-gradient(120deg, rgba(8,20,32,0.9) 0%, rgba(13,33,55,0.72) 100%), url('https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1900&q=80') center/cover no-repeat",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 16% 24%, rgba(204,51,51,0.28), transparent 50%), radial-gradient(circle at 82% 70%, rgba(54,194,206,0.22), transparent 48%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            animation: "moveGrid 13s linear infinite",
          }}
        />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1080, margin: "0 auto", width: "100%" }}>
          <Reveal>
            <img src={logoSrc} alt="Alverca Urban Runners" style={{ height: 76, width: "auto", marginBottom: 26 }} />
          </Reveal>
          <Reveal delay={120}>
            <h1
              style={{
                margin: "0 0 16px",
                color: "#fff",
                lineHeight: 1.03,
                letterSpacing: -1.2,
                fontSize: "clamp(38px, 8vw, 86px)",
                textTransform: "uppercase",
                fontWeight: 800,
                fontFamily: "Oswald, Inter, system-ui, sans-serif",
              }}
            >
              Corre connosco.
              <br />
              <span style={{ color: "#CC3333" }}>Cresce connosco.</span>
            </h1>
          </Reveal>
          <Reveal delay={220}>
            <p
              style={{
                margin: "0 0 32px",
                maxWidth: 720,
                color: "rgba(255,255,255,0.88)",
                lineHeight: 1.72,
                fontSize: "clamp(17px, 2.8vw, 22px)",
              }}
            >
              Em Alverca, cada treino e um passo para mais saude, mais confianca e mais comunidade.
              Somos energia em movimento para todos os niveis.
            </p>
          </Reveal>
          <Reveal delay={320}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link
                to="/register"
                style={{
                  textDecoration: "none",
                  background: "#CC3333",
                  color: "#fff",
                  padding: "13px 24px",
                  borderRadius: 999,
                  border: "2px solid #CC3333",
                  fontWeight: 800,
                  transition: "transform 200ms ease, background 200ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.background = "#AF1010";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.background = "#CC3333";
                }}
              >
                Junta-te a nos
              </Link>
              <ActionButton
                href="mailto:alvercaurbanrunners@gmail.com"
                style={{ color: "#fff", border: "2px solid rgba(255,255,255,0.7)", background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#fff")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.7)")}
              >
                Vem treinar
              </ActionButton>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="about-section" style={{ padding: "82px 24px", background: V("--bg-page") }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <Reveal>
            <SectionTitle
              tag="Quem somos"
              title="Nascemos de forma simples. Crescemos com espirito de equipa."
              subtitle="Os Alverca Urban Runners comecaram com amigos a correr juntos. Hoje somos uma comunidade com presenca competitiva e foco total na inclusao. Aqui, ninguem corre sozinho."
            />
          </Reveal>
          <Reveal delay={100}>
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
              {[
                { value: "2014", label: "Origem organica" },
                { value: "50+", label: "Participantes ativos" },
                { value: "2", label: "Pontos de encontro" },
                { value: "100%", label: "Espirito de grupo" },
              ].map((stat) => (
                <article
                  key={stat.label}
                  style={{
                    borderRadius: 14,
                    padding: "18px 16px",
                    background: V("--bg-card"),
                    border: `1px solid ${V("--border-subtle")}`,
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 2px",
                      color: "#CC3333",
                      fontSize: 34,
                      lineHeight: 1,
                      fontWeight: 800,
                      fontFamily: "Oswald, Inter, system-ui, sans-serif",
                    }}
                  >
                    {stat.value}
                  </p>
                  <p style={{ margin: 0, color: V("--text-secondary"), fontSize: 14 }}>{stat.label}</p>
                </article>
              ))}
            </div>
          </Reveal>
          <Reveal delay={180}>
            <p style={{ margin: "18px 0 0", color: V("--text-muted"), fontSize: 13 }}>
              Imagem sugerida: corrida de grupo em avenida de Alverca com diferentes idades.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="about-section" style={{ padding: "82px 24px", background: V("--bg-card") }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <Reveal>
            <SectionTitle
              tag="O que fazemos"
              title="Treinos regulares, desafios especiais e eventos com identidade."
              subtitle="Estrutura clara para evoluir com seguranca e motivacao."
            />
          </Reveal>
          <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            {[
              {
                title: "Treinos regulares",
                text: "Tercas e quintas com dois pontos de encontro na cidade, grupos por ritmo e acompanhamento para todos os niveis.",
                points: ["Iniciantes bem-vindos", "Progressao por objetivo", "Ambiente inclusivo"],
                hint: "Grupo a correr em circuito urbano ao fim da tarde.",
              },
              {
                title: "Treinos especiais",
                text: "Trilhos, desafios mensais e experiencias fora da rotina para trabalhar resistencia, tecnica e mentalidade.",
                points: ["Trail running", "Desafios por equipas", "Treinos sunrise"],
                hint: "Subida em trilho com vista panoramica.",
              },
              {
                title: "Eventos",
                text: "Destaque para o Trail Encostas de Xira e para a Sao Silvestre Pirata, alem de participacoes em provas regionais.",
                points: ["Trail Encostas de Xira", "Sao Silvestre Pirata", "Provas de estrada e trail"],
                hint: "Meta com celebracao coletiva e bandeiras do grupo.",
              },
            ].map((card, idx) => (
              <Reveal delay={idx * 100 + 90} key={card.title}>
                <article
                  style={{
                    height: "100%",
                    borderRadius: 16,
                    padding: 24,
                    background: `linear-gradient(160deg, ${V("--bg-card")} 0%, rgba(11,26,43,0.86) 100%)`,
                    border: `1px solid ${V("--border-subtle")}`,
                    boxShadow: "0 14px 36px rgba(0,0,0,0.2)",
                    transition: "transform 220ms ease, border-color 220ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.borderColor = "#CC3333";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = V("--border-subtle");
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 10px",
                      color: V("--text-heading"),
                      fontSize: 24,
                      lineHeight: 1.2,
                      fontFamily: "Oswald, Inter, system-ui, sans-serif",
                    }}
                  >
                    {card.title}
                  </h3>
                  <p style={{ margin: "0 0 14px", color: V("--text-secondary"), lineHeight: 1.68 }}>{card.text}</p>
                  <ul style={{ margin: "0 0 0 18px", padding: 0, color: V("--text-primary"), lineHeight: 1.6 }}>
                    {card.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                  <p style={{ margin: "14px 0 0", color: V("--text-muted"), fontSize: 13 }}>
                    Imagem sugerida: {card.hint}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section
        className="about-section"
        style={{ padding: "84px 24px", background: "linear-gradient(180deg, #0D2137 0%, #0A1727 100%)" }}
      >
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <Reveal>
            <SectionTitle
              tag="Energia da comunidade"
              title="Amizade, entreajuda e motivacao em cada passada."
              subtitle="Juntamos pessoas com ritmos diferentes e a mesma vontade de evoluir. O ambiente e proximo, humano e inspirador."
            />
          </Reveal>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            {[
              '"Entrei sem conseguir correr 5K. Hoje fecho 10K com a equipa a puxar por mim."',
              '"Nos dias dificeis, o grupo ajuda-me a manter o foco. Nunca corro sozinho."',
              '"Mais do que treino, encontrei amizades e uma rotina que mudou a minha vida."',
            ].map((quote, idx) => (
              <Reveal delay={idx * 100 + 100} key={quote}>
                <article
                  style={{
                    borderRadius: 14,
                    padding: 22,
                    minHeight: 148,
                    background: "rgba(11,26,43,0.9)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    color: "rgba(255,255,255,0.92)",
                    lineHeight: 1.68,
                  }}
                >
                  {quote}
                </article>
              </Reveal>
            ))}
          </div>
          <Reveal delay={420}>
            <p style={{ margin: "18px 0 0", color: "rgba(255,255,255,0.64)", fontSize: 13 }}>
              Imagem sugerida: foto de grupo diverso pos-treino, com celebracao espontanea.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="about-section" style={{ padding: "82px 24px", background: V("--bg-page") }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <Reveal>
            <SectionTitle
              tag="Conquistas"
              title="As conquistas individuais sao vitorias de todos."
              subtitle="Do primeiro 10K aos podios, cada passo tem apoio coletivo."
            />
          </Reveal>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {[
              { year: "2024", text: "Primeiros 10K de novos membros com pacers da equipa." },
              { year: "2025", text: "Entradas em meias maratonas e trails tecnicos." },
              { year: "2025", text: "Podios regionais em provas de estrada e montanha." },
              { year: "2026", text: "Mais superacoes pessoais e maior impacto na cidade." },
            ].map((item, idx) => (
              <Reveal delay={idx * 90 + 100} key={`${item.year}-${item.text}`}>
                <article
                  style={{
                    position: "relative",
                    borderRadius: 14,
                    padding: "20px 18px 20px 20px",
                    background: V("--bg-card"),
                    border: `1px solid ${V("--border-subtle")}`,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 4,
                      borderRadius: "14px 0 0 14px",
                      background: "#CC3333",
                      animation: "pulseBar 3s ease-in-out infinite",
                    }}
                  />
                  <p
                    style={{
                      margin: "0 0 6px",
                      color: "#36C2CE",
                      fontSize: 13,
                      textTransform: "uppercase",
                      letterSpacing: 1.1,
                      fontWeight: 700,
                    }}
                  >
                    {item.year}
                  </p>
                  <p style={{ margin: 0, color: V("--text-secondary"), lineHeight: 1.65 }}>{item.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
          <Reveal delay={420}>
            <p style={{ margin: "18px 0 0", color: V("--text-muted"), fontSize: 13 }}>
              Imagem sugerida: meta de prova com medalhas e abracos entre membros.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="about-section" style={{ padding: "82px 24px", background: V("--bg-card") }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <Reveal>
            <SectionTitle
              tag="Impacto na comunidade"
              title="Corremos por nos e inspiramos Alverca a mexer-se."
              subtitle="Promocao da saude, parcerias locais e eventos comunitarios que aproximam pessoas."
            />
          </Reveal>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {[
              "Promocao de habitos saudaveis para todas as idades.",
              "Parcerias com agentes locais para fortalecer o desporto.",
              "Eventos comunitarios com envolvimento direto da cidade.",
              "Representacao ativa de Alverca em iniciativas da regiao.",
            ].map((item, idx) => (
              <Reveal delay={idx * 80 + 90} key={item}>
                <article
                  style={{
                    borderRadius: 14,
                    padding: 18,
                    border: `1px solid ${V("--border-subtle")}`,
                    background: "rgba(11,26,43,0.72)",
                    color: V("--text-secondary"),
                    lineHeight: 1.65,
                  }}
                >
                  {item}
                </article>
              </Reveal>
            ))}
          </div>
          <Reveal delay={380}>
            <p style={{ margin: "18px 0 0", color: V("--text-muted"), fontSize: 13 }}>
              Imagem sugerida: treino aberto com participantes e familias.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="about-section" style={{ padding: "82px 24px", background: V("--bg-page") }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <Reveal>
            <SectionTitle
              tag="Redes sociais"
              title="Segue o ritmo da equipa todos os dias."
              subtitle="Facebook e Instagram com horarios, bastidores e desafios."
            />
          </Reveal>
          <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            <Reveal delay={100}>
              <a
                href="https://www.facebook.com/alvercaurbanrunners/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  textDecoration: "none",
                  color: V("--text-primary"),
                  border: `1px solid ${V("--border-subtle")}`,
                  borderRadius: 14,
                  padding: 20,
                  background: V("--bg-card"),
                }}
              >
                <p style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700 }}>Facebook</p>
                <p style={{ margin: 0, color: V("--text-secondary") }}>facebook.com/alvercaurbanrunners</p>
              </a>
            </Reveal>
            <Reveal delay={160}>
              <a
                href="https://www.instagram.com/alvercaurbanrunners/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  textDecoration: "none",
                  color: V("--text-primary"),
                  border: `1px solid ${V("--border-subtle")}`,
                  borderRadius: 14,
                  padding: 20,
                  background: V("--bg-card"),
                }}
              >
                <p style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700 }}>Instagram</p>
                <p style={{ margin: 0, color: V("--text-secondary") }}>instagram.com/alvercaurbanrunners</p>
              </a>
            </Reveal>
            <Reveal delay={220}>
              <article
                style={{
                  border: `1px solid ${V("--border-subtle")}`,
                  borderRadius: 14,
                  padding: 20,
                  background: V("--bg-card"),
                }}
              >
                <p style={{ margin: "0 0 12px", color: V("--text-heading"), fontWeight: 700 }}>
                  Feed dinamico (simulacao)
                </p>
                <div style={{ display: "grid", gap: 10 }}>
                  {feed.map((post) => (
                    <p
                      key={post}
                      style={{
                        margin: 0,
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "rgba(54,194,206,0.08)",
                        color: V("--text-secondary"),
                        fontSize: 14,
                        lineHeight: 1.55,
                      }}
                    >
                      {post}
                    </p>
                  ))}
                </div>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      <section
        className="about-section"
        style={{
          position: "relative",
          padding: "94px 24px",
          textAlign: "center",
          background: "linear-gradient(130deg, #CC3333 0%, #8E1515 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.2), transparent 44%), radial-gradient(circle at 80% 85%, rgba(0,0,0,0.22), transparent 55%)",
          }}
        />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 860, margin: "0 auto" }}>
          <Reveal>
            <h2
              style={{
                margin: "0 0 12px",
                color: "#fff",
                lineHeight: 1.08,
                fontSize: "clamp(34px, 6vw, 62px)",
                fontWeight: 800,
                letterSpacing: -0.8,
                fontFamily: "Oswald, Inter, system-ui, sans-serif",
              }}
            >
              O proximo passo e teu.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p
              style={{
                margin: "0 auto 26px",
                maxWidth: 620,
                color: "rgba(255,255,255,0.92)",
                lineHeight: 1.7,
                fontSize: "clamp(17px, 2.6vw, 20px)",
              }}
            >
              Participa num treino, conhece o grupo e descobre como e evoluir com uma equipa que acredita em ti
              desde o primeiro dia.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link
                to="/register"
                style={{
                  textDecoration: "none",
                  background: "#fff",
                  color: "#B91515",
                  fontWeight: 800,
                  padding: "13px 24px",
                  borderRadius: 999,
                  transition: "transform 200ms ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                Participar num treino
              </Link>
              <ActionButton
                href="mailto:alvercaurbanrunners@gmail.com"
                style={{ color: "#fff", border: "2px solid rgba(255,255,255,0.84)", background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#fff")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.84)")}
              >
                Falar connosco
              </ActionButton>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
