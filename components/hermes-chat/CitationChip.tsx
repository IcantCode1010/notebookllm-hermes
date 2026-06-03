"use client";

import { ExternalLink } from "lucide-react";
import type { CitationTarget } from "@/lib/types";

type CitationChipProps = {
  label: string;
  target: CitationTarget;
  onOpenSource: (target: CitationTarget) => void;
};

export function CitationChip({ label, target, onOpenSource }: CitationChipProps) {
  return (
    <button
      type="button"
      onClick={() => onOpenSource(target)}
      className="inline-flex items-center gap-1 rounded-md border border-cockpit-line bg-white px-2 py-1 text-xs font-semibold text-cockpit-blue hover:bg-blue-50"
    >
      <ExternalLink className="h-3 w-3" />
      {label}
    </button>
  );
}
