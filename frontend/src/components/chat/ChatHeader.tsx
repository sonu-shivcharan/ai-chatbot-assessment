import { Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/context/ChatContext";

export function ChatHeader() {
  const {
    activeConversationId,
    conversations,
    provider,
    model,
    isSidebarOpen,
    setIsSidebarOpen,
    startNewChat,
  } = useChat();

  const activeConversation = conversations.find(
    (c) => c._id === activeConversationId
  );

  return (
    <header className="flex h-16 items-center justify-between border-b px-6 backdrop-blur-md bg-background/80">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground md:hidden"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Conversation Active Title */}
        <div>
          {activeConversationId ? (
            <div className="flex flex-col">
              <h2 className="text-sm font-semibold text-foreground">
                {activeConversation?.title || "Active Conversation"}
              </h2>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                <span>Active config:</span>
                <span className="uppercase text-muted-foreground">{provider}</span>
                <span>•</span>
                <span className="text-muted-foreground">{model}</span>
              </span>
            </div>
          ) : (
            <div className="flex flex-col">
              <h2 className="text-sm font-semibold text-foreground">
                New Conversation
              </h2>
              <span className="text-[10px] text-muted-foreground">
                Select provider & model below to start
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={startNewChat}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New Chat</span>
        </Button>
      </div>
    </header>
  );
}
