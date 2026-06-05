"use client";

import { SendHorizonal } from "lucide-react";
import React from "react";
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
  events?: { label: string; status: string }[];
  toolCalls?: { name: string; status: string; summary: string }[];
};

type HermesChatProps = {
  selectedStoreIds: string[];
  onOpenSource: (target: CitationTarget) => void;
};

export function HermesChat({ selectedStoreIds, onOpenSource }: HermesChatProps) {
  const [question, setQuestion] = useState("What does hydraulic system A power?");
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
    <aside className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-cockpit-line p-4">
        <h2 className="text-sm font-semibold text-cockpit-navy">Hermes chat</h2>
        <p className="text-xs text-slate-600">Grounded answers with source citations</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          className="min-h-24 w-full shrink-0 resize-none rounded-md border border-cockpit-line p-3 text-sm outline-none focus:border-cockpit-blue"
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

        <div className="shrink-0 rounded-md border border-cockpit-line bg-cockpit-panel p-3 text-xs text-slate-600">
          Selected stores: {selectedStoreIds.join(", ")}
        </div>

        {response ? (
          <div
            data-testid="hermes-response-window"
            className="min-h-0 max-h-[calc(100vh-22rem)] flex-1 overflow-y-auto rounded-md border border-cockpit-line p-4"
          >
            {response.events && response.events.length > 0 ? (
              <div className="mb-4 rounded-md border border-cockpit-line bg-cockpit-panel p-3">
                <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Hermes activity</div>
                <div className="space-y-2">
                  {response.events.map((event) => {
                    const matchingToolCall = response.toolCalls?.find((toolCall) => toolCallLabel(toolCall.name) === event.label);
                    return (
                      <div key={event.label} className="rounded border border-cockpit-line bg-white p-2">
                        <div className="text-xs font-semibold text-cockpit-navy">{event.label}</div>
                        {matchingToolCall ? (
                          <div className="mt-1 text-xs text-slate-600">{matchingToolCall.summary}</div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
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

function toolCallLabel(toolName: string) {
  if (toolName === "searchApprovedSources") {
    return "Search approved sources";
  }

  if (toolName === "searchHybridEvidence") {
    return "Search vector store";
  }

  if (toolName === "validateCitationTargets") {
    return "Validate citations";
  }

  return "";
}
