import { PDFParse } from "pdf-parse";
import { IngestionDocument } from "./pipeline.js";

export type SupportedFormat = "txt" | "md" | "pdf";

export interface ParsedDocument {
  id: string;
  title: string;
  content: string;
  format: SupportedFormat;
  totalPages?: number;
  metadata?: Record<string, unknown>;
}

export interface IDocumentParser {
  parse(buffer: Buffer, filename: string): Promise<ParsedDocument>;
  toIngestionDocument(parsed: ParsedDocument): IngestionDocument;
}

export class DocumentParser implements IDocumentParser {
  /**
   * Parses a file buffer based on its extension (.txt, .md, .pdf)
   */
  async parse(buffer: Buffer, filename: string): Promise<ParsedDocument> {
    if (!buffer || buffer.length === 0) {
      throw new Error(`Cannot parse empty buffer for file: ${filename}`);
    }

    const format = this.detectFormat(filename);
    const title = this.extractTitle(filename);
    const id = `doc_${Date.now()}_${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

    if (format === "txt" || format === "md") {
      const content = buffer.toString("utf-8");
      return {
        id,
        title,
        content,
        format,
        totalPages: 1,
        metadata: {
          filename,
          sizeBytes: buffer.length,
        },
      };
    }

    if (format === "pdf") {
      return this.parsePdf(buffer, id, title, filename);
    }

    throw new Error(`Unsupported file format for: ${filename}`);
  }

  /**
   * Converts a ParsedDocument into an IngestionDocument ready for the IngestionPipeline
   */
  toIngestionDocument(parsed: ParsedDocument): IngestionDocument {
    return {
      id: parsed.id,
      title: parsed.title,
      content: parsed.content,
      metadata: {
        format: parsed.format,
        totalPages: parsed.totalPages,
        ...parsed.metadata,
      },
    };
  }

  private async parsePdf(
    buffer: Buffer,
    id: string,
    title: string,
    filename: string
  ): Promise<ParsedDocument> {
    const parser = new PDFParse({ data: buffer });

    try {
      const textResult = await parser.getText();
      const info = await parser.getInfo().catch(() => undefined);

      return {
        id,
        title,
        content: textResult.text,
        format: "pdf",
        totalPages: textResult.pages?.length ?? 1,
        metadata: {
          filename,
          sizeBytes: buffer.length,
          author: (info as any)?.author,
          creationDate: (info as any)?.creationDate,
        },
      };
    } finally {
      await parser.destroy();
    }
  }

  private detectFormat(filename: string): SupportedFormat {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext === "md" || ext === "markdown") return "md";
    if (ext === "pdf") return "pdf";
    if (ext === "txt") return "txt";

    return "txt";
  }

  private extractTitle(filename: string): string {
    const withoutExt = filename.replace(/\.[^/.]+$/, "");
    return withoutExt.trim() || "Untitled Document";
  }
}
