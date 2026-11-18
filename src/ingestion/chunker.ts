export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  seperators?: string[];
}

export interface DocumentChunk {
  text: string;
  index: number;
  startOffset: number;
  endOffset: number;
}

export interface IChunker {
  chunkText(text: string, options?: ChunkOptions): DocumentChunk[];
}

export class RecursiveCharacterChunker implements IChunker {
  private defaultChunkSize = 1000;
  private defaultChunkOverlap = 200;
  private defaultSeparators = ["\n\n", "\n", ". ", " ", ""];

  chunkText(text: string, options?: ChunkOptions): DocumentChunk[] {
    const chunkSize = options?.chunkSize ?? this.defaultChunkSize;
    const chunkOverlap = options?.chunkOverlap ?? this.defaultChunkOverlap;
    const seperators = options?.seperators ?? this.defaultSeparators;

    if (chunkOverlap >= chunkSize)
      throw new Error("chunkoverlap must be strictly less that chunk size");

    if (!text || text.trim().length === 0) return [];

    const pieces = this.splitTextRecursively(text, seperators, chunkSize);

    return this.mergePieces(text, pieces, chunkSize, chunkOverlap);
  }

  private splitTextRecursively(
    text: string,
    seperators: string[],
    chunkSize: number,
  ): string[] {
    if (text.length <= chunkSize) return [text];

    if (seperators.length === 0) {
      const slices: string[] = [];
      for (let i = 0; i < text.length; i += chunkSize) {
        slices.push(text.slice(i, i + chunkSize));
      }
      return slices;
    }

    let selectedSeparatorIndex = -1;
    for (let i = 0; i < seperators.length; i++) {
      const sep = seperators[i];
      if (sep === "" || text.includes(sep)) {
        selectedSeparatorIndex = i;
        break;
      }
    }

    if (selectedSeparatorIndex === -1) {
      return [text];
    }

    const sep = seperators[selectedSeparatorIndex];
    const nextSeperators = seperators.slice(selectedSeparatorIndex + 1);

    const rawSplits = sep === "" ? Array.from(text) : text.split(sep);

    const pieces: string[] = [];
    for (let i = 0; i < rawSplits.length; i++) {
      let part = rawSplits[i];

      if (sep !== "" && i < rawSplits.length - 1) {
        part += sep;
      }

      if (part.length === 0) continue;

      if (part.length <= chunkSize) {
        pieces.push(part);
      } else {
        const subPieces = this.splitTextRecursively(
          part,
          nextSeperators,
          chunkSize,
        );
        pieces.push(...subPieces);
      }
    }
    return pieces;
  }

  private mergePieces(
    originalText: string,
    pieces: string[],
    chunkSize: number,
    chunkOverlap: number,
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let currentPieces: string[] = [];
    let currentLength = 0;
    let searchCursor = 0;

    for (const piece of pieces) {
      if (piece.length === 0) continue;

      if (
        currentLength + piece.length > chunkSize &&
        currentPieces.length > 0
      ) {
        const chunkText = currentPieces.join("").trim();
        if (chunkText.length > 0) {
          const startOffset = originalText.indexOf(chunkText, searchCursor);
          const actualStart = startOffset !== -1 ? startOffset : searchCursor;

          chunks.push({
            text: chunkText,
            index: chunks.length,
            startOffset: actualStart,
            endOffset: actualStart + chunkText.length,
          });
          searchCursor = actualStart;
        }

        const overlapPieces: string[] = [];
        let overlapLength = 0;

        for (let i = currentPieces.length - 1; i >= 0; i--) {
          const p = currentPieces[i];
          if (overlapLength + p.length <= chunkOverlap) {
            overlapPieces.unshift(p);
            overlapLength += p.length;
          } else {
            break;
          }
        }
        currentPieces = overlapPieces;
        currentLength = overlapLength;
      }
      currentPieces.push(piece);
      currentLength += piece.length;
    }
    if (currentPieces.length > 0) {
      const chunkText = currentPieces.join("").trim();
      if (chunkText.length > 0) {
        const startOffset = originalText.indexOf(chunkText, searchCursor);
        const actualStart = startOffset !== -1 ? startOffset : searchCursor;
        chunks.push({
          text: chunkText,
          index: chunks.length,
          startOffset: actualStart,
          endOffset: actualStart + chunkText.length,
        });
      }
    }
    return chunks;
  }
}
