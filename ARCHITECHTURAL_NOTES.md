# AntiChat SDK Architectural Notes

This document describes the high-level architecture and design patterns used across the backend and frontend components of the AntiChat SDK project.

---

## 1. High-Level Architecture Overview

The system is split into two primary components:
1. **Frontend (React)**: A modern Single Page Application (SPA) built with React, Vite, and TailwindCSS. It handles user interactions, session configurations, and SSE streaming rendering.
2. **Backend (Node.js/Express)**: A RESTful API built with TypeScript and Express. It interfaces with LLM API providers, collects inference metrics, and manages the database.

Database persistence is handled by **MongoDB**, which stores all chat histories, settings, and telemetry information.

```
┌───────────────────────────────────────────────────────────────┐
│                       Client Browser                          │
│  ┌───────────────────────┐         ┌───────────────────────┐  │
│  │   React Components    │ ◄─────► │     useChatState      │  │
│  └───────────────────────┘         └───────────┬───────────┘  │
└────────────────────────────────────────────────┼──────────────┘
                                                 │ HTTPS / SSE (Stream)
┌────────────────────────────────────────────────▼──────────────┐
│                       Express API Gateway                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                     chat.controller                     │  │
│  └─────────────────────────────┬───────────────────────────┘  │
│                                │                              │
│  ┌─────────────────────────────▼───────────────────────────┐  │
│  │                         LLMSDK                          │  │
│  └──────┬───────────────────────────────────────────┬──────┘  │
│         │                                           │         │
│         │ (Synchronous Call)                        │ (Async Event)
│  ┌──────▼──────────────┐                    ┌──────▼──────┐  │
│  │    LLMFactory       │                    │  EventEmitter│  │
│  └──────┬──────────────┘                    └──────┬──────┘  │
│         │ (Adapter Pattern)                        │         │
│  ┌──────▼──────────────┐                    ┌──────▼──────┐  │
│  │   LLM Adapters      │                    │  Telemetry  │  │
│  │ (Gemini/Groq/Mock)  │                    │  Listener   │  │
│  └──────┬──────────────┘                    └──────┬──────┘  │
└─────────┼──────────────────────────────────────────┼──────────┘
          │ External LLM APIs                        │ Mongoose Query
          ▼                                          ▼
┌────────────────────────┐                ┌─────────────────────┐
│  Google & Groq APIs    │                │      MongoDB        │
└────────────────────────┘                └─────────────────────┘
```

---

## 2. Backend Design Patterns & Workflows

### A. Multi-Provider Support via the Adapter Pattern
To allow seamless switching between different model providers (such as Gemini, Groq, or Mock implementations) without changing controller logic, the system utilizes the **Adapter Pattern**:

- **[LLMAdapter Interface](/backend/src/services/llm/types.ts)**: Defines the common contract that all model wrappers must implement:
  ```typescript
  export interface LLMAdapter {
    chat(messages: ChatMessage[], options?: GenerateOptions): Promise<ChatResponse>;
    chatStream(messages: ChatMessage[], options?: GenerateOptions): AsyncGenerator<string, void, unknown>;
  }
  ```
- **Specific Provider Adapters** ([providers/](/backend/src/services/llm/providers)):
  - [GeminiAdapter](/backend/src/services/llm/providers/gemini.adapter.ts): Wraps Google's `@google/genai` SDK and maps roles to `user`/`model` while inserting system instructions into the model configuration.
  - [GroqAdapter](/backend/src/services/llm/providers/groq.adapter.ts): Wraps the `groq-sdk` and pre-pends system messages in the message arrays.
  - [MockAdapter](/backend/src/services/llm/providers/mock.adapter.ts): Simulates streaming/non-streaming responses locally for development and testing.
- **[LLMFactory](/backend/src/services/llm/factory.ts)**: A creational factory class that caches and retrieves adapter instances based on the requested provider dynamically.

---

### B. Custom LLM SDK & Asynchronous Telemetry Ingestion
Monitoring LLM metrics (like token counts, latency, and error rates) is handled by a custom wrapper layer:

- **[LLMSDK](/backend/src/services/llm/sdk.ts)**: Wraps all calls to the adapters (`chat` and `chatStream`). It:
  1. Computes the overall request execution latency.
  2. Extracts metadata details from the adapter's response (or estimates them in stream mode).
  3. Prepares an `InferenceLogMetadata` object containing status, provider, model, character counts, and preview snippets.
- **Asynchronous Telemetry Ingestion via `EventEmitter`**:
  - Rather than making the client wait for database writes to finalize before returning the response, `LLMSDK` uses a simple `EventEmitter` (`telemetryEmitter`) to publish the inference log:
    ```typescript
    telemetryEmitter.ingest(metadata); // triggers: this.emit("log_inference", metadata)
    ```
  - **[Telemetry Listener](/backend/src/services/llm/telemetry-listener.ts)**: Runs in the background, listening for the `"log_inference"` event. Upon receipt, it persists the metadata into the database via Mongoose asynchronously.

