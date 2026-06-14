/**
 * Self-hosted SVG flags for the in-scope countries only.
 *
 * We import the individual flag assets from `flag-icons` (not its full
 * stylesheet) so the build bundles ~18 small SVGs instead of all ~260 flags
 * plus a 400 kB stylesheet. Each import resolves to a hashed, same-origin asset
 * URL — no third-party runtime request (important for this project's privacy
 * posture). Add a line here when a new origin/destination country is supported.
 */

import au from 'flag-icons/flags/4x3/au.svg';
import at from 'flag-icons/flags/4x3/at.svg';
import be from 'flag-icons/flags/4x3/be.svg';
import ca from 'flag-icons/flags/4x3/ca.svg';
import ch from 'flag-icons/flags/4x3/ch.svg';
import cn from 'flag-icons/flags/4x3/cn.svg';
import de from 'flag-icons/flags/4x3/de.svg';
import fr from 'flag-icons/flags/4x3/fr.svg';
import gb from 'flag-icons/flags/4x3/gb.svg';
import ie from 'flag-icons/flags/4x3/ie.svg';
import inFlag from 'flag-icons/flags/4x3/in.svg';
import lu from 'flag-icons/flags/4x3/lu.svg';
import nl from 'flag-icons/flags/4x3/nl.svg';
import ph from 'flag-icons/flags/4x3/ph.svg';
import rs from 'flag-icons/flags/4x3/rs.svg';
import ru from 'flag-icons/flags/4x3/ru.svg';
import ua from 'flag-icons/flags/4x3/ua.svg';
import us from 'flag-icons/flags/4x3/us.svg';

// Astro resolves an `.svg` import to an `ImageMetadata` object; `.src` is the
// emitted same-origin asset URL we feed to <img>.
export const FLAG_URLS: Record<string, string> = {
  au: au.src, at: at.src, be: be.src, ca: ca.src, ch: ch.src, cn: cn.src,
  de: de.src, fr: fr.src, gb: gb.src, ie: ie.src, in: inFlag.src, lu: lu.src,
  nl: nl.src, ph: ph.src, rs: rs.src, ru: ru.src, ua: ua.src, us: us.src,
};

export function flagUrl(iso2: string): string | undefined {
  return FLAG_URLS[iso2.toLowerCase()];
}
