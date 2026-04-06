import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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

function App() {
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
          // Don't remove token on network errors (cold start, etc)
        })
        .finally(() => setLoaded(true));
    } else {
      setLoaded(true);
    }
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e) => {
      if (!e.target.closest("[data-user-menu]")) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  if (!loaded) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#081420" }}>
      <div className="animate-spin rounded-full h-8 w-8 border-t-2" style={{ borderColor: "#CC3333" }}></div>
    </div>
  );

  return (
    <BrowserRouter>
      <div style={{ minHeight: "100vh", background: "#081420", color: "#e8ecef" }}>

        <header style={{ background: "#0D2137", position: "sticky", top: 0, zIndex: 50 }}>
          <nav style={{ maxWidth: 1152, margin: "0 auto", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 14, textDecoration: "none" }}>
              <img src="/logo.png" alt="AUR" style={{ height: 52, width: "auto" }} />
              <div>
                <div style={{ fontSize: 17, fontWeight: 500, color: "#FFFFFF", textTransform: "uppercase"}}>Alverca Urban Runners</div>
                <div style={{ fontSize: 11, color: "#c0c0c0", letterSpacing: 1, textTransform: "uppercase" }}>Vamos descobrir a cidade</div>
              </div>
            </Link>
            <div style={{ display: "flex", gap: 20, alignItems: "center", fontSize: 14 }}>
              <Link to="/" style={{ color: "#9ca3af", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={e => e.target.style.color = "#36C2CE"}
                onMouseLeave={e => e.target.style.color = "#9ca3af"}>Calendário</Link>
              <Link to="/about" style={{ color: "#9ca3af", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={e => e.target.style.color = "#36C2CE"}
                onMouseLeave={e => e.target.style.color = "#9ca3af"}>Sobre</Link>
              {user && ["admin", "organizer"].includes(user.role) && (
                <>
                  <Link to="/admin" style={{ color: "#9ca3af", textDecoration: "none", transition: "color 0.2s" }}
                    onMouseEnter={e => e.target.style.color = "#36C2CE"}
                    onMouseLeave={e => e.target.style.color = "#9ca3af"}>Admin</Link>
                  <Link to="/import" style={{ color: "#9ca3af", textDecoration: "none", transition: "color 0.2s" }}
                    onMouseEnter={e => e.target.style.color = "#36C2CE"}
                    onMouseLeave={e => e.target.style.color = "#9ca3af"}>Importar</Link>
                </>
              )}
              {user?.role === "admin" && (
                <Link to="/admin/users" style={{ color: "#9ca3af", textDecoration: "none", transition: "color 0.2s" }}
                  onMouseEnter={e => e.target.style.color = "#36C2CE"}
                  onMouseLeave={e => e.target.style.color = "#9ca3af"}>Utilizadores</Link>
              )}
              {user ? (
                <div style={{ position: "relative" }} data-user-menu>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 8, transition: "background 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#1B3A5C"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span style={{ color: "#9ca3af", fontSize: 14 }}>{user.name}</span>
                  </button>
                  {userMenuOpen && (
                    <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, background: "#0D2137", border: "1px solid #1B3A5C", borderRadius: 10, overflow: "hidden", minWidth: 160, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          localStorage.removeItem("token");
                          fetch("/auth/logout", { method: "POST" }).finally(() => window.location.reload());
                        }}
                        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "12px 16px", background: "none", border: "none", color: "#e8ecef", fontSize: 14, cursor: "pointer", transition: "background 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#1B3A5C"}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                          <polyline points="16 17 21 12 16 7"/>
                          <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Sair
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" style={{ background: "#CC3333", color: "#fff", padding: "6px 16px", borderRadius: 9999, textDecoration: "none", fontWeight: 500, transition: "background 0.2s" }}
                  onMouseEnter={e => e.target.style.background = "#be0000"}
                  onMouseLeave={e => e.target.style.background = "#CC3333"}>Entrar</Link>
              )}
            </div>
          </nav>
        </header>

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

        <footer style={{ borderTop: "1px solid #1B3A5C", background: "#0D2137", marginTop: 48 }}>
          <div style={{ maxWidth: 1152, margin: "0 auto", padding: "24px 16px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, fontSize: 14, color: "#6b7280" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img src="/logo.png" alt="AUR" style={{ height: 24, width: "auto", opacity: 0.5 }} />
              <span>Alverca Urban Runners &copy; {new Date().getFullYear()}</span>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <a href="https://www.facebook.com/alvercaurbanrunners/" target="_blank" rel="noopener noreferrer" style={{ color: "#6b7280", textDecoration: "none" }}
                onMouseEnter={e => e.target.style.color = "#36C2CE"}
                onMouseLeave={e => e.target.style.color = "#6b7280"}>Facebook</a>
              <a href="https://www.instagram.com/alvercaurbanrunners/" target="_blank" rel="noopener noreferrer" style={{ color: "#6b7280", textDecoration: "none" }}
                onMouseEnter={e => e.target.style.color = "#36C2CE"}
                onMouseLeave={e => e.target.style.color = "#6b7280"}>Instagram</a>
              <a href="https://www.uin-sports.pt/lojaonline/clubes/ps-alverca-urban-runners" target="_blank" rel="noopener noreferrer" style={{ color: "#6b7280", textDecoration: "none" }}
                onMouseEnter={e => e.target.style.color = "#36C2CE"}
                onMouseLeave={e => e.target.style.color = "#6b7280"}>Loja</a>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
