import type {
  LLMAdapter,
  ChatMessage,
  GenerateOptions,
  ChatResponse,
} from "../types";

export class MockAdapter implements LLMAdapter {
  private defaultModel = "mock-llama-3-8b";

  async chat(
    messages: ChatMessage[],
    options?: GenerateOptions,
  ): Promise<ChatResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const lastUserMessage =
      [...messages].reverse().find((m) => m.role === "user")?.content || "";

    let content = `This is a mock response from the LLM adapter.
Your last message was: "${lastUserMessage}"
System instruction configured: "${options?.systemInstruction || "none"}"`;

    if (lastUserMessage.toLowerCase().includes("hello")) {
      content = `Hello! I am a simulated assistant. How can I help you today?`;
    }

    const model = options?.model || this.defaultModel;
    const promptTokens = Math.ceil(JSON.stringify(messages).length / 4);
    const completionTokens = Math.ceil(content.length / 4);

    return {
      content,
      model,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
    };
  }

  async *chatStream(messages: ChatMessage[], options?: GenerateOptions): AsyncGenerator<string, void, unknown> {
    const response = await this.chat(messages, options);
    const words = response.content.split(/(\s+)/);
    for (const word of words) {
      if (word) {
        yield word;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  }
}
