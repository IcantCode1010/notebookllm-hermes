# Hermes Aviation Notebook PRD Tracking

Last updated: 2026-06-03

## Product Goal

Build a controlled, aviation-specific NotebookLM-style workspace where approved users can select aircraft knowledge stores, ask Hermes questions, receive cited answers, and open the cited PDF/image source in the center viewer.

## Critical MVP Loop

```text
Select aircraft -> ask Hermes -> retrieve evidence -> answer with citations -> click citation -> view source
```

## Current Baseline

Status: Scaffold created

Repository baseline includes:

- Next.js 15, React 19, TypeScript, Tailwind CSS
- Three-pane workspace shell
- Mock A320 and B737 NG aircraft stores
- Mock source documents and evidence
- Retrieval and chat API route shapes
- Citation-to-source target resolution
- Prisma schema draft
- Architecture and API contract docs
- Unit tests for retrieval grouping and citation resolution

## Release Criteria

- [ ] Users can select one aircraft store and ask Hermes a question.
- [ ] Retrieval preserves aircraft store scope on every evidence item.
- [ ] Multi-store comparison requires explicit multi-store selection.
- [ ] Hermes only receives retrieved evidence and never processes documents directly.
- [ ] Every visible citation maps to a source viewer action.
- [ ] End users cannot upload, register, edit, approve, or archive documents.
- [ ] Admin store and document registration routes enforce RBAC.
- [ ] Browser code never receives Hermes or RAGFlow API keys.
- [ ] Tests cover retrieval grouping, citation resolution, RBAC, and the critical MVP loop.

## Phase Tracker

| Phase | Status | Owner | Notes |
| --- | --- | --- | --- |
| 0. Project scaffold | Complete | Codex | Initial scaffold pushed to `main`. |
| 1. Domain model and seed data | In progress | TBD | Prisma schema exists; migrations and seed script still needed. |
| 2. Scoped retrieval contract | In progress | TBD | Mock retrieval exists; RAGFlow adapter still needed. |
| 3. Hermes server adapter | In progress | TBD | Mock chat response exists; live Hermes adapter still needed. |
| 4. Three-pane workspace UI | In progress | TBD | Shell exists; production UI states and mobile polish still needed. |
| 5. Source viewer and citation navigation | In progress | TBD | Citation target wiring exists; PDF.js/OpenSeadragon rendering still needed. |
| 6. Admin workflow | Not started | TBD | Store/document registry UI and RBAC mutation tests needed. |
| 7. End-to-end MVP verification | Not started | TBD | Playwright critical-loop coverage needed. |

## Decision Log

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-06-03 | Keep RAGFlow as the document/RAG engine. | Avoid building OCR, chunking, embeddings, and retrieval from scratch. |
| 2026-06-03 | Keep Hermes behind a server-side adapter. | Prevent secret exposure and preserve app control over retrieval scope. |
| 2026-06-03 | Start with a Next.js-only app boundary. | Faster MVP while preserving option to split a FastAPI adapter later. |
| 2026-06-03 | Use mock evidence in the scaffold. | Allows UI/API development before live RAGFlow and Hermes credentials are wired. |

## Open Questions

- [ ] Which authentication provider should gate admin and end-user roles?
- [ ] What is the exact Hermes API request/response contract?
- [ ] What RAGFlow endpoint and response shape should the adapter normalize?
- [ ] Where will source PDFs/images be served from in MVP: local public assets, object storage, or RAGFlow URLs?
- [ ] Should chat sessions be saved in the first MVP release or deferred?

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| RAGFlow response shape differs from the mock evidence contract. | Citation mapping may need rework. | Add adapter-level normalization tests before wiring UI to live data. |
| Hermes returns citations that do not map to evidence items. | Source viewer clicks may break. | Require citations to reference normalized evidence IDs. |
| Admin and end-user boundaries are implemented late. | End-user upload or mutation paths could leak into the MVP. | Add RBAC tests before building admin mutation UI. |
| PDF/image location metadata is incomplete. | Source viewer may only open document overview. | Make missing page/image metadata explicit in UI and logs. |

## Notes

Use this section for running product, implementation, and review notes.

### 2026-06-03

- Initial project scaffold created and pushed to GitHub.
- npm baseline pinned to `npm@11.16.0`.
- Remaining audit item: moderate PostCSS advisory through Next's nested dependency. npm's suggested fix currently forces a breaking downgrade, so it has not been applied.

### Add Future Notes Here

- 

