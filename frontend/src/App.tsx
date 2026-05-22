import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ChatProvider, useChat } from "@/context/ChatContext";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { DashboardView } from "@/components/chat/DashboardView";

function ChatDashboard() {
  const { errorMsg, setErrorMsg } = useChat();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-sans text-foreground antialiased relative">
      <Sidebar />

      {/* CHAT CONTAINER */}
      <main className="flex flex-1 flex-col overflow-hidden bg-background relative z-10">
        <ChatHeader />

        {/* ERROR ALERTER */}
        {errorMsg && (
          <div className="bg-destructive/10 border-b border-destructive/20 px-6 py-2.5 text-xs text-destructive flex items-center justify-between">
            <span className="truncate">{errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="hover:text-destructive/80 font-bold ml-2 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <MessageList />

        <ChatInput />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ChatProvider>
        <Routes>
          <Route path="/" element={<ChatDashboard />} />
          <Route path="/chat/:id" element={<ChatDashboard />} />
          <Route path="/dashboard" element={<DashboardView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ChatProvider>
    </BrowserRouter>
  );
}
