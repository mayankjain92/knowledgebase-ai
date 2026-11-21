import { Request, Response } from "express";
import { ragEngine } from "../services.js";

export const chat = async (req: Request, res: Response) => {
  try {
    const { query, topK, documentId } = req.body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ error: "Query is required" });
    }

    const response = await ragEngine.answer(query, {
      topK: topK ? Number(topK) : undefined,
      documentId: documentId ? String(documentId) : undefined,
    });

    return res.json({ success: true, ...response });
  } catch (err: any) {
    console.error("Chat error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to process query" });
  }
};

export const chatStream = async (req: Request, res: Response) => {
  try {
    const { query, topK, documentId } = req.body;
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ error: "Query is required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const { citations, stream } = await ragEngine.answerStream(query, {
      topK: topK ? Number(topK) : undefined,
      documentId: documentId ? String(documentId) : undefined,
    });

    // 1. Send citations first
    res.write(`event: citations\ndata: ${JSON.stringify(citations)}\n\n`);

    // 2. If no chunks found, stream is null
    if (!stream) {
      res.write(
        `event: token\ndata: ${JSON.stringify({
          text: "I cannot find any relevant documents in the knowledge base to answer your question.",
        })}\n\n`,
      );
      res.write(`event: done\ndata: {}\n\n`);
      return res.end();
    }

    // 3. Stream generated tokens in real time
    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(
          `event: token\ndata: ${JSON.stringify({ text: chunk.text })}\n\n`,
        );
      }
    }

    // 4. Signal stream completion
    res.write(`event: done\ndata: {}\n\n`);
    res.end();
  } catch (err: any) {
    console.error("Chat stream error:", err);
    if (!res.headersSent) {
      return res
        .status(500)
        .json({ error: err.message || "Streaming failed" });
    }
    res.write(
      `event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`,
    );
    res.end();
  }
};
