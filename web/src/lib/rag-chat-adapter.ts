import type { ChatModelAdapter } from "@assistant-ui/react";

const URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface Citation {
  id: string;
  documentId: string;
  text: string;
  similarity: number;
  metadata?: {
    title?: string;
  };
}

// Helper to transform citation brackets [1, 2, 3] into interactive anchors [1](#source-1)
function linkifyCitations(text: string): string {
  return text.replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (_, group: string) => {
    return group
      .split(/\s*,\s*/)
      .map((n: string) => `[${n}](#source-${n})`)
      .join(" ");
  });
}

export const ragChatAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const lastUserMessage = messages
      .filter((m) => m.role === "user")
      .pop();

    const query =
      lastUserMessage?.content
        ?.filter((c) => c.type === "text")
        ?.map((c) => (c as { type: "text"; text: string }).text)
        ?.join(" ") || "";

    if (!query) return;

    const response = await fetch(`${URL}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: abortSignal,
    });

    if (!response.ok || !response.body) {
      throw new Error("Failed to connect to chat stream endpoint");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";
    let citations: Citation[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          if (block.startsWith("event: citations")) {
            const dataStr = block.replace("event: citations\ndata: ", "").trim();
            if (dataStr) {
              try {
                citations = JSON.parse(dataStr);
              } catch {
                // ignore malformed citation json
              }
            }
          } else if (block.startsWith("event: token")) {
            const dataStr = block.replace("event: token\ndata: ", "").trim();
            if (dataStr) {
              try {
                const { text } = JSON.parse(dataStr);
                fullText += text;
                yield {
                  content: [{ type: "text", text: linkifyCitations(fullText) }],
                };
              } catch {
                // ignore malformed token json
              }
            }
          }
        }
      }

      // If citations were returned, append a clean markdown sources section with anchor IDs
      if (citations.length > 0 && !fullText.includes("I cannot find")) {
        const sourcesMarkdown =
          "\n\n---\n### 📚 Referenced Sources\n\n" +
          citations
            .map((c: Citation, i: number) => {
              const matchPct = Math.round(c.similarity * 100);
              const title = c.metadata?.title || c.documentId || "Document";
              const cleanSnippet = c.text.replace(/\n+/g, " ").trim();
              return `> **[Source ${i + 1}](#source-${i + 1})** \`${title}\` • **${matchPct}% match**\n>\n> "${cleanSnippet}"`;
            })
            .join("\n\n");

        yield {
          content: [
            { type: "text", text: linkifyCitations(fullText) + sourcesMarkdown },
          ],
        };
      }
    } finally {
      reader.releaseLock();
    }
  },
};
