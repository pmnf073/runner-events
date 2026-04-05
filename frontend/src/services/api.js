// API helper — adds JWT token to all requests
// Uses VITE_API_URL env var in production (Render backend URL)
// Falls back to relative paths for local dev (Vite proxy)

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = API_BASE ? `${API_BASE}${path}` : path;
  const opts = { ...options, headers, credentials: API_BASE ? "include" : "include" };
  return fetch(url, opts);
}
