import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  fetchConversations,
  fetchMessages,
  deleteConversation,
  sendMessageStream,
} from "@/lib/api";
import type { ConversationData, MessageData } from "@/lib/api";

export function useChatState() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const match = pathname.match(/^\/chat\/([^/]+)/);
  const activeConversationId = match ? match[1] : null;
  const loadedConversationIdRef = useRef<string | null>(null);

  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [messages, setMessages] = useState<MessageData[]>([]);

  const setActiveConversationId = (newId: string | null) => {
    navigate(newId ? `/chat/${newId}` : "/");
  };

  // Model settings state
  const [provider, setProvider] = useState<"mock" | "gemini" | "groq">("mock");
  const [model, setModel] = useState("mock-llama-3-8b");

  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isStreaming = streamingContent !== "";

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancelStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setStreamingContent("");
    setMessages((prev) => prev.filter((m) => m._id !== "temp-user"));
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, isLoading]);

  // Fetch initial conversations
  const loadConversations = async () => {
    try {
      const list = await fetchConversations();
      setConversations(list);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load conversations from database.");
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadConversations();
    };

    void init();
  }, []);

  // Sync model with provider choice
  const handleProviderChange = (newProvider: "mock" | "gemini" | "groq") => {
    setProvider(newProvider);
    if (newProvider === "mock") {
      setModel("mock-llama-3-8b");
    } else if (newProvider === "gemini") {
      setModel("gemini-2.5-flash");
    } else if (newProvider === "groq") {
      setModel("llama-3.1-8b-instant");
    }
  };

  // Load message logs when active conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!activeConversationId) {
        setMessages([]);
        loadedConversationIdRef.current = null;
        return;
      }
      if (activeConversationId === loadedConversationIdRef.current) {
        return;
      }
      try {
        setIsLoading(true);
        setErrorMsg(null);
        const data = await fetchMessages(activeConversationId);
        setMessages(data);
        loadedConversationIdRef.current = activeConversationId;
      } catch (err) {
        console.error(err);
        setErrorMsg("Failed to fetch messages for this conversation.");
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [activeConversationId]);

  // Sync provider/model when active conversation or conversations list changes
  useEffect(() => {
    if (!activeConversationId || !conversations.length) return;
    const activeChat = conversations.find(
      (c) => c._id === activeConversationId,
    );
    if (activeChat) {
      const p = activeChat.provider as "mock" | "gemini" | "groq";
      if (p === "mock" || p === "gemini" || p === "groq") {
        setProvider(p);
      }
      setModel(activeChat.model);
    }
  }, [activeConversationId, conversations]);

  // Handle New Chat Click
  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setErrorMsg(null);
    setStreamingContent("");
    setIsLoading(false);
  };

  // Handle Conversation Delete
  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // prevent select conversation click
    if (!confirm("Are you sure you want to delete this conversation?")) return;

    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c._id !== id));
      if (activeConversationId === id) {
        startNewChat();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to delete conversation.");
    }
  };

  // Handle message sending (SSE Stream)
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading || isStreaming) return;

    setErrorMsg(null);
    setIsLoading(true);
    setStreamingContent("");

    // Setup local messages preview containing user prompt
    const userMsgPlaceholder: MessageData = {
      _id: "temp-user",
      conversationId: activeConversationId || "temp",
      role: "user",
      content: text,
      tokenCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsgPlaceholder]);

    const activeId = activeConversationId;
    let accumulatedContent = "";

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await sendMessageStream(
        {
          conversationId: activeId || undefined,
          message: text,
          provider,
          model,
          temperature: 0.7,
        },
        {
          onChunk: (chunk) => {
            setIsLoading(false);
            accumulatedContent += chunk;
            setStreamingContent(accumulatedContent);
          },
          onDone: ({ conversation, userMessage, assistantMessage }) => {
            setStreamingContent("");
            abortControllerRef.current = null;

            // Update active conversation states
            loadedConversationIdRef.current = conversation._id;
            setActiveConversationId(conversation._id);
            setMessages((prev) => {
              // Filter out temporary prompt, replace with actual persisted messages
              const base = prev.filter((m) => m._id !== "temp-user");
              return [...base, userMessage, assistantMessage];
            });

            // Update the conversations sidebar list state locally without reloading from database
            setConversations((prev) => {
              const exists = prev.some((c) => c._id === conversation._id);
              if (exists) {
                const updated = prev.map((c) =>
                  c._id === conversation._id ? conversation : c,
                );
                return updated.sort(
                  (a, b) =>
                    new Date(b.lastMessageAt).getTime() -
                    new Date(a.lastMessageAt).getTime(),
                );
              } else {
                return [conversation, ...prev];
              }
            });
          },
          onError: (err) => {
            if (controller.signal.aborted) {
              console.log("[useChatState] Chat stream aborted by user.");
              return;
            }
            console.error(err);
            setErrorMsg(err);
            setIsLoading(false);
            setStreamingContent("");
            // remove user message placeholder if it failed completely
            setMessages((prev) => prev.filter((m) => m._id !== "temp-user"));
            abortControllerRef.current = null;
          },
        },
        controller.signal,
      );
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message || "Failed to establish chat stream.");
      setIsLoading(false);
      setMessages((prev) => prev.filter((m) => m._id !== "temp-user"));
      abortControllerRef.current = null;
    }
  };

  return {
    conversations,
    activeConversationId,
    setActiveConversationId,
    messages,
    provider,
    model,
    isSidebarOpen,
    setIsSidebarOpen,
    isLoading,
    isStreaming,
    streamingContent,
    errorMsg,
    setErrorMsg,
    scrollRef,
    startNewChat,
    handleDeleteConversation,
    handleSendMessage,
    handleProviderChange,
    setModel,
    handleCancelStream,
  };
}
