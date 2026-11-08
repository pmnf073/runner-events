import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { captureAppVersion } from "./components/AppUpdateBanner";

captureAppVersion();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Installable app (PWA / Android TWA): only in production builds, so the dev server is unaffected.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => console.warn("Service worker não registado:", err));
  });
}
