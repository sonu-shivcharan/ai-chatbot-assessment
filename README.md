# AntiChat SDK - AI Chatbot Platform

A full-stack AI chatbot application demonstrating multi-provider LLM integrations (Gemini, Groq, Mock Adapters), asynchronous telemetry logging, real-time chunk streaming, and dashboard metrics.

---

## 1. Project Overview & Architecture

This application consists of:

- **Frontend**: A React / Vite single-page application showcasing interactive messaging session configurations, model customization, and custom SSE stream decoding.
- **Backend**: An Express / TypeScript API server that wraps external LLM APIs, streams chunks via async generators, and processes telemetry logs asynchronously.
- **Database**: MongoDB for storing conversation records, message logs, and request latencies.

### Key Architectural Highlights

- **Adapter Pattern**: Seamless provider swapping with the `LLMAdapter` contract, allowing clean model updates under `GeminiAdapter`, `GroqAdapter`, and `MockAdapter`.
- **Asynchronous Telemetry Ingestion**: A decoupled background worker using Node `EventEmitter` processes the `"log_inference"` event to store token counts, latencies, and metadata without blocking user-facing chat responses.
- **Async Generator Streams**: Real-time message streaming powered by ES6 `AsyncGenerator` functions feeding Server-Sent Events (SSE).

Detailed architectural notes are available in the [ARCHITECHTURAL_NOTES.md](/ARCHITECHTURAL_NOTES.md) file.

---

## 2. Setup Instructions

### A. Docker Compose Setup (Recommended)

1. **Environment Setup**: Copy the sample environment file [backend/.env.sample](/backend/.env.sample) to `/backend/.env` and input your API keys:
   ```bash
   cp backend/.env.sample backend/.env
   ```
   Open `backend/.env` and configure your API keys:
   ```env
   GROQ_API_KEY="your-actual-groq-api-key"
   GEMINI_API_KEY="your-actual-gemini-api-key"
   ```
2. **Build and Run**: From the project root directory, run:
   ```bash
   docker compose up --build
   ```
3. **Access Services**:
   - **Frontend UI**: Open [http://localhost:5173](http://localhost:5173) in your browser.
   - **Backend API**: Running on [http://localhost:3000](http://localhost:3000).
   - **MongoDB Database**: Running on [http://localhost:27017](http://localhost:27017).

### B. Individual Local Service Setup

To run services individually outside of Docker (e.g. for development), see their respective README guides:

- **Backend Dev Setup**: Refer to [backend/README.md](/backend/README.md).
- **Frontend Dev Setup**: Refer to [frontend/README.md](/frontend/README.md).

---

## 3. Schema Design Decisions

We use MongoDB with Mongoose to implement a clean, decoupled data layout:

1. **Conversations collection** ([conversation.model.ts](/backend/src/models/conversation.model.ts)):
   - Stores session-level metadata: title, selected provider, model, and the timestamp of the last message.
   - Designed to load and list recent chat histories rapidly in the sidebar UI without downloading heavy message bodies.
2. **Messages collection** ([message.model.ts](/backend/src/models/message.model.ts)):
   - Stores individual message documents, linked to a parent conversation via `conversationId`, with fields for role (`user`/`assistant`/`system`), text content, and token counts.
   - Decoupled from the conversation record to avoid document size limit bottlenecks as chat threads grow.
3. **InferenceLogs collection** ([inference-logs.model.ts](/backend/src/models/inference-logs.model.ts)):
   - Stores telemetry data for dashboard analytics, containing request latencies, token counts (prompt, completion, total), request/response previews, statuses, and optional error messages.
   - Isolated from the core chat operations so logging writes do not block user messages.

---

## 4. Tradeoffs Made

- **Local `EventEmitter` vs. Message Queue**:
  - We used a local Node.js `EventEmitter` to decouple telemetry database writes from user responses. This provides zero external dependency complexity and low-latency local execution.
  - _Tradeoff_: It still runs on Node's main single-threaded event loop, which could introduce CPU/connection overhead under high volumes.
- **ESM Imports & Bundling**:
  - Node.js ESM strictness requires `.js` extensions for relative imports, which is not required by Bun.
  - _Tradeoff_: Rather than modifying all relative imports in the codebase, we introduced `esbuild` to compile and bundle the backend typescript files into a single `dist/index.js` file at build time, allowing standard `node dist/index.js` container starts.

---

## 5. What I Would Improve with More Time

1. **User Authentication Layer**:
   - Secure the API endpoints with JWT authentication and user sessions to isolate and scope conversations, messages, and telemetry statistics per user.
2. **Deep Analytics Dashboards**:
   - Extend the dashboard to support granular trace analytics, date-range filters, custom charting filters, and paginated logs list views.
3. **True Event-Based Telemetry Ingestion (Redis + BullMQ)**:
   - Replace the local `EventEmitter` with a dedicated Redis queue powered by BullMQ to serialize and process telemetry ingestion asynchronously on separate worker threads, ensuring the main API thread stays responsive under extreme scale.
4. **Improved Frontend Design**:
   - Enhance visual polish with premium UI design elements, framer micro-animations, and better responsiveness.

---

## 6. Architecture Notes & Systems Design

### Ingestion Flow

1. Telemetry log generation triggers immediately after the LLM completes a transaction.
2. The `LLMSDK` dispatches an asynchronous event using a Node `EventEmitter` (`telemetryEmitter.ingest(metadata)`).
3. The background `TelemetryListener` intercepts this event and commits the document to MongoDB. The client HTTP response is sent immediately and does not wait for this db write.

### Logging Strategy

- **Metric Extraction**: Token usage is extracted from the provider's API metadata response where available (e.g. Gemini `usageMetadata`). If missing (e.g., during active chunk streams), the system estimates usage dynamically using an index of 4 characters per token.
- **Latency Tracking**: Measures the exact delta (in milliseconds) from adapter initialization to completion or connection error.

### Scaling Considerations

- Under heavy write traffic, the single-threaded event loop can suffer I/O bottlenecks.
- To scale, the local `EventEmitter` would be replaced with a message broker (e.g., Redis Pub/Sub, RabbitMQ, or Kafka) and write operations would be buffered and saved in bulk.

### Failure Handling Assumptions

- **Telemetry Decoupling**: Database write failures for logs are caught in a `try/catch` and logged to `stderr`, ensuring chat sessions never fail because of logging glitches.
- **LLM Outages**: If a provider API fails, the SDK records the telemetry log marked with status `"error"` and propagates the error so the client receives a clean notification.
- **Database Schema Fallbacks**: For old conversations created with models that are now disallowed, backend routes validate request schemas dynamically and return `400 Bad Request` errors prior to starting transactions.

---

## 7. Bonus Features Implemented

- **[x] Multi-provider support**: Fully integrated Gemini (`gemini-2.5-flash`), Groq (`llama-3.1-8b-instant`, `groq/compound`), and Mock adapters.
- **[x] Streaming Responses**: Real-time response streaming in the frontend using Express SSE and JS generator functions in the backend.
- **[x] Latency + Throughput + Errors dashboards**: Fully functional Metrics Dashboard view in the frontend mapping live statistics.
- **[x] Docker Compose one-command setup**: A root [docker-compose.yml](/docker-compose.yml) linking MongoDB 7, backend, and frontend.
- **[x] Event based architecture**: Telemetry ingestion fully decoupled via background `EventEmitter` listeners.
- **[x] Frontend list, and resume conversations**: Sidebar interface allowing chat selection, message resuming.
