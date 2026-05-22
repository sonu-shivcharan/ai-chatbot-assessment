import React, { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChat } from "@/context/ChatContext";

const PROVIDER_MODELS = {
  mock: [
    { value: "mock-llama-3-8b", label: "Mock Llama 3 (8B)" },
  ],
  gemini: [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  ],
  groq: [
    { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
    { value: "groq/compound", label: "Groq Compound" },
  ],
};

export function ChatInput() {
  const {
    provider,
    model,
    isLoading,
    isStreaming,
    handleProviderChange,
    setModel,
    handleSendMessage,
  } = useChat();

  const [inputMessage, setInputMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading || isStreaming) return;
    handleSendMessage(inputMessage);
    setInputMessage("");
  };

  return (
    <footer className="border-t bg-background p-4 backdrop-blur-md">
      <div className="mx-auto max-w-3xl space-y-3">
        {/* PROVIDER AND MODEL CONFIG ROW */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground font-medium mr-1">
            Configure Model:
          </span>

          {/* Provider Selector */}
          <Select
            value={provider}
            onValueChange={(val: any) => handleProviderChange(val)}
            disabled={isLoading || isStreaming}
          >
            <SelectTrigger className="h-8 w-32 border-input bg-background text-foreground">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mock">Mock Adapter</SelectItem>
              <SelectItem value="gemini">Gemini API</SelectItem>
              <SelectItem value="groq">Groq API</SelectItem>
            </SelectContent>
          </Select>

          {/* Model Selector */}
          <Select
            value={model}
            onValueChange={setModel}
            disabled={isLoading || isStreaming}
          >
            <SelectTrigger className="h-8 w-44 border-input bg-background text-foreground">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              {PROVIDER_MODELS[provider].map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* MESSAGE INPUT BOX */}
        <form
          onSubmit={handleSubmit}
          className="relative flex items-center overflow-hidden rounded-xl border bg-background focus-within:ring-1 focus-within:ring-ring transition-all shadow-inner"
        >
          <Input
            type="text"
            placeholder={
              isLoading || isStreaming
                ? "Generating reply..."
                : `Send a message using ${provider}...`
            }
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading || isStreaming}
            className="flex-1 border-none bg-transparent py-6 px-4 text-[15px] focus-visible:ring-0 placeholder:text-muted-foreground text-foreground"
          />
          <div className="flex items-center gap-2 pr-3">
            <Button
              type="submit"
              size="icon"
              disabled={!inputMessage.trim() || isLoading || isStreaming}
              className="h-9 w-9 rounded-lg transition-all active:scale-95 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>

        {/* HELPER CAPTION */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
          <span>Press enter to send</span>
          <span>All responses are fully database-persisted.</span>
        </div>
      </div>
    </footer>
  );
}
