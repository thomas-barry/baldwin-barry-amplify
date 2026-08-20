/**
 * Bundled fallback quips.
 *
 * These are NOT migration leftovers — quips live in DynamoDB and are edited
 * through /admin/quips, but this list stays shipped in the bundle on purpose.
 * The hero draws from it synchronously at mount so the curtain never opens on
 * an empty panel, and falls back to it entirely when the read fails. See
 * docs/adr/0001-bundled-quip-fallback.md before deleting this file.
 *
 * Keep entries to roughly 25 characters. `QuipPanel` renders them at
 * `clamp(2rem, 5vw, 3rem)` in the display face at `--fw-black`, inside a card
 * locked to `aspect-ratio: 500 / 624` — longer lines wrap into a block that
 * loses the punch, and much longer ones overflow the panel outright.
 */
export const QUIPS: string[] = ['Fuck Donald Trump'];
