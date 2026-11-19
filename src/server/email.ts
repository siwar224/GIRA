import "server-only";
import { after } from "next/server";
import { emailEnv } from "./env";

/**
 * Transactional email through Resend's HTTP API (plain fetch, no SDK).
 * Sending never decides whether a booking succeeds: failures are logged and swallowed.
 */

export type Email = { to: string; subject: string; text: string; html: string };

export const emailEnabled = () => emailEnv() !== null;

export async function sendEmail(email: Email): Promise<boolean> {
  const env = emailEnv();
  if (!env) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.from, to: [email.to], subject: email.subject, text: email.text, html: email.html }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      // Status only: the body may echo the recipient.
      console.error(`[email] Resend answered ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[email] ${err instanceof Error ? err.name : "Error"}: sending failed`);
    return false;
  }
}

/**
 * Runs a task after the response has been sent (Vercel keeps the function alive for it),
 * so the guest never waits for the email. Outside a request (tests, scripts) it just runs.
 */
export function runAfterResponse(task: () => Promise<unknown>): void {
  const safe = () => task().catch(() => undefined);
  try {
    after(safe);
  } catch {
    void safe();
  }
}
