import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { COUNTRY_OPTIONS, countryName } from '../utils/countries';
import { flagUrl } from '../utils/flags';
import { topoOrder, statusOf, currentTaskId, type TaskStatus } from '../utils/journey';
import { evaluateAppliesIf, type AppliesIfContext } from '../utils/appliesIf';
import { INTAKE_PARAM_KEYS, readIntakeParams, applyIntakeParams, intakeSearchString } from '../utils/urlState';

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

/** Muted ISO chip used in place of a flag for not-yet-supported countries. */
function IsoChip({ iso }: { iso: string }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-sm bg-slate-200 text-slate-400 font-semibold"
      style={{ width: '1.66rem', height: '1.25rem', fontSize: '0.6rem' }}
      aria-hidden="true"
    >
      {iso.toUpperCase()}
    </span>
  );
}

// ── Content types (mirror the corridor schema, passed in from the Astro page) ─

interface ClaimData {
  text: string;
  sourceUrl: string;
  sourceName: string;
}

interface StepData {
  text: string;
  tip?: string;
  links?: ClaimData[];
}

export interface TaskData {
  id: string;
  title: string;
  category: string;
  summary: ClaimData;
  detail: string;
  steps: StepData[];
  documents: string[];
  timeline?: ClaimData;
  cost?: ClaimData;
  warning?: string;
  dependsOn: string[];
  appliesIf?: string;
}

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
}

// ── Intake model ─────────────────────────────────────────────────────────────

type Motivation = 'work' | 'family' | 'study' | 'retirement' | 'other';

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
  hasChildren: boolean | null;
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
  { value: 'unmarried-partner', label: 'Unmarried partner', description: 'Long-term partner (concubinage)' },
  { value: 'parent', label: 'Parent or child' },
];

const STUDY_STATUS: Opt[] = [
  { value: 'admitted', label: 'Admitted to a programme' },
  { value: 'applying', label: 'Still applying' },
];

const DURATION: Opt[] = [
  { value: 'short', label: 'Less than a year', description: 'Short-stay (L permit) path' },
  { value: 'long', label: 'A year or more', description: 'Standard (B permit) path' },
  { value: 'permanent', label: 'Indefinitely — planning to settle', description: 'B permit now; C permit later' },
];

function defaultIntake(originIso2: string, destinationIso2: string): Intake {
  return {
    origin: originIso2,
    destination: destinationIso2,
    passports: [originIso2],
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
    hasChildren: null,
  };
}

// ── Wizard field/step config (extensible: add a motivation = add steps) ──────

type Field =
  | { kind: 'country'; scope: 'origin' | 'destination' }
  | { kind: 'countryMulti' }
  | { kind: 'single'; get: (a: Intake) => string | null; set: (a: Intake, v: string) => Intake; options: Opt[] | ((a: Intake) => Opt[]) }
  | { kind: 'boolean'; get: (a: Intake) => boolean | null; set: (a: Intake, v: boolean) => Intake; yes?: string; no?: string }
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
    subtitle: 'Only corridors we have verified data for are selectable today.',
    fields: [{ kind: 'country', scope: 'origin' }],
    isComplete: (a) => !!a.origin,
  },
  {
    id: 'destination',
    title: 'Where are you moving to?',
    subtitle: 'More destinations unlock as we verify them.',
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
    id: 'children',
    title: 'Are children moving with you?',
    fields: [
      { kind: 'boolean', get: (a) => a.hasChildren, set: (a, v) => ({ ...a, hasChildren: v }), yes: 'Yes, children are coming', no: 'No' },
    ],
    isComplete: (a) => a.hasChildren !== null,
  },
];

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
      className={`w-full border rounded-xl p-4 text-left transition-all ${
        disabled
          ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
          : selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-slate-200 bg-white hover:border-blue-300'
      }`}
    >
      <span className={`font-medium ${disabled ? 'text-slate-400' : 'text-slate-900'}`}>{label}</span>
      {description && <span className="block text-sm text-slate-500 mt-0.5">{description}</span>}
    </button>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    'visa-permit': 'bg-blue-100 text-blue-800',
    employment: 'bg-orange-100 text-orange-800',
    housing: 'bg-purple-100 text-purple-800',
    'healthcare-insurance': 'bg-red-100 text-red-800',
    'registration-bureaucracy': 'bg-slate-100 text-slate-700',
    'finance-banking': 'bg-amber-100 text-amber-800',
    taxes: 'bg-green-100 text-green-800',
    'family-dependents': 'bg-pink-100 text-pink-800',
    education: 'bg-teal-100 text-teal-800',
  };
  return (
    <span className={`text-xs rounded px-2 py-0.5 font-medium ${colors[category] ?? 'bg-slate-100 text-slate-700'}`}>
      {category}
    </span>
  );
}

