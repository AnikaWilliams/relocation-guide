/**
 * Cookie consent banner (ADR-0004, compliance-owned behaviour).
 *
 * Behaviour required by GDPR / ePrivacy / Swiss FADP:
 * - Optional categories default to OFF (reject-by-default; no pre-ticked boxes).
 * - "Accept all" and "Reject non-essential" have equal prominence.
 * - Granular per-category toggles via "Customise".
 * - The choice is withdrawable/changeable any time (footer "Cookie settings"
 *   dispatches `CONSENT_OPEN_EVENT`).
 *
 * The banner only GATES the providers; whether anything actually loads also
 * depends on config (see analytics.ts — dormant until env vars are set).
 *
 * Hydration safety: renders nothing until mounted, then reads localStorage in
 * an effect (never during first render).
 */
import { useEffect, useRef, useState } from 'react';
import {
  CONSENT_OPEN_EVENT,
  applyConsent,
  initAnalytics,
  readConsent,
  writeConsent,
} from '../utils/analytics';

type View = 'hidden' | 'banner' | 'customise';

export default function ConsentBanner() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<View>('hidden');
  const [analytics, setAnalytics] = useState(false);
  const [advertising, setAdvertising] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    // Load cookieless analytics (if configured) + apply any stored consent.
    initAnalytics();

    const stored = readConsent();
    if (stored) {
      setAnalytics(stored.analytics);
      setAdvertising(stored.advertising);
    } else {
      setView('banner');
    }

    // Footer "Cookie settings" → re-open the granular panel with current choice.
    const openSettings = () => {
      const current = readConsent();
      setAnalytics(current?.analytics ?? false);
      setAdvertising(current?.advertising ?? false);
      setView('customise');
    };
    window.addEventListener(CONSENT_OPEN_EVENT, openSettings);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, openSettings);
  }, []);

  // Publish the banner's rendered height as a CSS var so fixed-height app shells
  // (the corridor page) can shrink and never let the banner cover their footer
  // CTA. Reset to 0px whenever the banner is hidden or unmounted. Re-measures on
  // view change (banner vs. customise differ in height) and on viewport resize.
  useEffect(() => {
    const root = document.documentElement;
    const visible = mounted && view !== 'hidden';
    if (!visible || !sectionRef.current) {
      root.style.setProperty('--cb-h', '0px');
      return;
    }
    const el = sectionRef.current;
    const measure = () => root.style.setProperty('--cb-h', `${el.offsetHeight}px`);
    measure();
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      root.style.setProperty('--cb-h', '0px');
    };
  }, [mounted, view]);

  if (!mounted || view === 'hidden') return null;

  const persist = (choice: { analytics: boolean; advertising: boolean }) => {
    writeConsent(choice);
    applyConsent(choice);
    setAnalytics(choice.analytics);
    setAdvertising(choice.advertising);
    setView('hidden');
  };

  const acceptAll = () => persist({ analytics: true, advertising: true });
  const rejectAll = () => persist({ analytics: false, advertising: false });
  const savePrefs = () => persist({ analytics, advertising });

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <section
        ref={sectionRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="consent-title"
        className="mx-auto max-w-3xl rounded-xl border border-slate-300 bg-white p-5 shadow-xl"
      >
        <h2 id="consent-title" className="text-base font-semibold text-slate-900">
          Your privacy choices
        </h2>

        {view === 'banner' ? (
          <>
            <p className="mt-2 text-sm text-slate-600">
              Your planner answers stay in your browser. We'd also like to measure usage to
              improve the guidance. Privacy-friendly, cookieless analytics run by default;
              optional cookie-based analytics and any future ads load only if you agree. See
              our{' '}
              <a className="underline hover:text-slate-900" href="/cookie-policy">
                Cookie policy
              </a>
              .
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setView('customise')}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                Customise
              </button>
              <button
                type="button"
                onClick={rejectAll}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                Reject non-essential
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-md border border-brand-600 bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                Accept all
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-600">
              Choose which optional technologies to allow. You can change this any time from
              "Cookie settings" in the footer.
            </p>
            <ul className="mt-4 space-y-3">
              <li className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked
                  disabled
                  aria-label="Strictly necessary (always on)"
                  className="mt-1 h-4 w-4"
                />
                <span className="text-sm">
                  <span className="font-medium text-slate-900">Strictly necessary</span>
                  <span className="block text-slate-600">
                    Remembers your planner answers and these choices, on your device. Always on.
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <input
                  id="consent-analytics"
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <label htmlFor="consent-analytics" className="text-sm">
                  <span className="font-medium text-slate-900">Analytics (cookies)</span>
                  <span className="block text-slate-600">
                    Google Analytics, to understand usage in more detail. Uses cookies.
                  </span>
                </label>
              </li>
              <li className="flex items-start gap-3">
                <input
                  id="consent-ads"
                  type="checkbox"
                  checked={advertising}
                  onChange={(e) => setAdvertising(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <label htmlFor="consent-ads" className="text-sm">
                  <span className="font-medium text-slate-900">Advertising</span>
                  <span className="block text-slate-600">
                    Ad cookies to help fund the site. Never shown beside legal or visa guidance.
                  </span>
                </label>
              </li>
            </ul>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={rejectAll}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                Reject non-essential
              </button>
              <button
                type="button"
                onClick={savePrefs}
                className="rounded-md border border-brand-600 bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                Save choices
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
