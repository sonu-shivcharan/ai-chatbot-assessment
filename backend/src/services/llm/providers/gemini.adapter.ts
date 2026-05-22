import { GoogleGenAI } from "@google/genai";
import type {
  LLMAdapter,
  ChatMessage,
  GenerateOptions,
  ChatResponse,
} from "../types";

export class GeminiAdapter implements LLMAdapter {
  private ai: GoogleGenAI;
  private defaultModel = "gemini-2.5-flash";

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn(
        "[GeminiAdapter] GEMINI_API_KEY is not set in environment variables.",
      );
    }
    // GoogleGenAI will read GEMINI_API_KEY from environment automatically, but we can pass it explicitly.
    this.ai = new GoogleGenAI({ apiKey });
  }

  async chat(
    messages: ChatMessage[],
    options?: GenerateOptions,
  ): Promise<ChatResponse> {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "Gemini API key is not configured. Please set GEMINI_API_KEY in your environment.",
      );
    }

    // Gemini doesn't support 'system' messages in the 'contents' array.
    // Instead, they must be passed via the config.systemInstruction.
    const systemMessages = messages.filter((m) => m.role === "system");
    const systemInstruction =
      systemMessages.map((m) => m.content).join("\n") ||
      options?.systemInstruction;

    // Filter out system messages and map user/assistant roles.
    // Note: Gemini expects 'model' instead of 'assistant'.
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const model = options?.model || this.defaultModel;

    try {
      const response = await this.ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: options?.temperature,
          maxOutputTokens: options?.maxTokens,
          topP: options?.topP,
        },
      });

      return {
        content: response.text || "",
        model,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount,
          completionTokens: response.usageMetadata?.candidatesTokenCount,
          totalTokens: response.usageMetadata?.totalTokenCount,
        },
      };
    } catch (error) {
      console.error("[GeminiAdapter] Error generating content:", error);
      throw error;
    }
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: GenerateOptions,
  ): AsyncGenerator<string, void, unknown> {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "Gemini API key is not configured. Please set GEMINI_API_KEY in your environment.",
      );
    }

    const systemMessages = messages.filter((m) => m.role === "system");
    const systemInstruction =
      systemMessages.map((m) => m.content).join("\n") ||
      options?.systemInstruction;

    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const model = options?.model || this.defaultModel;

    try {
      const responseStream = await this.ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: options?.temperature,
          maxOutputTokens: options?.maxTokens,
          topP: options?.topP,
        },
      });

      for await (const chunk of responseStream) {
        yield chunk.text || "";
      }
    } catch (error) {
      console.error("[GeminiAdapter] Error generating content stream:", error);
      throw error;
    }
  }
}
