import { useEffect, useState } from "react";
import api from "../services/api";

const V = (name) => `var(${name})`;

// Push notifications on this device (the Android app or a browser): turn them on
// or off, and choose which ones. The subscription is per device; the choices are per user.

function urlBase64ToUint8Array(base64) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const supported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

export default function PushNotifications({ card, h2, button, secondaryButton }) {
  const [config, setConfig] = useState(null);
  const [prefs, setPrefs] = useState(null);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [configRes, prefsRes] = await Promise.all([api("/api/push/config"), api("/api/push/preferences")]);
        if (configRes.ok) setConfig(await configRes.json());
        if (prefsRes.ok) setPrefs(await prefsRes.json());
        if (supported()) setSubscribed(Boolean(await currentSubscription()));
      } catch {
        setConfig({ enabled: false });
      }
    })();
  }, []);

  if (!config?.enabled || !prefs) return null;

  const enable = async () => {
    setError("");
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("As notificações estão bloqueadas. Permite-as nas definições do telemóvel ou do browser.");
        return;
      }
      const registration = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(config.publicKey) }));
      const res = await api("/api/push/subscriptions", { method: "POST", body: JSON.stringify(subscription.toJSON()) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error);
      setSubscribed(true);
    } catch (err) {
      setError(err.message || "Não foi possível ativar as notificações.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setError("");
    setBusy(true);
    try {
      const subscription = await currentSubscription();
      if (subscription) {
        await api("/api/push/subscriptions", { method: "DELETE", body: JSON.stringify({ endpoint: subscription.endpoint }) });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } catch {
      setError("Não foi possível desativar as notificações.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (field, value) => {
    const previous = prefs;
    setPrefs({ ...prefs, [field]: value });
    const res = await api("/api/push/preferences", { method: "PUT", body: JSON.stringify({ [field]: value }) });
    if (!res.ok) {
      setPrefs(previous);
      setError("Não foi possível guardar a preferência.");
    }
  };

  const option = (field, label, hint) => (
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 14, fontSize: 14, color: V("--text-primary"), cursor: "pointer" }}>
      <input type="checkbox" checked={prefs[field]} onChange={(e) => toggle(field, e.target.checked)} style={{ marginTop: 3 }} />
      <span>{label}
        <span style={{ display: "block", fontSize: 12, color: V("--text-muted") }}>{hint}</span>
      </span>
    </label>
  );

  return (
    <section style={card}>
      <h2 style={h2}>Notificações</h2>
      {!supported() ? (
        <p style={{ fontSize: 14, color: V("--text-secondary"), margin: 0 }}>
          Este browser não suporta notificações. Instala a app Android do clube ou usa o Chrome.
        </p>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, color: V("--text-primary") }}>
            {subscribed ? "Ativas neste dispositivo." : "Desativadas neste dispositivo."}
          </span>
          {subscribed ? (
            <button type="button" onClick={disable} disabled={busy} style={{ ...secondaryButton, opacity: busy ? 0.5 : 1 }}>Desativar</button>
          ) : (
            <button type="button" onClick={enable} disabled={busy} style={{ ...button, opacity: busy ? 0.5 : 1 }}>{busy ? "A ativar..." : "Ativar notificações"}</button>
          )}
        </div>
      )}
      {option("pushNewEvents", "Novos eventos", "Quando é criado um evento no calendário do clube.")}
      {option("pushTrainingReminders", "Lembretes de treino", "No dia do treino, a partir das 9h, se ainda não confirmaste. Para organizadores, também o lembrete de marcar presenças.")}
      {error && <p style={{ fontSize: 14, color: "var(--c-danger)", margin: "12px 0 0" }}>{error}</p>}
    </section>
  );
}
