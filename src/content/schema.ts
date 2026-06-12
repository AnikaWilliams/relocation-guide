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
export const MotivationEnum = z.enum(['work', 'family', 'study', 'other']);
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
});
export type Claim = z.infer<typeof ClaimSchema>;

const StepSchema = z.object({
  text: z.string().min(1),
  tip: z.string().optional(),
  links: z.array(ClaimSchema).optional(),
});
export type Step = z.infer<typeof StepSchema>;

/** A corridor task — one step in the relocation journey. */
export const TaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: CategoryEnum,
  summary: ClaimSchema, // The task summary is itself a verifiable claim
  detail: z.string(),
  steps: z.array(StepSchema),
  documents: z.array(z.string()),
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
});
export type Corridor = z.infer<typeof CorridorSchema>;
