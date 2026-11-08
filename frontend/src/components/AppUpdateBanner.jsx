import { useEffect, useState } from "react";

// Android app (TWA) updates. Each APK opens the site with ?app=<versionCode> (set by
// the build workflow); the site remembers it and, when the newest GitHub Release
// of the app has a higher number, shows a banner with the APK download.
// The site itself needs no update: only changes to the APK do (icon, name, domain).

const RELEASES_URL = "https://api.github.com/repos/pmnf073/runner-events/releases/latest";
const VERSION_KEY = "androidAppVersion";
const CACHE_KEY = "androidLatestRelease";
const DISMISS_KEY = "androidUpdateDismissed";

const storage = {
  get: (s, k) => { try { return s.getItem(k); } catch { return null; } },
  set: (s, k, v) => { try { s.setItem(k, v); } catch { /* private mode */ } },
};

// Called once at startup, before the router can redirect and drop the query string.
export function captureAppVersion() {
  const url = new URL(window.location.href);
  const version = url.searchParams.get("app");
  if (!version || !/^\d+$/.test(version)) return;
  storage.set(localStorage, VERSION_KEY, version);
  url.searchParams.delete("app");
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
}

// { version, apkUrl } of the newest app release, cached for the browser session.
async function latestRelease() {
  const cached = storage.get(sessionStorage, CACHE_KEY);
  if (cached) return JSON.parse(cached);
  const res = await fetch(RELEASES_URL, { headers: { Accept: "application/vnd.github+json" } });
  if (!res.ok) return null;
  const release = await res.json();
  // Tags are "android-v1.0.0.<versionCode>".
  const tag = release.tag_name || "";
  const version = tag.startsWith("android-v") ? Number(tag.split(".").pop()) : NaN;
  const apk = (release.assets || []).find((a) => a.name.endsWith(".apk"));
  const info = Number.isInteger(version) && apk ? { version, apkUrl: apk.browser_download_url } : null;
  if (info) storage.set(sessionStorage, CACHE_KEY, JSON.stringify(info));
  return info;
}

export default function AppUpdateBanner() {
  const [update, setUpdate] = useState(null);

  useEffect(() => {
    const installed = Number(storage.get(localStorage, VERSION_KEY));
    if (!installed) return; // not opened from the Android app
    latestRelease()
      .then((latest) => {
        if (!latest || latest.version <= installed) return;
        if (storage.get(sessionStorage, DISMISS_KEY) === String(latest.version)) return;
        setUpdate(latest);
      })
      .catch(() => {});
  }, []);

  if (!update) return null;

  const dismiss = () => {
    storage.set(sessionStorage, DISMISS_KEY, String(update.version));
    setUpdate(null);
  };

  return (
    <div role="status" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 16px", background: "var(--bg-card)", borderBottom: "1px solid var(--border-input)", color: "var(--text-primary)", fontSize: 14 }}>
      <span style={{ flex: 1, minWidth: 180 }}>Há uma nova versão da app disponível.</span>
      <a href={update.apkUrl} style={{ background: "#CC3333", color: "#fff", borderRadius: 8, padding: "8px 14px", fontWeight: 500, textDecoration: "none" }}>Atualizar</a>
      <button type="button" onClick={dismiss} aria-label="Fechar" style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
    </div>
  );
}