---

### C. Chunk Streaming using Generators
Real-time response streaming is achieved using ES6 **Async Generators**:

- **Adapter Output**: The adapter's `chatStream` method returns an `AsyncGenerator<string, void, unknown>`, yielding chunks of text as they arrive:
  ```typescript
  async *chatStream(messages: ChatMessage[], options?: GenerateOptions) {
     for await (const chunk of responseStream) {
        yield chunk.text || "";
     }
  }
  ```
- **SSE Stream Construction**: The controller ([chat.controller.ts](/backend/src/features/chats/chat.controller.ts)) consumes this generator, formatting and sending each chunk down to the client using **Server-Sent Events (SSE)** formats (`data: {"chunk": "..."}`).

---

### D. MongoDB Schema Design
The backend persists application models using three primary MongoDB collections defined via Mongoose schemas in [models/](/backend/src/models):

1. **[Conversation](/backend/src/models/conversation.model.ts)**: Stores the metadata of a chat session, including the chat's title, selected provider, model, and the timestamp of the last message.
2. **[Message](/backend/src/models/message.model.ts)**: Stores individual message documents, linked to a `conversationId`, with fields for role (`user`/`assistant`), content, and token counts.
3. **[InferenceLog](/backend/src/models/inference-logs.model.ts)**: Houses telemetry data for dashboard analytics, containing request latencies, token counts (prompt, completion, total), request/response previews, statuses, and optional error messages.

---

## 3. Frontend Architecture

The frontend follows a clean hook-based architecture to isolate UI render structures from stateful client logic:

- **[useChatState Hook](/frontend/src/hooks/useChatState.ts)**: Centralizes frontend state management. It encapsulates:
  - Sidebar toggling and conversations loading.
  - Active conversation synchronizations (loading previous messages from database when selected).
  - Dropdown values and current model selections.
  - Managing temporary state changes during streaming (e.g. tracking temporary message components).
- **SSE Stream Decoding**:
  - The [api.ts](/frontend/src/lib/api.ts) file features `sendMessageStream()`, which reads the readable stream returned by the server, decodes the chunks in real-time, and fires triggers like `onChunk` and `onDone` to update state parameters dynamically in the hook.
- **Context API Layer**:
  - [ChatContext.tsx](/frontend/src/context/ChatContext.tsx) exposes the hook state globally, enabling clean prop-drilling-free access in header, sidebar, input, and message log components.

---

## 4. Systems Design & Operational Notes

### A. Ingestion Flow
Inference logs follow an **asynchronous event-driven ingestion flow**:
1. **Trigger**: When `LLMSDK` completes a chat transaction (either resolving a non-streaming promise or finishing an SSE stream), it compiles request metrics (tokens, latency, model type) into an `InferenceLogMetadata` object.
2. **Dispatch**: The SDK invokes `telemetryEmitter.ingest(metadata)`. This fires the `"log_inference"` event synchronously.
3. **Execution**: The background `TelemetryListener` receives the event and executes a database save operation.
4. **Resolution**: The client HTTP response is sent immediately, and is not blocked by database write operations to minimize API latency.

### B. Logging Strategy
- **Metric Extraction**: Token counts are extracted directly from the provider's API response metadata (e.g. Google's `usageMetadata`). If not returned by the provider (e.g., when streaming or in case of early termination), token count is estimated using a character-to-token ratio (approx. 4 characters per token).
- **Latency Tracking**: Latency is measured from the moment the adapter call starts until the final chunk is received or the promise resolves.
- **Log Levels**: Standard warnings are written to console stdout for missing keys, while adapter connection failures throw explicit `ApiError` objects containing root provider errors.

### C. Scaling Considerations
- **Event Loop Threading**: Although using Node's `EventEmitter` decouples database writes from the client HTTP request, it still runs on Node's main single-threaded event loop. Under heavy write traffic, this can lead to database I/O bottlenecks.
- **Scaling to Production**:
  - **Message Queues**: In high-throughput settings, the local `EventEmitter` should be replaced with a message broker (e.g., RabbitMQ, Redis Pub/Sub, or Kafka) to distribute log processing to dedicated ingestion workers.
  - **Bulk Database Ingestion**: Replace single writes with a buffering mechanism that groups inference logs and executes bulk writes (e.g., MongoDB `insertMany`) every few seconds or when a threshold is met.

### D. Failure Handling Assumptions
- **Decoupled Telemetry Failures**: An error in telemetry saving (like a temporary database connection drop) must not crash the chat request. The listener wraps database insertions in a `try/catch` block to log telemetry failures to stderr without impacting the active chat response.
- **LLM Provider Outages**: If a provider API call fails, the SDK logs the error metadata (status `"error"`) to capture telemetry of the failure, and then propagates the error back to the controller to display a user-friendly message on the client.
- **Database Schema Fallbacks**: For old conversations created with models that are now disallowed, backend routes validate request schemas dynamically and return `400 Bad Request` errors prior to starting transactions.

