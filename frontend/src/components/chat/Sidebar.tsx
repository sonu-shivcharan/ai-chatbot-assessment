import { MessageSquare, Plus, Bot, X, BarChart2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/context/ChatContext";
import { useNavigate, useLocation } from "react-router-dom";

export function Sidebar() {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    isSidebarOpen,
    setIsSidebarOpen,
    startNewChat,
    handleDeleteConversation,
  } = useChat();

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDashboard = pathname === "/dashboard";

  return (
    <>
      {/* MOBILE SIDEBAR DRAWERS BACKDROP */}
      {!isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(true)}
        />
      )}

      {/* SIDEBAR CONTAINER */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r bg-card text-card-foreground transition-all duration-300 ease-in-out md:static md:translate-x-0 ${
          isSidebarOpen ? "-translate-x-full" : "translate-x-0"
        }`}
      >
        {/* SIDEBAR HEADER */}
        <div className="flex h-16 items-center justify-between border-b px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bot className="h-5 w-5" />
            </div>
            <span className="font-semibold text-lg tracking-tight">
              AntiChat SDK
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setIsSidebarOpen(true)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* SIDEBAR NAVIGATION BUTTONS */}
        <div className="p-4 space-y-2">
          <Button
            onClick={() => {
              startNewChat();
              setIsSidebarOpen(true); // Close drawer on mobile
            }}
            variant={!isDashboard ? "default" : "outline"}
            className="w-full justify-start gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            New conversation
          </Button>

          <Button
            onClick={() => {
              navigate("/dashboard");
              setIsSidebarOpen(true); // Close drawer on mobile
            }}
            variant={isDashboard ? "secondary" : "ghost"}
            className="w-full justify-start gap-2 cursor-pointer"
          >
            <BarChart2 className="h-4 w-4" />
            Metrics Dashboard
          </Button>
        </div>

        {/* RECENT CONVERSATIONS LIST */}
        <ScrollArea className="flex-1 px-4 py-2">
          <div className="space-y-1">
            <h3 className=" text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Recent Chats
            </h3>
            {conversations.length === 0 ? (
              <p className="px-2 py-4 text-xs text-muted-foreground italic">
                No conversations yet
              </p>
            ) : (
              conversations.map((chat) => {
                const isActive = chat._id === activeConversationId;
                return (
                  <div
                    key={chat._id}
                    onClick={() => {
                      setActiveConversationId(chat._id);
                      setIsSidebarOpen(true); // Close drawer on mobile
                    }}
                    className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all duration-150 cursor-pointer ${
                      isActive
                        ? "bg-accent text-accent-foreground shadow-sm border"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                      <MessageSquare
                        className={`h-4.5 w-4.5 shrink-0 ${
                          isActive ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                      <span className="truncate font-medium">{chat.title}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={(e) => handleDeleteConversation(e, chat._id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* SIDEBAR FOOTER */}
        <div className="border-t p-4 bg-muted/20">
          <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Database Synced</span>
          </div>
        </div>
      </aside>
    </>
  );
}
