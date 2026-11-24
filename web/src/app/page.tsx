"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { KnowledgeBaseWelcome } from "@/components/assistant-ui/knowledgebase-welcome";
import { ragChatAdapter } from "@/lib/rag-chat-adapter";
import {
  Database,
  UploadCloud,
  FileText,
  FileCode,
  File,
  Trash2,
  RotateCcw,
  Menu,
  X,
  Search,
  Layers,
  Loader2,
  Sparkles,
} from "lucide-react";

export interface IDocuments {
  id: string;
  title: string;
  format: string;
  total_pages: number;
  chunk_count: number;
  created_at: string;
}

const URL = process.env.NEXT_PUBLIC_BACKEND_URL;

function getFormatBadge(format: string) {
  const f = format.toLowerCase();
  if (f === "pdf") {
    return {
      label: "PDF",
      className: "bg-rose-500/10 text-rose-400",
      icon: FileText,
    };
  }
  if (f === "docx") {
    return {
      label: "DOCX",
      className: "bg-sky-500/10 text-sky-400",
      icon: FileText,
    };
  }
  if (f === "md" || f === "markdown") {
    return {
      label: "MD",
      className: "bg-violet-500/10 text-violet-400",
      icon: FileCode,
    };
  }
  return {
    label: "TXT",
    className: "bg-emerald-500/10 text-emerald-400",
    icon: File,
  };
}

