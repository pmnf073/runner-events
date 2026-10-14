// API helper — adds JWT token to all requests
// Uses VITE_API_URL env var in production (Render backend URL)
// Falls back to relative paths for local dev (Vite proxy)

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = API_BASE ? `${API_BASE}${path}` : path;
  return fetch(url, { ...options, headers });
}

// Opens a file served by the API (e.g. a PDF receipt) in a new tab, sending the
// login token, which a plain link cannot do.
export async function openApiFile(path) {
  const win = window.open("", "_blank");
  const res = await api(path);
  if (!res.ok) {
    win?.close();
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Não foi possível abrir o ficheiro.");
  }
  const url = URL.createObjectURL(await res.blob());
  if (win) win.location.href = url;
  else window.location.href = url;
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
