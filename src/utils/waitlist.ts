/**
 * Waitlist capture for not-yet-live corridors.
 *
 * DORMANT BY DEFAULT — mirrors analytics.ts. With no `PUBLIC_WAITLIST_ENDPOINT`
 * set, NOTHING is transmitted off the device: a signup is recorded only in this
 * browser's localStorage, so the privacy policy's "your answers stay in your
 * browser" remains true for the default deployment. Set the endpoint (a backend
 * that stores the signup and can email/SMS at launch) to activate transmission.
 *
 * BEFORE activating (compliance, CLAUDE.md):
 * - update the Privacy + Cookie policies and have a lawyer review them,
 * - confirm a lawful basis (the form takes explicit, unticked consent),
 * - agree a data-processing agreement with whatever backend/provider stores it.
 *
 * The transmitted payload is COARSE only — route (origin/destination),
 * motivation, and the contact details the visitor explicitly typed. It never
 * includes free text (employer / institution / "other" description), matching
 * the analytics hard-rule.
 */

/** localStorage key holding this device's own waitlist signups. */
export const WAITLIST_STORAGE_KEY = 'rg-waitlist-v1';

export const waitlistConfig = {
  /**
   * POST endpoint that stores a signup and can notify it at launch. Empty = off
   * (dormant): signups are kept on-device only and nothing is transmitted.
   */
  endpoint: (import.meta.env.PUBLIC_WAITLIST_ENDPOINT as string | undefined) ?? '',
};

export interface WaitlistSignup {
  origin: string;
  destination: string;
  /** Coarse enum from the intake; never free text. */
  motivation: string | null;
  email: string;
  phone?: string;
  /** Epoch ms the signup was recorded. */
  ts: number;
}

export type WaitlistStatus =
  | 'subscribed' // accepted by the backend
  | 'recorded-local' // dormant (no endpoint) — kept on this device only
  | 'error'; // endpoint configured but the request failed

// Pragmatic email shape check (full RFC validation belongs to the backend).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

function readLocal(): WaitlistSignup[] {
  try {
    const raw = window.localStorage.getItem(WAITLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WaitlistSignup[]) : [];
  } catch {
    return [];
  }
}

/** A signup's identity for de-duplication: route + email (case-insensitive). */
function signupKey(s: { origin: string; destination: string; email: string }): string {
  return `${s.origin}>${s.destination}:${s.email.trim().toLowerCase()}`;
}

function recordLocal(signup: WaitlistSignup): void {
  try {
    const list = readLocal();
    const next = [...list.filter((s) => signupKey(s) !== signupKey(signup)), signup];
    window.localStorage.setItem(WAITLIST_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable (private mode) — non-fatal; the signup still POSTs if configured */
  }
}

/** Has this browser already joined the waitlist for this exact route? */
export function alreadyOnWaitlist(origin: string, destination: string): boolean {
  return readLocal().some((s) => s.origin === origin && s.destination === destination);
}

/**
 * Record a waitlist signup. Always writes a local record first (works offline,
 * lets the UI confirm, and avoids asking the same device twice). Then, only if
 * an endpoint is configured, POSTs the coarse payload.
 */
export async function submitWaitlist(input: Omit<WaitlistSignup, 'ts'>): Promise<WaitlistStatus> {
  const signup: WaitlistSignup = {
    origin: input.origin,
    destination: input.destination,
    motivation: input.motivation,
    email: input.email.trim(),
    phone: input.phone?.trim() || undefined,
    ts: Date.now(),
  };

  recordLocal(signup);

  if (!waitlistConfig.endpoint) {
    // Dormant: no backend wired yet → kept on this device only.
    return 'recorded-local';
  }

  try {
    const res = await fetch(waitlistConfig.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: signup.origin,
        destination: signup.destination,
        motivation: signup.motivation,
        email: signup.email,
        phone: signup.phone ?? '',
        ts: signup.ts,
      }),
    });
    return res.ok ? 'subscribed' : 'error';
  } catch {
    return 'error';
  }
}