// ── Country pickers ──────────────────────────────────────────────────────────

function CountryGrid({
  selectableIso, selectedIso, onSelect,
}: { selectableIso: Set<string>; selectedIso: string | null; onSelect: (iso: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
      {COUNTRY_OPTIONS.map((c) => {
        const selectable = selectableIso.has(c.iso2);
        const selected = selectedIso === c.iso2;
        return (
          <button
            key={c.iso2}
            type="button"
            disabled={!selectable}
            aria-pressed={selected}
            onClick={() => onSelect(c.iso2)}
            title={selectable ? undefined : 'No verified corridor for this country yet'}
            className={`flex items-center gap-2 border rounded-lg px-2.5 py-2 text-left text-sm transition-all ${
              !selectable
                ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                : selected
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-blue-300'
            }`}
          >
            {selectable ? <Flag iso={c.iso2} className="text-xl" /> : <IsoChip iso={c.iso2} />}
            <span className={`font-medium ${selectable ? 'text-slate-900' : 'text-slate-400'}`}>
              {c.name}
              {!selectable && <span className="sr-only"> (no verified corridor yet)</span>}
            </span>
            {selected && <span className="ml-auto text-blue-500" aria-hidden="true">✓</span>}
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
            className={`flex items-center gap-2 border rounded-lg px-2.5 py-2 text-left text-sm transition-all ${
              isOn ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'
            }`}
          >
            <Flag iso={c.iso2} className="text-xl" />
            <span className="font-medium text-slate-900">{c.name}</span>
            <span className={`ml-auto w-5 h-5 rounded border flex items-center justify-center text-xs ${
              isOn ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 text-transparent'
            }`} aria-hidden="true">✓</span>
          </button>
        );
      })}
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
  if (a.hasChildren !== null) {
    items.push({ label: a.hasChildren ? 'With children' : 'No children', stepId: 'children' });
  }
  return items;
}

// ── Journey sidebar (the "map + history") ────────────────────────────────────

function StatusDot({ status }: { status: TaskStatus }) {
  if (status === 'done') {
    return <span className="shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs" aria-hidden="true">✓</span>;
  }
  if (status === 'available') {
    return <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center" aria-hidden="true"><span className="w-1.5 h-1.5 rounded-full bg-white" /></span>;
  }
  return <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px]" aria-hidden="true">🔒</span>;
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
      className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
    >
      {copied ? 'Link copied ✓' : 'Copy link to this plan'}
    </button>
  );
}

