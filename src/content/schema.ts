import { z } from 'zod';

/**
 * Canonical content schema for the relocation guide.
 *
 * This module is the single source of truth for the data model (architect-owned;
 * see DECISIONS.md ADR-0005). It is deliberately framework-agnostic — it imports
 * the standalone `zod` package, not `astro:content` — so the schema and the
 * provenance gate can be unit-tested under Vitest without the Astro runtime.
 * `src/content/config.ts` wires these schemas into an Astro content collection.
 */

/** Task categories. Keep in sync with any category filtering UI. */
export const CategoryEnum = z.enum([
  'visa-permit',
  'employment',
  'housing',
  'finance-banking',
  'healthcare-insurance',
  'registration-bureaucracy',
  'taxes',
  'family-dependents',
  'education',
  'transport-logistics',
  'language-integration',
  'other',
]);
export type Category = z.infer<typeof CategoryEnum>;

export const ClaimStatusEnum = z.enum([
  'UNVERIFIED',
  'VERIFIED',
  'FLAGGED',
  'STALE',
]);
export type ClaimStatus = z.infer<typeof ClaimStatusEnum>;

/**
 * Relocation motivations the intake wizard can capture. Keep in sync with the
 * wizard's motivation step in `CorridorApp.tsx`.
 */
export const MotivationEnum = z.enum(['work', 'family', 'study', 'retirement', 'other']);
export type Motivation = z.infer<typeof MotivationEnum>;

/**
 * A single verifiable factual claim. Every fact a user could act on (a fee, a
 * threshold, a deadline) is a Claim and carries its own provenance.
 *
 * Provenance fields (`lastVerified`, `verifiedBy`, `reviewBy`) are optional at
 * the schema level so the content-researcher can draft `UNVERIFIED` claims
 * before the fact-verifier fills them in. The build gate (see utils/provenance)
 * enforces that they are present and fresh before a claim may be rendered.
 */
export const ClaimSchema = z.object({
  text: z.string().min(1),
  sourceUrl: z.string().url(),
  sourceName: z.string().min(1),
  lastVerified: z.string().date().optional(),
  verifiedBy: z.string().optional(),
  reviewBy: z.string().date().optional(),
  status: ClaimStatusEnum.default('UNVERIFIED'),
  // ADR-0017: sha256 of the normalized source text at last verification (optional; back-compat)
  sourceHash: z.string().optional(),
});
export type Claim = z.infer<typeof ClaimSchema>;

const StepSchema = z.object({
  text: z.string().min(1),
  tip: z.string().optional(),
  links: z.array(ClaimSchema).optional(),
});
export type Step = z.infer<typeof StepSchema>;

/**
 * A document or official form needed to complete a task (a checkable substep,
 * ADR-0012). `type: 'provide'` = the user supplies it (e.g. passport copy);
 * `type: 'form'` = an official form to obtain and fill out.
 *
 * For forms, `form` is a full Claim: `sourceUrl` is the issuing authority's
 * current link (we NEVER self-host official PDFs), `sourceName` is the issuer
 * (e.g. "SEM", "Canton de Vaud — SPOP"), and the standard provenance fields
 * apply — so form links go through fact-verifier, are enforced by the build
 * gate, and are watched weekly by link-auditor like every other claim. When a
 * deep PDF link can't be confirmed current, the claim links the authority's
 * forms index page instead and says so in its text.
 */
export const TaskDocumentSchema = z
  .object({
    name: z.string().min(1),
    type: z.enum(['provide', 'form']),
    /** One sentence max: what it is / where it comes from. */
    description: z.string().min(1),
    form: ClaimSchema.optional(),
  })
  .refine((d) => d.type !== 'form' || d.form !== undefined, {
    message: "documents of type 'form' must carry a `form` claim (officialUrl + issuer + provenance)",
  });
export type TaskDocument = z.infer<typeof TaskDocumentSchema>;

