import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../ThemeContext";

const V = (name) => `var(${name})`;

function FadeIn({ children, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
      setHasAnimated(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(20px)",
      transition: "opacity 0.6s ease, transform 0.6s ease",
    }}>
      {children}
    </div>
  );
}

export default function AboutPage() {
  const { theme } = useTheme();
  const logoSrc = theme === "light" ? "/logo-light.png" : "/logo.png";

  return (
    <div style={{ margin: 0, padding: 0, overflow: "hidden" }}>

      {/* ── HERO SECTION ── */}
      <section style={{
        position: "relative",
        minHeight: "90vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        background: `linear-gradient(135deg, ${V("--bg-page")} 0%, #0D2137 100%)`,
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 30% 70%, rgba(204,51,51,0.15) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(54,194,206,0.1) 0%, transparent 50%)",
        }} />
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        
        <div style={{ position: "relative", zIndex: 1, padding: "0 24px", maxWidth: 900 }}>
          <FadeIn>
            <img src={logoSrc} alt="AUR" style={{ height: 80, width: "auto", margin: "0 auto 32px", display: "block" }} />
          </FadeIn>
          
          <FadeIn delay={150}>
            <h1 style={{
              fontSize: "clamp(36px, 8vw, 64px)",
              fontWeight: 800,
              color: V("--text-heading"),
              margin: "0 0 24px",
              lineHeight: 1.1,
              letterSpacing: "-1px",
            }}>
              CORRE CONNOSCO.<br />
              <span style={{ color: "#CC3333" }}>CRESCE CONNOSCO.</span>
            </h1>
          </FadeIn>
          
          <FadeIn delay={300}>
            <p style={{
              fontSize: "clamp(16px, 3vw, 20px)",
              color: V("--text-secondary"),
              margin: "0 auto 40px",
              maxWidth: 600,
              lineHeight: 1.6,
            }}>
              Um grupo de corrida comunitario que nasceu de uma amizade e se tornou numa família. 
              Aqui, ninguém corre sozinho.
            </p>
          </FadeIn>
          
          <FadeIn delay={450}>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/"
                style={{
                  background: "#CC3333",
                  color: "#fff",
                  padding: "16px 36px",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontSize: 16,
                  fontWeight: 600,
                  transition: "transform 0.2s, background 0.2s",
                  display: "inline-block",
                }}
                onMouseEnter={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.background = "#be0000"; }}
                onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.background = "#CC3333"; }}
              >
                Junga-te a nós
              </Link>
              <a href="https://www.instagram.com/alvercaurbanrunners/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "transparent",
                  color: V("--text-primary"),
                  padding: "16px 36px",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontSize: 16,
                  fontWeight: 600,
                  border: `2px solid ${V("--border-subtle")}`,
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#CC3333"}
                onMouseLeave={e => e.currentTarget.style.borderColor = V("--border-subtle")}
              >
                Seguir nas redes
              </a>
            </div>
          </FadeIn>
        </div>
        
        <div style={{
          position: "absolute",
          bottom: 40,
          left: "50%",
          transform: "translateX(-50%)",
          animation: "bounce 2s infinite",
        }}>
          <span style={{ fontSize: 24, color: V(--"--text-muted") }}>↓</span>
        </div>
        <style>{`
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateX(-50%) translateY(0); }
            40% { transform: translateX(-50%) translateY(-10px); }
            60% { transform: translateX(-50%) translateY(-5px); }
          }
        `}</style>
      </section>

      {/* ── QUEM SOMOS ── */}
      <section style={{ padding: "80px 24px", background: V("--bg-card") }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <FadeIn>
            <span style={{ color: "#CC3333", fontWeight: 600, fontSize: 14, textTransform: "uppercase", letterSpacing: 2 }}>Quem Somos</span>
            <h2 style={{
              fontSize: "clamp(28px, 5vw, 40px)",
              fontWeight: 700,
              color: V("--text-heading"),
              margin: "16px 0 24px",
              lineHeight: 1.2,
            }}>
              Mais do que um grupo de corrida. Uma família.
            </h2>
          </FadeIn>
          
          <FadeIn delay={150}>
            <p style={{
              fontSize: 18,
              color: V("--text-secondary"),
              lineHeight: 1.8,
              maxWidth: 700,
              margin: "0 auto",
            }}>
              Os Alverca Urban Runners nasceram em 2014 de um pequeno grupo de amigos que queriam 
              correr juntos. O que começou como treinos informais tornou-se numa comunidade que 
              transforma a maneira de viver a corrida — com inclusão, amizade e superação.
            </p>
          </FadeIn>
          
          <FadeIn delay={300}>
            <div style={{
              display: "flex",
              justifyContent: "center",
              gap: 48,
              marginTop: 48,
              flexWrap: "wrap",
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 48, fontWeight: 800, color: "#CC3333" }}>2014</div>
                <div style={{ fontSize: 14, color: V("--text-muted"), textTransform: "uppercase", letterSpacing: 1 }}>Nascemos</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 48, fontWeight: 800, color: "#CC3333" }}>50+</div>
                <div style={{ fontSize: 14, color: V("--text-muted"), textTransform: "uppercase", letterSpacing: 1 }}>Ativos</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 48, fontWeight: 800, color: "#CC3333" }}>3x</div>
                <div style={{ fontSize: 14, color: V("--text-muted"), textTransform: "uppercase", letterSpacing: 1 }}>Semana</div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── O QUE FAZEMOS ── */}
      <section style={{ padding: "80px 24px", background: V("--bg-page") }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <span style={{ color: "#CC3333", fontWeight: 600, fontSize: 14, textTransform: "uppercase", letterSpacing: 2 }}>O Que Fazemos</span>
            <h2 style={{
              fontSize: "clamp(28px, 5vw, 40px)",
              fontWeight: 700,
              color: V("--text-heading"),
              margin: "16px 0 48px",
            }}>
              Corrida para todos. Sempre.
            </h2>
          </FadeIn>
          
          <div style={{ display: "grid", "gridTemplateColumns": "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            <FadeIn delay={100}>
              <div style={{
                background: V("--bg-card"),
                borderRadius: 16,
                padding: 32,
                border: `1px solid ${V("--border-subtle")}`,
                height: "100%",
              }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🏃</div>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: V("--text-heading"), margin: "0 0 12px" }}>Treinos Regulares</h3>
                <p style={{ color: V("--text-secondary"), lineHeight: 1.7, margin: "0 0 16px" }}>
                  <strong style={{ color: "#CC3333" }}>Terças e Quintas</strong> — dois pontos de encontro na cidade. 
                  Corremos em ritmos diferentes, mas sempre juntos. Os mais rápidos regressam para acompanhar quem vem atrás.
                </p>
                <ul style={{ color: V("--text-secondary"), paddingLeft: 20, margin: 0, lineHeight: 1.8 }}>
                  <li>Iniciantes welcome</li>
                  <li>Todos os níveis</li>
                  <li>Grupos por ritmo</li>
                </ul>
              </div>
            </FadeIn>
            
            <FadeIn delay={200}>
              <div style={{
                background: V("--bg-card"),
                borderRadius: 16,
                padding: 32,
                border: `1px solid ${V("--border-subtle")}`,
                height: "100%",
              }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🏔️</div>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: V("--text-heading"), margin: "0 0 12px" }}>Trilhos e Aventuras</h3>
                <p style={{ color: V("--text-secondary"), lineHeight: 1.7, margin: "0 0 16px" }}>
                  <strong style={{ color: "#CC3333" }}>Sábados</strong> — saímos da cidade para explorar os trilhos da região. 
                  Montanha, floresta, caminhos que poucos conhecem.
                </p>
                <ul style={{ color: V("--text-secondary"), paddingLeft: 20, margin: 0, lineHeight: 1.8 }}>
                  <li>Trail running</li>
                  <li>Reconhecimento de percursos</li>
                  <li>Eventos especiais</li>
                </ul>
              </div>
            </FadeIn>
            
            <FadeIn delay={300}>
              <div style={{
                background: V("--bg-card"),
                borderRadius: 16,
                padding: 32,
                border: `1px solid ${V("--border-subtle")}`,
                height: "100%",
              }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: V("--text-heading"), margin: "0 0 12px" }}>Eventos</h3>
                <p style={{ color: V("--text-secondary"), lineHeight: 1.7, margin: "0 0 16px" }}>
                  Organizamos e participamos em provas ao longo do ano. 
                  O <strong style={{ color: "#CC3333" }}>Trail das Encostas de Xira (TEX)</strong> é o nosso filho prinho.
                </p>
                <ul style={{ color: V("--text-secondary"), paddingLeft: 20, margin: 0, lineHeight: 1.8 }}>
                  <li>TEX - Trail das Encostas de Xira</li>
                  <li>São Silvestre Pirata</li>
                  <li>Participação em provas nacionais</li>
                </ul>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── ENERGIA DA COMUNIDADE ── */}
      <section style={{ padding: "80px 24px", background: "linear-gradient(180deg, #0D2137 0%, #0B1A2B 100%)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <FadeIn>
            <span style={{ color: "#CC3333", fontWeight: 600, fontSize: 14, textTransform: "uppercase", letterSpacing: 2 }}>Comunidade</span>
            <h2 style={{
              fontSize: "clamp(28px, 5vw, 40px)",
              fontWeight: 700,
              color: V("--text-heading"),
              margin: "16px 0 24px",
            }}>
              Aqui, toda a gente conta.
            </h2>
          </FadeIn>
          
          <FadeIn delay={150}>
            <p style={{
              fontSize: 18,
              color: V("--text-secondary"),
              lineHeight: 1.8,
              maxWidth: 700,
              margin: "0 auto 48px",
            }}>
              Não importa se nunca corriste ou se já corres há anos. 
              O que importa é quereres vir correndo. Achas que não consegues? 
              Nós corremos contigo até conseguires.
            </p>
          </FadeIn>
          
          <FadeIn delay={300}>
            <div style={{
              background: V("--bg-card"),
              borderRadius: 16,
              padding: 40,
              border: `1px solid ${V("--border-subtle")}`,
              borderLeft: "4px solid #CC3333",
            }}>
              <p style={{
                fontSize: 20,
                fontWeight: 500,
                color: V("--text-heading"),
                fontStyle: "italic",
                margin: 0,
                lineHeight: 1.6,
              }}>
                "Juntei-me ao grupo sem nunca ter corrido. Hoje corro a minha primeira maratona. 
                O grupo mudou a minha vida."
              </p>
              <p style={{ color: V("--text-muted"), marginTop: 16 }}>— Um，跑员</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CONQUISTAS ── */}
      <section style={{ padding: "80px 24px", background: V("--bg-page") }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <span style={{ color: "#CC3333", fontWeight: 600, fontSize: 14, textTransform: "uppercase", letterSpacing: 2 }}>Conquistas</span>
            <h2 style={{
              fontSize: "clamp(28px, 5vw, 40px)",
              fontWeight: 700,
              color: V("--text-heading"),
              margin: "16px 0 48px",
            }}>
              As tuas vitórias são as nossas.
            </h2>
          </FadeIn>
          
          <div style={{ display: "grid", "gridTemplateColumns": "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
            {[
              { icon: "🏅", title: "Primeiros 10K", desc: "Dezenas de membros que cumpriram o primeiro 10km" },
              { icon: "🥈", title: "Meia Maratona", desc: "Grupo completo a cruzar a meta da primeira Meia" },
              { icon: "🥇", title: "Pódios", desc: "Vários pódios em provas de trail e estrada" },
              { icon: "🏆", title: "Trail das Encostas", desc: "Organização do maior evento de trail da região" },
            ].map((item, i) => (
              <FadeIn delay={i * 100} key={item.title}>
                <div style={{
                  background: V("--bg-card"),
                  borderRadius: 12,
                  padding: 24,
                  border: `1px solid ${V("--border-subtle")}`,
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                  <h4 style={{ fontSize: 18, fontWeight: 600, color: V("--text-heading"), margin: "0 0 8px" }}>{item.title}</h4>
                  <p style={{ fontSize: 14, color: V("--text-secondary"), margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── IMPACTO NA COMUNIDADE ── */}
      <section style={{ padding: "80px 24px", background: V("--bg-card") }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <FadeIn>
            <span style={{ color: "#CC3333", fontWeight: 600, fontSize: 14, textTransform: "uppercase", letterSpacing: 2 }}>Comunidade</span>
            <h2 style={{
              fontSize: "clamp(28px, 5vw, 40px)",
              fontWeight: 700,
              color: V("--text-heading"),
              margin: "16px 0 24px",
            }}>
              Mais do que corrida.
            </h2>
          </FadeIn>
          
          <FadeIn delay={150}>
            <div style={{ display: "grid", "gridTemplateColumns": "repeat(auto-fit, minmax(200px, 1fr))", gap: 24, marginTop: 40 }}>
              <div>
                <div style={{ fontSize: 40, marginBottom: 12 }}>❤️</div>
                <h4 style={{ fontSize: 18, fontWeight: 600, color: V("--text-heading"), margin: "0 0 8px" }}>Saúde</h4>
                <p style={{ fontSize: 14, color: V("--text-secondary"), margin: 0 }}>Promovemos um estilo de vida ativo e saudável para todos</p>
              </div>
              <div>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🤝</div>
                <h4 style={{ fontSize: 18, fontWeight: 600, color: V("--text-heading"), margin: "0 0 8px" }}>Parcerias</h4>
                <p style={{ fontSize: 14, color: V("--text-secondary"), margin: 0 }}>Trabalhamos com a UIN Sports e a Destino Olímpico</p>
              </div>
              <div>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏘️</div>
                <h4 style={{ fontSize: 18, fontWeight: 600, color: V("--text-heading"), margin: "0 0 8px" }}>Cidade</h4>
                <p style={{ fontSize: 14, color: V("--text-secondary"), margin: 0 }}>Somos parte ativa da vida de Alverca</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── REDES SOCIAIS ── */}
      <section style={{ padding: "80px 24px", background: V("--bg-page") }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <FadeIn>
            <span style={{ color: "#CC3333", fontWeight: 600, fontSize: 14, textTransform: "uppercase", letterSpacing: 2 }}>Siga-nos</span>
            <h2 style={{
              fontSize: "clamp(28px, 5vw, 40px)",
              fontWeight: 700,
              color: V("--text-heading"),
              margin: "16px 0 48px",
            }}>
              Fica connosco.
            </h2>
          </FadeIn>
          
          <FadeIn delay={150}>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="https://www.facebook.com/alvercaurbanrunners/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: V("--bg-card"),
                  border: `1px solid ${V("--border-subtle")}`,
                  borderRadius: 12,
                  padding: "16px 24px",
                  textDecoration: "none",
                  color: V("--text-primary"),
                  transition: "border-color 0.2s, transform 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#CC3333"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = V("--border-subtle"); e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <span style={{ fontSize: 24 }}>📘</span>
                <span style={{ fontWeight: 500 }}>Facebook</span>
              </a>
              <a href="https://www.instagram.com/alvercaurbanrunners/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: V("--bg-card"),
                  border: `1px solid ${V("--border-subtle")}`,
                  borderRadius: 12,
                  padding: "16px 24px",
                  textDecoration: "none",
                  color: V("--text-primary"),
                  transition: "border-color 0.2s, transform 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#CC3333"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = V("--border-subtle"); e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <span style={{ fontSize: 24 }}>📷</span>
                <span style={{ fontWeight: 500 }}>Instagram</span>
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{
        padding: "100px 24px",
        background: "linear-gradient(135deg, #CC3333 0%, #991111 100%)",
        textAlign: "center",
      }}>
        <FadeIn>
          <h2 style={{
            fontSize: "clamp(32px, 6vw, 48px)",
            fontWeight: 800,
            color: "#fff",
            margin: "0 0 16px",
          }}>
            O próximo passo é teu.
          </h2>
          <p style={{
            fontSize: 18,
            color: "rgba(255,255,255,0.9)",
            maxWidth: 500,
            margin: "0 auto 32px",
            lineHeight: 1.6,
          }}>
            Queres experimentar um treino? Queres saber mais sobre o grupo? 
            Estamos aqui para te receber.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/"
              style={{
                background: "#fff",
                color: "#CC3333",
                padding: "16px 36px",
                borderRadius: 8,
                textDecoration: "none",
                fontSize: 16,
                fontWeight: 600,
                transition: "transform 0.2s",
              }}
              onMouseEnter={e => e.target.style.transform = "translateY(-2px)"}
              onMouseLeave={e => e.target.style.transform = "translateY(0)"}
            >
              Participar num treino
            </Link>
            <a href="mailto:alvercaurbanrunners@gmail.com"
              style={{
                background: "transparent",
                color: "#fff",
                padding: "16px 36px",
                borderRadius: 8,
                textDecoration: "none",
                fontSize: 16,
                fontWeight: 600,
                border: "2px solid rgba(255,255,255,0.5)",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#fff"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"}
            >
              Falar connosco
            </a>
          </div>
        </FadeIn>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: "24px",
        background: V("--bg-footer"),
        textAlign: "center",
        borderTop: `1px solid ${V("--border-subtle")}`,
      }}>
        <img src={logoSrc} alt="AUR" style={{ height: 40, width: "auto", margin: "0 auto 16px", display: "block", opacity: 0.6 }} />
        <p style={{ fontSize: 14, color: V("--text-muted"), margin: 0 }}>
          Alverca Urban Runners © {new Date().getFullYear()} — Vamos descobrir a cidade
        </p>
      </footer>

    </div>
  );
}
