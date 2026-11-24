"use client";

import React from "react";
import {
  Sparkles,
  DollarSign,
  ShieldCheck,
  Clock,
  BookOpen,
  ArrowUpRight,
} from "lucide-react";

interface WelcomeProps {
  onSelectPrompt?: (prompt: string) => void;
}

const STARTER_PROMPTS = [
  {
    icon: DollarSign,
    category: "Reimbursement Policy",
    title: "Home Office Stipend",
    prompt:
      "What is the equipment reimbursement policy and what items are eligible?",
  },
  {
    icon: ShieldCheck,
    category: "Equipment Rules",
    title: "Company Property Ownership",
    prompt:
      "What are the rules regarding company property and equipment ownership?",
  },
  {
    icon: Clock,
    category: "Eligibility & Tenure",
    title: "Tenure Requirements",
    prompt:
      "How many days of tenure are required to be eligible for home office equipment reimbursement?",
  },
  {
    icon: BookOpen,
    category: "Knowledge Synthesis",
    title: "Handbook Overview",
    prompt:
      "Summarize the key policies and guidelines found in the uploaded documents.",
  },
];

export const KnowledgeBaseWelcome: React.FC<WelcomeProps> = ({
  onSelectPrompt,
}) => {
  return (
    <div className="flex flex-col items-center justify-center max-w-2xl mx-auto px-4 py-8 text-center animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Brand Hero Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary/90 text-xs font-medium mb-4">
        <Sparkles className="size-3.5" />
        <span>Grounded RAG Assistant • Gemini + pgvector</span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-3">
        KnowledgeBase AI
      </h1>

      <p className="text-sm text-muted-foreground max-w-lg mb-8 leading-relaxed">
        Answers synthesized strictly from your uploaded enterprise documents.
        Every statement is backed by verifiable vector citations and similarity
        scores.
      </p>
    </div>
  );
};
