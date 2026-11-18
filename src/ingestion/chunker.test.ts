import { describe, it, expect } from "vitest";
import { RecursiveCharacterChunker } from "./chunker.js";

describe("RecursiveCharacterChunker", () => {
  const chunker = new RecursiveCharacterChunker();

  it("should return an empty array for empty or whitespace-only text", () => {
    expect(chunker.chunkText("")).toEqual([]);
    expect(chunker.chunkText("   \n\n   ")).toEqual([]);
  });

  it("should return a single chunk if text is smaller than chunkSize", () => {
    const text = "A short sentence that fits well within the limit.";
    const chunks = chunker.chunkText(text, { chunkSize: 100, chunkOverlap: 20 });

    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe(text);
    expect(chunks[0].index).toBe(0);
    expect(chunks[0].startOffset).toBe(0);
    expect(chunks[0].endOffset).toBe(text.length);
  });

  it("should split at paragraph boundaries (\\n\\n) when possible", () => {
    const para1 = "Paragraph 1 is about database indexing and performance.";
    const para2 = "Paragraph 2 discusses vector similarities and embeddings.";
    const text = `${para1}\n\n${para2}`;

    // Set chunkSize small enough to force a split at paragraphs
    const chunks = chunker.chunkText(text, { chunkSize: 65, chunkOverlap: 0 });

    expect(chunks).toHaveLength(2);
    expect(chunks[0].text).toBe(para1);
    expect(chunks[1].text).toBe(para2);
    expect(chunks[0].index).toBe(0);
    expect(chunks[1].index).toBe(1);
  });

  it("should retain overlap between consecutive chunks", () => {
    const sentence1 = "The first sentence establishes the initial premise.";
    const sentence2 = "The second sentence introduces a crucial secondary fact.";
    const sentence3 = "The third sentence concludes the analytical discussion.";
    const text = `${sentence1} ${sentence2} ${sentence3}`;

    // Overlap large enough to include sentence2 in both chunk 1 and chunk 2
    const chunks = chunker.chunkText(text, {
      chunkSize: 115,
      chunkOverlap: 65,
      seperators: [". ", " ", ""],
    });

    expect(chunks.length).toBeGreaterThan(1);
    // Verify that the start of chunk 2 contains the end of chunk 1
    expect(chunks[0].text).toContain(sentence2);
    expect(chunks[1].text).toContain(sentence2);
  });

  it("should track accurate startOffset and endOffset matching original text", () => {
    const text = "Alpha beta gamma.\n\nDelta epsilon zeta.\n\nEta theta iota.";
    const chunks = chunker.chunkText(text, { chunkSize: 30, chunkOverlap: 10 });

    expect(chunks.length).toBeGreaterThan(1);

    for (const chunk of chunks) {
      const slice = text.slice(chunk.startOffset, chunk.endOffset);
      expect(slice).toBe(chunk.text);
    }
  });

  it("should throw an error if chunkOverlap is greater than or equal to chunkSize", () => {
    expect(() =>
      chunker.chunkText("Some text", { chunkSize: 100, chunkOverlap: 100 })
    ).toThrow("chunkoverlap must be strictly less that chunk size");

    expect(() =>
      chunker.chunkText("Some text", { chunkSize: 100, chunkOverlap: 150 })
    ).toThrow("chunkoverlap must be strictly less that chunk size");
  });
});
