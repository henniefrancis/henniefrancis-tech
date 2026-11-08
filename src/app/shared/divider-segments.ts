/**
 * Text pieces around divider glyphs. Each piece keeps its own spaces, so the rendered text nodes match the
 * original layout exactly (a space inside a smaller font renders narrower than one outside it).
 */
export function dividerSegments(parts: string[], tail = ''): string[] {
  return parts.map((part, i) => (i > 0 ? ' ' : '') + part + (i === parts.length - 1 ? tail : ' '));
}
