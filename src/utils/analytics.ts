/**
 * Analytics & consent — central config and helpers (ADR-0004).
 *
 * DORMANT BY DEFAULT. Every provider ID below is read from a `PUBLIC_*` build
 * env var and defaults to an empty string. With empty config NOTHING loads —
 * not even after the visitor clicks "Accept" — so this is safe to ship before
 * the production domain and provider accounts exist. Populate the env vars at
 * launch (see `.env.example`) to activate.
 *
 * Privacy model:
 * - Plausible is cookieless and processes no personal data → loads without a
 *   consent prompt (legitimate interest), but only when configured.
 * - GA4 (analytics) and AdSense (advertising) load ONLY with the visitor's
 *   prior, explicit consent, and only when configured.
 *
 * HARD RULE for events: never pass personal data or free-text intake (no
 * passports, employer/institution names, "other" text). Use coarse enums only
 * (route, step index, task id, boolean flags).
 */

export const analyticsConfig = {
  /** Cookieless analytics domain, e.g. "relocation-guide.example". Empty = off. */
  plausibleDomain: (import.meta.env.PUBLIC_PLAUSIBLE_DOMAIN as string | undefined) ?? '',
  /** GA4 measurement ID, e.g. "G-XXXXXXXXXX". Consent-gated. Empty = off. */
  ga4MeasurementId: (import.meta.env.PUBLIC_GA4_ID as string | undefined) ?? '',
  /** AdSense publisher ID, e.g. "ca-pub-…". Consent-gated, post-launch. Empty = off. */
  adsenseClient: (import.meta.env.PUBLIC_ADSENSE_CLIENT as string | undefined) ?? '',
};

export const CONSENT_STORAGE_KEY = 'rg-consent-v1';
export const CONSENT_VERSION = 1;

/** Re-open the consent settings panel from anywhere (e.g. the footer link). */
export const CONSENT_OPEN_EVENT = 'rg:open-consent';

export interface ConsentChoice {
  analytics: boolean;
  advertising: boolean;
  version: number;
  /** Epoch ms the choice was recorded. */
  ts: number;
}

/** Returns the stored consent choice, or null if the visitor hasn't decided. */
export function readConsent(): ConsentChoice | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentChoice;
    // A bumped consent version invalidates an old choice → re-ask.
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeConsent(choice: { analytics: boolean; advertising: boolean }): ConsentChoice {
  const record: ConsentChoice = {
    analytics: choice.analytics,
    advertising: choice.advertising,
    version: CONSENT_VERSION,
    ts: Date.now(),
  };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* storage may be unavailable (private mode); consent simply won't persist */
  }
  return record;
}

// --- Script loaders (idempotent; each guards against double-injection) -------

function injectScript(attrs: Record<string, string>, id: string): void {
  if (document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id;
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  document.head.appendChild(s);
}

function loadPlausible(): void {
  if (!analyticsConfig.plausibleDomain) return;
  injectScript(
    {
      defer: '',
      'data-domain': analyticsConfig.plausibleDomain,
      src: 'https://plausible.io/js/script.js',
    },
    'plausible-js',
  );
}

function loadGa4(): void {
  const id = analyticsConfig.ga4MeasurementId;
  if (!id) return;
  injectScript({ async: '', src: `https://www.googletagmanager.com/gtag/js?id=${id}` }, 'ga4-js');
  const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  w.gtag('js', new Date());
  w.gtag('config', id, { anonymize_ip: true });
}

function loadAdsense(): void {
  const client = analyticsConfig.adsenseClient;
  if (!client) return;
  injectScript(
    {
      async: '',
      src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`,
      crossorigin: 'anonymous',
    },
    'adsense-js',
  );
}

/**
 * Initialise analytics for the current page load. Loads cookieless Plausible
 * immediately (if configured), then applies any stored consent for the
 * consent-gated providers. Safe to call on every mount (loaders are idempotent).
 */
export function initAnalytics(): void {
  if (typeof window === 'undefined') return;
  loadPlausible();
  const consent = readConsent();
  if (consent) applyConsent(consent);
}

/** Load the consent-gated providers permitted by `choice` (and configured). */
export function applyConsent(choice: { analytics: boolean; advertising: boolean }): void {
  if (typeof window === 'undefined') return;
  if (choice.analytics) loadGa4();
  if (choice.advertising) loadAdsense();
}

/**
 * Record a coarse, non-personal product event. No-op until a provider is loaded.
 * @param name  Event name from the documented taxonomy (docs/monetization.md).
 * @param props Coarse properties only — never personal data or free text.
 */
export function trackEvent(name: string, props?: Record<string, string | number | boolean>): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as {
    plausible?: (n: string, opts?: { props?: Record<string, unknown> }) => void;
    gtag?: (...args: unknown[]) => void;
  };
  if (w.plausible) w.plausible(name, props ? { props } : undefined);
  if (w.gtag) w.gtag('event', name, props ?? {});
}
