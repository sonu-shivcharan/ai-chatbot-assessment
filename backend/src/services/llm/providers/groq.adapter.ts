import Groq from "groq-sdk";
import type {
  LLMAdapter,
  ChatMessage,
  GenerateOptions,
  ChatResponse,
} from "../types";

export class GroqAdapter implements LLMAdapter {
  private groq: Groq;
  private defaultModel = "llama-3.1-8b-instant";

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn(
        "[GroqAdapter] GROQ_API_KEY is not set in environment variables.",
      );
    }
    this.groq = new Groq({ apiKey });
  }

  async chat(
    messages: ChatMessage[],
    options?: GenerateOptions,
  ): Promise<ChatResponse> {
    if (!process.env.GROQ_API_KEY) {
      throw new Error(
        "Groq API key is not configured. Please set GROQ_API_KEY in your environment.",
      );
    }

    const messagesToPass = [...messages];

    // Prepend system instruction if provided in options and not already at the front
    if (options?.systemInstruction) {
      messagesToPass.unshift({
        role: "system",
        content: options.systemInstruction,
      });
    }

    const model = options?.model || this.defaultModel;

    try {
      const response = await this.groq.chat.completions.create({
        model,
        messages: messagesToPass,
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
        top_p: options?.topP,
      });

      const content = response.choices[0]?.message?.content || "";

      return {
        content,
        model,
        usage: {
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
          totalTokens: response.usage?.total_tokens,
        },
      };
    } catch (error) {
      console.error("[GroqAdapter] Error generating content:", error);
      throw error;
    }
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: GenerateOptions,
  ): AsyncGenerator<string, void, unknown> {
    if (!process.env.GROQ_API_KEY) {
      throw new Error(
        "Groq API key is not configured. Please set GROQ_API_KEY in your environment.",
      );
    }

    const messagesToPass = [...messages];

    // Prepend system instruction if provided in options and not already at the front
    if (options?.systemInstruction) {
      messagesToPass.unshift({
        role: "system",
        content: options.systemInstruction,
      });
    }

    const model = options?.model || this.defaultModel;

    try {
      const responseStream = await this.groq.chat.completions.create({
        model,
        messages: messagesToPass,
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
        top_p: options?.topP,
        stream: true,
      });

      for await (const chunk of responseStream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error("[GroqAdapter] Error generating content stream:", error);
      throw error;
    }
  }
}
