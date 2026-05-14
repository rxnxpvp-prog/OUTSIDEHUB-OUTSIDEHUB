import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

export interface Message {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  channel: string;
  replyTo?: string;
  reactions: Record<string, number>;
  createdAt: string;
}

export interface ChatContextType {
  messages: Message[];
  currentChannel: string;
  loading: boolean;
  sendMessage: (content: string, replyTo?: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  addReaction: (id: string, emoji: string) => Promise<void>;
  setCurrentChannel: (channel: string) => void;
  refresh: () => void;
}

export const CHANNELS = ["general", "random", "announcements"];

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentChannel, setCurrentChannel] = useState("general");
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/chat/messages?channel=${currentChannel}`);
      setMessages(res.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [currentChannel]);

  useEffect(() => {
    const token = localStorage.getItem("outsidehub_token");
    if (!token) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const sendMessage = async (content: string, replyTo?: string) => {
    const res = await api.post("/chat/messages", { content, channel: currentChannel, replyTo });
    setMessages((prev) => [...prev, res.data]);
  };

  const deleteMessage = async (id: string) => {
    await api.delete(`/chat/messages/${id}`);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const addReaction = async (id: string, emoji: string) => {
    const res = await api.post(`/chat/messages/${id}/react`, { emoji });
    setMessages((prev) => prev.map((m) => (m.id === id ? res.data : m)));
  };

  const handleSetChannel = (channel: string) => {
    setCurrentChannel(channel);
    setMessages([]);
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        currentChannel,
        loading,
        sendMessage,
        deleteMessage,
        addReaction,
        setCurrentChannel: handleSetChannel,
        refresh: fetchMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
