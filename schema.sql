-- 1. Ενεργοποίηση της διανυσματικής επέκτασης για AI αναζητήσεις
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Πίνακας Χρηστών
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Πλήρες Ιστορικό Συνομιλιών (Chat Messages)
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    sender VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_date ON chat_messages(user_id, created_at);

-- 4. Επεισοδιακή Μνήμη (Memory Vault με pgvector)
CREATE TABLE IF NOT EXISTS memory_vault (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    fact TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'General',
    embedding TEXT, -- Embedding stored as TEXT, cast to vector for similarity search
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Similarity search uses ORDER BY CAST(embedding AS vector) with sequential scan (sufficient for personal chatbot scale)

-- 5. Ραντεβού & Υποχρεώσεις (Reminders / Tasks)
CREATE TABLE IF NOT EXISTS reminders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_schedule ON reminders(user_id, scheduled_at);