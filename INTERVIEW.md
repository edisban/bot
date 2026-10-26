
## Extended Q&A
Q: How does the frontend communicate with backend?
A: REST API via fetch/axios with JWT Bearer token.

Q: How is data persisted?
A: PostgreSQL with JPA/Hibernate; pgvector for embeddings.

Q: How are reminders scheduled?
A: AI extracts target datetime; stored in DB; due reminders surfaced in replies.

Q: How is memory retrieved?
A: Python FastAPI generates embeddings; cosine similarity search in pgvector.

Q: How is security handled?
A: JWT + BCrypt, CORS, global exception handler, protected endpoints.

Q: How is it deployed?
A: Docker Compose locally; Render for cloud; GitHub Actions CI.

Q: What are the main challenges?
A: LLM reliability, voice STT language support, deployment config.

