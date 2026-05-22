import { Sparkles, Cpu, MessageSquare, Bot, ChevronRight, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageContent } from "./MessageContent";
import { useChat } from "@/context/ChatContext";

const SUGGESTED_PROMPTS = [
  { text: "What is the difference between Vite and Next.js?", icon: Sparkles },
  { text: "Help me write a typescript script to parse SSE events", icon: Cpu },
  { text: "Suggest some rich styling palettes for an AI Chat App", icon: MessageSquare },
];

export function MessageList() {
  const {
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    scrollRef,
    handleSendMessage,
  } = useChat();

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {messages.length === 0 && !isLoading && !isStreaming ? (
          /* EMPTY CHAT PROMPT */
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted border shadow-sm animate-bounce">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                How can I assist you today?
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Select a model provider, type your message, and witness high-performance streaming results.
              </p>
            </div>

            {/* SUGGESTED ACTIONS */}
            <div className="grid grid-cols-1 gap-3 w-full max-w-md">
              {SUGGESTED_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt.text)}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3.5 text-left text-xs hover:bg-accent hover:text-accent-foreground transition-all duration-200 group active:scale-[0.98] cursor-pointer"
                >
                  <prompt.icon className="h-4.5 w-4.5 text-muted-foreground group-hover:text-foreground shrink-0" />
                  <span className="flex-1 truncate font-medium text-foreground">
                    {prompt.text}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* MESSAGE LIST */
          <div className="space-y-6">
            {messages.map((message) => {
              const isAssistant = message.role === "assistant";
              return (
                <div
                  key={message._id}
                  className={`flex gap-4 ${
                    isAssistant ? "justify-start" : "justify-end"
                  }`}
                >
                  {isAssistant && (
                    <Avatar className="h-8 w-8 border bg-muted shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        AI
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`rounded-2xl px-4 py-3 shadow-sm max-w-[85%] border ${
                      isAssistant
                        ? "bg-muted text-foreground border-border"
                        : "bg-primary text-primary-foreground border-primary"
                    }`}
                  >
                    {isAssistant ? (
                      <MessageContent content={message.content} />
                    ) : (
                      <p className="text-[15px] whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                    )}
                  </div>

                  {!isAssistant && (
                    <Avatar className="h-8 w-8 border bg-muted shrink-0">
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                        ME
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })}

            {/* CURRENT STREAMING CHUNKS CONTAINER */}
            {isStreaming && streamingContent && (
              <div className="flex gap-4 justify-start">
                <Avatar className="h-8 w-8 border bg-muted shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    AI
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-2xl px-4 py-3 bg-muted text-foreground shadow-sm max-w-[85%] border border-border">
                  <MessageContent content={streamingContent} />
                  {/* Pulse Cursor */}
                  <span className="inline-block h-3 w-1.5 bg-foreground animate-pulse ml-1" />
                </div>
              </div>
            )}

            {/* INITIAL LOADING STATE (AI THINKING) */}
            {isLoading && (
              <div className="flex gap-4 justify-start">
                <Avatar className="h-8 w-8 border bg-muted shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    AI
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-2xl px-4 py-3 bg-muted text-muted-foreground max-w-[80%] border border-border flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-xs italic tracking-wide">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Scroll Anchor */}
        <div ref={scrollRef} />
      </div>
    </div>
  );
}
