# Hermes Aviation Notebook Implementation Plan

This repository starts from the MVP scaffold. The execution order is:

1. Stabilize tooling and environment.
2. Add durable Prisma migrations and seed data.
3. Replace mock retrieval with a server-only RAGFlow adapter.
4. Replace mock chat with a server-only Hermes adapter.
5. Complete PDF.js and OpenSeadragon rendering.
6. Build admin store and document registry screens.
7. Add RBAC enforcement for mutations.
8. Verify the critical MVP loop end to end.

Critical loop:

```text
Select aircraft -> ask Hermes -> retrieve evidence -> answer with citations -> click citation -> view source
```
