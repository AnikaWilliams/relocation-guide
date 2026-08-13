import { useState, useEffect, useMemo, useRef, type ReactNode, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { COUNTRY_OPTIONS, countryName, type CountryOption } from '../utils/countries';
import { DISCLAIMER_LEAD, DISCLAIMER_BODY, DISCLAIMER_PROGRESS_NOTE, IMPRESSUM_PATH } from '../utils/disclaimer';
import { CH_CANTONS, cantonName } from '../utils/cantons';
import { flagUrl } from '../utils/flags';
import { topoOrder, statusOf, currentTaskId, type TaskStatus } from '../utils/journey';
import { evaluateAppliesIf, type AppliesIfContext } from '../utils/appliesIf';
import { INTAKE_PARAM_KEYS, readIntakeParams, applyIntakeParams, intakeSearchString, hasIntakeParams } from '../utils/urlState';
import { submitWaitlist, isValidEmail, alreadyOnWaitlist, type WaitlistStatus } from '../utils/waitlist';
import { isRouteLive } from '../utils/routes';

/** Self-hosted SVG flag — renders identically on every OS, unlike emoji flags. */
function Flag({ iso, className = '' }: { iso: string; className?: string }) {
  const src = flagUrl(iso);
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      className={`inline-block rounded-sm align-[-0.1em] ${className}`}
      style={{ width: '1.33em', height: '1em', objectFit: 'cover' }}
    />
  );
}

