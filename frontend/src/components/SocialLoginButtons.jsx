// Google and Facebook login buttons side by side, each with its logo and name.
export default function SocialLoginButtons({ onSelect }) {
  const base = {
    flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "11px 10px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
  };
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <button type="button" onClick={() => onSelect("google")} aria-label="Continuar com Google"
        style={{ ...base, background: "#fff", color: "#1f1f1f", border: "1px solid #747775" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M21.35 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.51h3.14c1.84-1.69 2.91-4.19 2.91-7.28Z" />
          <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.35l-3.14-2.51c-.87.58-1.99.92-3.31.92-2.54 0-4.69-1.71-5.46-4.01H3.3v2.59A9.75 9.75 0 0 0 12 21.75Z" />
          <path fill="#FBBC05" d="M6.54 13.8a5.87 5.87 0 0 1 0-3.6V7.61H3.3a9.75 9.75 0 0 0 0 8.78l3.24-2.59Z" />
          <path fill="#EA4335" d="M12 6.19c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.84 3.27 14.63 2.25 12 2.25A9.75 9.75 0 0 0 3.3 7.61l3.24 2.59C7.31 7.9 9.46 6.19 12 6.19Z" />
        </svg>
        Google
      </button>
      <button type="button" onClick={() => onSelect("facebook")} aria-label="Continuar com Facebook"
        style={{ ...base, background: "#0866FF", color: "#fff", border: "1px solid #0866FF" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M13.8 21v-8.2h2.75l.41-3.2H13.8V7.56c0-.93.26-1.56 1.59-1.56h1.7V3.14a22.7 22.7 0 0 0-2.48-.14c-2.45 0-4.13 1.5-4.13 4.24V9.6H7.7v3.2h2.78V21h3.32Z" />
        </svg>
        Facebook
      </button>
    </div>
  );
}
