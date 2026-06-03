"use client";

import { SendHorizonal } from "lucide-react";
import { useState } from "react";
import type { CitationTarget } from "@/lib/types";
import { CitationChip } from "@/components/hermes-chat/CitationChip";

type ChatCitation = {
  id: string;
  label: string;
  target: CitationTarget;
};

type ChatResponse = {
  answer: string;
  citations: ChatCitation[];
};

type HermesChatProps = {
  selectedStoreIds: string[];
  onOpenSource: (target: CitationTarget) => void;
};

export function HermesChat({ selectedStoreIds, onOpenSource }: HermesChatProps) {
  const [question, setQuestion] = useState("What powers the yellow hydraulic system?");
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function submitQuestion() {
    setIsLoading(true);
    try {
      const result = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, storeIds: selectedStoreIds })
      });
      setResponse(await result.json());
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <aside className="bg-white">
      <div className="border-b border-cockpit-line p-4">
        <h2 className="text-sm font-semibold text-cockpit-navy">Hermes chat</h2>
        <p className="text-xs text-slate-600">Grounded answers with source citations</p>
      </div>

      <div className="space-y-4 p-4">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          className="min-h-28 w-full resize-none rounded-md border border-cockpit-line p-3 text-sm outline-none focus:border-cockpit-blue"
        />
        <button
          type="button"
          onClick={submitQuestion}
          disabled={isLoading || question.trim().length === 0 || selectedStoreIds.length === 0}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-cockpit-blue px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          <SendHorizonal className="h-4 w-4" />
          {isLoading ? "Asking Hermes" : "Ask Hermes"}
        </button>

        <div className="rounded-md border border-cockpit-line bg-cockpit-panel p-3 text-xs text-slate-600">
          Selected stores: {selectedStoreIds.join(", ")}
        </div>

        {response ? (
          <div className="rounded-md border border-cockpit-line p-4">
            <div className="text-sm leading-6 text-slate-800">{response.answer}</div>
            {response.citations.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {response.citations.map((citation) => (
                  <CitationChip
                    key={citation.id}
                    label={citation.label}
                    target={citation.target}
                    onOpenSource={onOpenSource}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-cockpit-line p-4 text-sm text-slate-600">
            Ask a question to retrieve scoped evidence and generate a cited answer.
          </div>
        )}
      </div>
    </aside>
  );
}
