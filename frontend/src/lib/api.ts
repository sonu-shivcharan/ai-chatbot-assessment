export const API_BASE_URL = "http://localhost:3000/api";

export interface ConversationData {
  _id: string;
  title: string;
  provider: string;
  model: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageData {
  _id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  tokenCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

export async function fetchConversations(): Promise<ConversationData[]> {
  const response = await fetch(`${API_BASE_URL}/chats/conversations`);
  if (!response.ok) {
    throw new Error("Failed to fetch conversations");
  }
  const result: ApiResponse<ConversationData[]> = await response.json();
  return result.data || [];
}

export async function fetchMessages(
  conversationId: string,
): Promise<MessageData[]> {
  const response = await fetch(
    `${API_BASE_URL}/chats/conversations/${conversationId}/messages`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch conversation messages");
  }
  const result: ApiResponse<MessageData[]> = await response.json();
  return result.data || [];
}

export async function deleteConversation(
  conversationId: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/chats/conversations/${conversationId}`,
    {
      method: "DELETE",
    },
  );
  if (!response.ok) {
    throw new Error("Failed to delete conversation");
  }
}

export interface StreamHandlers {
  onChunk?: (chunk: string) => void;
  onDone?: (data: {
    conversation: ConversationData;
    userMessage: MessageData;
    assistantMessage: MessageData;
  }) => void;
  onError?: (error: string) => void;
}

export async function sendMessageStream(
  payload: {
    conversationId?: string;
    message: string;
    provider: string;
    model: string;
    temperature?: number;
  },
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/chats/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = "Failed to send message";
      try {
        const parsed = JSON.parse(errorText);
        errorMsg = parsed.message || errorMsg;
      } catch {
        errorMsg = errorText || errorMsg;
      }
      throw new Error(errorMsg);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No readable stream in response");
    }

    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      // Keep the last incomplete block in the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        const cleanedLine = line.trim();
        if (!cleanedLine) continue;

        if (cleanedLine.startsWith("data: ")) {
          const dataStr = cleanedLine.slice(6);
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              handlers.onError?.(parsed.error);
              return;
            }
            if (parsed.chunk !== undefined) {
              handlers.onChunk?.(parsed.chunk);
            }
            if (parsed.done) {
              handlers.onDone?.({
                conversation: parsed.conversation,
                userMessage: parsed.userMessage,
                assistantMessage: parsed.assistantMessage,
              });
              return;
            }
          } catch (e) {
            console.error("Error parsing stream line:", cleanedLine, e);
          }
        }
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    handlers.onError?.(message || "An error occurred during streaming");
  }
}

export interface DashboardSummary {
  timeframe: string;
  summary: {
    totalRequests: number;
    successRequests: number;
    errorRequests: number;
    avgLatencyMs: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    errorRate: number;
  };
  providers: Array<{
    provider: string;
    totalRequests: number;
    successRequests: number;
    errorRequests: number;
    errorRate: number;
    avgLatencyMs: number;
    totalTokens: number;
  }>;
  models: Array<{
    provider: string;
    model: string;
    totalRequests: number;
    successRequests: number;
    errorRequests: number;
    errorRate: number;
    avgLatencyMs: number;
    totalTokens: number;
  }>;
}

export interface DashboardTimeSeries {
  timestamp: string;
  totalRequests: number;
  successRequests: number;
  errorRequests: number;
  errorRate: number;
  avgLatencyMs: number;
  totalTokens: number;
}

export async function fetchDashboardSummary(timeframe = "24h"): Promise<DashboardSummary> {
  const response = await fetch(`${API_BASE_URL}/dashboard/summary?timeframe=${timeframe}`);
  if (!response.ok) {
    throw new Error("Failed to fetch dashboard summary");
  }
  const result: ApiResponse<DashboardSummary> = await response.json();
  return result.data;
}

export async function fetchDashboardTimeSeries(timeframe = "24h"): Promise<DashboardTimeSeries[]> {
  const response = await fetch(`${API_BASE_URL}/dashboard/time-series?timeframe=${timeframe}`);
  if (!response.ok) {
    throw new Error("Failed to fetch dashboard time-series");
  }
  const result: ApiResponse<DashboardTimeSeries[]> = await response.json();
  return result.data || [];
}
