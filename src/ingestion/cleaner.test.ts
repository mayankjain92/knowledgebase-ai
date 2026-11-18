import { describe, it, expect } from "vitest";
import { TextCleaner } from "./cleaner.js";

describe("TextCleaner", () => {
  const cleaner = new TextCleaner();

  it("should handle empty or null inputs gracefully", () => {
    expect(cleaner.clean("")).toBe("");
  });

  it("should normalize Windows CRLF and classic Mac line endings to standard LF", () => {
    const raw = "Line 1\r\nLine 2\rLine 3\nLine 4";
    const cleaned = cleaner.clean(raw);
    expect(cleaned).toBe("Line 1\nLine 2\nLine 3\nLine 4");
  });

  it("should strip PostgreSQL-crashing null bytes and ASCII control characters", () => {
    const raw = "Safe text\x00 with null byte\x07 and bell\x1F character";
    const cleaned = cleaner.clean(raw);
    expect(cleaned).toBe("Safe text with null byte and bell character");
  });

  it("should rejoin hyphenated line wraps from PDFs", () => {
    const raw = "The trans-\nformer architecture has revo-\n  lutionized NLP.";
    const cleaned = cleaner.clean(raw);
    expect(cleaned).toBe(
      "The transformer architecture has revolutionized NLP."
    );
  });

  it("should collapse excessive spaces and limit consecutive newlines to 2", () => {
    const raw = "Paragraph 1 with   multiple    spaces.\n\n\n\n\nParagraph 2.";
    const cleaned = cleaner.clean(raw);
    expect(cleaned).toBe(
      "Paragraph 1 with multiple spaces.\n\nParagraph 2."
    );
  });
});
