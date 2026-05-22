export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface GenerateOptions extends LLMConfig {
  systemInstruction?: string;
}

export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: TokenUsage;
}

export interface LLMAdapter {
  chat(messages: ChatMessage[], options?: GenerateOptions): Promise<ChatResponse>;
  chatStream(messages: ChatMessage[], options?: GenerateOptions): AsyncGenerator<string, void, unknown>;
}