export default function Page() {
  const [documents, setDocuments] = useState<IDocuments[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // assistant-ui local streaming runtime powered by our Express pgvector RAG backend
  const runtime = useLocalRuntime(ragChatAdapter);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${URL}/documents`);
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error("Unable to fetch documents:", error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDocuments();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${URL}/documents/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        await fetchDocuments();
      } else {
        alert(data.error || "Upload failed.");
      }
    } catch (error) {
      console.error("Failed to upload:", error);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (
      !confirm(
        `Delete "${title}"? All associated vector embeddings will be removed from pgvector.`
      )
    )
      return;
    try {
      const res = await fetch(`${URL}/documents/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const handleNewChat = () => {
    try {
      runtime.thread.reset?.();
    } catch {
      window.location.reload();
    }
  };

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    return documents.filter((doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [documents, searchQuery]);

  const totalChunks = documents.reduce(
    (sum, d) => sum + (d.chunk_count || 0),
    0
  );

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar: Ingestion & Document Knowledge Base */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-80 bg-sidebar border-r border-sidebar-border/40 flex flex-col transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="p-4 border-b border-sidebar-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary/80">
              <Database className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-sidebar-foreground tracking-tight">
                Knowledge Base
              </h2>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
                pgvector Store
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-sidebar-accent"
            aria-label="Close sidebar"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Upload Zone */}
        <div className="p-4 pb-3">
          <label
            className={`group relative flex flex-col items-center justify-center p-3.5 border border-dashed rounded-xl cursor-pointer transition-all ${
              isUploading
                ? "border-primary/40 bg-primary/5 pointer-events-none"
                : "border-sidebar-border/50 hover:border-sidebar-border hover:bg-sidebar-accent/30"
            }`}
          >
            <input
              type="file"
              accept=".pdf,.md,.txt,.docx"
              disabled={isUploading}
              onChange={handleUpload}
              className="hidden"
            />
            {isUploading ? (
              <div className="flex flex-col items-center gap-1.5 py-1">
                <Loader2 className="size-5 text-primary/80 animate-spin" />
                <span className="text-xs font-medium text-foreground">
                  Embedding into pgvector...
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Parsing & 768-d chunk embedding
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary/80 group-hover:scale-105 transition-transform">
                  <UploadCloud className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-sidebar-foreground">
                    Upload Document
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Click to browse (.pdf, .docx, .md, .txt)
                  </p>
                </div>
              </div>
            )}
          </label>
        </div>

        {/* Document Stats & Search */}
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="font-medium text-sidebar-foreground flex items-center gap-1.5">
              <Layers className="size-3.5" />
              Documents ({documents.length})
            </span>
            <span className="text-[11px] bg-sidebar-accent/40 px-2 py-0.5 rounded-full border border-sidebar-border/30">
              {totalChunks} chunks
            </span>
          </div>

          {documents.length > 2 && (
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-sidebar-accent/30 border border-sidebar-border/40 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-foreground/90 placeholder:text-muted-foreground/50 outline-none focus:border-sidebar-border/70 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Document Cards List */}
        <div className="flex-1 overflow-y-auto px-4 space-y-2 pr-2">
          {documents.length === 0 ? (
            <div className="text-center py-10 px-2 border border-dashed border-sidebar-border/30 rounded-xl mt-2">
              <FileText className="size-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs font-medium text-sidebar-foreground">
                No documents indexed
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px] mx-auto">
                Upload PDF, DOCX, MD, or TXT files to ground your queries.
              </p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No matching documents.
            </p>
          ) : (
            filteredDocuments.map((doc) => {
              const badge = getFormatBadge(doc.format);
              const BadgeIcon = badge.icon;
              return (
                <div
                  key={doc.id}
                  className="group relative p-2.5 bg-sidebar-accent/20 hover:bg-sidebar-accent/50 border border-sidebar-border/40 rounded-xl flex items-start justify-between transition-colors"
                >
                  <div className="min-w-0 flex-1 mr-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium px-1.5 py-0.2 rounded ${badge.className}`}
                      >
                        <BadgeIcon className="size-2.5" />
                        {badge.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {doc.chunk_count} chunks
                      </span>
                    </div>
                    <p
                      className="text-xs font-medium text-sidebar-foreground truncate"
                      title={doc.title}
                    >
                      {doc.title}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id, doc.title)}
                    className="opacity-50 group-hover:opacity-100 hover:text-destructive text-muted-foreground p-1 rounded-md hover:bg-destructive/10 transition cursor-pointer"
                    title="Delete document and its vector embeddings"
                    aria-label={`Delete ${doc.title}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-sidebar-border/40 bg-sidebar-accent/10">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500/80" />
              pgvector 768-d
            </span>
            <span>Gemini Embeddings</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Area Powered by assistant-ui */}
      <main className="flex-1 flex flex-col h-full bg-background overflow-hidden">
        {/* Top Navbar Header */}
        <header className="h-14 border-b border-border/40 px-4 flex items-center justify-between bg-background/50 backdrop-blur-md z-20 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg border border-border/40 bg-secondary/30 text-foreground cursor-pointer"
              aria-label="Open documents sidebar"
            >
              <Menu className="size-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-md bg-primary/10 flex items-center justify-center text-primary/80">
                <Sparkles className="size-3.5" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground/90">
                KnowledgeBase AI
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-secondary/40 text-secondary-foreground border border-border/30">
                Grounded Retrieval
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground px-2.5 py-1 rounded-full bg-secondary/30 border border-border/30">
              <span className="size-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
              {documents.length} docs active
            </span>
            <button
              onClick={handleNewChat}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 bg-secondary/30 hover:bg-secondary/60 text-foreground/90 text-xs font-medium transition cursor-pointer"
              title="Reset conversation"
            >
              <RotateCcw className="size-3.5" />
              <span>New Chat</span>
            </button>
          </div>
        </header>

        {/* assistant-ui Thread Component with Custom Welcome */}
        <div className="flex-1 h-[calc(100vh-3.5rem)] overflow-hidden">
          <AssistantRuntimeProvider runtime={runtime}>
            <Thread
              components={{
                Welcome: () => (
                  <KnowledgeBaseWelcome
                    onSelectPrompt={(prompt) => {
                      runtime.thread.append({
                        role: "user",
                        content: [{ type: "text", text: prompt }],
                      });
                    }}
                  />
                ),
              }}
            />
          </AssistantRuntimeProvider>
        </div>
      </main>
    </div>
  );
}
