/**
 * Safe evaluator for the `Task.appliesIf` expression field.
 *
 * The content pipeline attaches an `appliesIf` string to a task when it only
 * applies to some user situations (e.g. `hasChildren` on a school-enrolment
 * task). The app evaluates it against the user's intake answers to build a
 * personalised path.
 *
 * Design constraints:
 * - **No `eval`/`Function`** — content is data, never executable code.
 * - **Fail-open**: if an expression doesn't parse or references an unknown
 *   field, the task is treated as APPLICABLE. Showing a step that doesn't
 *   apply is an annoyance; hiding a legally required step is catastrophic.
 *
 * Grammar (deliberately tiny):
 *   expr       := andExpr ('||' andExpr)*
 *   andExpr    := term ('&&' term)*
 *   term       := '!' IDENT
 *               | IDENT '==' literal
 *               | IDENT '!=' literal
 *               | IDENT 'includes' literal   (for list fields, e.g. passports)
 *               | IDENT                      (truthy test)
 *   literal    := 'single-quoted' | "double-quoted" | true | false
 *
 * `&&` binds tighter than `||`. No parentheses — keep rules flat; split
 * complex applicability into multiple tasks instead.
 */

export type AppliesIfContext = Record<string, string | boolean | string[] | null | undefined>;

type Token =
  | { kind: 'ident'; value: string }
  | { kind: 'op'; value: '==' | '!=' | '&&' | '||' | '!' | 'includes' }
  | { kind: 'lit'; value: string | boolean };

class ParseError extends Error {}

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (src.startsWith('==', i)) { tokens.push({ kind: 'op', value: '==' }); i += 2; continue; }
    if (src.startsWith('!=', i)) { tokens.push({ kind: 'op', value: '!=' }); i += 2; continue; }
    if (src.startsWith('&&', i)) { tokens.push({ kind: 'op', value: '&&' }); i += 2; continue; }
    if (src.startsWith('||', i)) { tokens.push({ kind: 'op', value: '||' }); i += 2; continue; }
    if (ch === '!') { tokens.push({ kind: 'op', value: '!' }); i++; continue; }
    if (ch === "'" || ch === '"') {
      const end = src.indexOf(ch, i + 1);
      if (end === -1) throw new ParseError(`Unterminated string at ${i}`);
      tokens.push({ kind: 'lit', value: src.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    const m = /^[A-Za-z_][A-Za-z0-9_-]*/.exec(src.slice(i));
    if (m) {
      const word = m[0];
      if (word === 'true' || word === 'false') tokens.push({ kind: 'lit', value: word === 'true' });
      else if (word === 'includes') tokens.push({ kind: 'op', value: 'includes' });
      else tokens.push({ kind: 'ident', value: word });
      i += word.length;
      continue;
    }
    throw new ParseError(`Unexpected character '${ch}' at ${i}`);
  }
  return tokens;
}

function evalTokens(tokens: Token[], ctx: AppliesIfContext): boolean {
  let pos = 0;

  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  const lookup = (name: string): string | boolean | string[] | null => {
    if (!(name in ctx)) throw new ParseError(`Unknown field '${name}'`);
    return ctx[name] ?? null;
  };

  function term(): boolean {
    const t = next();
    if (!t) throw new ParseError('Unexpected end of expression');
    if (t.kind === 'op' && t.value === '!') {
      const id = next();
      if (!id || id.kind !== 'ident') throw new ParseError(`'!' must be followed by a field name`);
      return !lookup(id.value);
    }
    if (t.kind !== 'ident') throw new ParseError(`Expected a field name, got '${String(t.value)}'`);
    const left = lookup(t.value);
    const op = peek();
    if (op && op.kind === 'op' && (op.value === '==' || op.value === '!=' || op.value === 'includes')) {
      next();
      const lit = next();
      if (!lit || lit.kind !== 'lit') throw new ParseError(`'${op.value}' must be followed by a quoted string, true, or false`);
      if (op.value === 'includes') {
        return Array.isArray(left) && typeof lit.value === 'string' && left.includes(lit.value);
      }
      const eq = left === lit.value;
      return op.value === '==' ? eq : !eq;
    }
    return Boolean(left); // bare truthy test
  }

  function andExpr(): boolean {
    let acc = term();
    while (peek()?.kind === 'op' && (peek() as Token & { value: string }).value === '&&') {
      next();
      const rhs = term(); // no short-circuit: always parse (and validate) the whole expression
      acc = acc && rhs;
    }
    return acc;
  }

  function orExpr(): boolean {
    let acc = andExpr();
    while (peek()?.kind === 'op' && (peek() as Token & { value: string }).value === '||') {
      next();
      const rhs = andExpr();
      acc = acc || rhs;
    }
    return acc;
  }

  const result = orExpr();
  if (pos !== tokens.length) throw new ParseError(`Unexpected trailing tokens from position ${pos}`);
  return result;
}

export interface AppliesIfResult {
  /** Whether the task applies. On any parse/eval error this is `true` (fail-open). */
  applies: boolean;
  /** Set when the expression was invalid and the fail-open default was used. */
  error?: string;
}

export function evaluateAppliesIf(expression: string | undefined, ctx: AppliesIfContext): AppliesIfResult {
  if (!expression || expression.trim() === '') return { applies: true };
  try {
    return { applies: evalTokens(tokenize(expression), ctx) };
  } catch (e) {
    return { applies: true, error: e instanceof Error ? e.message : String(e) };
  }
}