function Sidebar({
  orderedTasks, statusFor, activeId, onSelect, recap, onEdit, doneCount, total,
}: {
  orderedTasks: TaskData[];
  statusFor: (id: string) => TaskStatus;
  activeId: string | null;
  onSelect: (id: string) => void;
  recap: { label: ReactNode; stepId: string }[];
  onEdit: (stepId: string) => void;
  doneCount: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-500">Your progress</span>
          <span className="text-xs font-medium text-slate-700">{doneCount} of {total}</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <CopyLinkButton />

      <div>
        <p className="text-xs text-slate-500 mb-2">Your answers</p>
        <div className="flex flex-col gap-1.5">
          {recap.map((r) => (
            <button
              key={r.stepId}
              type="button"
              onClick={() => onEdit(r.stepId)}
              className="group flex items-center justify-between gap-2 rounded-lg bg-slate-50 hover:bg-slate-100 px-3 py-2 text-left"
            >
              <span className="sr-only">Edit answer: </span>
              <span className="text-sm text-slate-700 truncate">{r.label}</span>
              <span className="text-slate-400 group-hover:text-slate-600 text-xs shrink-0" aria-hidden="true">✎</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <p className="text-xs text-slate-500 mb-2.5">Your journey</p>
        <div className="flex flex-col">
          {orderedTasks.map((t) => {
            const status = statusFor(t.id);
            const isActive = activeId === t.id;
            const locked = status === 'locked';
            return (
              <button
                key={t.id}
                type="button"
                disabled={locked}
                aria-current={isActive ? 'step' : undefined}
                onClick={() => onSelect(t.id)}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors ${
                  isActive ? 'bg-blue-50' : locked ? 'cursor-not-allowed' : 'hover:bg-slate-50'
                }`}
              >
                <StatusDot status={status} />
                <span className={`text-sm leading-snug ${
                  isActive ? 'font-medium text-blue-700' : locked ? 'text-slate-400' : status === 'done' ? 'text-slate-500' : 'text-slate-700'
                }`}>
                  {status === 'done' && <span className="sr-only">Done: </span>}
                  {locked && <span className="sr-only">Locked (finish earlier steps first): </span>}
                  {t.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Task card (one task at a time) ───────────────────────────────────────────

function TaskCard({
  task, status, hasPrev, onBack, onMarkDone, onNext, headingRef,
}: {
  task: TaskData;
  status: TaskStatus;
  hasPrev: boolean;
  onBack: () => void;
  onMarkDone: () => void;
  onNext: () => void;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  const done = status === 'done';
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-5">
        <div className="space-y-2">
          <CategoryBadge category={task.category} />
          {/* tabIndex={-1}: focus lands here when the active task changes, so
              keyboard/screen-reader users hear the new task and never lose
              focus to <body> (e.g. when the Back button unmounts). */}
          <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-slate-900 leading-snug focus:outline-none">{task.title}</h2>
          <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${
            done ? 'text-green-600' : 'text-blue-600'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-green-500' : 'bg-blue-500'}`} />
            {done ? 'Completed' : 'Ready to start'}
          </span>
        </div>

        <p className="text-slate-700 leading-relaxed">{task.summary.text}</p>
        {task.detail && <p className="text-sm text-slate-600 leading-relaxed">{task.detail}</p>}

        {(task.timeline || task.cost) && (
          <dl className="grid gap-3 sm:grid-cols-2">
            {task.timeline && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Timeline</dt>
                <dd className="text-sm text-slate-800">{task.timeline.text}</dd>
              </div>
            )}
            {task.cost && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Cost</dt>
                <dd className="text-sm text-slate-800">{task.cost.text}</dd>
              </div>
            )}
          </dl>
        )}

        {task.warning && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-semibold">Note: </span>{task.warning}
          </div>
        )}

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
                        {s.links.map((link, li) => (
                          <li key={li}>
                            <a href={link.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">{link.text} ↗</a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {task.documents.length > 0 && (
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Documents needed</h3>
            <ul className="space-y-1">
              {task.documents.map((doc, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <svg className="shrink-0 mt-0.5 w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  {doc}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-400">
            Source:{' '}
            <a href={task.summary.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-slate-500">{task.summary.sourceName}</a>
          </p>
          <p className="mt-2 text-xs text-slate-400 italic">
            General guidance only — not legal advice. Confirm with a licensed immigration professional or the relevant authority.
          </p>
          <p className="mt-2 text-xs text-slate-400 italic">
            Marking a step done only records your own progress on this site — it is not confirmation
            that a legal requirement has been met or an application approved.
          </p>
        </div>
      </div>

      <div className="shrink-0 px-6 sm:px-8 py-4 border-t border-slate-200 flex gap-3 bg-white">
        {hasPrev && (
          <button type="button" onClick={onBack} className="rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100">← Back</button>
        )}
        {done ? (
          <button type="button" onClick={onNext} className="flex-1 rounded-xl py-3 font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors">Next →</button>
        ) : (
          <button type="button" onClick={onMarkDone} className="flex-1 rounded-xl py-3 font-medium text-white bg-emerald-500 hover:bg-emerald-600 transition-colors">Mark done &amp; continue</button>
        )}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function CorridorApp({ tasks, corridorTitle, originIso2, destinationIso2, availableCorridors, coversMotivations }: CorridorAppProps) {
  // Deterministic defaults for the first render (must match the server so
  // hydration succeeds). Persisted state is loaded from localStorage in an
  // effect after mount — see below.
  const [phase, setPhase] = useState<'wizard' | 'app'>('wizard');
  const [stepId, setStepId] = useState<string>(STEPS[0].id);
  const [answers, setAnswers] = useState<Intake>(() => defaultIntake(originIso2, destinationIso2));
  const [doneIds, setDoneIds] = useState<Set<string>>(() => new Set());
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

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
      phase?: 'wizard' | 'app';
      stepId?: string;
      answers?: Partial<Intake>;
      doneIds?: unknown;
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

    let nextAnswers = defaultIntake(originIso2, destinationIso2);
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
    if (saved?.activeTaskId) setActiveTaskId(saved.activeTaskId);
    setHydrated(true);
  }, []);

  // Persist on every meaningful change — but only after the load above, so we
  // never overwrite saved state with the initial defaults.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        phase, stepId, answers, doneIds: [...doneIds], activeTaskId,
      }));
    } catch {
      // storage unavailable — silent
    }
  }, [hydrated, phase, stepId, answers, doneIds, activeTaskId]);

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

  // Selectable country sets, derived from published corridors.
  const originSelectable = useMemo(() => new Set(availableCorridors.map((c) => c.origin)), [availableCorridors]);
  const destinationSelectable = useMemo(() => {
    const pool = availableCorridors.filter((c) => !answers.origin || c.origin === answers.origin);
    return new Set(pool.map((c) => c.destination));
  }, [availableCorridors, answers.origin]);

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
    hasChildren: answers.hasChildren,
  }), [answers]);

  const { applicableTasks, excludedTasks } = useMemo(() => {
    const applicable: TaskData[] = [];
    const excluded: TaskData[] = [];
    for (const t of tasks) {
      const r = evaluateAppliesIf(t.appliesIf, appliesCtx);
      if (r.error) {
        console.warn(`appliesIf on task "${t.id}" is invalid (${r.error}); showing the task (fail-open).`);
      }
      (r.applies ? applicable : excluded).push(t);
    }
    return { applicableTasks: applicable, excludedTasks: excluded };
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

  function resolve<T>(v: T | ((a: Intake) => T)): T {
    return typeof v === 'function' ? (v as (a: Intake) => T)(answers) : v;
  }

  function pushHistory(nextPhase: 'wizard' | 'app', nextStepId?: string) {
    window.history.pushState({ __relocation: true, phase: nextPhase, stepId: nextStepId }, '');
  }

  function handleContinue() {
    if (currentIndex < visibleSteps.length - 1) {
      const next = visibleSteps[currentIndex + 1].id;
      setStepId(next);
      pushHistory('wizard', next);
      return;
    }
    // Last step → enter the app. Redirect if the chosen corridor isn't this
    // page — carrying the intake in the URL fragment so the target corridor
    // lands straight on the personalised plan (F-08), without the answers
    // ever appearing in the HTTP request.
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
    pushHistory('wizard', targetStepId);
  }

  function handleMarkDone(id: string) {
    const nextDone = new Set([...doneIds, id]);
    setDoneIds(nextDone);
    const next = currentTaskId(orderedTasks, nextDone);
    setActiveTaskId(next ?? id);
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
    setAnswers(defaultIntake(originIso2, destinationIso2));
    setDoneIds(new Set());
    setActiveTaskId(null);
    setMobilePanelOpen(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  // Country handlers (need cross-field logic, so not closures on the field).
  function selectOrigin(iso: string) {
    setAnswers((a) => {
      const stillValid = availableCorridors.some((c) => c.origin === iso && c.destination === a.destination);
      return { ...a, origin: iso, destination: stillValid ? a.destination : null };
    });
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

  // ── Wizard phase ───────────────────────────────────────────────────────────

  if (phase === 'wizard') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 bg-white border-b border-slate-200 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg sm:text-xl font-bold text-slate-900">Relocation Guide</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate">A few questions, then a step-by-step plan built for your situation</p>
          </div>
          {currentIndex > 0 && (
            <button type="button" onClick={handleReset} className="shrink-0 text-sm text-slate-500 hover:text-slate-700 font-medium whitespace-nowrap">Start over</button>
          )}
        </div>

        <div className="flex-1 min-h-0 bg-slate-50 flex flex-col items-center px-4 sm:px-6 py-3 sm:py-5">
          <div className="shrink-0 flex gap-2 w-full max-w-xl mb-3 sm:mb-4">
            {visibleSteps.map((s, i) => (
              <div key={s.id} className={`h-1 flex-1 rounded-full transition-colors ${i <= currentIndex ? 'bg-blue-500' : 'bg-slate-200'}`} />
            ))}
          </div>

          {/* The card caps at the available height: question header and footer
              stay visible; only the options area scrolls when it must. */}
          <div className="w-full max-w-xl flex-1 min-h-0 flex flex-col">
            <div className="w-full max-h-full bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
              <div className="shrink-0 px-6 sm:px-8 pt-5 sm:pt-7">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2 sm:mb-3">
                  Step {currentIndex + 1} of {visibleSteps.length}
                </p>
                <h2 ref={stepHeadingRef} tabIndex={-1} className="text-xl sm:text-2xl font-bold text-slate-900 mb-1 focus:outline-none">{resolve(currentStep.title)}</h2>
                {currentStep.subtitle && <p className="text-sm text-slate-500">{resolve(currentStep.subtitle)}</p>}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-8 py-4 space-y-4">
                {currentStep.fields.map((field, fi) => {
                  if (field.kind === 'country') {
                    const selectable = field.scope === 'origin' ? originSelectable : destinationSelectable;
                    const selected = field.scope === 'origin' ? answers.origin : answers.destination;
                    const onSelect = field.scope === 'origin' ? selectOrigin : selectDestination;
                    return <CountryGrid key={fi} selectableIso={selectable} selectedIso={selected} onSelect={onSelect} />;
                  }
                  if (field.kind === 'countryMulti') {
                    return <CountryMultiGrid key={fi} selected={answers.passports} onToggle={togglePassport} />;
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
                  <button type="button" onClick={handleBack} className="shrink-0 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100">← Back</button>
                )}
                <button
                  type="button"
                  disabled={!ready}
                  onClick={handleContinue}
                  className={`flex-1 rounded-xl py-3 font-medium text-white transition-colors ${
                    ready ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-300 cursor-not-allowed'
                  }`}
                >
                  {currentIndex === visibleSteps.length - 1 ? 'Build my relocation plan' : 'Continue'}
                </button>
              </div>
            </div>
          </div>

          <p className="shrink-0 text-xs text-slate-600 text-center mt-3 max-w-md px-4">
            General guidance only — not legal advice. Rules change frequently; always verify with
            the official authority or a licensed immigration adviser before acting.{' '}
            <a href="/impressum" className="underline hover:text-slate-800">Impressum</a>
          </p>
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
    />
  );

  const mainPanel = allDone ? (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
      </div>
      <h2 ref={taskHeadingRef} tabIndex={-1} className="text-2xl font-bold text-slate-900 focus:outline-none">You've completed every step</h2>
      <p className="text-slate-500 mt-2 max-w-sm">All {applicableTasks.length} tasks in your {corridorTitle} plan are marked done. You can revisit any step from your journey on the left.</p>
      <p className="text-xs text-slate-400 mt-4 max-w-sm">
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
    />
  ) : (
    <div className="flex-1 flex items-center justify-center text-slate-500 p-8">Select a step from your journey to begin.</div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
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
        </div>
        <button type="button" onClick={handleReset} className="shrink-0 text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap">← Start over</button>
      </div>

      <div className="shrink-0 bg-amber-50 border-b border-amber-100 px-4 py-2">
        <p className="text-xs text-amber-800">
          <strong>General guidance only — not legal advice.</strong>{' '}
          Rules change frequently; always verify with the official authority or a licensed
          immigration adviser before acting.{' '}
          <a href="/impressum" className="underline hover:text-amber-900">Impressum</a>
        </p>
      </div>

      {!routeCovered && answers.motivation && (
        <div className="shrink-0 bg-rose-50 border-b border-rose-100 px-4 py-2.5">
          <p className="text-xs text-rose-800">
            <strong>Your route isn't covered yet.</strong>{' '}
            Your answers point to the {motivationLabel(answers.motivation).toLowerCase()} route, but this
            guide's verified content covers the {coveredLabel} route only. The steps below describe
            the {coveredLabel} route and may not apply to your situation — treat them as background
            reading, not a plan you can rely on. For your route, go directly to the official
            authority or a licensed immigration adviser.
          </p>
        </div>
      )}

      {routeCovered && excludedTasks.length > 0 && (
        <div className="shrink-0 bg-blue-50 border-b border-blue-100 px-4 py-2">
          <p className="text-xs text-blue-800">
            <strong>Personalised for you:</strong> {applicableTasks.length} of {tasks.length} steps apply to
            your situation. Skipped: {excludedTasks.map((t) => t.title).join(' · ')}.
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
          <aside className="w-[300px] shrink-0 border-r border-slate-200 bg-white overflow-y-auto px-5 py-6">{sidebar}</aside>
          <div className="flex-1 overflow-hidden bg-white">{mainPanel}</div>
        </div>
      )}
    </div>
  );
}
