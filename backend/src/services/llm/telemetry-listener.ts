import { telemetryEmitter, type InferenceLogMetadata } from "./sdk";
import { InferenceLog } from "../../models/inference-logs.model";
import { Types } from "mongoose";

// Register the asynchronous listener on 'log_inference' events
telemetryEmitter.on(
  "log_inference",
  async (rawMetadata: InferenceLogMetadata) => {
    try {
      console.log(
        `[TelemetryIngestion] Received inference event for conversation: ${rawMetadata.conversationId}`,
      );

      // 1. Validation & Parsing
      if (
        !rawMetadata.conversationId ||
        !Types.ObjectId.isValid(rawMetadata.conversationId)
      ) {
        throw new Error(
          `Invalid conversationId: ${rawMetadata.conversationId}`,
        );
      }
      if (
        !rawMetadata.provider ||
        !["groq", "gemini", "mock"].includes(rawMetadata.provider)
      ) {
        throw new Error(
          `Unsupported/missing provider: ${rawMetadata.provider}`,
        );
      }
      if (!rawMetadata.model) {
        throw new Error("Missing model identifier");
      }
      if (
        typeof rawMetadata.latencyMs !== "number" ||
        rawMetadata.latencyMs < 0
      ) {
        throw new Error(`Invalid latency: ${rawMetadata.latencyMs}`);
      }
      if (!["success", "error"].includes(rawMetadata.status)) {
        throw new Error(`Invalid status: ${rawMetadata.status}`);
      }

      // 2. Metadata Extraction & Refinement
      const requestPreview = rawMetadata.requestPreview
        ? rawMetadata.requestPreview.substring(0, 300)
        : "";
      const responsePreview = rawMetadata.responsePreview
        ? rawMetadata.responsePreview.substring(0, 300)
        : "";

      const promptTokens = rawMetadata.promptTokens || 0;
      const completionTokens = rawMetadata.completionTokens || 0;
      const totalTokens =
        rawMetadata.totalTokens || promptTokens + completionTokens;

      // Additional enriched details
      const wordCountInput = rawMetadata.requestPreview
        ? rawMetadata.requestPreview.split(/\s+/).length
        : 0;
      const wordCountOutput = rawMetadata.responsePreview
        ? rawMetadata.responsePreview.split(/\s+/).length
        : 0;

      const processedData = {
        conversationId: new Types.ObjectId(rawMetadata.conversationId),
        provider: rawMetadata.provider as "groq" | "gemini" | "mock",
        model: rawMetadata.model,
        latencyMs: rawMetadata.latencyMs,
        promptTokens,
        completionTokens,
        totalTokens,
        status: rawMetadata.status as "success" | "error",
        requestPreview,
        responsePreview,
        errorMessage: rawMetadata.errorMessage,
        startedAt: rawMetadata.startedAt,
        completedAt: rawMetadata.completedAt,
      };

      console.log(
        `[TelemetryIngestion] Extracted metadata: ` +
          `Tokens=[Prompt: ${promptTokens}, Completion: ${completionTokens}, Total: ${totalTokens}], ` +
          `Words=[Input: ${wordCountInput}, Output: ${wordCountOutput}], ` +
          `Latency=${rawMetadata.latencyMs}ms`,
      );

      // 3. Database Persistence
      const log = await InferenceLog.create(processedData);
      console.log(
        `[TelemetryIngestion] Successfully ingested log in DB with ID: ${log._id}`,
      );
    } catch (error: any) {
      console.error(
        `[TelemetryIngestion] Ingestion pipeline failed:`,
        error.message,
      );
    }
  },
);

console.log(
  "[TelemetryIngestion] Registered async inference logging event listener.",
);
