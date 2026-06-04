# Hermes Chat UI Design

Last updated: 2026-06-04

## Purpose

The Hermes chat UI is the operator-facing workspace for asking aircraft-specific questions, reviewing grounded Hermes answers, and opening cited source material. It should feel like a controlled aviation document console, not a general chatbot or marketing interface.

The core loop is:

```text
Select aircraft store -> ask Hermes -> retrieve scoped RAGFlow evidence -> show cited answer -> open citation in source viewer
```

## Design Principles

- Scope is always visible. The user must know which aircraft stores are active before submitting a question.
- Citations are first-class controls, not passive footnotes.
- The center source viewer is the evidence surface; the chat panel is the reasoning and navigation surface.
- End users can read, ask, compare, and inspect. They cannot upload, register, approve, edit, archive, or delete documents.
- RAGFlow and Hermes credentials stay server-side. Browser code talks only to this app's API routes.
- The UI should be compact, scan-friendly, and useful for repeated work.

## Recommended Layout

Use the existing three-pane shell as the primary desktop layout, with a slim product rail on the far left when there is enough horizontal space:

```text
+----------+----------------------+-------------------------------+---------------------------+
| Rail     | Aircraft Stores       | Source Viewer                 | Hermes Chat               |
|          |                      |                               |                           |
| Stores   | Search/filter         | Source tabs                   | Assistant header/actions  |
| Sources  | Aircraft store cards  | PDF/image toolbar             | Message stream            |
| Chats    | Approved documents    | Active citation highlight     | Suggested prompts         |
| Settings | Storage/status admin  | Annotation controls           | Quick actions/composer    |
+----------+----------------------+-------------------------------+---------------------------+
```

Desktop column behavior:

- Product rail: fixed width around 64-72px.
- Left pane: fixed width around 280px.
- Center pane: flexible, largest workspace.
- Right pane: fixed width around 390-430px.

Mobile behavior:

- Collapse into stacked sections in this order: store scope, chat, source viewer.
- Keep the active store and active citation visible near the chat controls.
- Avoid hiding citation controls behind hover-only interactions.

NotebookLLM inspiration to adapt:

- The app should use the same general mental model: source library on the left, document viewer in the center, assistant on the right.
- The left pane can combine aircraft stores and approved documents, but it must preserve the aircraft scope controls that make Hermes safe for aviation use.
- The center viewer should support source tabs, page navigation, zoom controls, citation highlights, and document-level tools.
- The chat pane should include an assistant intro state, user and assistant message bubbles, suggested prompts, quick action chips, and a grounded status indicator.
- Visual polish should come from spacing, hierarchy, icons, and state clarity rather than decorative backgrounds.

## Primary Components

### `WorkspaceShell`

Owns cross-pane state:

- `selectedStoreIds`
- `activeCitation`
- future `activeSessionId`
- future `activeDocumentId`

It composes:

- `StoreNavigator`
- `SourceViewer`
- `HermesChat`

The shell should stay thin. It coordinates state but should not contain retrieval, Hermes, or source-rendering logic.

### `StoreNavigator`

Purpose: choose the retrieval scope.

Required behaviors:

- Provide search/filter for aircraft stores and approved documents.
- Single-click aircraft store selection for normal use.
- Explicit comparison mode using checkboxes or toggles.
- Show aircraft code, dataset identity, document count, and status.
- Keep the active aircraft store card visually selected.
- Show only approved/published documents to end users.
- Show document file type, size when known, upload/approval time when known, and per-document overflow actions only where permissions allow.
- Make multi-store selection visually distinct so comparison is intentional.

Do not put admin upload or document mutation controls in this component for end users.

The NotebookLLM-style "Notebooks" list maps to aircraft stores. The "Documents" list maps to approved source documents inside the selected aircraft store.

### `HermesChat`

Purpose: ask scoped questions and present grounded answers.

Required sections:

- Assistant header with title, status, and compact actions such as pin, clear, or menu.
- Scope summary: selected aircraft stores and whether comparison is active.
- Question composer: multiline input with submit button.
- Response area: answer, citations, and retrieval status.
- Message history: eventually grouped by question/answer turns.
- Suggested prompts based on the selected aircraft store and active document.
- Quick action chips: Summarize, Key points, Explain, Compare.
- Error and empty states: no selected store, no evidence found, Hermes unavailable, RAGFlow unavailable.

Interaction details:

- Disable submit when no store is selected or the question is empty.
- On submit, call `/api/chat` with `{ question, storeIds }`.
- Suggested prompts and quick actions prefill or submit structured questions using the selected source scope.
- Show retrieval/generation progress as distinct states when backend support exists.
- Preserve the last answer while a new answer is loading only if the pending state is clear.
- Show a small "Grounded" status when the current answer was generated from retrieved evidence.
- Show source count in the composer footer, for example `Sources: 5 documents`.
- Do not show raw model/provider errors to end users.

### `CitationChip`

Purpose: open evidence in the center viewer.

Each citation should include:

- short source label
- document title or abbreviation
- page number when available
- aircraft code when comparing stores

Click behavior:

- Calls `onOpenSource(target)`.
- Sets `activeCitation` in `WorkspaceShell`.
- Moves the `SourceViewer` to the cited document/page/image.
- Applies a highlight when bounding-box metadata exists.
- Offers lightweight message actions near assistant responses, such as copy, thumbs up, and thumbs down, without changing citation behavior.

### `SourceViewer`

Purpose: inspect the source behind citations.

Required behaviors:

