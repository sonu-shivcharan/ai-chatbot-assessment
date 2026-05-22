import { EventEmitter } from "events";
import { LLMFactory, type ProviderType } from "./factory";
import type { ChatMessage, GenerateOptions } from "./types";

export interface InferenceLogMetadata {
  conversationId: string;
  provider: string;
  model: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  status: "success" | "error";
  requestPreview: string;
  responsePreview: string;
  errorMessage?: string;
  startedAt: Date;
  completedAt: Date;
}

// Extended EventEmitter to trigger asynchronous telemetry ingestion
class TelemetryEmitter extends EventEmitter {
  ingest(metadata: InferenceLogMetadata): void {
    console.log(
      `[TelemetryIngestion] Received metadata for conversation ${metadata.conversationId}:`,
      metadata,
    );
    this.emit("log_inference", metadata);
  }
}

export const telemetryEmitter = new TelemetryEmitter();

export interface InferenceLogMetadata {
  conversationId: string;
  provider: string;
  model: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  status: "success" | "error";
  requestPreview: string;
  responsePreview: string;
  errorMessage?: string;
  startedAt: Date;
  completedAt: Date;
}

export class LLMSDK {
  /**
   * Performs a blocking, non-streaming chat call and captures inference metadata.
   */
  static async chat(
    conversationId: string,
    provider: ProviderType | string,
    messages: ChatMessage[],
    options: GenerateOptions,
  ) {
    const startedAt = new Date();
    const adapter = LLMFactory.getProvider(provider);
    const content = messages[messages.length - 1]?.content || "";

    try {
      const response = await adapter.chat(messages, options);
      const completedAt = new Date();
      const latencyMs = completedAt.getTime() - startedAt.getTime();

      const promptTokens =
        response.usage?.promptTokens || Math.ceil(content.length / 4);
      const completionTokens =
        response.usage?.completionTokens ||
        Math.ceil(response.content.length / 4);
      const totalTokens =
        response.usage?.totalTokens || promptTokens + completionTokens;

      const metadata: InferenceLogMetadata = {
        conversationId,
        provider,
        model: response.model || options.model || "unknown",
        latencyMs,
        promptTokens,
        completionTokens,
        totalTokens,
        status: "success",
        requestPreview: content,
        responsePreview: response.content,
        startedAt,
        completedAt,
      };

      // Ingest telemetry asynchronously
      telemetryEmitter.ingest(metadata);

      return response;
    } catch (error: any) {
      const completedAt = new Date();
      const latencyMs = completedAt.getTime() - startedAt.getTime();

      const metadata: InferenceLogMetadata = {
        conversationId,
        provider,
        model: options.model || "unknown",
        latencyMs,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        status: "error",
        requestPreview: content,
        responsePreview: "",
        errorMessage: error.message || "Unknown error during inference",
        startedAt,
        completedAt,
      };

      // Ingest telemetry asynchronously
      telemetryEmitter.ingest(metadata);

      throw error;
    }
  }

  /**
   * Performs a streaming chat call, yielding chunks in real time, and captures inference metadata upon completion or error.
   */
  static async *chatStream(
    conversationId: string,
    provider: ProviderType | string,
    messages: ChatMessage[],
    options: GenerateOptions,
  ): AsyncGenerator<string, void, unknown> {
    const startedAt = new Date();
    const adapter = LLMFactory.getProvider(provider);
    const content = messages[messages.length - 1]?.content || "";

    let fullResponseContent = "";
    let isSuccess = true;
    let errorMessage = "";

    try {
      const chunkStream = adapter.chatStream(messages, options);
      for await (const chunk of chunkStream) {
        fullResponseContent += chunk;
        yield chunk;
      }
    } catch (error: any) {
      isSuccess = false;
      errorMessage = error.message || "Unknown error during inference stream";
      throw error;
    } finally {
      const completedAt = new Date();
      const latencyMs = completedAt.getTime() - startedAt.getTime();

      const promptTokens = Math.ceil(content.length / 4);
      const completionTokens = Math.ceil(fullResponseContent.length / 4);
      const totalTokens = promptTokens + completionTokens;

      const metadata: InferenceLogMetadata = {
        conversationId,
        provider,
        model: options.model || "unknown",
        latencyMs,
        promptTokens: isSuccess ? promptTokens : 0,
        completionTokens: isSuccess ? completionTokens : 0,
        totalTokens: isSuccess ? totalTokens : 0,
        status: isSuccess ? "success" : "error",
        requestPreview: content.slice(0, 50),
        responsePreview: fullResponseContent.slice(0, 50),
        errorMessage: isSuccess ? undefined : errorMessage,
        startedAt,
        completedAt,
      };

      // Ingest telemetry asynchronously
      telemetryEmitter.ingest(metadata);
    }
  }
}
