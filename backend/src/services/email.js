// Sends email through the Resend HTTP API (https://resend.com). Configure with
// RESEND_API_KEY and EMAIL_FROM (e.g. "Alverca Urban Runners <geral@alvercaurbanrunners.pt>",
// a sender on a domain verified in Resend). Without them, emails are only logged,
// so development and tests never send anything.

export const CLUB_NAME = process.env.CLUB_NAME || "Alverca Urban Runners";

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export const frontendUrl = (path = "/") => new URL(path, process.env.FRONTEND_URL || "http://localhost:5173").toString();

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Plain-text body -> simple HTML (paragraphs, links kept clickable).
export function textToHtml(text) {
  const paragraphs = escapeHtml(text)
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')}</p>`)
    .join("\n");
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1f2937">${paragraphs}
<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 8px">
<p style="font-size:12px;color:#6b7280">${escapeHtml(CLUB_NAME)}</p></div>`;
}

// Sends one email. Returns { sent: true } or { sent: false, reason }; never throws,
// so a failed email never breaks the request that triggered it.
export async function sendEmail({ to, subject, text }) {
  if (!to) return { sent: false, reason: "no-recipient" };
  if (!isEmailConfigured()) {
    console.log(`[Email] (not configured) to=${to} subject=${JSON.stringify(subject)}\n${text}`);
    return { sent: false, reason: "not-configured" };
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text, html: textToHtml(text) }),
    });
    if (!response.ok) {
      console.error("[Email] Resend error", response.status, await response.text());
      return { sent: false, reason: `http-${response.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error("[Email] send failed", err.message);
    return { sent: false, reason: "network" };
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Sends the same kind of email to many people, one at a time (Resend's free plan
// accepts 2 requests per second). Returns how many were sent, failed or skipped
// (skipped = email not configured).
export async function sendBulk(messages) {
  const result = { sent: 0, failed: 0, skipped: 0 };
  for (const message of messages) {
    const { sent, reason } = await sendEmail(message);
    if (sent) result.sent++;
    else if (reason === "not-configured") result.skipped++;
    else result.failed++;
    if (isEmailConfigured()) await sleep(600);
  }
  return result;
}