- Open source tabs for active documents, allowing the user to switch between recently viewed sources.
- Open a document overview when no citation is active.
- Open the cited page for PDF targets.
- Open the cited image for image targets.
- Highlight the cited region when bounding-box metadata exists.
- Show an explicit message when metadata is incomplete.
- Provide a source toolbar with page controls, zoom, fullscreen, annotation, comment, and more menu affordances where supported.
- Keep annotation tools visually secondary to citation navigation for MVP.

Implementation target:

- PDF documents: PDF.js.
- Large images or diagrams: OpenSeadragon.
- Missing or unsupported source: structured fallback panel with source metadata.

## Data Flow

```text
User question
  -> HermesChat
  -> POST /api/chat
  -> server validates selected stores
  -> server retrieves grouped evidence from RAGFlow
  -> server sends question + evidence to Hermes
  -> server normalizes answer citations
  -> HermesChat renders answer
  -> CitationChip opens SourceViewer target
```

Important boundary:

- `/api/chat` owns orchestration.
- `/api/retrieve` owns retrieval normalization.
- `lib/ragflow/` should own RAGFlow API calls.
- future `lib/hermes/` should own Hermes API calls.
- Client components should never know RAGFlow dataset IDs unless they are already public app metadata.

## Answer Model

The UI expects chat responses shaped like:

```ts
type ChatResponse = {
  answer: string;
  citations: Array<{
    id: string;
    label: string;
    target: {
      documentId: string;
      pageNumber?: number;
      boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      imageId?: string;
    };
  }>;
  groups?: GroupedEvidence[];
};
```

Every visible citation must resolve to a viewer action. If the backend cannot resolve a citation, the UI should show it as unavailable instead of creating a dead click target.

## UI States

### Product Rail

- Normal: show icon buttons for aircraft stores, sources, chats, and settings.
- Active section: use text plus selected state, not color alone.
- Restricted section: hide or disable admin-only destinations depending on the user's role.

### Store Scope

- No selected store: disable chat submit and ask the user to choose an aircraft store.
- One selected store: normal scoped retrieval.
- Multiple selected stores: comparison mode, grouped evidence, aircraft labels on answer sections and citations.

### Chat

- Empty: show an assistant intro card and recent example questions.
- Loading: show request state without clearing the composer.
- Answered: show answer with citation chips immediately below relevant answer text or in a citation strip.
- Suggested prompts: show three to four context-aware prompts, each as a single-line button with a send icon.
- Quick actions: show compact chips for Summarize, Key points, Explain, and Compare.
- No evidence: explain that the selected source set did not return matching evidence.
- Error: show a short operational message and keep the question available for retry.

### Source Viewer

- No documents: prompt to select an approved document.
- Document selected: show source overview.
- Citation selected: navigate to page/image and highlight when possible.
- Tab selected: show the selected source tab and keep citation state if still relevant.
- Missing page or bounds: open the closest available document location and disclose that exact highlight metadata is missing.

## Visual Direction

Use a restrained cockpit/workbench style:

- White and pale blue-gray surfaces.
- Navy text for primary labels.
- Blue for selected scope and primary actions.
- Soft blue answer bubbles are acceptable for user messages.
- Assistant cards should remain white with subtle borders and light shadow.
- Suggested prompt rows should be pale blue-gray with an icon send affordance.
- Quick action chips may use restrained category colors, but they should not dominate the panel.
- Amber only for attention states such as missing highlight metadata.
- Eight-pixel or smaller radii.
- Dense spacing, readable typography, and stable pane dimensions.

Avoid:

- hero sections
- decorative gradients
- nested cards
- oversized marketing copy
- decorative illustration in the workspace
- client-side secret exposure

## Accessibility

- Buttons must have clear text or icons with accessible labels.
- Citation chips must be keyboard-focusable.
- Loading state must be announced through text, not color only.
- Selected aircraft stores must be visible through text and state styling.
- Error messages must identify the failed operation and the next user action.

## Security And Permissions

End-user UI must not expose:

- upload controls
- document approval controls
- archive/delete controls
- raw RAGFlow API key
- raw Hermes API key
- direct RAGFlow API calls from browser code

Admin workflows belong in a separate admin surface with RBAC tests before release.

## Implementation Notes

Near-term implementation should build on the current component structure:

- Keep `WorkspaceShell` as the state coordinator.
- Expand `HermesChat` into smaller subcomponents once message history, progress, and errors are added.
- Add `lib/ragflow/` for the local RAGFlow adapter.
- Add adapter tests before replacing mock evidence.
- Keep `/api/chat` as the only client-facing answer-generation route.

Recommended next order:

1. Normalize live RAGFlow retrieval into `GroupedEvidence`.
2. Add typed error states to `/api/retrieve` and `/api/chat`.
3. Update `HermesChat` to render loading, no-evidence, and error states.
4. Add suggested prompts, quick action chips, source count, and grounded status to the chat composer.
5. Add source tabs and PDF/image toolbar affordances to the source viewer.
6. Add citation resolution tests against live-shaped RAGFlow metadata.
7. Replace the interim source viewer panel with PDF.js/OpenSeadragon.

## Testing

Required coverage:

- Unit tests for RAGFlow response normalization.
- Unit tests for citation target resolution.
- API tests for unknown store IDs and empty retrieval results.
- Component tests for disabled submit, error state, no-evidence state, and citation click behavior.
- End-to-end test for the MVP loop:

```text
select aircraft -> ask question -> receive cited answer -> click citation -> source viewer opens target
```

## Open Design Decisions

- Whether answer citations appear inline next to claims or as a grouped citation strip below each answer.
- Whether chat history is required for MVP or can remain single-turn until live retrieval is stable.
- Whether source PDFs/images are served through app-controlled URLs, RAGFlow URLs, or object storage URLs.
- How much aircraft comparison formatting Hermes should return versus how much the app should impose.