/** Inline Heroicons (SVG, not emoji — render identically on every OS, unlike 🔒/✎). */
function IconCheck({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}
function IconLock({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75M6.75 10.5h10.5a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H6.75a1.5 1.5 0 0 1-1.5-1.5v-6a1.5 1.5 0 0 1 1.5-1.5Z" />
    </svg>
  );
}
function IconPencil({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.931-8.931Z" />
    </svg>
  );
}
function IconChevronDown({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function IconX({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

// ── Content types (mirror the corridor schema, passed in from the Astro page) ─

interface ClaimData {
  text: string;
  sourceUrl: string;
  sourceName: string;
  lastVerified?: string;
}

/**
 * Per-canton local detail (mirrors CantonSchema in content/schema.ts, projected
 * to the render-time claim shape). Surfaced in the plan once the user picks a
 * canton; cantons absent here fall back to the federal SEM directory.
 */
export interface CantonData {
  code: string;
  name: string;
  migrationOffice: ClaimData;
  taxInfo: ClaimData;
  notes?: (ClaimData & { label: string })[];
}

interface StepData {
  text: string;
  tip?: string;
  /** cantonOffice: this link points at the cantonal migration authority. When the
   *  user has picked a CH canton we authored, we swap it for their canton's office;
   *  otherwise it renders unchanged (the federal SEM directory fallback). */
  links?: (ClaimData & { cantonOffice?: boolean })[];
}

/** Structured document substep (ADR-0012). Plain strings are the legacy shape. */
export interface TaskDocumentData {
  name: string;
  type: 'provide' | 'form';
  description: string;
  /** For type 'form': sourceUrl = official link, sourceName = issuer. */
  form?: ClaimData;
}

export interface TaskData {
  id: string;
  title: string;
  category: string;
  summary: ClaimData;
  /** 1–2 sentence distilled summary; falls back to summary.text when absent. */
  tldr?: ClaimData;
  keyFacts?: (ClaimData & { label: string })[];
  detail: string;
  steps: StepData[];
  documents: (string | TaskDocumentData)[];
  timeline?: ClaimData;
  cost?: ClaimData;
  /** Presentation hint (ADR-0021/ADR-0007): this step's fee + processing time are set
   *  locally — by the canton or, for study admission, the institution — with no federal
   *  figure. Renders a "confirm locally" note only when no cost/timeline claim exists. */
  localCostTimeline?: 'canton' | 'institution';
  warning?: string;
  dependsOn: string[];
  appliesIf?: string;
}

/** Legacy string documents render as 'provide' items with no description. */
function normalizeDocs(documents: (string | TaskDocumentData)[]): TaskDocumentData[] {
  return documents.map((d) =>
    typeof d === 'string' ? { name: d, type: 'provide' as const, description: '' } : d,
  );
}

/** Stable key for a document's checked/skipped state. */
function docKey(taskId: string, docName: string): string {
  return `${taskId}::${docName}`;
}

type DocMark = 'done' | 'skipped';
type DocState = Record<string, DocMark>;

export interface CorridorPair {
  origin: string;
  destination: string;
}

interface CorridorAppProps {
  tasks: TaskData[];
  corridorTitle: string;
  originIso2: string;
  destinationIso2: string;
  /** Origin/destination pairs of every published corridor — drives which countries are selectable. */
  availableCorridors: CorridorPair[];
  /** Routes this corridor's verified content covers; answers outside it get an honest "not covered yet" notice. */
  coversMotivations?: ('work' | 'family' | 'study' | 'retirement' | 'other')[];
  /** Per-canton local detail for cantonally-administered destinations (Switzerland). Empty when none authored. */
  cantons?: CantonData[];
}

// ── Intake model ─────────────────────────────────────────────────────────────

type Motivation = 'work' | 'family' | 'study' | 'retirement' | 'other';
/** Dependants moving WITH the primary applicant (the "who's joining you?" step). */
type Companion = 'partner' | 'children';

interface Intake {
  origin: string | null;
  destination: string | null;
  passports: string[];
  motivation: Motivation | null;
  // work branch
  workStatus: 'has-offer' | 'job-seeking' | null;
  employerName: string;
  employerLocation: string;
  // family branch
  familyRelationship: 'spouse' | 'registered-partner' | 'unmarried-partner' | 'parent' | null;
  familyJoineeStatus: 'citizen' | 'settled' | 'permit-holder' | 'other' | null;
  // study branch
  studyStatus: 'admitted' | 'applying' | null;
  studyInstitution: string;
  // other branch
  otherDescription: string;
  // common tail
  durationIntent: 'short' | 'long' | 'permanent' | null;
  /** Who is moving with the applicant; empty = moving alone. Replaces the old
      yes/no "children" question so we only show steps that actually apply. */
  companions: Companion[];
  /** Swiss canton being moved to (lowercased CH code); null = unknown / not CH. */
  canton: string | null;
}

const STORAGE_KEY = 'relocation-intake-v2';

// ── Option sets ──────────────────────────────────────────────────────────────

type Opt = { value: string; label: string; description?: string };

const MOTIVATIONS: Opt[] = [
  { value: 'work', label: 'Work or employment', description: 'A job, job-seeking, or self-employment' },
  { value: 'family', label: 'Joining family', description: 'Joining a partner or relative who lives there' },
  { value: 'study', label: 'Study', description: 'University or another programme' },
  { value: 'retirement', label: 'Retirement', description: 'Moving without taking up work' },
  { value: 'other', label: 'Another reason', description: 'Remote work, investment, and more' },
];

const WORK_STATUS: Opt[] = [
  { value: 'has-offer', label: 'I have a job offer', description: 'An employer is ready to hire me' },
  { value: 'job-seeking', label: "I'm still job-seeking", description: 'Looking for work first' },
];

const FAMILY_REL: Opt[] = [
  { value: 'spouse', label: 'Spouse', description: "We're married" },
  { value: 'registered-partner', label: 'Registered partner' },
  { value: 'unmarried-partner', label: 'Unmarried partner', description: "We've been together long-term" },
  { value: 'parent', label: 'Parent or child' },
];

const STUDY_STATUS: Opt[] = [
  { value: 'admitted', label: 'Admitted to a programme' },
  { value: 'applying', label: 'Still applying' },
];

const DURATION: Opt[] = [
  { value: 'short', label: 'Less than a year' },
  { value: 'long', label: 'A year or more' },
  { value: 'permanent', label: "Indefinitely — I'm planning to settle" },
];

const COMPANIONS: Opt[] = [
  { value: 'partner', label: 'A partner or spouse', description: 'Husband, wife, civil/registered or unmarried partner' },
  { value: 'children', label: 'Children', description: 'Dependent children moving with you' },
];

/**
 * A blank intake — nothing is preselected. A fresh visitor picks their own
 * origin, destination, and passport(s); the page's corridor only seeds the
 * answers when a share link / saved state restores them (see the mount effect).
 */
function defaultIntake(): Intake {
  return {
    origin: null,
    destination: null,
    passports: [],
    motivation: null,
    workStatus: null,
    employerName: '',
    employerLocation: '',
    familyRelationship: null,
    familyJoineeStatus: null,
    studyStatus: null,
    studyInstitution: '',
    otherDescription: '',
    durationIntent: null,
    companions: [],
    canton: null,
  };
}

// ── Wizard field/step config (extensible: add a motivation = add steps) ──────

type Field =
  | { kind: 'country'; scope: 'origin' | 'destination' }
  | { kind: 'countryMulti' }
  | { kind: 'single'; get: (a: Intake) => string | null; set: (a: Intake, v: string) => Intake; options: Opt[] | ((a: Intake) => Opt[]) }
  | { kind: 'boolean'; get: (a: Intake) => boolean | null; set: (a: Intake, v: boolean) => Intake; yes?: string; no?: string }
  | { kind: 'companions' }
  | { kind: 'canton' }
  | { kind: 'text'; get: (a: Intake) => string; set: (a: Intake, v: string) => Intake; label?: string; placeholder?: string; textarea?: boolean; optional?: boolean };

interface WizardStep {
  id: string;
  title: string | ((a: Intake) => string);
  subtitle?: string | ((a: Intake) => string);
  fields: Field[];
  visibleIf?: (a: Intake) => boolean;
  isComplete: (a: Intake) => boolean;
}

const STEPS: WizardStep[] = [
  {
    id: 'origin',
    title: 'Where are you moving from?',
    subtitle: "Pick any country. If your route has a verified guide we'll open it; if not, you can join the launch waitlist.",
    fields: [{ kind: 'country', scope: 'origin' }],
    isComplete: (a) => !!a.origin,
  },
  {
    id: 'destination',
    title: 'Where are you moving to?',
    subtitle: "Pick anywhere you're headed. Ready routes open the full guide; the rest let you join the waitlist.",
    fields: [{ kind: 'country', scope: 'destination' }],
    isComplete: (a) => !!a.destination,
  },
  {
    id: 'passports',
    title: 'Which passport(s) do you hold?',
    subtitle: 'Select all that apply — citizenship affects your entry rules.',
    fields: [{ kind: 'countryMulti' }],
    isComplete: (a) => a.passports.length > 0,
  },
  {
    id: 'motivation',
    title: "What's your main reason for moving?",
    subtitle: 'This shapes which path we build for you.',
    fields: [
      {
        kind: 'single',
        options: MOTIVATIONS,
        get: (a) => a.motivation,
        set: (a, v) => ({ ...a, motivation: v as Motivation }),
      },
    ],
    isComplete: (a) => !!a.motivation,
  },
  // ── Work branch ──
  {
    id: 'work-status',
    visibleIf: (a) => a.motivation === 'work',
    title: 'Do you already have a job offer?',
    fields: [
      { kind: 'single', options: WORK_STATUS, get: (a) => a.workStatus, set: (a, v) => ({ ...a, workStatus: v as Intake['workStatus'] }) },
    ],
    isComplete: (a) => !!a.workStatus,
  },
  {
    id: 'work-employer',
    visibleIf: (a) => a.motivation === 'work' && a.workStatus === 'has-offer',
    title: 'Tell us about the role',
    subtitle: 'Optional — helps tailor your steps.',
    fields: [
      { kind: 'text', label: 'Employer name', placeholder: 'e.g. Acme AG', optional: true, get: (a) => a.employerName, set: (a, v) => ({ ...a, employerName: v }) },
      { kind: 'text', label: 'Location (canton or city)', placeholder: 'e.g. Zürich', optional: true, get: (a) => a.employerLocation, set: (a, v) => ({ ...a, employerLocation: v }) },
    ],
    isComplete: () => true,
  },
  // ── Family branch ──
  {
    id: 'family-rel',
    visibleIf: (a) => a.motivation === 'family',
    title: 'Who are you joining?',
    fields: [
      { kind: 'single', options: FAMILY_REL, get: (a) => a.familyRelationship, set: (a, v) => ({ ...a, familyRelationship: v as Intake['familyRelationship'] }) },
    ],
    isComplete: (a) => !!a.familyRelationship,
  },
  {
    id: 'family-status',
    visibleIf: (a) => a.motivation === 'family',
    title: (a) => `Their status in ${a.destination ? countryName(a.destination) : 'the destination'}`,
    fields: [
      {
        kind: 'single',
        get: (a) => a.familyJoineeStatus,
        set: (a, v) => ({ ...a, familyJoineeStatus: v as Intake['familyJoineeStatus'] }),
        options: (a) => {
          const d = a.destination ? countryName(a.destination) : 'the country';
          return [
            { value: 'citizen', label: `${d === 'Switzerland' ? 'Swiss' : d} citizen` },
            { value: 'settled', label: 'Settled (permanent resident)' },
            { value: 'permit-holder', label: 'Resident permit holder' },
            { value: 'other', label: 'Something else / not sure' },
          ];
        },
      },
    ],
    isComplete: (a) => !!a.familyJoineeStatus,
  },
  // ── Study branch ──
  {
    id: 'study-status',
    visibleIf: (a) => a.motivation === 'study',
    title: 'Where are you in the process?',
    fields: [
      { kind: 'single', options: STUDY_STATUS, get: (a) => a.studyStatus, set: (a, v) => ({ ...a, studyStatus: v as Intake['studyStatus'] }) },
    ],
    isComplete: (a) => !!a.studyStatus,
  },
  {
    id: 'study-inst',
    visibleIf: (a) => a.motivation === 'study' && a.studyStatus === 'admitted',
    title: 'Which institution?',
    subtitle: 'Optional.',
    fields: [
      { kind: 'text', label: 'Institution', placeholder: 'e.g. ETH Zürich', optional: true, get: (a) => a.studyInstitution, set: (a, v) => ({ ...a, studyInstitution: v }) },
    ],
    isComplete: () => true,
  },
  // ── Other branch ──
  {
    id: 'other-desc',
    visibleIf: (a) => a.motivation === 'other',
    title: 'Tell us your main reason',
    subtitle: 'A sentence is plenty — it helps us point you to the right path.',
    fields: [
      { kind: 'text', textarea: true, placeholder: 'e.g. retiring, remote work for a US employer, investment…', get: (a) => a.otherDescription, set: (a, v) => ({ ...a, otherDescription: v }) },
    ],
    isComplete: (a) => a.otherDescription.trim().length > 0,
  },
  // ── Common tail ──
  {
    id: 'duration',
    title: 'How long do you plan to stay?',
    subtitle: 'Your intended stay determines which permit you need.',
    fields: [
      { kind: 'single', options: DURATION, get: (a) => a.durationIntent, set: (a, v) => ({ ...a, durationIntent: v as Intake['durationIntent'] }) },
    ],
    isComplete: (a) => !!a.durationIntent,
  },
  {
    id: 'canton',
    // Switzerland runs permits, taxes and registration cantonally (ADR-0021),
    // so only show this for CH-bound users. Optional — many people don't yet
    // know their canton, so it never blocks (isComplete is always true).
    visibleIf: (a) => a.destination === 'ch',
    title: 'Which canton are you moving to?',
    subtitle: "Knowing your canton lets us tailor the local details — you can add it later if you're not sure yet.",
    fields: [{ kind: 'canton' }],
    isComplete: () => true,
  },
  {
    id: 'companions',
    title: "Who's joining you?",
    subtitle: "Pick everyone moving with you, or choose “It's just me”. We only show the steps that apply to who's coming.",
    fields: [{ kind: 'companions' }],
    isComplete: () => true,
  },
];

// ── Wizard phases (stable progress, ADR-0019 follow-up) ──────────────────────
//
// The wizard inserts branch questions (work/family/study/other) mid-flow, so a
// "Step X of N" counter has a denominator that grows the moment a motivation is
// picked — which reads as backsliding ("now there are MORE steps"). Instead we
// group every step into three NAMED phases whose count never changes. The bar
// fills by phase and the eyebrow names the phase, so progress only ever moves
// forward. Every step id maps to exactly one phase.

const WIZARD_PHASES = [
  { id: 'route', label: 'Your route' },
  { id: 'situation', label: 'Your situation' },
  { id: 'details', label: 'Your details' },
] as const;

type WizardPhaseId = (typeof WIZARD_PHASES)[number]['id'];

/** Which named phase each wizard step belongs to. */
const STEP_PHASE: Record<string, WizardPhaseId> = {
  origin: 'route',
  destination: 'route',
  passports: 'route',
  motivation: 'situation',
  'work-status': 'situation',
  'work-employer': 'situation',
  'family-rel': 'situation',
  'family-status': 'situation',
  'study-status': 'situation',
  'study-inst': 'situation',
  'other-desc': 'situation',
  duration: 'details',
  canton: 'details',
  companions: 'details',
};

function phaseOfStep(stepId: string): WizardPhaseId {
  return STEP_PHASE[stepId] ?? 'route';
}

function phaseIndex(phaseId: WizardPhaseId): number {
  return WIZARD_PHASES.findIndex((p) => p.id === phaseId);
}

// ── Hooks ────────────────────────────────────────────────────────────────────

function useIsMobile() {
  // Start `false` so the server and the client's first render agree (no
  // hydration mismatch); correct it from matchMedia right after mount.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

/** localStorage key recording that the user has read & acknowledged the
 *  post-intake disclaimer in this browser. Bumped to -v2 etc. if the wording
 *  materially changes and re-acknowledgement is required. */
const DISCLAIMER_ACK_KEY = 'rg-disclaimer-ack-v1';

function hasAckedDisclaimer(): boolean {
  try {
    return localStorage.getItem(DISCLAIMER_ACK_KEY) === '1';
  } catch {
    return false;
  }
}

function persistDisclaimerAck() {
  try {
    localStorage.setItem(DISCLAIMER_ACK_KEY, '1');
  } catch {
    // storage unavailable — the modal will simply reappear next navigation.
  }
}

/**
 * Focus trap for a modal dialog. While `active`, Tab / Shift+Tab cycle within
 * `containerRef`, focus is moved to `initialFocusRef` (or the first focusable
 * element) on open, and focus is restored to the previously-focused element on
 * close. Escape does NOT close the modal here — the disclaimer gate requires an
 * explicit acknowledgement, so the caller intentionally does not pass an onClose
 * for Escape.
 */
function useFocusTrap(
  active: boolean,
  containerRef: React.RefObject<HTMLElement>,
  initialFocusRef?: React.RefObject<HTMLElement>,
) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

    function focusables(): HTMLElement[] {
      return Array.from(container!.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
    }

    // Move focus into the dialog on open.
    const target = initialFocusRef?.current ?? focusables()[0] ?? container;
    target.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (activeEl === first || !container!.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else if (activeEl === last || !container!.contains(activeEl)) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      // Restore focus to where it was before the dialog opened.
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [active, containerRef, initialFocusRef]);
}

// ── Small UI atoms ───────────────────────────────────────────────────────────

function OptionCard({
  label, description, selected, disabled, onClick,
}: { label: string; description?: string; selected: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
      className={`w-full min-h-11 border rounded-xl p-4 text-left transition-all focus-visible:ring-2 focus-visible:ring-brand-500 ${
        disabled
          ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
          : selected
          ? 'border-brand-600 bg-brand-50'
          : 'border-slate-200 bg-white hover:border-brand-300'
      }`}
    >
      <span className={`font-medium ${disabled ? 'text-slate-400' : 'text-slate-900'}`}>{label}</span>
      {description && <span className="block text-sm text-slate-500 mt-0.5">{description}</span>}
    </button>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    'visa-permit': 'bg-blue-50 text-blue-700',
    employment: 'bg-orange-50 text-orange-700',
    housing: 'bg-purple-50 text-purple-700',
    'healthcare-insurance': 'bg-red-50 text-red-700',
    'registration-bureaucracy': 'bg-slate-50 text-slate-700',
    'finance-banking': 'bg-amber-50 text-amber-700',
    taxes: 'bg-green-50 text-green-700',
    'family-dependents': 'bg-pink-50 text-pink-700',
    education: 'bg-teal-50 text-teal-700',
  };
  return (
    <span className={`text-xs rounded px-2 py-0.5 font-medium ${colors[category] ?? 'bg-slate-50 text-slate-700'}`}>
      {category}
    </span>
  );
}

// ── Country pickers ──────────────────────────────────────────────────────────

/**
 * Country picker. Every country is selectable — there are no greyed-out options
 * and no per-country availability badge. Whether a chosen route has a published
 * guide is revealed only after selection (the plan vs. the launch waitlist).
 */
function CountryGrid({
  options, liveIso, selectedIso, onSelect,
}: { options: CountryOption[]; liveIso: Set<string>; selectedIso: string | null; onSelect: (iso: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
      {options.map((c) => {
        const selected = selectedIso === c.iso2;
        const live = liveIso.has(c.iso2);
        return (
          <button
            key={c.iso2}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(c.iso2)}
            className={`flex items-center gap-2 min-h-11 border rounded-lg px-2.5 py-2 text-left text-sm transition-all focus-visible:ring-2 focus-visible:ring-brand-500 ${
              selected ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-300'
            }`}
          >
            {/* Availability dot: green = a published, verified guide exists for this
                route; gray = not yet (selecting it leads to the launch waitlist). */}
            <span
              aria-hidden="true"
              className={`shrink-0 h-2 w-2 rounded-full ${live ? 'bg-emerald-500' : 'bg-slate-300'}`}
            />
            <Flag iso={c.iso2} className="text-xl" />
            <span className="font-medium text-slate-900 truncate">{c.name}</span>
            <span className="sr-only">{live ? '(published guide available)' : '(no published guide yet)'}</span>
            {selected && <span className="ml-auto text-brand-600 shrink-0" aria-hidden="true">✓</span>}
          </button>
        );
      })}
    </div>
  );
}

function CountryMultiGrid({
  selected, onToggle,
}: { selected: string[]; onToggle: (iso: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
      {COUNTRY_OPTIONS.map((c) => {
        const isOn = selected.includes(c.iso2);
        return (
          <button
            key={c.iso2}
            type="button"
            aria-pressed={isOn}
            onClick={() => onToggle(c.iso2)}
            className={`flex items-center gap-2 min-h-11 border rounded-lg px-2.5 py-2 text-left text-sm transition-all focus-visible:ring-2 focus-visible:ring-brand-500 ${
              isOn ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-300'
            }`}
          >
            <Flag iso={c.iso2} className="text-xl" />
            <span className="font-medium text-slate-900">{c.name}</span>
            <span className={`ml-auto w-5 h-5 rounded border flex items-center justify-center text-xs ${
              isOn ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300 text-transparent'
            }`} aria-hidden="true">✓</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Single-select canton picker (Switzerland) as a searchable ARIA combobox.
 * Type to filter the 26 cantons by name or 2-letter code; arrow keys move the
 * active option, Enter selects, Escape closes (reverting the query to the
 * current selection), outside-click / Tab closes. The listbox renders in-flow
 * (a block under the input, not absolutely positioned) so it is never clipped by
 * the wizard card's `overflow-y-auto`; it scrolls internally when long.
 *
 * Mirrors CorridorApp styling — min-h-11 touch targets, brand selection state,
 * focus-visible ring, inline SVG icons (no emoji). An "I'm not sure yet" row +
 * a clear "✕" affordance call `onClear()`, so the step never blocks the wizard.
 */
function CantonCombobox({
  selected, onSelect, onClear,
}: { selected: string | null; onSelect: (code: string) => void; onClear: () => void }) {
  const selectedName = selected ? cantonName(selected) : '';
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const listboxId = 'canton-combobox-listbox';
  const optionId = (i: number) => `canton-combobox-option-${i}`;

  // Fold case + diacritics so an ASCII query ("zur", "neuchatel", "graubunden")
  // still finds accented canton names ("Zürich", "Neuchâtel", "Graubünden").
  // ̀-ͯ is the Unicode "Combining Diacritical Marks" block.
  const fold = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  // Filter by name or 2-letter code. While the field shows the current selection
  // verbatim (no edits yet), treat the query as empty so the full list is
  // browsable on open.
  const filtered = (() => {
    const q = fold(query.trim());
    const showAll = q === '' || q === fold(selectedName);
    if (showAll) return CH_CANTONS;
    return CH_CANTONS.filter(
      (c) => fold(c.name).includes(q) || c.code.toLowerCase().startsWith(q),
    );
  })();

  // Rows are: [0] = "I'm not sure yet", then one row per filtered canton.
  // activeIndex 0 === the not-sure row; activeIndex >= 1 maps to filtered[i-1].
  const rowCount = filtered.length + 1;

  function openList() {
    if (!open) {
      setOpen(true);
      // Pre-highlight the selected canton if it's in view, else the not-sure row.
      const selIdx = selected ? filtered.findIndex((c) => c.code === selected) : -1;
      setActiveIndex(selIdx >= 0 ? selIdx + 1 : 0);
    }
  }

  function closeList(revert = true) {
    setOpen(false);
    setActiveIndex(-1);
    if (revert) setQuery(''); // revert typed text back to the current selection
  }

  function commit(rowIndex: number) {
    if (rowIndex <= 0) {
      onClear();
    } else {
      const c = filtered[rowIndex - 1];
      if (c) onSelect(c.code);
    }
    setQuery('');
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  // Keep the query in sync when the field is not being actively edited (e.g. the
  // selection changed elsewhere, or the list closed): reflect the selection.
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  // Clamp the active row whenever the filtered set shrinks.
  useEffect(() => {
    if (open && activeIndex > rowCount - 1) setActiveIndex(rowCount - 1);
  }, [open, rowCount, activeIndex]);

  // Scroll the active option into view as the user arrows through.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(`#${optionId(activeIndex)}`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  // Close on outside pointerdown; cleaned up on unmount.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) closeList();
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function onKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) { openList(); return; }
        setActiveIndex((i) => (i + 1 > rowCount - 1 ? 0 : i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) { openList(); return; }
        setActiveIndex((i) => (i - 1 < 0 ? rowCount - 1 : i - 1));
        break;
      case 'Enter':
        if (open && activeIndex >= 0) {
          e.preventDefault();
          commit(activeIndex);
        }
        break;
      case 'Escape':
        if (open) {
          e.preventDefault();
          closeList();
        }
        break;
      case 'Tab':
        if (open) closeList();
        break;
      default:
        break;
    }
  }

  // What the input displays: the live query while editing, otherwise the
  // current selection's name (empty when nothing is selected).
  const inputValue = open ? query : selectedName;

  return (
    <div className="space-y-3">
      <div ref={rootRef} className="relative">
        <label htmlFor="canton-combobox-input" className="sr-only">
          Search and select your canton
        </label>
        <div
          className={`flex items-center min-h-11 border rounded-lg bg-white transition-all focus-within:ring-2 focus-within:ring-brand-500 ${
            selected ? 'border-brand-600 bg-brand-50' : 'border-slate-200'
          }`}
        >
          <input
            ref={inputRef}
            id="canton-combobox-input"
            type="text"
            role="combobox"
            autoComplete="off"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
            placeholder="Search cantons…"
            value={inputValue}
            onChange={(e) => {
              if (!open) setOpen(true);
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onFocus={openList}
            onClick={openList}
            onKeyDown={onKeyDown}
            className={`flex-1 min-w-0 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400 ${
              selected ? 'text-brand-700 font-medium' : 'text-slate-900'
            }`}
          />
          {selected && (
            <button
              type="button"
              onClick={() => { onClear(); setQuery(''); inputRef.current?.focus(); }}
              aria-label="Clear selected canton"
              className="shrink-0 inline-flex items-center justify-center w-8 h-8 mr-0.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <IconX className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            aria-label={open ? 'Close canton list' : 'Open canton list'}
            onClick={() => {
              if (open) { closeList(); return; }
              inputRef.current?.focus();
              openList();
            }}
            className="shrink-0 inline-flex items-center justify-center w-9 h-9 mr-1 rounded-md text-slate-500 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <IconChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {open && (
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label="Cantons"
            className="mt-1.5 max-h-64 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-sm py-1"
          >
            {/* Row 0: the always-present "I'm not sure yet" / clear option. */}
            <li
              id={optionId(0)}
              role="option"
              aria-selected={selected === null}
              onMouseEnter={() => setActiveIndex(0)}
              onClick={() => commit(0)}
              className={`flex items-center gap-2 min-h-11 px-3 py-2 text-sm cursor-pointer ${
                activeIndex === 0 ? 'bg-slate-100' : ''
              } ${selected === null ? 'text-brand-700 font-medium' : 'text-slate-600'}`}
            >
              <span className="flex-1">I'm not sure yet</span>
              {selected === null && <IconCheck className="w-4 h-4 text-brand-600 shrink-0" />}
            </li>

            {filtered.length === 0 ? (
              <li role="presentation" className="px-3 py-3 text-sm text-slate-500">
                No cantons match
              </li>
            ) : (
              filtered.map((c, i) => {
                const rowIndex = i + 1;
                const isSelected = selected === c.code;
                const isActive = activeIndex === rowIndex;
                return (
                  <li
                    key={c.code}
                    id={optionId(rowIndex)}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(rowIndex)}
                    onClick={() => commit(rowIndex)}
                    className={`flex items-center gap-2 min-h-11 px-3 py-2 text-sm cursor-pointer transition-colors ${
                      isActive ? 'bg-slate-100' : ''
                    } ${isSelected ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-900'}`}
                  >
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-xs uppercase text-slate-400 shrink-0">{c.code}</span>
                    {isSelected && <IconCheck className="w-4 h-4 text-brand-600 shrink-0" />}
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Answer recap (for the sidebar) ───────────────────────────────────────────

function motivationLabel(m: Motivation): string {
  return { work: 'Work', family: 'Family', study: 'Study', retirement: 'Retirement', other: 'Other' }[m];
}

function buildRecap(a: Intake): { label: ReactNode; stepId: string }[] {
  const items: { label: ReactNode; stepId: string }[] = [];
  if (a.origin && a.destination) {
    items.push({
      label: (
        <span className="inline-flex items-center gap-1.5">
          <Flag iso={a.origin} /> {countryName(a.origin)} <span className="text-slate-400">→</span> <Flag iso={a.destination} /> {countryName(a.destination)}
        </span>
      ),
      stepId: 'origin',
    });
  }
  if (a.passports.length) {
    items.push({
      label: (
        <span className="inline-flex items-center gap-1.5">
          Passport:{' '}
          {a.passports.map((p) => (
            <span key={p} className="inline-flex items-center gap-1"><Flag iso={p} /> {countryName(p)}</span>
          ))}
        </span>
      ),
      stepId: 'passports',
    });
  }
  if (a.motivation) {
    let m = motivationLabel(a.motivation);
    if (a.motivation === 'work' && a.workStatus) m += a.workStatus === 'has-offer' ? ' · has offer' : ' · job-seeking';
    if (a.motivation === 'family' && a.familyRelationship) m += ` · ${a.familyRelationship.replace('-', ' ')}`;
    if (a.motivation === 'study' && a.studyStatus) m += a.studyStatus === 'admitted' ? ' · admitted' : ' · applying';
    items.push({ label: m, stepId: 'motivation' });
  }
  if (a.durationIntent) {
    const d = { short: '<1 year', long: '1 year+', permanent: 'settling' }[a.durationIntent];
    items.push({ label: `Stay: ${d}`, stepId: 'duration' });
  }
  if (a.canton) {
    items.push({ label: `Canton: ${cantonName(a.canton)}`, stepId: 'canton' });
  }
  if (a.companions.length) {
    const who = a.companions.map((c) => (c === 'partner' ? 'partner' : 'children')).join(' + ');
    items.push({ label: `Joining you: ${who}`, stepId: 'companions' });
  } else {
    items.push({ label: 'Moving alone', stepId: 'companions' });
  }
  return items;
}

// ── Journey sidebar (the "map + history") ────────────────────────────────────

function StatusDot({ status }: { status: TaskStatus }) {
  if (status === 'done') {
    return <span className="shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center" aria-hidden="true"><IconCheck className="w-3 h-3" /></span>;
  }
  if (status === 'available') {
    return <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center" aria-hidden="true"><span className="w-1.5 h-1.5 rounded-full bg-white" /></span>;
  }
  return <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center" aria-hidden="true"><IconLock className="w-3 h-3" /></span>;
}

/**
 * Share the current plan URL (answers ride in the URL fragment — never sent to
 * servers). The pre-copy warning is compliance-required: the link encodes the
 * user's answers, so they must understand what they're handing out.
 */
function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const ok = window.confirm(
      'This link contains your answers (countries, reason for moving, family situation). Anyone with the link can read them.\n\nCopy the link?'
    );
    if (!ok) return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — show the URL instead.
      window.prompt('Copy this link:', window.location.href);
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      {copied ? 'Link copied ✓' : 'Copy link to this plan'}
    </button>
  );
}

/** Per-task document completion: skipped counts as handled (conditional docs). */
function docProgress(task: TaskData, docState: DocState): { completed: number; total: number } {
  const docs = normalizeDocs(task.documents);
  return {
    completed: docs.filter((d) => docState[docKey(task.id, d.name)]).length,
    total: docs.length,
  };
}

/**
 * Checkable document list for a task (ADR-0012). `compact` renders the
 * sidebar variant (checkbox + name only); the full variant adds descriptions,
 * the "Get form from …" link (official URL, new tab — we never self-host
 * official PDFs), and the per-document Skip affordance for conditional items.
 */
function DocChecklist({
  task, docState, onToggle, compact = false,
}: {
  task: TaskData;
  docState: DocState;
  onToggle: (taskId: string, docName: string, mark: DocMark) => void;
  compact?: boolean;
}) {
  const docs = normalizeDocs(task.documents);
  if (docs.length === 0) return null;
  return (
    <ul className={compact ? 'space-y-1' : 'space-y-2'}>
      {docs.map((doc) => {
        const mark = docState[docKey(task.id, doc.name)];
        const done = mark === 'done';
        const skipped = mark === 'skipped';
        return (
          <li key={doc.name} className={compact ? '' : 'rounded-lg border border-slate-100 bg-white px-3 py-2'}>
            <div className="flex items-start gap-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={done}
                aria-label={`${doc.name}${doc.type === 'form' ? ' (official form)' : ''}${skipped ? ' — skipped' : ''}`}
                onClick={() => onToggle(task.id, doc.name, 'done')}
                className={`shrink-0 mt-0.5 h-5 w-5 rounded border flex items-center justify-center text-[10px] leading-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  done
                    ? 'bg-emerald-700 border-emerald-700 text-white'
                    : skipped
                    ? 'bg-slate-100 border-slate-200 text-slate-400'
                    : 'border-slate-300 text-transparent hover:border-emerald-500'
                }`}
              >
                {skipped ? '–' : '✓'}
              </button>
              <div className="min-w-0 flex-1">
                <span
                  className={`block leading-snug ${compact ? 'text-xs' : 'text-sm'} ${
                    skipped ? 'text-slate-400 line-through' : done ? 'text-slate-500' : 'text-slate-700'
                  }`}
                >
                  {doc.name}
                  {doc.type === 'form' && (
                    <span className="ml-1.5 inline-block align-middle rounded bg-blue-50 px-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                      form
                    </span>
                  )}
                </span>
                {!compact && doc.description && (
                  <span className="mt-0.5 block text-xs text-slate-500">{doc.description}</span>
                )}
                {!compact && doc.type === 'form' && doc.form && (
                  <span className="mt-1.5 block">
                    <a
                      href={doc.form.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                    >
                      Get form from {doc.form.sourceName} ↗
                    </a>
                    {doc.form.lastVerified && (
                      <span className="ml-2 text-[11px] text-slate-600">link verified {doc.form.lastVerified}</span>
                    )}
                  </span>
                )}
              </div>
              {!compact && (
                <button
                  type="button"
                  onClick={() => onToggle(task.id, doc.name, 'skipped')}
                  className="shrink-0 -my-2 -mr-1 inline-flex min-h-11 items-center px-2 text-[11px] text-slate-600 underline hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  {skipped ? 'Undo skip' : 'Skip'}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Federal SEM directory of cantonal migration authorities — the fallback when
 *  a canton's local detail hasn't been authored for this corridor yet. */
const SEM_CANTONAL_DIRECTORY =
  'https://www.sem.admin.ch/sem/en/home/sem/kontakt/kantonale_behoerden/adressen_kantone_und.html';

/** Brand-styled external link to one verified canton claim (office, tax, …). */
function CantonLink({ claim }: { claim: ClaimData }) {
  return (
    <a
      href={claim.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-brand-700 hover:border-brand-300 hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <span className="font-medium">{claim.sourceName} ↗</span>
      <span className="mt-0.5 block text-xs text-slate-500">{claim.text}</span>
    </a>
  );
}

/**
 * "Your canton" payoff card (CH only, once a canton is chosen). When the
 * corridor authored this canton's local detail, show its migration office and
 * tax pointer as titled external links plus any notes; otherwise fall back to
 * the federal SEM cantonal-authority directory. Modest and on-brand — it sits
 * by "Your answers" in the sidebar.
 */
function CantonPanel({ canton, data }: { canton: string; data: CantonData | undefined }) {
  const name = data?.name ?? cantonName(canton);
  return (
    <div>
      <h2 className="text-xs font-normal text-slate-500 mb-2">Your canton</h2>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
        <p className="text-sm font-semibold text-slate-900">{name}</p>
        {data ? (
          <div className="mt-2 space-y-2">
            <CantonLink claim={data.migrationOffice} />
            <CantonLink claim={data.taxInfo} />
            {data.notes?.map((note) => (
              <div key={note.label} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{note.label}</p>
                <p className="mt-0.5 text-sm text-slate-700">{note.text}</p>
              </div>
            ))}
            <p className="text-xs text-slate-500">
              Exact fees, processing times and some procedures are set by {name} and vary across Switzerland — confirm them with the office above.
            </p>
          </div>
        ) : (
          <div className="mt-2 space-y-1.5">
            <a
              href={SEM_CANTONAL_DIRECTORY}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-brand-700 hover:border-brand-300 hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              Find {name}'s cantonal migration office ↗
            </a>
            <p className="text-xs text-slate-500">
              Permits, taxes and premiums vary by canton — confirm local details with your cantonal authorities.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Sidebar({
  orderedTasks, statusFor, activeId, onSelect, recap, onEdit, doneCount, total, docState, onToggleDoc, cantonPanel,
}: {
  orderedTasks: TaskData[];
  statusFor: (id: string) => TaskStatus;
  activeId: string | null;
  onSelect: (id: string) => void;
  recap: { label: ReactNode; stepId: string }[];
  onEdit: (stepId: string) => void;
  doneCount: number;
  total: number;
  docState: DocState;
  onToggleDoc: (taskId: string, docName: string, mark: DocMark) => void;
  /** Rendered "Your canton" card (CH + canton chosen); null otherwise. */
  cantonPanel?: ReactNode;
}) {
  // Substeps: the active step auto-expands; any unlocked step can be toggled.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const shownExpandedId = expandedId ?? activeId;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-xs font-normal text-slate-500">Your progress</h2>
          <span role="status" className="text-xs font-medium text-slate-700">{doneCount} of {total}</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <CopyLinkButton />

      <div>
        <h2 className="text-xs font-normal text-slate-500 mb-2">Your answers</h2>
        <div className="flex flex-col gap-1.5">
          {recap.map((r) => (
            <button
              key={r.stepId}
              type="button"
              onClick={() => onEdit(r.stepId)}
              className="group flex min-h-11 items-center justify-between gap-2 rounded-lg bg-slate-50 hover:bg-slate-100 px-3 py-2 text-left focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <span className="sr-only">Edit answer: </span>
              <span className="text-sm text-slate-700 truncate">{r.label}</span>
              <IconPencil className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-slate-600" />
            </button>
          ))}
        </div>
      </div>

      {cantonPanel}

      <div className="border-t border-slate-200 pt-4">
        <h2 className="text-xs font-normal text-slate-500 mb-2.5">Your journey</h2>
        <div className="flex flex-col">
          {orderedTasks.map((t) => {
            const status = statusFor(t.id);
            const isActive = activeId === t.id;
            const locked = status === 'locked';
            const { completed, total: docTotal } = docProgress(t, docState);
            const isExpanded = !locked && docTotal > 0 && shownExpandedId === t.id;
            return (
              <div key={t.id} className={`rounded-lg ${isActive ? 'bg-brand-50' : ''}`}>
                <div className={`flex items-center gap-2.5 rounded-lg px-2 py-2 ${
                  isActive ? '' : locked ? '' : 'hover:bg-slate-50'
                }`}>
                  <button
                    type="button"
                    disabled={locked}
                    aria-current={isActive ? 'step' : undefined}
                    onClick={() => onSelect(t.id)}
                    className={`flex flex-1 items-center gap-2.5 rounded text-left min-w-0 focus-visible:ring-2 focus-visible:ring-brand-500 ${locked ? 'cursor-not-allowed' : ''}`}
                  >
                    <StatusDot status={status} />
                    <span className={`text-sm leading-snug min-w-0 ${
                      isActive ? 'font-medium text-brand-700' : locked ? 'text-slate-400' : status === 'done' ? 'text-slate-500' : 'text-slate-700'
                    }`}>
                      {status === 'done' && <span className="sr-only">Done: </span>}
                      {locked && <span className="sr-only">Locked (finish earlier steps first): </span>}
                      {t.title}
                    </span>
                  </button>
                  {!locked && docTotal > 0 && (
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-label={`Documents for "${t.title}" (${completed} of ${docTotal} handled)`}
                      onClick={() => setExpandedId(isExpanded ? 'NONE' : t.id)}
                      className="shrink-0 flex items-center gap-1 rounded px-1 py-0.5 text-[11px] text-slate-600 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      {completed}/{docTotal}
                      <span aria-hidden="true">{isExpanded ? '▾' : '▸'}</span>
                    </button>
                  )}
                </div>
                {isExpanded && (
                  <div className="ml-9 mr-2 pb-2">
                    <p className="mb-1 text-[11px] text-slate-600">{completed}/{docTotal} documents</p>
                    <DocChecklist task={t} docState={docState} onToggle={onToggleDoc} compact />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Task card (one task at a time) ───────────────────────────────────────────

function TaskCard({
  task, status, hasPrev, onBack, onMarkDone, onNext, headingRef, docState, onToggleDoc,
  cantonOfficeClaim, selectedCantonName,
}: {
  task: TaskData;
  status: TaskStatus;
  hasPrev: boolean;
  onBack: () => void;
  onMarkDone: () => void;
  onNext: () => void;
  headingRef?: React.Ref<HTMLHeadingElement>;
  docState: DocState;
  onToggleDoc: (taskId: string, docName: string, mark: DocMark) => void;
  /** The user's selected canton's migration-office claim, when they picked a
   *  canton we authored; null otherwise. Drives the cantonOffice step-link swap. */
  cantonOfficeClaim: ClaimData | null;
  /** Display name of the selected canton, for the personalised link cue. */
  selectedCantonName?: string;
}) {
  const done = status === 'done';
  const { completed: docsHandled, total: docsTotal } = docProgress(task, docState);
  const docsRemaining = docsTotal - docsHandled;

  // Does this task carry any reference material worth folding away? (Key facts,
  // verified cost/timeline, localCostTimeline note, long prose, or step links).
  const hasReference =
    !!task.keyFacts?.length ||
    !!task.timeline ||
    !!task.cost ||
    !!task.localCostTimeline ||
    !!task.detail ||
    !!task.tldr ||
    task.steps.some((s) => s.links && s.links.length > 0);

  // A step link is "long" (a statute citation / sentence-length legal pointer)
  // when its authored text reads as prose rather than a short label. We render
  // those as a short label inline (sourceName) with the full authored text on
  // hover (title=) and spelled out in full in the reference fold — never dropping
  // sourceName / sourceUrl / lastVerified.
  const isLongLink = (text: string) => text.trim().length > 48 || text.trim().split(/\s+/).length > 6;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-5">
        <div className="space-y-2">
          <CategoryBadge category={task.category} />
          {/* tabIndex={-1}: focus lands here when the active task changes, so
              keyboard/screen-reader users hear the new task and never lose
              focus to <body> (e.g. when the Back button unmounts). */}
          <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-slate-900 leading-snug focus:outline-none">{task.title}</h2>
          <span className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${
              done ? 'text-green-600' : 'text-blue-600'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-green-500' : 'bg-blue-500'}`} />
              {done ? 'Completed' : 'Ready to start'}
            </span>
            {docsTotal > 0 && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {docsHandled}/{docsTotal} documents
              </span>
            )}
          </span>
        </div>

        {/* ACTION FIRST (progressive disclosure). (a) one-line "what and why",
            then (b) the numbered steps, then (c) documents. The reference grid
            and long prose live in a single collapsed fold below. */}

        {/* (a) 1–2 sentence "what and why" (ADR-0012). Falls back to the verified
            summary claim until the distilled tldr passes the content pipeline. */}
        <p className="text-slate-700 leading-relaxed">{(task.tldr ?? task.summary).text}</p>

        {/* Situational warning stays VISIBLE — it's specific to this step, not
            boilerplate (it must not be folded away). */}
        {task.warning && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-semibold">Note: </span>{task.warning}
          </div>
        )}

        {/* (b) The numbered "what you'll do" steps — the hero of the card. */}
        {task.steps.length > 0 && (
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">What you'll do</h3>
            <ol className="space-y-3">
              {task.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-700">{s.text}</p>
                    {s.tip && <p className="text-xs text-slate-500 italic">{s.tip}</p>}
                    {s.links && s.links.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {s.links.map((link, li) => {
                          // cantonOffice links point at "the cantonal migration
                          // authority where you live". When the user picked a
                          // canton we authored, send them straight to THEIR
                          // canton's office (sourceName already names the canton);
                          // otherwise keep the authored federal SEM directory link.
                          const useCanton = link.cantonOffice === true && cantonOfficeClaim !== null;
                          if (useCanton) {
                            return (
                              <li key={li}>
                                <a href={cantonOfficeClaim!.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                                  {selectedCantonName && <span className="text-slate-500 not-italic">Your canton — </span>}
                                  {cantonOfficeClaim!.sourceName} ↗
                                </a>
                              </li>
                            );
                          }
                          // Long, sentence-length legal links: show a short label
                          // (the authority's name) with the full authored text on
                          // hover. The complete sentence is spelled out in the
                          // reference fold below, so nothing is lost.
                          if (isLongLink(link.text)) {
                            return (
                              <li key={li}>
                                <a
                                  href={link.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={link.text}
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  {link.sourceName} ↗
                                </a>
                              </li>
                            );
                          }
                          return (
                            <li key={li}>
                              <a href={link.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">{link.text} ↗</a>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* (c) Documents needed. */}
        {task.documents.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-semibold text-slate-900">Documents needed</h3>
              <span role="status" className="text-xs text-slate-500">{docsHandled}/{docsTotal} handled</span>
            </div>
            <DocChecklist task={task} docState={docState} onToggle={onToggleDoc} />
            <p className="mt-2 text-xs text-slate-600">
              Check off each document as you gather it — or skip ones that don't apply to your case.
            </p>
          </div>
        )}

        {/* (d) ONE collapsed reference fold: key facts grid (incl. cost/timeline
            and the localCostTimeline note), legal basis, the long prose, and the
            full text of any sentence-length legal links. Provenance is preserved:
            every claim keeps its sourceName / sourceUrl / lastVerified. */}
        {hasReference && (
          <details className="group rounded-lg border border-slate-200">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg group-open:rounded-b-none group-open:border-b group-open:border-slate-100 focus-visible:ring-2 focus-visible:ring-brand-500">
              Reference: key facts, legal basis &amp; details
              <span className="float-right text-slate-400 group-open:hidden" aria-hidden="true">▸</span>
              <span className="float-right text-slate-400 hidden group-open:inline" aria-hidden="true">▾</span>
            </summary>
            <div className="px-4 py-4 space-y-4">
              {/* Key facts grid (incl. Legal basis facts, cost, timeline, and
                  the canton/institution "Fees & processing time" note). */}
              {(task.keyFacts?.length || task.timeline || task.cost || task.localCostTimeline) && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Key facts</h4>
                  <dl className="grid gap-2 sm:grid-cols-2">
                    {task.keyFacts?.map((fact) => (
                      <div key={fact.label} className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-2.5">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-0.5">{fact.label}</dt>
                        <dd className="text-sm text-slate-800">{fact.text}</dd>
                      </div>
                    ))}
                    {task.timeline && (
                      <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-2.5">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Processing time</dt>
                        <dd className="text-sm text-slate-800">{task.timeline.text}</dd>
                      </div>
                    )}
                    {task.cost && (
                      <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-2.5">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Cost</dt>
                        <dd className="text-sm text-slate-800">{task.cost.text}</dd>
                      </div>
                    )}
                    {task.localCostTimeline && !task.cost && !task.timeline && (
                      <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-2.5 sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Fees &amp; processing time</dt>
                        <dd className="text-sm text-slate-800">
                          {task.localCostTimeline === 'institution'
                            ? 'Set by the educational institution, not at the federal level. Confirm the exact application fee and timing directly with the institution.'
                            : 'Set by your canton, not at the federal level — there is no single national figure, and it varies across Switzerland. Confirm the exact amount and timing with your cantonal authorities (see “Your canton”).'}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* The long authored prose (the former "Read the details"). */}
              {(task.detail || task.tldr) && (
                <div className="space-y-3">
                  {task.tldr && <p className="text-sm text-slate-700 leading-relaxed">{task.summary.text}</p>}
                  {task.detail && <p className="text-sm text-slate-600 leading-relaxed">{task.detail}</p>}
                </div>
              )}

              {/* Full text of any sentence-length legal step-links — spelled out
                  here (collapsed inline above) so the authored wording, the
                  authority name and the link are all preserved. */}
              {task.steps.some((s) => s.links?.some((l) => l.cantonOffice !== true && isLongLink(l.text))) && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Legal basis &amp; references</h4>
                  <ul className="space-y-1.5">
                    {task.steps.flatMap((s, si) =>
                      (s.links ?? [])
                        .map((link, li) => ({ link, key: `${si}-${li}` }))
                        .filter(({ link }) => link.cantonOffice !== true && isLongLink(link.text))
                        .map(({ link, key }) => (
                          <li key={key} className="text-sm text-slate-600 leading-relaxed">
                            {link.text}{' '}
                            <a href={link.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {link.sourceName} ↗
                            </a>
                            {link.lastVerified && (
                              <span className="ml-1 text-xs text-slate-500">link verified {link.lastVerified}</span>
                            )}
                          </li>
                        )),
                    )}
                  </ul>
                </div>
              )}
            </div>
          </details>
        )}

        {/* Source stays always-visible; the two boilerplate caveats are
            consolidated into one collapsed "Sources & legal notes" disclosure —
            present and findable, no longer triplicated. */}
        <div className="border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-600">
            Source:{' '}
            <a href={task.summary.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-slate-500">{task.summary.sourceName}</a>
            {task.summary.lastVerified && (
              <span className="ml-2 text-xs text-slate-500">verified {task.summary.lastVerified}</span>
            )}
          </p>
          {/* Core "not legal advice" caveat kept always-visible on the surface
              where users act on claims; the fuller notes live in the disclosure. */}
          <p className="mt-1 text-xs text-slate-500">General guidance only — not legal advice.</p>
          <details className="group mt-2">
            <summary className="cursor-pointer select-none text-xs font-medium text-slate-500 hover:text-slate-700 rounded focus-visible:ring-2 focus-visible:ring-brand-500">
              Sources &amp; legal notes
              <span className="ml-1 text-slate-400 group-open:hidden" aria-hidden="true">▸</span>
              <span className="ml-1 text-slate-400 hidden group-open:inline" aria-hidden="true">▾</span>
            </summary>
            <div className="mt-2 space-y-2">
              <p className="text-sm text-slate-600">
                Source:{' '}
                <a href={task.summary.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-slate-500">{task.summary.sourceName}</a>
                {task.summary.lastVerified && (
                  <span className="ml-2 text-xs text-slate-500">verified {task.summary.lastVerified}</span>
                )}
              </p>
              <p className="text-sm text-slate-600 italic">
                General guidance only — not legal advice. Confirm with a licensed immigration professional or the relevant authority.
              </p>
              <p className="text-sm text-slate-600 italic">
                {DISCLAIMER_PROGRESS_NOTE}
              </p>
            </div>
          </details>
        </div>
      </div>

      <div className="shrink-0 px-6 sm:px-8 py-4 border-t border-slate-200 bg-white">
        {/* Calmer gate: a helper near the checklist instead of a scolding line on
            a greyed button. Only shows when documents are still outstanding. */}
        {!done && docsRemaining > 0 && (
          <p className="mb-2 text-xs text-slate-500 text-center">
            A few documents to go — check the ones you have, skip what doesn't apply, and you can
            mark this step done.
          </p>
        )}
        <div className="flex gap-3">
        {hasPrev && (
          <button type="button" onClick={onBack} className="rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-500">← Back</button>
        )}
        {done ? (
          <button type="button" onClick={onNext} className="flex-1 rounded-xl py-3 font-medium text-white bg-brand-600 hover:bg-brand-700 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500">Next →</button>
        ) : (
          <button
            type="button"
            onClick={onMarkDone}
            disabled={docsRemaining > 0}
            className={`flex-1 rounded-xl py-3 font-medium text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 ${
              docsRemaining > 0 ? 'bg-emerald-300 cursor-not-allowed' : 'bg-emerald-700 hover:bg-emerald-800'
            }`}
          >Mark done &amp; continue</button>
        )}
        </div>
      </div>
    </div>
  );
}

// ── Waitlist (route not live yet) ────────────────────────────────────────────

/**
 * Shown when the chosen origin→destination corridor has no published guide.
 * Captures an email (required) and optional phone with explicit, unticked
 * consent, then hands them to `submitWaitlist` (dormant by default — see
 * utils/waitlist.ts). Honest framing: we say plainly the guide isn't built yet.
 */
function WaitlistPanel({
  origin, destination, motivation, onEditRoute, headingRef,
}: {
  origin: string;
  destination: string;
  motivation: Motivation | null;
  onEditRoute: () => void;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [already, setAlready] = useState(false);

  // localStorage read happens after mount (never during first render).
  useEffect(() => {
    setAlready(alreadyOnWaitlist(origin, destination));
  }, [origin, destination]);

  const routeLabel = (
    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
      <Flag iso={origin} /> {countryName(origin)} <span className="text-slate-400">→</span> <Flag iso={destination} /> {countryName(destination)}
    </span>
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address so we can reach you.');
      return;
    }
    if (!consent) {
      setError('Please tick the box to confirm we can contact you about this route.');
      return;
    }
    setStatus('submitting');
    const result: WaitlistStatus = await submitWaitlist({ origin, destination, motivation, email, phone });
    if (result === 'error') {
      setStatus('error');
      setError('Something went wrong saving your request. Please try again in a moment.');
      return;
    }
    setStatus('done');
    setAlready(true);
  }

  const done = status === 'done' || already;

  return (
    <div className="mx-auto w-full max-w-xl px-4 sm:px-6 py-8 space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 space-y-5">
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
            Not live yet
          </span>
          <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-slate-900 leading-snug focus:outline-none">
            We haven't built the {countryName(origin)} → {countryName(destination)} guide yet
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Every route we publish is researched against official sources and independently
            fact-checked before it goes live, so we add them one at a time. Yours isn't ready —
            but leave your details and we'll tell you the moment it launches.
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700 flex flex-wrap items-center gap-x-2 gap-y-1">
          {routeLabel}
          {motivation && <span className="text-slate-400">·</span>}
          {motivation && <span>{motivationLabel(motivation)} route</span>}
        </div>

        {origin === 'ru' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>Note for moves from Russia:</strong> sanctions and banking restrictions can
            heavily affect this route. When we publish it, those blockers will be flagged
            prominently.
          </div>
        )}

        {done ? (
          <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
            <p className="font-semibold text-emerald-800">You're on the list ✓</p>
            <p className="mt-1 text-sm text-emerald-700">
              We'll contact you when the {countryName(origin)} → {countryName(destination)} guide is
              ready. You can close this page — your spot is saved on this device.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="wl-email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                id="wl-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="wl-phone" className="block text-sm font-medium text-slate-700">
                Phone number <span className="text-slate-400 font-normal">(optional, for a text)</span>
              </label>
              <input
                id="wl-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 123 4567"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <label className="flex items-start gap-2.5 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span>
                You can contact me once, when this route launches. I can ask to be removed at any
                time. See the <a href="/privacy" className="underline hover:text-slate-800">Privacy policy</a>.
              </span>
            </label>

            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className={`w-full rounded-xl py-3 font-medium text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 ${
                status === 'submitting' ? 'bg-brand-300 cursor-wait' : 'bg-brand-600 hover:bg-brand-700'
              }`}
            >
              {status === 'submitting' ? 'Saving…' : 'Notify me when it launches'}
            </button>

            <p className="text-xs text-slate-600">
              We'll only use these details to tell you about this one route — nothing else.
            </p>
          </form>
        )}
      </div>

      <div className="flex items-center justify-center text-sm">
        <button type="button" onClick={onEditRoute} className="text-slate-500 hover:text-slate-700 font-medium">
          ← Choose a different route
        </button>
      </div>
    </div>
  );
}

// ── Post-intake disclaimer gate (replaces the persistent plan banner) ────────

/**
 * Blocking disclaimer modal shown the first time a user reaches the plan in this
 * browser — both when finishing the wizard and when opening a shared/bookmarked
 * plan link cold. The plan renders beneath it, but a full-screen overlay + focus
 * trap make the modal the gate: the plan is not readable or interactive until
 * the user confirms. There is deliberately NO backdrop-click or Escape dismissal
 * — acknowledgement is required (CLAUDE.md rule 7). Wording is single-sourced
 * from `utils/disclaimer.ts`, which mirrors `Disclaimer.astro` verbatim.
 */
function DisclaimerModal({ onAcknowledge }: { onAcknowledge: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(true, dialogRef, confirmRef);

  // Prevent background scroll while the gate is up.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Opaque-enough backdrop so the plan beneath is not readable. No onClick:
          clicking the backdrop must NOT dismiss the gate. */}
      <div aria-hidden="true" className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rg-disclaimer-title"
        aria-describedby="rg-disclaimer-body"
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 p-6 sm:p-8"
      >
        <h2
          id="rg-disclaimer-title"
          className="font-serif text-xl sm:text-2xl font-bold text-slate-900 leading-snug"
        >
          Before your plan — please read
        </h2>
        <div id="rg-disclaimer-body" className="mt-3 space-y-3 text-sm text-slate-700 leading-relaxed">
          <p>
            <strong>{DISCLAIMER_LEAD}</strong> {DISCLAIMER_BODY}
          </p>
          <p className="text-slate-600">
            {DISCLAIMER_PROGRESS_NOTE}
          </p>
          <p className="text-slate-500">
            See our{' '}
            <a href={IMPRESSUM_PATH} className="underline hover:text-slate-800">
              Impressum
            </a>{' '}
            for who runs this site.
          </p>
        </div>
        <div className="mt-6">
          <button
            ref={confirmRef}
            type="button"
            onClick={onAcknowledge}
            className="w-full rounded-xl bg-brand-600 py-3 font-medium text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            I've read and understand
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Momentum affirmation (calmer, after marking a step done) ─────────────────

/**
 * Brief, dismissible affirmation shown after the user marks a step done. Counts
 * ONLY the user's own real progress (no fabricated reassurance). Adds a quiet
 * milestone note as the plan crosses 25 / 50 / 75 %. Auto-dismisses; also
 * dismissible by the user.
 */
function MomentumToast({
  remaining, pct, onDismiss,
}: { remaining: number; pct: number; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const milestone =
    pct >= 75 ? "You're three-quarters of the way there."
    : pct >= 50 ? "Halfway through your plan — keep going."
    : pct >= 25 ? "A quarter done — you've got momentum."
    : null;

  return (
    <div
      role="status"
      className="pointer-events-auto flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm"
    >
      <span className="mt-0.5 shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
        <IconCheck className="h-3 w-3" />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium text-emerald-900">
          Step done — nice work.{' '}
          {remaining > 0
            ? `${remaining} to go.`
            : 'That was the last one.'}
        </p>
        {milestone && <p className="mt-0.5 text-emerald-700">{milestone}</p>}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 -mr-1 -mt-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <IconX className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function CorridorApp({ tasks, corridorTitle, originIso2, destinationIso2, availableCorridors, coversMotivations, cantons = [] }: CorridorAppProps) {
  // Deterministic defaults for the first render (must match the server so
  // hydration succeeds). Persisted state is loaded from localStorage in an
  // effect after mount — see below.
  const [phase, setPhase] = useState<'wizard' | 'app' | 'waitlist'>('wizard');
  const [stepId, setStepId] = useState<string>(STEPS[0].id);
  const [answers, setAnswers] = useState<Intake>(() => defaultIntake());
  const [doneIds, setDoneIds] = useState<Set<string>>(() => new Set());
  const [docState, setDocState] = useState<DocState>({});
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  // Desktop: let the user collapse the plan sidebar to give the task panel full width.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // Post-intake disclaimer gate. `null` until we've read localStorage after
  // mount (must not differ from the server's first render); then true/false.
  // The modal shows whenever we're in the plan phase and this is false.
  const [disclaimerAcked, setDisclaimerAcked] = useState<boolean | null>(null);
  // Momentum affirmation after marking a step done (calmer than a banner).
  const [momentum, setMomentum] = useState<{ remaining: number; pct: number } | null>(null);

  const isMobile = useIsMobile();

  // F-10 focus management. Moving between wizard steps (or into the plan)
  // would otherwise drop keyboard focus to <body>: the focused Continue
  // button becomes disabled on the next step, and the wizard unmounts
  // entirely when the plan opens. Focus the current question/task heading
  // instead — this also makes screen readers announce the change. The
  // initial render (and the localStorage/URL restore right after mount)
  // must NOT steal focus, so nothing happens until a key has been recorded.
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const taskHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const prevFocusKey = useRef<string | null>(null);
  useEffect(() => {
    // The done-flag keeps the key changing when the LAST task is marked done:
    // activeTaskId stays put then, but the card is replaced by the all-done
    // panel and the focused button unmounts.
    const key = phase === 'wizard'
      ? `w:${stepId}`
      : `a:${activeTaskId ?? ''}:${activeTaskId ? doneIds.has(activeTaskId) : false}`;
    const prev = prevFocusKey.current;
    // `a::false` -> `a:<id>:...` is the automatic first-task selection right
    // after a shared-link/restore load lands in the app phase — not a user
    // action, so it must not steal focus either.
    const isAutoSelect = prev === 'a::false' && key.startsWith('a:');
    if (prev !== null && prev !== key && !isAutoSelect) {
      (phase === 'wizard' ? stepHeadingRef : taskHeadingRef).current?.focus();
    }
    prevFocusKey.current = hydrated ? key : null;
  }, [hydrated, phase, stepId, activeTaskId, doneIds]);

  // Load persisted state once, after the first (server-matching) render.
  // Browser state (URL, localStorage) must never be read during the initial
  // render — the server HTML and the first client render have to be identical.
  //
  // Restore precedence (F-08): URL params > localStorage > defaults.
  // When the URL carries intake params (a shared/bookmarked plan), it is the
  // sole source of truth for every plan-affecting answer and we land directly
  // in the app phase, so the link reproduces the sharer's plan even if this
  // browser has different saved answers. localStorage still contributes the
  // non-plan extras (free text) and task progress.
  useEffect(() => {
    let saved: {
      phase?: 'wizard' | 'app' | 'waitlist';
      stepId?: string;
      answers?: Partial<Intake>;
      doneIds?: unknown;
      docState?: unknown;
      activeTaskId?: string;
    } | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {
      // ignore unreadable storage
    }

    // Canonical carrier is the URL fragment (compliance: answers must never
    // reach our servers); the query string is accepted for hand-built links.
    const params = readIntakeParams(window.location);

    let nextAnswers = defaultIntake();
    if (saved?.answers) nextAnswers = { ...nextAnswers, ...saved.answers };
    if (params) {
      // Origin/destination come from the page path, not from saved state.
      nextAnswers = applyIntakeParams(
        { ...nextAnswers, origin: originIso2, destination: destinationIso2 },
        params,
      );
    }
    setAnswers(nextAnswers);

    if (params) setPhase('app');
    else if (saved?.phase) setPhase(saved.phase);
    if (saved?.stepId) setStepId(saved.stepId);
    if (Array.isArray(saved?.doneIds)) setDoneIds(new Set(saved.doneIds));
    if (saved?.docState && typeof saved.docState === 'object' && !Array.isArray(saved.docState)) {
      const clean: DocState = {};
      for (const [k, v] of Object.entries(saved.docState as Record<string, unknown>)) {
        if (v === 'done' || v === 'skipped') clean[k] = v;
      }
      setDocState(clean);
    }
    if (saved?.activeTaskId) setActiveTaskId(saved.activeTaskId);
    // Disclaimer acknowledgement is read here (after mount) so it never differs
    // from the server's first render. The gate appears in the plan phase until
    // this is true.
    setDisclaimerAcked(hasAckedDisclaimer());
    setHydrated(true);
  }, []);

  // Persist on every meaningful change — but only after the load above, so we
  // never overwrite saved state with the initial defaults.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        phase, stepId, answers, doneIds: [...doneIds], docState, activeTaskId,
      }));
    } catch {
      // storage unavailable — silent
    }
  }, [hydrated, phase, stepId, answers, doneIds, docState, activeTaskId]);

  // F-08: mirror the intake into the URL fragment while the plan is showing,
  // so the URL is shareable/bookmarkable; strip it in the wizard so a
  // half-finished intake isn't shareable as a plan. The fragment (never the
  // query string) carries the answers — browsers don't send it to servers,
  // per the compliance ruling on share links. Any intake keys in the query
  // string (hand-built links) are removed here; foreign params (e.g. utm_*)
  // are kept. Uses replaceState — it rewrites the current entry in place and
  // never adds history entries, so it can't fight the pushState step
  // navigation below. The history.state object is preserved for the same reason.
  useEffect(() => {
    if (!hydrated) return;
    const url = new URL(window.location.href);
    const foreign = new URLSearchParams(url.search);
    for (const k of INTAKE_PARAM_KEYS) foreign.delete(k);
    const search = foreign.toString() ? `?${foreign.toString()}` : '';
    const intake = phase === 'app' ? intakeSearchString(answers) : '';
    const next = `${url.pathname}${search}${intake ? `#${intake}` : ''}`;
    if (next !== `${url.pathname}${url.search}${url.hash}`) {
      window.history.replaceState(window.history.state, '', next);
    }
  }, [hydrated, phase, answers]);

  // Browser back restores phase/step.
  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      if (e.state?.__relocation) {
        setPhase(e.state.phase);
        if (e.state.stepId) setStepId(e.state.stepId);
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // F-08 follow-up: same-page profile links. Browsers don't reload on a
  // hash-only navigation, so applying a share link to an already-open page
  // needs an explicit listener. Our own fragment-sync uses replaceState,
  // which never fires hashchange — no feedback loop. Plain anchors (e.g.
  // #full-guide) carry no intake params and are ignored.
  useEffect(() => {
    const handler = () => {
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      if (!hasIntakeParams(params)) return;
      setAnswers((a) =>
        applyIntakeParams({ ...a, origin: originIso2, destination: destinationIso2 }, params),
      );
      setActiveTaskId(null); // the auto-focus effect picks the new profile's current task
      setPhase('app');
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, [originIso2, destinationIso2]);

  // Availability-dot data: which origins/destinations have a PUBLISHED, verified
  // corridor. An origin that heads at least one published corridor gets a green
  // dot; a destination gets one when a published corridor exists FROM the chosen
  // origin. (Driven by availableCorridors = getPublishedCorridorPairs.)
  const liveOriginIso = useMemo(() => new Set(availableCorridors.map((c) => c.origin)), [availableCorridors]);
  const liveDestinationIso = useMemo(
    () => new Set(availableCorridors.filter((c) => c.origin === answers.origin).map((c) => c.destination)),
    [availableCorridors, answers.origin],
  );

  // The destination grid offers every country except the one chosen as origin.
  const destinationOptions = useMemo(
    () => COUNTRY_OPTIONS.filter((c) => c.iso2 !== answers.origin),
    [answers.origin],
  );
  // Is the chosen corridor a published one (vs. a waitlist route)?
  const routeLive = useMemo(
    () => isRouteLive(availableCorridors, answers.origin, answers.destination),
    [availableCorridors, answers.origin, answers.destination],
  );

  // Personalised path: evaluate each task's `appliesIf` against the intake
  // answers. Invalid expressions fail OPEN (the task stays visible) — hiding
  // a legally required step is worse than showing an unneeded one.
  const appliesCtx = useMemo<AppliesIfContext>(() => ({
    origin: answers.origin,
    destination: answers.destination,
    passports: answers.passports,
    motivation: answers.motivation,
    workStatus: answers.workStatus,
    familyRelationship: answers.familyRelationship,
    familyJoineeStatus: answers.familyJoineeStatus,
    studyStatus: answers.studyStatus,
    durationIntent: answers.durationIntent,
    // `companions` drives the new "who's joining you" gating; `hasChildren` is
    // derived from it so the existing children-gated tasks keep working unchanged.
    companions: answers.companions,
    hasChildren: answers.companions.includes('children'),
    // Surfaced for future canton-gated appliesIf (e.g. a task that only applies
    // in certain cantons). null when unknown / not a CH move.
    canton: answers.canton,
  }), [answers]);

  const applicableTasks = useMemo(() => {
    const applicable: TaskData[] = [];
    for (const t of tasks) {
      const r = evaluateAppliesIf(t.appliesIf, appliesCtx);
      if (r.error) {
        console.warn(`appliesIf on task "${t.id}" is invalid (${r.error}); showing the task (fail-open).`);
      }
      if (r.applies) applicable.push(t);
    }
    return applicable;
  }, [tasks, appliesCtx]);

  // The ordered journey + status helpers (over the applicable tasks only).
  const orderedTasks = useMemo(() => topoOrder(applicableTasks), [applicableTasks]);
  const presentIds = useMemo(() => new Set(applicableTasks.map((t) => t.id)), [applicableTasks]);
  const statusFor = (id: string): TaskStatus => {
    const t = applicableTasks.find((x) => x.id === id);
    return t ? statusOf(t, presentIds, doneIds) : 'locked';
  };

  // Keep a valid focused task: on entry, after a restore, or when editing an
  // answer changes which tasks apply.
  useEffect(() => {
    if (phase !== 'app') return;
    const stillApplicable = activeTaskId !== null && orderedTasks.some((t) => t.id === activeTaskId);
    if (!stillApplicable) {
      setActiveTaskId(currentTaskId(orderedTasks, doneIds) ?? orderedTasks[0]?.id ?? null);
    }
  }, [phase, activeTaskId, orderedTasks, doneIds]);

  // Coverage honesty: does this corridor's verified content cover the user's
  // route? If not, never present the plan as personalised — say so plainly.
  const routeCovered =
    !answers.motivation || !coversMotivations || coversMotivations.includes(answers.motivation);
  const coveredLabel = (coversMotivations ?? []).map((m) => motivationLabel(m).toLowerCase()).join(' / ');

  const visibleSteps = useMemo(() => STEPS.filter((s) => !s.visibleIf || s.visibleIf(answers)), [answers]);
  const currentIndex = Math.max(0, visibleSteps.findIndex((s) => s.id === stepId));
  const currentStep = visibleSteps[currentIndex] ?? visibleSteps[0];
  const ready = currentStep.isComplete(answers);

  // Phase-based progress (item 5). The current step maps to one of three stable
  // named phases; the bar fills the current phase proportionally to how far the
  // user is through that phase's currently-visible steps, so inserting branch
  // questions never grows a denominator or pushes progress backward.
  const currentPhaseId = phaseOfStep(currentStep.id);
  const currentPhase = WIZARD_PHASES[phaseIndex(currentPhaseId)];
  const phaseProgressPct = (() => {
    // Stable denominator: the phase's full step set, regardless of which branch
    // questions the user's answers have revealed. Branch questions only appear
    // after the step that reveals them, so the numerator (visible steps passed)
    // stays monotonic and the bar never moves backward.
    const stepsInPhase = STEPS.filter((s) => phaseOfStep(s.id) === currentPhaseId);
    const visiblePhaseSteps = visibleSteps.filter((s) => phaseOfStep(s.id) === currentPhaseId);
    const idxInPhase = visiblePhaseSteps.findIndex((s) => s.id === currentStep.id);
    if (stepsInPhase.length === 0) return 0;
    // Fill is "steps already passed" within the phase, out of the phase's steps,
    // nudged so the very first step of a phase still reads as started.
    const passed = Math.max(0, idxInPhase);
    return Math.round(((passed + 0.5) / stepsInPhase.length) * 100);
  })();

  function resolve<T>(v: T | ((a: Intake) => T)): T {
    return typeof v === 'function' ? (v as (a: Intake) => T)(answers) : v;
  }

  function pushHistory(nextPhase: 'wizard' | 'app' | 'waitlist', nextStepId?: string) {
    window.history.pushState({ __relocation: true, phase: nextPhase, stepId: nextStepId }, '');
  }

  function handleContinue() {
    if (currentIndex < visibleSteps.length - 1) {
      const next = visibleSteps[currentIndex + 1].id;
      setStepId(next);
      pushHistory('wizard', next);
      return;
    }
    // Last step. If the chosen corridor has no published guide, send them to the
    // launch waitlist instead of navigating to a page that doesn't exist.
    if (answers.origin && answers.destination && !routeLive) {
      setMobilePanelOpen(false);
      setPhase('waitlist');
      pushHistory('waitlist');
      return;
    }
    // Live corridor on a different page → redirect, carrying the intake in the
    // URL fragment so the target corridor lands straight on the personalised
    // plan (F-08), without the answers ever appearing in the HTTP request.
    if (answers.origin && answers.destination && (answers.origin !== originIso2 || answers.destination !== destinationIso2)) {
      const qs = intakeSearchString(answers);
      window.location.assign(`/${answers.origin}/${answers.destination}/${qs ? `#${qs}` : ''}`);
      return;
    }
    const first = currentTaskId(orderedTasks, doneIds) ?? orderedTasks[0]?.id ?? null;
    setActiveTaskId(first);
    setPhase('app');
    pushHistory('app');
  }

  function handleBack() {
    if (currentIndex > 0) setStepId(visibleSteps[currentIndex - 1].id);
  }

  function handleEditAnswer(targetStepId: string) {
    setPhase('wizard');
    setStepId(targetStepId);
    setMobilePanelOpen(false);
    setMomentum(null);
    pushHistory('wizard', targetStepId);
  }

  function handleMarkDone(id: string) {
    const nextDone = new Set([...doneIds, id]);
    setDoneIds(nextDone);
    // Affirmation counts ONLY the user's own real progress over applicable tasks.
    const doneApplicable = applicableTasks.filter((t) => nextDone.has(t.id)).length;
    const totalApplicable = applicableTasks.length;
    const remaining = Math.max(0, totalApplicable - doneApplicable);
    const pct = totalApplicable > 0 ? Math.round((doneApplicable / totalApplicable) * 100) : 0;
    // Don't show the brief toast when the whole plan is finished — the all-done
    // panel already celebrates that.
    setMomentum(remaining > 0 ? { remaining, pct } : null);
    const next = currentTaskId(orderedTasks, nextDone);
    setActiveTaskId(next ?? id);
  }

  function handleAcknowledgeDisclaimer() {
    persistDisclaimerAck();
    setDisclaimerAcked(true);
    // Move focus somewhere sensible once the gate clears: the active task heading
    // (or the all-done heading) so keyboard / screen-reader users land in the
    // plan rather than on <body>. Runs after the modal unmounts on the next tick.
    setTimeout(() => taskHeadingRef.current?.focus(), 0);
  }

  /** Toggle a document between unchecked and `mark` ('done' or 'skipped'). */
  function handleToggleDoc(taskId: string, docName: string, mark: DocMark) {
    setDocState((s) => {
      const key = docKey(taskId, docName);
      const next = { ...s };
      if (next[key] === mark) delete next[key];
      else next[key] = mark;
      return next;
    });
  }

  function gotoAdjacentTask(dir: -1 | 1) {
    if (!activeTaskId) return;
    const idx = orderedTasks.findIndex((t) => t.id === activeTaskId);
    const next = orderedTasks[idx + dir];
    if (next && statusFor(next.id) !== 'locked') setActiveTaskId(next.id);
  }

  function handleReset() {
    // Confirm before discarding answers or checklist progress.
    const hasProgress = phase === 'app' || doneIds.size > 0 || currentIndex > 0;
    if (hasProgress && typeof window !== 'undefined' &&
        !window.confirm('Start over? This clears your answers and progress for this corridor.')) {
      return;
    }
    setPhase('wizard');
    setStepId(STEPS[0].id);
    setAnswers(defaultIntake());
    setDoneIds(new Set());
    setDocState({});
    setActiveTaskId(null);
    setMobilePanelOpen(false);
    setMomentum(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  // Country handlers (need cross-field logic, so not closures on the field).
  function selectOrigin(iso: string) {
    // The destination grid excludes the chosen origin, so clear a destination
    // that would now equal it; otherwise keep the user's destination as-is.
    setAnswers((a) => ({ ...a, origin: iso, destination: a.destination === iso ? null : a.destination }));
  }
  function selectDestination(iso: string) {
    setAnswers((a) => ({ ...a, destination: iso }));
  }
  function togglePassport(iso: string) {
    setAnswers((a) => ({
      ...a,
      passports: a.passports.includes(iso) ? a.passports.filter((p) => p !== iso) : [...a.passports, iso],
    }));
  }
  function toggleCompanion(c: Companion) {
    setAnswers((a) => ({
      ...a,
      companions: a.companions.includes(c) ? a.companions.filter((x) => x !== c) : [...a.companions, c],
    }));
  }
  function selectCanton(code: string | null) {
    setAnswers((a) => ({ ...a, canton: code }));
  }

  // ── Wizard phase ───────────────────────────────────────────────────────────

  if (phase === 'wizard') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 bg-white border-b border-slate-200 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-serif text-lg sm:text-xl font-bold text-slate-900">Relocation Guide</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate">A few questions, then a plan made for your move — about 2 minutes.</p>
          </div>
          {currentIndex > 0 && (
            <button type="button" onClick={handleReset} className="shrink-0 text-sm text-slate-500 hover:text-slate-700 font-medium whitespace-nowrap">Start over</button>
          )}
        </div>

        <div className="flex-1 min-h-0 bg-slate-50 flex flex-col items-center px-4 sm:px-6 py-3 sm:py-5">
          {/* Phase-based progress: three STABLE named phases whose count never
              grows when branch questions are inserted, so the bar only ever moves
              forward. The current phase fills proportionally to honest position. */}
          <div
            className="shrink-0 w-full max-w-xl lg:max-w-5xl mb-3 sm:mb-4"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={WIZARD_PHASES.length}
            aria-valuenow={phaseIndex(currentPhaseId) + 1}
            aria-label={`${currentPhase.label} — phase ${phaseIndex(currentPhaseId) + 1} of ${WIZARD_PHASES.length}`}
          >
            <span className="sr-only">
              {currentPhase.label} — phase {phaseIndex(currentPhaseId) + 1} of {WIZARD_PHASES.length}
            </span>
            {/* Decorative bar segments — the position is announced via the
                progressbar role above, so the visual segments stay hidden from AT. */}
            <div className="flex gap-2" aria-hidden="true">
              {WIZARD_PHASES.map((p, pi) => {
                const curPi = phaseIndex(currentPhaseId);
                let fill = 0;
                if (pi < curPi) fill = 100;
                else if (pi === curPi) fill = phaseProgressPct;
                return (
                  <div key={p.id} className="h-1 flex-1 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full rounded-full bg-brand-600 transition-all duration-300" style={{ width: `${fill}%` }} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* The card caps at the available height: question header and footer
              stay visible; only the options area scrolls when it must. On lg+ a
              supporting value-prop column sits beside the card so the single
              narrow card no longer floats in empty space; below lg the layout
              stays a centered single column and the card internals are unchanged. */}
          <div className="w-full max-w-xl lg:max-w-5xl flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[1fr_minmax(0,36rem)] lg:items-stretch lg:gap-8">
            <aside className="hidden lg:flex lg:flex-col lg:justify-center lg:min-h-0 lg:pr-2">
              <p className="font-serif text-2xl font-bold text-slate-900 leading-snug">Let's map out your move.</p>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Tell us a little about your situation and we'll build a step-by-step plan for your
                exact route — every fact traced to an official source.
              </p>
              {/* Trust points stay present, but quiet — small chips, not a checklist. */}
              <ul className="mt-6 flex flex-wrap gap-2">
                <li className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-2.5 py-1 text-xs text-slate-600">
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0 text-brand-600"><path fillRule="evenodd" d="M9.661 2.237a.531.531 0 0 1 .678 0 11.947 11.947 0 0 0 7.078 2.749.5.5 0 0 1 .479.425c.069.52.104 1.05.104 1.59 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 0 1-.332 0C5.26 16.564 2 12.163 2 7c0-.538.035-1.069.104-1.589a.5.5 0 0 1 .48-.425 11.947 11.947 0 0 0 7.077-2.75Zm4.196 5.954a.75.75 0 0 0-1.214-.882l-3.236 4.53-1.847-1.846a.75.75 0 0 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.137-.089l3.72-5.273Z" clipRule="evenodd" /></svg>
                  Traced to official sources
                </li>
                <li className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-2.5 py-1 text-xs text-slate-600">
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0 text-brand-600"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
                  Independently fact-checked
                </li>
                <li className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-2.5 py-1 text-xs text-slate-600">
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0 text-brand-600"><path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" /></svg>
                  Dated and re-checked
                </li>
              </ul>
            </aside>
            <div className="w-full max-h-full bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden lg:min-h-0">
              {/* Warm intro on EVERY breakpoint above the first country grid. On
                  lg+ the aside carries the warmth, so this in-card version only
                  shows below lg (where there is no aside). Shown on the very first
                  step only. */}
              {currentStep.id === STEPS[0].id && (
                <div className="lg:hidden shrink-0 px-6 sm:px-8 pt-5 sm:pt-7 -mb-1">
                  <p className="font-serif text-lg font-bold text-slate-900 leading-snug">Let's map out your move.</p>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                    Tell us a little about your situation and we'll build a step-by-step plan for your
                    exact route — every fact traced to an official source.
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    <li className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600">Traced to official sources</li>
                    <li className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600">Independently fact-checked</li>
                    <li className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600">Dated and re-checked</li>
                  </ul>
                </div>
              )}
              <div className="shrink-0 px-6 sm:px-8 pt-5 sm:pt-7">
                <p className="text-xs font-bold text-brand-700 uppercase tracking-widest mb-2 sm:mb-3">
                  {currentPhase.label}
                </p>
                <h2 ref={stepHeadingRef} tabIndex={-1} className="text-xl sm:text-2xl font-bold text-slate-900 mb-1 focus:outline-none">{resolve(currentStep.title)}</h2>
                {currentStep.subtitle && <p className="text-sm text-slate-500">{resolve(currentStep.subtitle)}</p>}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-8 py-4 space-y-4">
                {currentStep.fields.map((field, fi) => {
                  if (field.kind === 'country') {
                    if (field.scope === 'origin') {
                      return <CountryGrid key={fi} options={COUNTRY_OPTIONS} liveIso={liveOriginIso} selectedIso={answers.origin} onSelect={selectOrigin} />;
                    }
                    return <CountryGrid key={fi} options={destinationOptions} liveIso={liveDestinationIso} selectedIso={answers.destination} onSelect={selectDestination} />;
                  }
                  if (field.kind === 'countryMulti') {
                    return <CountryMultiGrid key={fi} selected={answers.passports} onToggle={togglePassport} />;
                  }
                  if (field.kind === 'companions') {
                    return (
                      <div key={fi} className="space-y-3">
                        {COMPANIONS.map((o) => (
                          <OptionCard
                            key={o.value}
                            label={o.label}
                            description={o.description}
                            selected={answers.companions.includes(o.value as Companion)}
                            onClick={() => toggleCompanion(o.value as Companion)}
                          />
                        ))}
                        {/* Explicit "solo" choice: selected when no companions are
                            picked; choosing it clears any partner/children selection. */}
                        <OptionCard
                          label="It's just me"
                          description="No partner or children are moving with you"
                          selected={answers.companions.length === 0}
                          onClick={() => setAnswers((a) => ({ ...a, companions: [] }))}
                        />
                      </div>
                    );
                  }
                  if (field.kind === 'canton') {
                    return (
                      <CantonCombobox
                        key={fi}
                        selected={answers.canton}
                        onSelect={selectCanton}
                        onClear={() => selectCanton(null)}
                      />
                    );
                  }
                  if (field.kind === 'single') {
                    const opts = resolve(field.options);
                    const val = field.get(answers);
                    return (
                      <div key={fi} className="space-y-3">
                        {opts.map((o) => (
                          <OptionCard
                            key={o.value}
                            label={o.label}
                            description={o.description}
                            selected={val === o.value}
                            onClick={() => setAnswers((a) => field.set(a, o.value))}
                          />
                        ))}
                      </div>
                    );
                  }
                  if (field.kind === 'boolean') {
                    const val = field.get(answers);
                    return (
                      <div key={fi} className="space-y-3">
                        <OptionCard label={field.yes ?? 'Yes'} selected={val === true} onClick={() => setAnswers((a) => field.set(a, true))} />
                        <OptionCard label={field.no ?? 'No'} selected={val === false} onClick={() => setAnswers((a) => field.set(a, false))} />
                      </div>
                    );
                  }
                  const value = field.get(answers);
                  return (
                    <div key={fi} className="space-y-1.5">
                      {field.label && (
                        <label className="block text-sm font-medium text-slate-700">
                          {field.label}{field.optional && <span className="text-slate-400 font-normal"> (optional)</span>}
                        </label>
                      )}
                      {field.textarea ? (
                        <textarea
                          value={value}
                          placeholder={field.placeholder}
                          onChange={(e) => setAnswers((a) => field.set(a, e.target.value))}
                          rows={3}
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                        />
                      ) : (
                        <input
                          type="text"
                          value={value}
                          placeholder={field.placeholder}
                          onChange={(e) => setAnswers((a) => field.set(a, e.target.value))}
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      )}
                    </div>
                  );
                })}

                {currentStep.id === 'motivation' && answers.motivation && !routeCovered && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <strong>Heads up:</strong> we haven't verified the{' '}
                    {motivationLabel(answers.motivation).toLowerCase()} route for this corridor yet.
                    You can continue, but the current guide covers the {coveredLabel} route only —
                    we'll flag this again on your plan.
                  </div>
                )}
              </div>

              <div className="shrink-0 px-6 sm:px-8 py-3.5 sm:py-4 border-t border-slate-100 flex items-center gap-3">
                {currentIndex > 0 && (
                  <button type="button" onClick={handleBack} className="shrink-0 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-500">← Back</button>
                )}
                <button
                  type="button"
                  disabled={!ready}
                  onClick={handleContinue}
                  className={`flex-1 rounded-xl py-3 font-medium text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    ready ? 'bg-brand-600 hover:bg-brand-700' : 'bg-brand-300 cursor-not-allowed'
                  }`}
                >
                  {currentIndex === visibleSteps.length - 1 ? 'Build my relocation plan' : 'Continue'}
                </button>
              </div>
            </div>
          </div>

          {/* Slim, calm reassurance line (replaces the old legal-heavy banner).
              The full disclaimer lives in the footer + the post-intake modal gate;
              the Impressum stays reachable here. */}
          <p className="shrink-0 text-xs text-slate-500 text-center mt-3 max-w-md px-4">
            Your answers stay on this device{' '}
            <span aria-hidden="true">·</span>{' '}
            Informational only — not legal advice{' '}
            <span aria-hidden="true">·</span>{' '}
            <a href={IMPRESSUM_PATH} className="underline hover:text-slate-700">Impressum</a>
          </p>
        </div>
      </div>
    );
  }

  // ── Waitlist phase (chosen corridor has no published guide yet) ──────────────

  if (phase === 'waitlist' && answers.origin && answers.destination) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 bg-white border-b border-slate-200 px-4 sm:px-8 py-3 sm:py-5 flex items-center justify-between gap-3 min-w-0">
          <div className="min-w-0">
            <p className="text-base sm:text-xl font-bold text-slate-900 flex items-center gap-1.5 min-w-0">
              <Flag iso={answers.origin} className="shrink-0" />
              <span className="truncate">{countryName(answers.origin)}</span>
              <span className="shrink-0 text-slate-400">→</span>
              <Flag iso={answers.destination} className="shrink-0" />
              <span className="truncate">{countryName(answers.destination)}</span>
            </p>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate">This route isn't live yet — join the launch waitlist</p>
          </div>
          <button type="button" onClick={handleReset} className="shrink-0 text-sm text-brand-700 hover:text-brand-800 font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:ring-brand-500">← Start over</button>
        </div>

        {/* Slim, calm caveat line (replaces the old gold/amber banner, per the
            founder's directive — the gold banner is gone everywhere). Mirrors the
            intake slim line; the full disclaimer lives in the footer + modal gate. */}
        <div className="shrink-0 border-b border-slate-200 px-4 py-2 text-center">
          <p className="text-xs text-slate-500">
            Informational only — not legal advice{' '}
            <span aria-hidden="true">·</span>{' '}
            <a href={IMPRESSUM_PATH} className="underline hover:text-slate-700">Impressum</a>
          </p>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50">
          <WaitlistPanel
            origin={answers.origin}
            destination={answers.destination}
            motivation={answers.motivation}
            onEditRoute={() => handleEditAnswer('origin')}
            headingRef={taskHeadingRef}
          />
        </div>
      </div>
    );
  }

  // ── App phase (one task at a time + journey sidebar) ─────────────────────────

  const activeTask = activeTaskId ? applicableTasks.find((t) => t.id === activeTaskId) ?? null : null;
  const activeStatus = activeTask ? statusFor(activeTask.id) : null;
  const activeIdx = activeTask ? orderedTasks.findIndex((t) => t.id === activeTask.id) : -1;
  const recap = buildRecap(answers);
  // Count only applicable done tasks — doneIds may hold tasks excluded by a later answer edit.
  const doneCount = applicableTasks.filter((t) => doneIds.has(t.id)).length;
  const allDone = doneCount >= applicableTasks.length && applicableTasks.length > 0;

  // "Your canton" payoff (CH only, once a canton is chosen). Matches the chosen
  // code against the corridor's authored cantons; CantonPanel falls back to the
  // federal SEM directory when there's no entry.
  const selectedCantonData =
    answers.destination === 'ch' && answers.canton
      ? cantons.find((c) => c.code === answers.canton)
      : undefined;
  const cantonPanel =
    answers.destination === 'ch' && answers.canton ? (
      <CantonPanel canton={answers.canton} data={selectedCantonData} />
    ) : null;
  // When the user has picked a canton we authored, step links flagged
  // cantonOffice swap from the federal SEM directory to their canton's migration
  // office. Null when no canton is chosen or it isn't authored — links render as-is.
  const cantonOfficeClaim: ClaimData | null = selectedCantonData?.migrationOffice ?? null;
  const selectedCantonName =
    selectedCantonData?.name ?? (answers.canton ? cantonName(answers.canton) : undefined);

  const sidebar = (
    <Sidebar
      orderedTasks={orderedTasks}
      statusFor={statusFor}
      activeId={activeTaskId}
      onSelect={(id) => { setActiveTaskId(id); setMobilePanelOpen(false); }}
      recap={recap}
      onEdit={handleEditAnswer}
      doneCount={doneCount}
      total={applicableTasks.length}
      docState={docState}
      onToggleDoc={handleToggleDoc}
      cantonPanel={cantonPanel}
    />
  );

  const mainPanel = allDone ? (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
      </div>
      <h2 ref={taskHeadingRef} tabIndex={-1} className="text-2xl font-bold text-slate-900 focus:outline-none">You've completed every step</h2>
      <p className="text-slate-500 mt-2 max-w-sm">All {applicableTasks.length} tasks in your {corridorTitle} plan are marked done. You can revisit any step from your journey on the left.</p>
      <p className="text-xs text-slate-600 mt-4 max-w-sm">
        This checklist tracks your progress only. Final decisions always rest with the
        authorities — keep official confirmations for every step.
      </p>
    </div>
  ) : activeTask && activeStatus ? (
    <TaskCard
      task={activeTask}
      status={activeStatus}
      headingRef={taskHeadingRef}
      hasPrev={activeIdx > 0 && statusFor(orderedTasks[activeIdx - 1].id) !== 'locked'}
      onBack={() => gotoAdjacentTask(-1)}
      onMarkDone={() => handleMarkDone(activeTask.id)}
      onNext={() => gotoAdjacentTask(1)}
      docState={docState}
      onToggleDoc={handleToggleDoc}
      cantonOfficeClaim={cantonOfficeClaim}
      selectedCantonName={selectedCantonName}
    />
  ) : (
    <div className="flex-1 flex items-center justify-center text-slate-500 p-8">Select a step from your journey to begin.</div>
  );

  // Post-intake gate: show the blocking disclaimer modal the first time the plan
  // is reached in this browser — both finishing the wizard AND opening a shared /
  // bookmarked link cold (both paths set phase='app'). `disclaimerAcked` is null
  // until localStorage is read after mount, so the modal never renders during the
  // server / first client render (no hydration mismatch). While gated, the plan
  // renders beneath but is inert (aria-hidden + no pointer events) so it can't be
  // read or interacted with until acknowledged.
  const showDisclaimerGate = disclaimerAcked === false;

  return (
    <>
    <div
      className="flex-1 flex flex-col overflow-hidden"
      aria-hidden={showDisclaimerGate ? true : undefined}
      // While the gate is up the plan beneath must not be interactive; the modal
      // is the only thing the user can reach.
      style={showDisclaimerGate ? { pointerEvents: 'none' } : undefined}
    >
      <div className="shrink-0 bg-white border-b border-slate-200 px-4 sm:px-8 py-3 sm:py-5 flex items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-base sm:text-xl font-bold text-slate-900 flex items-center gap-1.5 min-w-0">
            {answers.origin && <Flag iso={answers.origin} className="shrink-0" />}
            {answers.origin && <span className="truncate">{countryName(answers.origin)}</span>}
            <span className="shrink-0 text-slate-400">→</span>
            {answers.destination && <Flag iso={answers.destination} className="shrink-0" />}
            {answers.destination && <span className="truncate">{countryName(answers.destination)}</span>}
          </p>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate">
            {routeCovered ? 'Your personalised relocation plan' : `${coveredLabel.charAt(0).toUpperCase()}${coveredLabel.slice(1)} route guide — your route isn't covered yet`}
          </p>
          {routeCovered && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5"><path fillRule="evenodd" d="M9.661 2.237a.531.531 0 0 1 .678 0 11.947 11.947 0 0 0 7.078 2.749.5.5 0 0 1 .479.425c.069.52.104 1.05.104 1.59 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 0 1-.332 0C5.26 16.564 2 12.163 2 7c0-.538.035-1.069.104-1.589a.5.5 0 0 1 .48-.425 11.947 11.947 0 0 0 7.077-2.75Zm4.196 5.954a.75.75 0 0 0-1.214-.882l-3.236 4.53-1.847-1.846a.75.75 0 0 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.137-.089l3.72-5.273Z" clipRule="evenodd" /></svg>
              Verified against official sources
            </span>
          )}
        </div>
        <button type="button" onClick={handleReset} className="shrink-0 text-sm text-brand-700 hover:text-brand-800 font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:ring-brand-500">← Start over</button>
      </div>

      {/* The persistent "not legal advice" banner that used to frame the plan is
          replaced by the post-intake DisclaimerModal gate (rendered below). The
          full disclaimer still lives in the site footer on every page. */}

      {!routeCovered && answers.motivation && (
        <div className="shrink-0 bg-rose-50 border-b border-rose-100 px-4 py-2.5">
          <p role="status" className="text-xs text-rose-800">
            <strong>Your route isn't covered yet.</strong>{' '}
            Your answers point to the {motivationLabel(answers.motivation).toLowerCase()} route, but this
            guide's verified content covers the {coveredLabel} route only. The steps below describe
            the {coveredLabel} route and may not apply to your situation — treat them as background
            reading, not a plan you can rely on. For your route, go directly to the official
            authority or a licensed immigration adviser.
          </p>
        </div>
      )}

      {isMobile ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
            <button type="button" aria-expanded={mobilePanelOpen} onClick={() => setMobilePanelOpen((v) => !v)} className="w-full flex items-center justify-between text-sm font-medium text-slate-700">
              <span>Your journey · {doneCount}/{applicableTasks.length} done</span>
              <span aria-hidden="true">{mobilePanelOpen ? '▲' : '▼'}</span>
            </button>
          </div>
          {mobilePanelOpen ? (
            <div className="flex-1 overflow-y-auto px-4 py-4">{sidebar}</div>
          ) : (
            <div className="flex-1 overflow-hidden bg-white">{mainPanel}</div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {sidebarCollapsed ? (
            <div className="shrink-0 border-r border-slate-200 bg-white pt-4">
              <button
                type="button"
                aria-expanded={false}
                aria-label="Show your plan panel"
                title="Show your plan panel"
                onClick={() => setSidebarCollapsed(false)}
                className="mx-1 inline-flex min-h-11 items-center rounded-lg px-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <IconChevronDown className="h-5 w-5 -rotate-90" />
              </button>
            </div>
          ) : (
            <aside className="w-[300px] shrink-0 border-r border-slate-200 bg-white overflow-y-auto px-5 py-6">
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  aria-expanded={true}
                  aria-label="Hide your plan panel"
                  onClick={() => setSidebarCollapsed(true)}
                  className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  Hide <IconChevronDown className="h-4 w-4 rotate-90" />
                </button>
              </div>
              {sidebar}
            </aside>
          )}
          <div className="flex-1 overflow-hidden bg-white">{mainPanel}</div>
        </div>
      )}
    </div>

    {/* Momentum affirmation (calmer than a banner) — only after the user marks a
        real step done; counts their own progress only. Sits above the plan, below
        the gate. */}
    {momentum && !showDisclaimerGate && (
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
        <div className="w-full max-w-sm">
          <MomentumToast remaining={momentum.remaining} pct={momentum.pct} onDismiss={() => setMomentum(null)} />
        </div>
      </div>
    )}

    {/* Blocking post-intake disclaimer gate. */}
    {showDisclaimerGate && <DisclaimerModal onAcknowledge={handleAcknowledgeDisclaimer} />}
    </>
  );
}
