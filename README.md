# SHS AI — Adaptive AI Study Copilot

An intelligent, full-stack Adaptive AI Study Copilot designed for school students (Class 5 to Class 10), powered by **Retrieval-Augmented Generation (RAG)**, **Gemini 768-dim embeddings**, **MongoDB Vector Search**, **Conversational AI**, **Learning Analytics**, and **Personalized Study Recommendations**.

---

## 🌟 Key Features

### 1. Document Ingestion & Page-by-Page RAG
- **Sentence-Aware Chunking**: Chunks PDF, DOCX, and TXT files (500–800 tokens with 100–150 token overlap) while preserving exact page numbers.
- **Dedicated Embedding Engine**: Uses Google Gemini `gemini-embedding-2` with `outputDimensionality: 768` (with fallback to `text-embedding-004`), exponential backoff, dimension normalization, and Redis caching.
- **MongoDB Atlas Vector Search**: Vector searches with strict user isolation (`userId`), optional `documentId` and `subject` filters, and in-memory cosine fallback for local dev.

### 2. Conversational AI Tutor
- **4 Dedicated Study Modes**:
  - **My Notes**: Strictly answers from uploaded study material with page citations.
  - **General AI**: Grade-appropriate general knowledge explanation.
  - **Teach Me**: Socratic step-by-step guidance with real-life analogies.
  - **Exam Prep**: Focuses on marking points, keywords, and high-scoring structure.
- **Student-Friendly Actions**:
  - **Explain Simpler / "I don't understand"**: Breaks down previous answers using simpler words and relatable analogies.
  - **Homework Helper**: Progressive coaching (Understand Problem → Give Hint → Next Step → Full Solution).
  - **Instant Answer Checker**: Grades student answers out of 10 with strengths and tips to achieve full marks.
  - **Speech Read Aloud**: Built-in browser-native text-to-speech for auditory learners.
  - **Source Citations**: Clickable citations showing document name, page number, similarity score, and exact excerpt.

### 3. Adaptive Practice Hub
- **Adaptive Quizzes**: Generates MCQs tailored to student class level (Class 5–10) from uploaded notes, subjects, or weak topics.
- **Digital Mistake Book**: Automatically tracks missed quiz questions, previous student answers, correct answers, and explanations.
- **Flashcard Deck**: 3D flip cards with self-grading (Easy, Medium, Hard) that update mastery algorithms.
- **Revision Sheets**: Quick Notes, Formula Sheets, and Key Definitions generator.

### 4. Learning Analytics & Recommendations
- **Dynamic Topic Mastery**: Computes scores (0–100) based on weighted accuracy (60%), volume (20%), and recency (20%).
- **"What Should I Study?" Engine**: Real-time priority engine recommending the single highest-impact study task.
- **Exam Study Planner**: Generates day-by-day revision timetables factoring in weak concepts with 1-click **Google Calendar Sync**.

---

## 🚀 Tech Stack

- **Frontend**: React 18, Vite 6, Tailwind CSS, Lucide React, React Hot Toast, Axios.
- **Backend**: Node.js, Express, MongoDB with Mongoose, Redis (ioredis), Google OAuth, Google Calendar API.
- **AI / Embeddings**: Google Gemini API (`gemini-2.5-flash`, `gemini-embedding-2` 768-dim), Groq API fallback.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas or local MongoDB instance
- (Optional) Redis server

### 1. Backend Setup
```bash
cd backend
cp .env.example .env
# Fill in your MONGO_URI, GEMINI_API_KEY, JWT_SECRET, etc.
npm install
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Testing & Verification

Run the full end-to-end smoke test suite:
```bash
node backend/scripts/smoke.js
```
Run the frontend production build:
```bash
cd frontend
npm run build
```
