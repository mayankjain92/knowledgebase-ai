import { describe, it, expect } from "vitest";
import { DocumentParser } from "./parser.js";

describe("DocumentParser", () => {
  const parser = new DocumentParser();

  it("should parse plain text and markdown buffers correctly", async () => {
    const textBuffer = Buffer.from("Hello world, this is a plain text document.");
    const parsed = await parser.parse(textBuffer, "notes.txt");

    expect(parsed.title).toBe("notes");
    expect(parsed.format).toBe("txt");
    expect(parsed.content).toBe("Hello world, this is a plain text document.");
    expect(parsed.totalPages).toBe(1);

    const mdBuffer = Buffer.from("# Title\n\nThis is a markdown document.");
    const parsedMd = await parser.parse(mdBuffer, "guide.md");

    expect(parsedMd.title).toBe("guide");
    expect(parsedMd.format).toBe("md");
    expect(parsedMd.content).toContain("# Title");
  });

  it("should throw an error for empty buffers", async () => {
    const empty = Buffer.alloc(0);
    await expect(parser.parse(empty, "empty.txt")).rejects.toThrow(
      "Cannot parse empty buffer"
    );
  });

  it("should convert ParsedDocument to IngestionDocument schema", async () => {
    const buffer = Buffer.from("Sample text");
    const parsed = await parser.parse(buffer, "sample.txt");
    const ingestionDoc = parser.toIngestionDocument(parsed);

    expect(ingestionDoc.id).toBe(parsed.id);
    expect(ingestionDoc.title).toBe(parsed.title);
    expect(ingestionDoc.content).toBe(parsed.content);
    expect(ingestionDoc.metadata?.format).toBe("txt");
  });
});
