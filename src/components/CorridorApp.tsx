import { useState } from 'react';
import CorridorFlowchart, { type FlowTask } from './CorridorFlowchart';

// ── Types ──────────────────────────────────────────────────────────────────

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

type HasJobOffer = boolean | null;
type PartnerStatus = 'solo' | 'partner' | 'spouse' | null;
type DurationIntent = 'short' | 'long' | 'permanent' | null;

interface Answers {
  hasJobOffer: HasJobOffer;
  partnerStatus: PartnerStatus;
  hasChildren: boolean | null;
  durationIntent: DurationIntent;
}

interface CorridorAppProps {
  tasks: TaskData[];
  corridorTitle: string;
  originName: string;
  destinationName: string;
}

// ── Wizard helpers ─────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;

function canContinue(step: number, answers: Answers): boolean {
  if (step === 1) return true; // corridor is pre-selected
  if (step === 2) return answers.hasJobOffer !== null;
  if (step === 3) return answers.durationIntent !== null;
  return false;
}

// ── Shared UI atoms ─────────────────────────────────────────────────────────

function OptionCard({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full border rounded-xl p-4 text-left transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-slate-200 bg-white hover:border-blue-300'
      }`}
    >
      <span className="font-medium text-slate-900">{label}</span>
      {description && (
        <span className="block text-sm text-slate-500 mt-0.5">{description}</span>
      )}
    </button>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    legal: 'bg-blue-100 text-blue-800',
    financial: 'bg-green-100 text-green-800',
    housing: 'bg-purple-100 text-purple-800',
    health: 'bg-red-100 text-red-800',
    administrative: 'bg-slate-100 text-slate-700',
    banking: 'bg-amber-100 text-amber-800',
    education: 'bg-teal-100 text-teal-800',
    employment: 'bg-orange-100 text-orange-800',
  };
  return (
    <span className={`text-xs rounded px-2 py-0.5 font-medium ${colors[category] ?? 'bg-slate-100 text-slate-700'}`}>
      {category}
    </span>
  );
}

// ── Task detail panel ───────────────────────────────────────────────────────

function TaskDetailPanel({
  task,
  onClose,
}: {
  task: TaskData;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-slate-200 shrink-0">
        <div className="space-y-1">
          <CategoryBadge category={task.category} />
          <h2 className="text-xl font-semibold text-slate-900 leading-snug">{task.title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="shrink-0 mt-1 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <p className="text-slate-700 leading-relaxed">{task.summary.text}</p>
        {task.detail && (
          <p className="text-sm text-slate-600 leading-relaxed">{task.detail}</p>
        )}

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
            <h3 className="font-semibold text-slate-900 mb-3">Steps</h3>
            <ol className="space-y-3">
              {task.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-700">{step.text}</p>
                    {step.tip && (
                      <p className="text-xs text-slate-500 italic">{step.tip}</p>
                    )}
                    {step.links && step.links.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {step.links.map((link, li) => (
                          <li key={li}>
                            <a
                              href={link.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {link.text} ↗
                            </a>
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
            <a
              href={task.summary.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-slate-500"
            >
              {task.summary.sourceName}
            </a>
          </p>
          <p className="mt-2 text-xs text-slate-400 italic">
            This information is for general guidance only — not legal advice. Confirm requirements with a licensed immigration professional or the relevant Swiss authority.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function CorridorApp({ tasks, corridorTitle, originName, destinationName }: CorridorAppProps) {
  const [phase, setPhase] = useState<'wizard' | 'app'>('wizard');
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Answers>({
    hasJobOffer: null,
    partnerStatus: null,
    hasChildren: null,
    durationIntent: null,
  });
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const flowTasks: FlowTask[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    dependsOn: t.dependsOn,
  }));

  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null;

  function handleWizardUpdate(patch: Partial<Answers>) {
    setAnswers((a) => ({ ...a, ...patch }));
  }

  function handleWizardContinue() {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      setPhase('app');
    }
  }

  function handleWizardBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  function handleNodeClick(id: string) {
    setSelectedTaskId((prev) => (prev === id ? null : id));
  }

  if (phase === 'wizard') {
    const ready = canContinue(step, answers);
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* App header */}
        <div className="shrink-0 bg-white border-b border-slate-200 px-8 py-5">
          <p className="text-xl font-bold text-slate-900">Relocation Flowchart</p>
          <p className="text-sm text-slate-500 mt-0.5">Dependency-aware guide to every legal and administrative step</p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 bg-slate-50 overflow-y-auto">
          <div className="flex flex-col items-center py-10 px-6">
            {/* Progress bar — outside the card */}
            <div className="flex gap-2 w-full max-w-xl mb-6">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${i < step ? 'bg-blue-500' : 'bg-slate-200'}`}
                />
              ))}
            </div>

            {/* Card */}
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4">
                Step {step} of {TOTAL_STEPS}
              </p>

              {step === 1 && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Where are you coming from?</h2>
                  <p className="text-sm text-slate-500 mb-6">We have verified data for this corridor.</p>
                  <div className="space-y-3">
                    <OptionCard
                      label={`${originName} → ${destinationName}`}
                      selected={true}
                      onClick={() => {}}
                    />
                  </div>
                  <p className="mt-3 text-xs text-slate-400">More corridors coming soon — we verify every fact before publishing.</p>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Your situation</h2>
                  <p className="text-sm text-slate-500 mb-6">Help us personalise your plan.</p>
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-700">Do you have a job offer in Switzerland?</p>
                    <OptionCard
                      label="Yes, I have a job offer"
                      description="Your employer will sponsor your work permit"
                      selected={answers.hasJobOffer === true}
                      onClick={() => handleWizardUpdate({ hasJobOffer: true })}
                    />
                    <OptionCard
                      label="Not yet"
                      description="I'm planning to find work after arriving"
                      selected={answers.hasJobOffer === false}
                      onClick={() => handleWizardUpdate({ hasJobOffer: false })}
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">How long are you staying?</h2>
                  <p className="text-sm text-slate-500 mb-6">Your intended stay determines which permit you'll need.</p>
                  <div className="space-y-3">
                    <OptionCard
                      label="Less than 1 year"
                      description="Short-stay L permit path"
                      selected={answers.durationIntent === 'short'}
                      onClick={() => handleWizardUpdate({ durationIntent: 'short' })}
                    />
                    <OptionCard
                      label="1 year or more"
                      description="Standard B permit path"
                      selected={answers.durationIntent === 'long'}
                      onClick={() => handleWizardUpdate({ durationIntent: 'long' })}
                    />
                    <OptionCard
                      label="Indefinitely — planning to settle"
                      description="B permit now; C permit possible after 5–10 years"
                      selected={answers.durationIntent === 'permanent'}
                      onClick={() => handleWizardUpdate({ durationIntent: 'permanent' })}
                    />
                  </div>
                </div>
              )}

              {step > 1 && (
                <button
                  type="button"
                  onClick={handleWizardBack}
                  className="mt-6 text-sm text-slate-500 hover:text-slate-700"
                >
                  ← Back
                </button>
              )}

              <button
                type="button"
                disabled={!ready}
                onClick={handleWizardContinue}
                className={`w-full mt-4 rounded-xl py-3.5 font-medium text-white transition-colors ${
                  ready ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-300 cursor-not-allowed'
                }`}
              >
                {step === TOTAL_STEPS ? 'Generate my relocation plan' : 'Continue'}
              </button>
            </div>

            <p className="text-xs text-slate-400 text-center mt-8 max-w-md">
              This tool provides general guidance only — not legal advice. Rules change; always verify with official government sources.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── App phase ────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* App header — same style as wizard header */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-8 py-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xl font-bold text-slate-900">Relocation Flowchart</p>
          <p className="text-sm text-slate-500 mt-0.5">{corridorTitle} · click any step to see details</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setPhase('wizard');
            setStep(1);
            setSelectedTaskId(null);
            setAnswers({ hasJobOffer: null, partnerStatus: null, hasChildren: null, durationIntent: null });
          }}
          className="shrink-0 mt-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Edit preferences
        </button>
      </div>

      {/* Split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Flowchart panel */}
        <div className="flex-1 relative bg-slate-50">
          <CorridorFlowchart
            tasks={flowTasks}
            onNodeClick={handleNodeClick}
            selectedId={selectedTaskId}
          />
        </div>

        {/* Detail panel */}
        <div className="w-[420px] shrink-0 border-l border-slate-200 bg-white overflow-hidden flex flex-col">
          {selectedTask ? (
            <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTaskId(null)} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 0 0 0 12h3" />
                </svg>
              </div>
              <p className="font-medium text-slate-700">Select a step to get started</p>
              <p className="text-sm text-slate-500 mt-1">Click any node in the flowchart to see what's required, how long it takes, and the official forms you'll need.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
