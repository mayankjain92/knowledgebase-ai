/**
 * Text Sanitizer & Cleaner
 *
 * Pre-processes raw extracted text before chunking and embedding.
 * Strips database-breaking characters (like PostgreSQL null bytes),
 * normalizes line endings, rejoins hyphenated line breaks, and collapses excess whitespace.
 */

export interface CleanerOptions {
  /** Convert \r\n and \r to standard \n (default: true) */
  normalizeLineBreaks?: boolean;
  /** Remove null bytes (\x00) and non-printable control characters (default: true) */
  stripControlChars?: boolean;
  /** Rejoin words broken across line wraps (e.g. 'multi-\nple' -> 'multiple') (default: true) */
  rejoinHyphenatedWords?: boolean;
  /** Collapse consecutive horizontal spaces and limit consecutive newlines to 2 (default: true) */
  collapseWhitespace?: boolean;
}

export interface ITextCleaner {
  clean(text: string, options?: CleanerOptions): string;
}

export class TextCleaner implements ITextCleaner {
  clean(text: string, options?: CleanerOptions): string {
    if (!text || text.length === 0) {
      return "";
    }

    const normalizeLineBreaks = options?.normalizeLineBreaks ?? true;
    const stripControlChars = options?.stripControlChars ?? true;
    const rejoinHyphenatedWords = options?.rejoinHyphenatedWords ?? true;
    const collapseWhitespace = options?.collapseWhitespace ?? true;

    let result = text;

    // 1. Normalize line endings to standard Unix \n
    if (normalizeLineBreaks) {
      result = result.replace(/\r\n|\r/g, "\n");
    }

    // 2. Strip null bytes (\x00) and non-printable ASCII control characters
    // Preserves standard tabs (\t = 0x09) and newlines (\n = 0x0A)
    if (stripControlChars) {
      result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
    }

    // 3. Rejoin hyphenated words split across line breaks (common in PDFs)
    if (rejoinHyphenatedWords) {
      result = result.replace(/(\w+)-\s*\n\s*(\w+)/g, "$1$2");
    }

    // 4. Collapse whitespace
    if (collapseWhitespace) {
      // Collapse multiple horizontal spaces and tabs into a single space
      result = result.replace(/[^\S\r\n]+/g, " ");

      // Trim whitespace from the start and end of each line
      result = result
        .split("\n")
        .map((line) => line.trim())
        .join("\n");

      // Limit consecutive newlines to at most 2 (preserving paragraph structure)
      result = result.replace(/\n{3,}/g, "\n\n");
    }

    return result.trim();
  }
}
