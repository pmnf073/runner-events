// Same markup as the splash inside #root in index.html (its CSS lives there too), so the
// animation carries on when React takes over while the app waits for the server.
export default function SplashScreen() {
  return (
    <div className="app-splash" role="status" aria-live="polite">
      <div className="app-splash-mark">
        <div className="app-splash-ring" />
        <img className="app-splash-logo app-splash-logo-dark" src="/splash-logo-dark.png" alt="Alverca Urban Runners" width="112" height="112" />
        <img className="app-splash-logo app-splash-logo-light" src="/splash-logo-light.png" alt="Alverca Urban Runners" width="112" height="112" />
      </div>
      <div className="app-splash-text">
        <span>A ligar ao servidor…</span>
        <span>O primeiro acesso pode demorar até um minuto.</span>
      </div>
    </div>
  );
}
