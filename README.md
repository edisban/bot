# RoboFriend

A full-stack AI chatbot with chat history, reminders, and semantic memory search via vector embeddings.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Material UI
- **Backend**: Spring Boot (Java), JPA, PostgreSQL
- **ML Service**: Python, FastAPI, sentence-transformers, pgvector
- **Database**: PostgreSQL with pgvector extension

## Architecture Overview

- **React Frontend**: User interface for chat, voice input, reminders, and authentication.
- **Spring Boot Backend**: Handles auth, chat, reminders, and memory ingestion via REST APIs.
- **FastAPI ML Service**: Generates embeddings with sentence-transformers and performs semantic search over pgvector.
- **PostgreSQL + pgvector**: Stores users, chat messages, reminders, and vector embeddings in `memory_vault` for similarity search.

## Quick Start

```bash
docker compose up -d
```

Once running, access the app at [http://localhost](http://localhost).
