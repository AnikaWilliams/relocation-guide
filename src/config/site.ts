/**
 * Central site constants. Single source of truth for the operator details that
 * legal pages (privacy, cookies, terms, Impressum) reference.
 *
 * Values marked [TBD ...] MUST be filled in before launch — the Impressum and
 * privacy policy are legally required to name a real operator and contact.
 */
export const SITE = {
  name: 'Relocation Guide',
  tagline: 'Source-backed guidance for relocating to Western Europe.',

  /** Public contact address. Placeholder until a real inbox exists. */
  contactEmail: '[TBD: contact email]',

  /**
   * Operator / publisher details. Required for the German (§5 DDG/TMG) and Swiss
   * Impressum, and named in the privacy policy as the data controller.
   */
  operator: {
    legalName: '[TBD: operator legal name]',
    address: '[TBD: street, postal code, city, country]',
    email: '[TBD: contact email]',
    /** Person responsible for content (Impressum requirement). */
    responsibleForContent: '[TBD: responsible person]',
  },

  /** Date the policy drafts were last touched (shown on legal pages). */
  policiesLastUpdated: '2026-06-09',
} as const;
