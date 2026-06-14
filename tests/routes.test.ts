import { describe, it, expect } from 'vitest';
import { isRouteLive, type RoutePair } from '../src/utils/routes';
import { COUNTRY_OPTIONS } from '../src/utils/countries';

/**
 * The intake makes EVERY country selectable; only published corridors are
 * "live", and every other origin→destination pair must fall through to the
 * launch waitlist. These tests assert that gate across the FULL country matrix,
 * so "works for all unavailable routes" is verified exhaustively, not sampled.
 */

// Mirror production today: the only published corridor is USA → Switzerland.
const LIVE: RoutePair[] = [{ origin: 'us', destination: 'ch' }];

describe('isRouteLive', () => {
  it('treats the published corridor (us → ch) as live', () => {
    expect(isRouteLive(LIVE, 'us', 'ch')).toBe(true);
  });

  it('is false for an incomplete selection', () => {
    expect(isRouteLive(LIVE, null, 'ch')).toBe(false);
    expect(isRouteLive(LIVE, 'us', null)).toBe(false);
    expect(isRouteLive(LIVE, null, null)).toBe(false);
    expect(isRouteLive(LIVE, 'us', undefined)).toBe(false);
  });

  it('is live for EXACTLY the published pair and nothing else, across the full matrix', () => {
    const isos = COUNTRY_OPTIONS.map((c) => c.iso2);
    let liveCount = 0;
    let unavailableCount = 0;
    for (const origin of isos) {
      for (const destination of isos) {
        const live = isRouteLive(LIVE, origin, destination);
        if (origin === 'us' && destination === 'ch') {
          expect(live).toBe(true);
          liveCount += 1;
        } else {
          // Every other pair — including same-country pairs like us→us — is a
          // waitlist route, never live.
          expect(live).toBe(false);
          unavailableCount += 1;
        }
      }
    }
    expect(liveCount).toBe(1);
    // 18 countries → 18×18 = 324 pairs, minus the 1 live pair.
    expect(unavailableCount).toBe(isos.length * isos.length - 1);
  });

  it('supports multiple live corridors independently', () => {
    const pairs: RoutePair[] = [
      { origin: 'us', destination: 'ch' },
      { origin: 'in', destination: 'de' },
    ];
    expect(isRouteLive(pairs, 'in', 'de')).toBe(true);
    expect(isRouteLive(pairs, 'us', 'ch')).toBe(true);
    // A live origin paired with a different destination is still not live.
    expect(isRouteLive(pairs, 'us', 'de')).toBe(false);
    expect(isRouteLive(pairs, 'in', 'ch')).toBe(false);
  });
});