/** A scannable key fact (label + claim), e.g. "Who applies" / "Processing time" (ADR-0012). */
export const KeyFactSchema = ClaimSchema.extend({
  label: z.string().min(1),
});
export type KeyFact = z.infer<typeof KeyFactSchema>;

/**
 * Per-canton local detail for a destination whose rules are administered
 * cantonally (Switzerland is federal law + cantonal administration, ADR-0021).
 * When the user picks their canton, the plan surfaces that canton's migration
 * office and tax pointer; cantons not listed fall back to the federal SEM
 * cantonal-authority directory. Each field a user could act on is a Claim with
 * full provenance — sourced + fact-verified and enforced by the build gate when
 * the corridor is published, exactly like every other claim. This lives on the
 * corridor (not a separate collection) because the content is corridor-scoped
 * and reuses the same gate + two-agent pipeline.
 */
export const CantonSchema = z.object({
  code: z.string().min(1), // e.g. 'zh', 'ge', 'vd'
  name: z.string().min(1), // e.g. 'Zürich', 'Geneva', 'Vaud'
  /** The cantonal migration/immigration office that decides permits locally. */
  migrationOffice: ClaimSchema,
  /** The canton's tax authority / rate information (income tax varies by canton). */
  taxInfo: ClaimSchema,
  /** Optional extra canton-specific facts (quota competitiveness, language, …). */
  notes: z.array(KeyFactSchema).optional(),
});
export type Canton = z.infer<typeof CantonSchema>;

/** A corridor task — one step in the relocation journey. */
export const TaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: CategoryEnum,
  summary: ClaimSchema, // The task summary is itself a verifiable claim
  /** 1–2 sentence distilled "what and why" shown at the top of the detail panel (ADR-0012). */
  tldr: ClaimSchema.optional(),
  /** 3–5 scannable facts (who applies, where, processing time, …) — each one a Claim (ADR-0012). */
  keyFacts: z.array(KeyFactSchema).optional(),
  detail: z.string(),
  steps: z.array(StepSchema),
  /**
   * Documents/forms needed for this task. Plain strings are the legacy shape
   * (rendered as type 'provide' with no description); structured entries are
   * the ADR-0012 substep model. The content pipeline migrates strings to
   * structured entries corridor by corridor.
   */
  documents: z.array(z.union([z.string(), TaskDocumentSchema])),
  timeline: ClaimSchema.optional(),
  cost: ClaimSchema.optional(),
  warning: z.string().optional(),
  dependsOn: z.array(z.string()).default([]),
  appliesIf: z.string().optional(), // Expression evaluated at runtime
});
export type Task = z.infer<typeof TaskSchema>;

/**
 * A corridor (origin -> destination pair).
 *
 * `published` gates whether the corridor renders to a public page. It defaults
 * to `false` so work-in-progress drafts can live in the repo without tripping
 * the build gate. The founder flips it to `true` only after the human approval
 * gate (CLAUDE.md rule 8); the build then enforces that every claim on the page
 * is VERIFIED and fresh.
 */
export const CorridorSchema = z.object({
  originIso2: z.string().length(2),
  destinationIso2: z.string().length(2),
  title: z.string().min(1),
  description: z.string().min(1),
  lastReviewed: z.string().date(),
  reviewedBy: z.string().min(1),
  published: z.boolean().default(false),
  /**
   * Which relocation routes this corridor's verified content covers. When a
   * user's intake motivation falls outside this list, the app shows an honest
   * "your route isn't covered yet" notice instead of presenting the plan as
   * personalised. Omitted = no coverage check (legacy corridors).
   */
  coversMotivations: z.array(MotivationEnum).optional(),
  tasks: z.array(TaskSchema),
  /**
   * Optional per-canton local detail (Switzerland: federal law, cantonal
   * administration — ADR-0021). Surfaced when the user picks their canton;
   * unlisted cantons fall back to the federal SEM cantonal-authority directory.
   * Canton claims are provenance-gated like corridor claims.
   */
  cantons: z.array(CantonSchema).optional(),
});
export type Corridor = z.infer<typeof CorridorSchema>;
