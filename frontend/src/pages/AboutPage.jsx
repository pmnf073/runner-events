import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const V = (name) => `var(${name})`;

const MAIL = "mailto:alvercaurbanrunners@gmail.com";
const MAIL_TRIAL = `${MAIL}?subject=${encodeURIComponent("Quero experimentar um treino")}`;

// Fades its content in when it scrolls into view (immediately without IntersectionObserver
// or when the user prefers reduced motion).
function Reveal({ children, delay = 0, as: Tag = "div", style }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!el || reduced || !("IntersectionObserver" in window)) {
      setVisible(true);
      return undefined;
    }
    let timer;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timer = setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [delay]);

  return (
    <Tag
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 650ms ease, transform 650ms ease",
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

// A photo below a section's content, 3:2, lazy-loaded.
function SectionPhoto({ src, alt }) {
  return (
    <img
      src={src}
      alt={alt}
      width={1200}
      height={800}
      loading="lazy"
      style={{ display: "block", width: "100%", height: "auto", maxHeight: 460, marginTop: 24, borderRadius: 16, objectFit: "cover" }}
    />
  );
}

// onDark: the section has its own dark background in both themes, so the text stays light.
function SectionTitle({ tag, title, subtitle, onDark = false }) {
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
          color: onDark ? "#FFFFFF" : V("--text-heading"),
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
            color: onDark ? "rgba(255,255,255,0.78)" : V("--text-secondary"),
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
  // The hero has a dark photo background in both themes, so it always uses the light-on-dark logo.
  const logoSrc = "/logo.png";

  // Mobile: a "try a training" bar once the hero is out of view, hidden near the final call to action
  // and for logged-in users.
  const heroRef = useRef(null);
  const finalRef = useRef(null);
  const [showStickyCta, setShowStickyCta] = useState(false);
  useEffect(() => {
    let loggedIn = false;
    try { loggedIn = Boolean(localStorage.getItem("token")); } catch { /* storage blocked */ }
    if (loggedIn) return undefined;
    const onScroll = () => {
      const hero = heroRef.current?.getBoundingClientRect();
      const final = finalRef.current?.getBoundingClientRect();
      if (!hero || !final) return;
      setShowStickyCta(hero.bottom < 0 && final.top > window.innerHeight);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

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
        .about-stats { display: grid; gap: 12px; grid-template-columns: repeat(4, 1fr); }
        .about-steps { display: grid; gap: 16px; grid-template-columns: repeat(3, 1fr); counter-reset: step; }
        .about-mosaic { display: grid; gap: 12px; grid-template-columns: repeat(3, 1fr); margin-top: 24px; }
        .about-mosaic img { display: block; width: 100%; height: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 14px; }
        .about-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 28px; padding: 0; list-style: none; }
        .about-chips li { padding: 6px 12px; border-radius: 999px; font-size: 14px; font-weight: 600; color: #fff;
          background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.28); }
        .about-sticky-cta { display: none; }
        @media (max-width: 860px) {
          .about-stats { grid-template-columns: repeat(2, 1fr); }
          .about-steps { grid-template-columns: 1fr; }
          .about-mosaic { grid-template-columns: 1fr 1fr; }
          .about-mosaic img:first-child { grid-column: 1 / -1; aspect-ratio: 3 / 2; }
          .about-sticky-cta {
            display: block; position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;
            padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
            background: var(--bg-header); border-top: 1px solid var(--border-subtle);
            box-shadow: 0 -6px 20px var(--shadow-dropdown);
            transform: translateY(110%); transition: transform 250ms ease;
          }
          .about-sticky-cta.visible { transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .about-sticky-cta { transition: none; }
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
        ref={heroRef}
        className="about-wrapper"
        style={{
          position: "relative",
          minHeight: "88vh",
          padding: "90px 24px 80px",
          display: "flex",
          alignItems: "center",
          backgroundImage:
            "linear-gradient(120deg, rgba(8,20,32,0.9) 0%, rgba(13,33,55,0.72) 100%), url('/IMG_20260301.jpg')",
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
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
                margin: "0 0 20px",
                maxWidth: 720,
                color: "rgba(255,255,255,0.88)",
                lineHeight: 1.72,
                fontSize: "clamp(17px, 2.8vw, 22px)",
              }}
            >
              Em Alverca, cada treino é um passo para mais saúde, mais confiança e mais comunidade.
              Somos energia em movimento para todos os níveis.
            </p>
            <ul className="about-chips">
              <li>Terças e quintas</li>
              <li>Todos os níveis</li>
              <li>Grupos por ritmo</li>
              <li>Desde 2014</li>
            </ul>
          </Reveal>
          <Reveal delay={320}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a
                href="#comecar"
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
                Experimenta um treino
              </a>
              <ActionButton
                href={MAIL}
                style={{ color: "#fff", border: "2px solid rgba(255,255,255,0.7)", background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#fff")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.7)")}
              >
                Fala connosco
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
              title="Nascemos de forma simples. Crescemos com espírito de equipa."
              subtitle="Os Alverca Urban Runners começaram com amigos a correr juntos. Hoje somos uma comunidade com presença competitiva e foco total na inclusão. Aqui, ninguém corre sozinho."
            />
          </Reveal>
          <Reveal delay={100}>
            <div className="about-stats">
              {[
                { value: "2014", label: "Origem orgânica" },
                { value: "50+", label: "Participantes ativos" },
                { value: "2", label: "Pontos de encontro" },
                { value: "100%", label: "Espírito de grupo" },
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
            <img
              src="/fotos/quem-somos-ogma.jpg"
              alt="Dezenas de atletas do clube junto ao mural da aviação em Alverca"
              width={1200}
              height={800}
              loading="lazy"
              style={{ display: "block", width: "100%", height: "auto", maxHeight: 460, marginTop: 24, borderRadius: 16, objectFit: "cover" }}
            />
          </Reveal>
        </div>
      </section>

      <section className="about-section" style={{ padding: "82px 24px", background: V("--bg-card") }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <Reveal>
            <SectionTitle
              tag="O que fazemos"
              title="Treinos regulares, desafios especiais e eventos com identidade."
              subtitle="Estrutura clara para evoluir com segurança e motivação."
            />
          </Reveal>
          <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            {[
              {
                title: "Treinos regulares",
                text: "Terças e quintas com dois pontos de encontro na cidade, grupos por ritmo e acompanhamento para todos os níveis.",
                points: ["Iniciantes bem-vindos", "Progressão por objetivo", "Ambiente inclusivo"],
                image: "/fotos/treinos-regulares-tejo.jpg",
                alt: "Grupo a correr junto ao Tejo",
              },
              {
                title: "Treinos especiais",
                text: "Trilhos, desafios mensais e experiências fora da rotina para trabalhar resistência, técnica e mentalidade.",
                points: ["Trail running", "Desafios por equipas", "Treinos sunrise"],
                image: "/fotos/treinos-especiais-falesia.jpg",
                alt: "Atletas no alto de uma falésia sobre o mar ao pôr do sol",
              },
              {
                title: "Eventos",
                text: "Destaque para o Trail Encostas de Xira e para a São Silvestre Pirata, além de participações em provas regionais.",
                points: ["Trail Encostas de Xira", "São Silvestre Pirata", "Provas de estrada e trail"],
                image: "/fotos/eventos-trail-encostas-xira.jpg",
                alt: "Equipa de staff do Trail Encostas de Xira 2024",
              },
            ].map((card, idx) => (
              <Reveal delay={idx * 100 + 90} key={card.title}>
                <article
                  style={{
                    height: "100%",
                    borderRadius: 16,
                    padding: 24,
                    background: `linear-gradient(160deg, ${V("--bg-card")} 0%, ${V("--card-gradient-end")} 100%)`,
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
                  <img
                    src={card.image}
                    alt={card.alt}
                    width={1200}
                    height={800}
                    loading="lazy"
                    style={{ display: "block", width: "100%", height: "auto", borderRadius: 12, marginBottom: 18 }}
                  />
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
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="comecar" className="about-section" style={{ padding: "82px 24px", background: V("--bg-page"), scrollMarginTop: 72 }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <Reveal>
            <SectionTitle
              tag="Como começar"
              title="O primeiro treino é o mais fácil."
              subtitle="Não precisas de experiência nem de ritmo certo. Só de vontade de aparecer."
            />
          </Reveal>
          <ol className="about-steps" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {[
              { title: "Fala connosco", text: "Envia-nos um e-mail ou uma mensagem nas redes sociais. Dizemos-te onde e a que horas é o próximo treino." },
              { title: "Aparece num treino", text: "Às terças ou quintas, com sapatilhas e água. Os grupos são por ritmo, por isso ninguém fica para trás." },
              { title: "Fica connosco", text: "Gostaste? Torna-te sócio, cria a tua conta e acompanha os treinos, provas e eventos no calendário do clube." },
            ].map((step, idx) => (
              <Reveal
                as="li"
                delay={idx * 100 + 80}
                key={step.title}
                style={{
                  boxSizing: "border-box",
                  borderRadius: 16,
                  padding: 22,
                  background: V("--bg-card"),
                  border: `1px solid ${V("--border-subtle")}`,
                }}
              >
                  <span
                    aria-hidden
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 40, height: 40, borderRadius: 999, marginBottom: 14,
                      background: "#CC3333", color: "#fff", fontWeight: 800, fontSize: 18,
                      fontFamily: "Oswald, Inter, system-ui, sans-serif",
                    }}
                  >
                    {idx + 1}
                  </span>
                  <h3 style={{ margin: "0 0 8px", color: V("--text-heading"), fontSize: 20, fontWeight: 700 }}>{step.title}</h3>
                  <p style={{ margin: 0, color: V("--text-secondary"), lineHeight: 1.65 }}>{step.text}</p>
              </Reveal>
            ))}
          </ol>
          <Reveal delay={200}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 24 }}>
              <ActionButton href={MAIL_TRIAL} style={{ background: "#CC3333", color: "#fff", border: "2px solid #CC3333" }}>
                Quero experimentar um treino
              </ActionButton>
              <Link to="/register" style={{ color: V("--c-accent"), fontWeight: 700, textDecoration: "none", padding: "13px 8px" }}>
                Já és do clube? Cria a tua conta →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section
        className="about-section"
        style={{ padding: "84px 24px", background: "linear-gradient(180deg, #0D2137 0%, #0A1727 100%)" }}
      >
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <Reveal>
            <SectionTitle
              onDark
              tag="Energia da comunidade"
              title="Amizade, entreajuda e motivação em cada passada."
              subtitle="Juntamos pessoas com ritmos diferentes e a mesma vontade de evoluir. O ambiente é próximo, humano e inspirador."
            />
          </Reveal>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            {[
              '"Entrei sem conseguir correr 5K. Hoje fecho 10K com a equipa a puxar por mim."',
              '"Nos dias difíceis, o grupo ajuda-me a manter o foco. Nunca corro sozinho."',
              '"Mais do que treino, encontrei amizades e uma rotina que mudou a minha vida."',
            ].map((quote, idx) => (
              <Reveal delay={idx * 100 + 100} key={quote}>
                <article
                  style={{
                    borderRadius: 14,
                    padding: 22,
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
          <Reveal delay={200}>
            <div className="about-mosaic">
              <img src="/fotos/mosaico-brinde.jpg" alt="Brinde em roda depois de um treino, visto de baixo" width={800} height={800} loading="lazy" />
              <img src="/fotos/mosaico-serra.jpg" alt="Grupo de atletas no alto da serra ao pôr do sol" width={800} height={800} loading="lazy" />
              <img src="/fotos/mosaico-pelourinho.jpg" alt="Atletas do clube junto ao pelourinho, em frente à Câmara Municipal" width={800} height={800} loading="lazy" />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="about-section" style={{ padding: "82px 24px", background: V("--bg-page") }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <Reveal>
            <SectionTitle
              tag="Conquistas"
              title="As conquistas individuais são vitórias de todos."
              subtitle="Do primeiro 10K aos pódios, cada passo tem apoio coletivo."
            />
          </Reveal>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {[
              { year: "2024", text: "Primeiros 10K de novos membros com pacers da equipa." },
              { year: "2025", text: "Entradas em meias maratonas e trails técnicos." },
              { year: "2025", text: "Pódios regionais em provas de estrada e montanha." },
              { year: "2026", text: "Mais superações pessoais e maior impacto na cidade." },
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
                      color: V("--c-accent"),
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
          <Reveal delay={200}>
            <SectionPhoto src="/fotos/conquistas-2600tr.jpg" alt="Atletas do clube com dorsal de prova junto a uma capela no alto da serra" />
          </Reveal>
        </div>
      </section>

      <section className="about-section" style={{ padding: "82px 24px", background: V("--bg-card") }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <Reveal>
            <SectionTitle
              tag="Impacto na comunidade"
              title="Corremos por nós e inspiramos Alverca a mexer-se."
              subtitle="Promoção da saúde, parcerias locais e eventos comunitários que aproximam pessoas."
            />
          </Reveal>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {[
              "Promoção de hábitos saudáveis para todas as idades.",
              "Parcerias com agentes locais para fortalecer o desporto.",
              "Eventos comunitários com envolvimento direto da cidade.",
              "Representação ativa de Alverca em iniciativas da região.",
            ].map((item, idx) => (
              <Reveal delay={idx * 80 + 90} key={item}>
                <article
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    height: "100%",
                    boxSizing: "border-box",
                    borderRadius: 14,
                    padding: 18,
                    border: `1px solid ${V("--border-subtle")}`,
                    background: V("--bg-page"),
                    color: V("--text-primary"),
                    lineHeight: 1.6,
                  }}
                >
                  <span aria-hidden style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 999, background: "#CC3333", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>✓</span>
                  <span>{item}</span>
                </article>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200}>
            <SectionPhoto src="/fotos/impacto-trail-familias.jpg" alt="Staff e participantes, com várias crianças, no Trail Encostas de Xira" />
          </Reveal>
        </div>
      </section>

      <section className="about-section" style={{ padding: "82px 24px", background: V("--bg-page") }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <Reveal>
            <SectionTitle
              tag="Redes sociais"
              title="Segue o ritmo da equipa todos os dias."
              subtitle="Facebook e Instagram com horários, bastidores e desafios."
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
          </div>
        </div>
      </section>

      <section
        ref={finalRef}
        className="about-section"
        style={{
          position: "relative",
          padding: "110px 24px",
          textAlign: "center",
          backgroundImage: "linear-gradient(130deg, rgba(204,51,51,0.84) 0%, rgba(110,14,14,0.88) 100%), url('/fotos/cta-miradouro.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
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
              O próximo passo é teu.
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
              Participa num treino, conhece o grupo e descobre como é evoluir com uma equipa que acredita em ti
              desde o primeiro dia.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a
                href={MAIL_TRIAL}
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
                Quero experimentar um treino
              </a>
              <Link
                to="/register"
                style={{ textDecoration: "none", color: "#fff", border: "2px solid rgba(255,255,255,0.84)", background: "transparent", padding: "13px 24px", borderRadius: 999, fontWeight: 800 }}
              >
                Criar conta
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <div className={`about-sticky-cta${showStickyCta ? " visible" : ""}`} aria-hidden={!showStickyCta}>
        <a
          href="#comecar"
          tabIndex={showStickyCta ? 0 : -1}
          style={{ display: "block", textAlign: "center", textDecoration: "none", background: "#CC3333", color: "#fff", fontWeight: 800, padding: "14px 16px", borderRadius: 999, fontSize: 16 }}
        >
          Experimenta um treino connosco
        </a>
      </div>
    </div>
  );
}
