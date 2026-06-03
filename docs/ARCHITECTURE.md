# Architecture

Hermes Aviation Notebook uses a deliberately narrow set of service boundaries.

## Application

The Next.js app owns:

- user and role checks
- aircraft store selection
- document registry metadata
- chat sessions
- retrieval request scope
- citation mapping
- source viewer behavior

## RAGFlow

RAGFlow owns:

- document ingestion
- OCR
- PDF/image parsing
- chunking
- embeddings
- retrieval
- source location metadata

The app should call RAGFlow only through server-side adapters.

## Hermes

Hermes owns answer generation after retrieval. It receives user questions and grouped evidence. Hermes must not upload, parse, OCR, chunk, embed, or search source documents.
