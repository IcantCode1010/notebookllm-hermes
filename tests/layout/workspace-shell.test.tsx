/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { WorkspaceShell } from "@/components/layout/WorkspaceShell";

describe("WorkspaceShell", () => {
  afterEach(() => {
    cleanup();
  });

  it("uses a fixed-height workspace layout with a wider source viewer column", () => {
    render(<WorkspaceShell />);

    const workspace = screen.getByTestId("workspace-grid");
    expect(workspace.className).toContain("lg:h-[calc(100vh-4rem)]");
    expect(workspace.className).toContain("lg:overflow-hidden");
    expect(workspace.className).toContain("lg:grid-cols-[220px_minmax(640px,1fr)_300px]");
    expect(workspace.className).toContain("xl:grid-cols-[260px_minmax(760px,1fr)_320px]");
  });
});
