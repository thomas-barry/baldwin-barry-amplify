/**
 * Helpers for the markdown musing format.
 *
 * Images are stored as bare S3 keys — `![alt](uploads/photo.jpg)` — and resolved
 * to real URLs at render time. The key must stay scheme-less: react-markdown
 * runs every target through `defaultUrlTransform`, which blanks any value whose
 * first colon comes before the first `/`, `?` or `#` unless the scheme is
 * http/https/mailto/xmpp/irc. So `s3:uploads/photo.jpg` renders as an empty
 * `src`, while `uploads/photo.jpg` passes through untouched.
 */

/**
 * `![alt](target "optional title")`, with the CommonMark `<...>` form for
 * targets containing spaces. Kept deliberately loose — it only has to find
 * candidates, `isS3Key` decides which ones we own.
 */
const IMAGE_PATTERN = /!\[([^\]]*)\]\(\s*(?:<([^>]*)>|([^)\s]+))(?:\s+"[^"]*")?\s*\)/g;

/** Anything of the form `scheme:` — the test `defaultUrlTransform` applies. */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * True for targets we resolve ourselves. Absolute URLs, protocol-relative URLs,
 * data URIs and site-root paths are left for the browser to fetch as written.
 */
export function isS3Key(target: string): boolean {
  return target.length > 0 && !HAS_SCHEME.test(target) && !target.startsWith('/') && !target.startsWith('#');
}

/** Every distinct S3 key referenced by an image in `markdown`, in first-use order. */
export function extractImageKeys(markdown: string): string[] {
  const keys = new Set<string>();
  for (const match of markdown.matchAll(IMAGE_PATTERN)) {
    const target = match[2] ?? match[3] ?? '';
    if (isS3Key(target)) keys.add(target);
  }
  return [...keys];
}

/**
 * Builds the snippet the image picker copies. A caption goes in the title slot,
 * which the renderer turns into a `<figcaption>`.
 */
export function formatImageMarkdown(altText: string, key: string, caption?: string): string {
  // `]` would close the alt early; `"` would close the title early.
  const alt = altText.replace(/[[\]]/g, '');
  // Angle brackets are the CommonMark escape for targets containing spaces.
  const target = /[\s()]/.test(key) ? `<${key}>` : key;
  const title = caption ? ` "${caption.replace(/"/g, "'")}"` : '';
  return `![${alt}](${target}${title})`;
}

/**
 * Flattens markdown to plain prose for card excerpts and meta descriptions.
 * Approximate by design: this feeds a 160-character preview, not a renderer.
 */
export function stripMarkdown(markdown: string): string {
  return (
    markdown
      .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
      .replace(IMAGE_PATTERN, ' ') // images contribute nothing readable
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → their text
      .replace(/^\s{0,3}>+\s?/gm, '') // blockquote markers
      .replace(/^\s{0,3}#{1,6}\s+/gm, '') // ATX headings
      .replace(/^\s{0,3}(?:[-*+]|\d+[.)])\s+/gm, '') // list bullets
      .replace(/^\s{0,3}(?:[-*_]\s*){3,}$/gm, ' ') // thematic breaks
      // Emphasis is unwrapped as delimited pairs rather than by deleting every
      // marker: a bare `_` strip eats the underscores in file names like
      // `20250806-_U8A0988.jpg` and in snake_case identifiers. Underscore
      // delimiters therefore require a non-word character on each side, matching
      // CommonMark's intraword rule. No lookbehind — Safari before 16.4 throws on
      // it at parse time, which would take the whole bundle down.
      .replace(/`([^`]+)`/g, '$1') // inline code
      .replace(/\*\*([^*]+)\*\*/g, '$1') // strong
      .replace(/(^|\W)__([^_]+)__(?!\w)/g, '$1$2')
      .replace(/~~([^~]+)~~/g, '$1') // strikethrough
      .replace(/\*([^*]+)\*/g, '$1') // emphasis
      .replace(/(^|\W)_([^_]+)_(?!\w)/g, '$1$2')
      .replace(/\s+/g, ' ')
      .trim()
  );
}
