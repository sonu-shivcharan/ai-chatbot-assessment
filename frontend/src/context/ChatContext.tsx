import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useChatState } from "@/hooks/useChatState";

type ChatState = ReturnType<typeof useChatState>;

const ChatContext = createContext<ChatState | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const chatState = useChatState();
  return (
    <ChatContext.Provider value={chatState}>{children}</ChatContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
