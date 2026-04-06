import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ThemeProvider, useTheme } from "./ThemeContext";
import CalendarPage from "./pages/CalendarPage";
import EventPage from "./pages/EventPage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AboutPage from "./pages/AboutPage";
import RegisterPage from "./pages/RegisterPage";
import RegisterSuccessPage from "./pages/RegisterSuccessPage";
import ImportPage from "./pages/ImportPage";

const API_URL = import.meta.env.VITE_API_URL || "";

function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(API_URL + path, { ...options, headers, credentials: "include" });
}

/* ── Theme Toggle Button ── */
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      type="button"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        border: "none",
        borderRadius: 9999,
        cursor: "pointer",
        transition: "background 0.2s",
        background: "transparent",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {isDark ? (
        // Sun icon
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--toggle-icon-fill)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        // Moon icon
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--toggle-icon-fill)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

/* ── Inner App (has access to ThemeContext) ── */
function AppInner() {
  const { theme } = useTheme();
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log("App init, API_URL:", API_URL, "token:", token ? "present" : "none");
    if (token) {
      api("/auth/me")
        .then(async (r) => {
          console.log("/auth/me status:", r.status);
          const data = await r.json();
          console.log("/auth/me data:", data);
          if (data.authenticated) setUser(data.user);
          else localStorage.removeItem("token");
        })
        .catch((err) => {
          console.error("/auth/me error:", err);
        })
        .finally(() => setLoaded(true));
    } else {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e) => {
      if (!e.target.closest("[data-user-menu]")) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2" style={{ borderColor: "#CC3333" }}></div>
      </div>
    );
  }

  const navStyle = { color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.2s" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-page)", color: "var(--text-primary)" }}>

      {/* Header */}
      <header style={{ background: "var(--bg-header)", position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid var(--border-subtle)", transition: "background 0.3s ease" }}>
        <nav style={{ maxWidth: 1152, margin: "0 auto", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 14, textDecoration: "none" }}>
            <img src={theme === "light" ? "/logo-light.png" : "/logo.png"} alt="AUR" style={{ height: 52, width: "auto" }} />
            <div>
              <div style={{ fontSize: 17, fontWeight: 500, color: "var(--text-heading)", textTransform: "uppercase" }}>Alverca Urban Runners</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", letterSpacing: 1, textTransform: "uppercase" }}>Vamos descobrir a cidade</div>
            </div>
          </Link>
          <div style={{ display: "flex", gap: 20, alignItems: "center", fontSize: 14 }}>
            <Link to="/" style={navStyle}
              onMouseEnter={(e) => (e.target.style.color = "var(--hover-text)")}
              onMouseLeave={(e) => (e.target.style.color = "var(--text-secondary)")}>Calendário</Link>
            <Link to="/about" style={navStyle}
              onMouseEnter={(e) => (e.target.style.color = "var(--hover-text)")}
              onMouseLeave={(e) => (e.target.style.color = "var(--text-secondary)")}>Sobre</Link>
            {user && ["admin", "organizer"].includes(user.role) && (
              <>
                <Link to="/admin" style={navStyle}
                  onMouseEnter={(e) => (e.target.style.color = "var(--hover-text)")}
                  onMouseLeave={(e) => (e.target.style.color = "var(--text-secondary)")}>Eventos</Link>
                <Link to="/import" style={navStyle}
                  onMouseEnter={(e) => (e.target.style.color = "var(--hover-text)")}
                  onMouseLeave={(e) => (e.target.style.color = "var(--text-secondary)")}>Importar</Link>
              </>
            )}
            {user?.role === "admin" && (
              <Link to="/admin/users" style={navStyle}
                onMouseEnter={(e) => (e.target.style.color = "var(--hover-text)")}
                onMouseLeave={(e) => (e.target.style.color = "var(--text-secondary)")}>Utilizadores</Link>
            )}

            {/* Theme toggle */}
            <ThemeToggle />

            {user ? (
              <div style={{ position: "relative" }} data-user-menu>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 8, transition: "background 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>{user.name}</span>
                </button>
                {userMenuOpen && (
                  <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, background: "var(--bg-modal)", border: "1px solid var(--border-subtle)", borderRadius: 10, overflow: "hidden", minWidth: 160, boxShadow: `0 8px 24px var(--shadow-dropdown)` }}>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        localStorage.removeItem("token");
                        setUser(null);
                        fetch(`${API_URL}/auth/logout`, { method: "POST" }).finally(() => {
                          window.location.href = "/";
                        });
                      }}
                      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "12px 16px", background: "none", border: "none", color: "var(--text-primary)", fontSize: 14, cursor: "pointer", transition: "background 0.2s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Sair
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" style={{ background: "#CC3333", color: "#fff", padding: "6px 16px", borderRadius: 9999, textDecoration: "none", fontWeight: 500, transition: "background 0.2s" }}
                onMouseEnter={(e) => (e.target.style.background = "#be0000")}
                onMouseLeave={(e) => (e.target.style.background = "#CC3333")}>Entrar</Link>
            )}
          </div>
        </nav>
      </header>

      {/* Main */}
      <main style={{ maxWidth: 1152, margin: "0 auto", padding: "24px 16px" }}>
        <Routes>
          <Route path="/" element={<CalendarPage />} />
          <Route path="/event/:id" element={<EventPage />} />
          <Route path="/login" element={<LoginPage setUser={setUser} />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register-success" element={<RegisterSuccessPage />} />
          <Route path="/admin" element={<AdminPage user={user} />} />
          <Route path="/admin/users" element={<AdminUsersPage user={user} />} />
          <Route path="/import" element={<ImportPage user={user} />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--bg-footer)", marginTop: 48, transition: "background 0.3s ease" }}>
        <div style={{ maxWidth: 1152, margin: "0 auto", padding: "24px 16px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, fontSize: 14, color: "var(--text-muted)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={theme === "light" ? "/logo-light.png" : "/logo.png"} alt="AUR" style={{ height: 24, width: "auto", opacity: 0.5 }} />
            <span>Alverca Urban Runners &copy; {new Date().getFullYear()}</span>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <a href="https://www.facebook.com/alvercaurbanrunners/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", textDecoration: "none" }}
              onMouseEnter={(e) => (e.target.style.color = "var(--hover-text)")}
              onMouseLeave={(e) => (e.target.style.color = "var(--text-muted)")}>Facebook</a>
            <a href="https://www.instagram.com/alvercaurbanrunners/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", textDecoration: "none" }}
              onMouseEnter={(e) => (e.target.style.color = "var(--hover-text)")}
              onMouseLeave={(e) => (e.target.style.color = "var(--text-muted)")}>Instagram</a>
            <a href="https://www.uin-sports.pt/lojaonline/clubes/ps-alverca-urban-runners" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", textDecoration: "none" }}
              onMouseEnter={(e) => (e.target.style.color = "var(--hover-text)")}
              onMouseLeave={(e) => (e.target.style.color = "var(--text-muted)")}>Loja</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Wrap App in ThemeProvider ── */
function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;

/* ── Fix: user header button SVG color ── */
