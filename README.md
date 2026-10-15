# RoboFriend — AI Chatbot Application

A full-stack AI chatbot application with persistent chat history, a semantic memory vault, automated reminder extraction, and user authentication. Features a modern React + Material UI frontend and a Spring Boot backend powered by the Google Gemini API.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Frontend (Port 80)               │
│  React 19 + TypeScript + Vite + Material UI (nginx) │
│                                                      │
│  ┌──────────────────────────────────────┐            │
│  │         Nginx Reverse Proxy          │            │
│  │         /api/* → backend:8080        │            │
│  └────────────────┬─────────────────────┘            │
└──────────────────┼────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────┐
│                   Backend (Port 8080)                │
│  Spring Boot 4 • Java 22 • Maven                     │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────┐  │
│  │  Auth    │  │  Chat    │  │  Memory  │  │Remind│  │
│  │ Controller│  │Controller│  │Controller│  │Controller│
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──┬───┘  │
│       │             │              │            │      │
│       ▼             ▼              ▼            ▼      │
│  ┌──────────────────────────────────────┐           │
│  │          GeminiService                │           │
│  │  - /v1/models/{model}:generateContent │           │
│  │  - Retry logic (3 attempts)           │           │
│  └──────────────────────────────────────┘           │
│                                                      │
│  ┌──────────────────────────────────────┐           │
│  │       PostgreSQL + pgvector           │           │
│  │       (Vector similarity search)     │           │
└──┴──────────────────────────────────────┴───────────┘
```

## Features

### Core
- **AI Chatbot** — Real-time conversation powered by Google Gemini (`gemini-3.8-flash` model)
- **Chat History** — All conversations are persisted to PostgreSQL with timestamps
- **User Authentication** — Register/login with bcrypt password hashing (Spring Security Crypto)
- **Dark/Light Theme** — Toggle between modern dark and light modes

### Memory Vault (RAG)
- Stores user facts in a `memory_vault` table with pgvector `VECTOR(768)` embeddings
- Retrieves relevant memories using cosine similarity search before generating responses
- Context-aware AI replies based on stored facts

### Reminder Extraction
- Automatically detects date/time references in user messages ("tomorrow at 3pm", "next Monday", etc.)
- Creates reminders with parsed `scheduled_at` timestamps
- Reminders are displayed in a sidebar with checkbox completion tracking

### Resilience
- **Retry logic** — 3 attempts with exponential backoff on API calls
- **Graceful fallback** — Returns a helpful message when the AI API is unavailable
- **Circuit-style protection** — No hard failure on API errors

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, Material UI, React Query |
| **Backend** | Spring Boot 4.1, Java 22, Maven, Spring Data JPA, Lombok |
| **Database** | PostgreSQL 16 + pgvector (vector similarity search) |
| **AI** | Google Gemini API (`gemini-3.8-flash` via `/v1/models`) |
| **Deployment** | Docker Compose (3 containers), nginx reverse proxy |

## Project Structure

```
bot/
├── docker-compose.yml          # Docker orchestration (postgres, backend, frontend)
├── schema.sql                  # Database schema with pgvector extension
├── .env                        # Environment variables (API keys)
├── bot-back/                   # Spring Boot backend
│   ├── Dockerfile              # Multi-stage build (Maven → JRE)
│   ├── pom.xml
│   └── src/main/java/com/bot/botback/
│       ├── BotBackApplication.java
│       ├── controller/
│       │   ├── AuthController.java      (/api/auth/register, /api/auth/login)
│       │   ├── ChatController.java      (/api/chat/history/{userId}, /api/chat/send)
│       │   ├── MemoryController.java    (/api/memory/{userId})
│       │   └── ReminderController.java  (/api/reminders/{userId})
│       ├── service/
│       │   ├── GeminiService.java       (AI API calls with retry logic)
│       │   └── AiService.java           (Local AI fallback + reminder extraction)
│       ├── model/                      (User, ChatMessage, MemoryVault, Reminder)
│       ├── repository/                 (Spring Data JPA repositories)
│       ├── dto/                      (MessageRequest, LoginRequest)
│       └── config/                   (WebConfig, RestClientConfig, PasswordEncoderConfig)
│   └── src/test/                     (JUnit 5 tests)
├── bot-front/                  # React frontend
│   ├── Dockerfile              # Multi-stage build (Node → nginx)
│   ├── vite.config.ts          # Dev server (port 5174) + proxy to backend
│   ├── nginx.conf              # Production nginx config (proxy /api/ → backend)
│   └── src/
│       ├── App.tsx             # Main component (auth, chat, memory, reminders)
│       ├── main.tsx
│       └── index.css
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login existing user |
| GET | `/api/chat/history/{userId}` | Get chat history |
| POST | `/api/chat/send` | Send message + get AI reply |
| GET | `/api/memory/{userId}` | List memory vault entries |
| GET | `/api/reminders/{userId}` | List reminders |

## Quick Start

### Prerequisites
- Docker & Docker Compose
- A Google Gemini API key ([get one](https://aistudio.google.com/app/apikey))

### Setup

1. **Clone & navigate to project root:**
```bash
cd /path/to/bot
```

2. **Create `.env` file:**
```bash
echo "GEMINI_API_KEY=your-key-here" > .env
```

3. **Start all services:**
```bash
docker compose up --build -d
```

4. **Access the app:**
```
Frontend: http://localhost:80
Backend API: http://localhost:8080
Database: localhost:5433
```

### Useful Commands

```bash
# Build and start all containers
docker compose up --build -d

# View logs
docker compose logs -f

# Restart a specific service
docker compose restart backend

# Rebuild after code changes
docker compose up --build -d

# Stop everything
docker compose down

# Run backend tests (without Docker)
cd bot-back && ./mvnw test

# Run frontend dev server (without Docker)
cd bot-front && npm install && npm run dev
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | — | Google Gemini API key |
| `DB_URL` | No | `jdbc:postgresql://postgres:5432/botdb` | Database URL (in Docker) |
| `DB_USERNAME` | No | `postgres` | Database username |
| `DB_PASSWORD` | No | `password` | Database password |

## Development

### Run Frontend (dev mode)
```bash
cd bot-front
npm install
npm run dev
```
Server: `http://localhost:5174` (proxies `/api/*` to backend on 8080)

### Run Backend (without Docker)
```bash
cd bot-back
./mvnw spring-boot:run
```

### Run Tests
```bash
cd bot-back
./mvnw test
```

## License

This project is provided as-is for educational and development purposes.
