// Text utilities shared between schedule and renderer phases
// Keeps wrap logic in one place to prevent schedule/renderer divergence

export const MAX_CHARS_PER_LINE = 18;

/** Split text into lines that fit within a max character count */
export function wrapText(text: string | undefined, maxChars: number): string[] {
  if (!text) return [];
  if (text.length <= maxChars) return [text];
  const lines: string[] = [];
  const words = text.split(" ");
  let line = "";
  for (const word of words) {
    if ((line + " " + word).length <= maxChars) {
      line += (line ? " " : "") + word;
    } else {
      if (line) lines.push(line);
      line = word;
      while (line.length > maxChars) {
        lines.push(line.slice(0, maxChars));
        line = line.slice(maxChars);
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Number of lines after wrapping — uses same logic as wrapText */
export function wrappedLineCount(text: string | undefined, maxChars: number): number {
  return wrapText(text, maxChars).length;
}
