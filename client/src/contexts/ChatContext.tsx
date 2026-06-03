import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import { subscribeRealtime } from "@/lib/realtime";

export interface Message {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole?: string;
  userBadges?: { id: string; name: string; icon: string; image?: string; color?: string }[];
  channel: string;
  replyTo?: string;
  replyToMessage?: {
    id: string;
    content: string;
    userName: string;
    attachments?: ChatAttachment[];
  };
  attachments?: ChatAttachment[];
  reactions: Record<string, number>;
  createdAt: string;
}

export interface ChatAttachment {
  id?: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface ChatContextType {
  messages: Message[];
  channels: ChatChannel[];
  currentChannel: string;
  loading: boolean;
  sendMessage: (content: string, replyTo?: string, attachments?: ChatAttachment[]) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  addReaction: (id: string, emoji: string) => Promise<void>;
  setCurrentChannel: (channel: string) => void;
  refresh: () => void;
}

export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  locked?: boolean;
  createdAt: string;
}

export const DEFAULT_CHANNELS: ChatChannel[] = [
  { id: "general", name: "general", description: "Chat principal", createdAt: "" },
  { id: "random", name: "random", description: "Assuntos livres", createdAt: "" },
  { id: "announcements", name: "announcements", description: "Anuncios", locked: true, createdAt: "" },
];

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [channels, setChannels] = useState<ChatChannel[]>(DEFAULT_CHANNELS);
  const [currentChannel, setCurrentChannel] = useState("general");
  const [loading, setLoading] = useState(false);
  const fetchingChannelsRef = useRef(false);
  const fetchingMessagesRef = useRef(false);

  const fetchChannels = useCallback(async () => {
    if (fetchingChannelsRef.current) return;
    fetchingChannelsRef.current = true;
    try {
      const res = await api.get("/chat/channels");
      const next = res.data.length ? res.data : DEFAULT_CHANNELS;
      setChannels(next);
      if (!next.some((channel: ChatChannel) => channel.name === currentChannel)) {
        setCurrentChannel(next[0].name);
      }
    } catch {
      setChannels(DEFAULT_CHANNELS);
    } finally {
      fetchingChannelsRef.current = false;
    }
  }, [currentChannel]);

  const fetchMessages = useCallback(async (showSpinner = false) => {
    if (fetchingMessagesRef.current) return;
    fetchingMessagesRef.current = true;
    if (showSpinner) setLoading(true);
    try {
      const res = await api.get(`/chat/messages?channel=${currentChannel}`);
      setMessages(res.data);
    } catch {
    } finally {
      fetchingMessagesRef.current = false;
      if (showSpinner) setLoading(false);
    }
  }, [currentChannel]);

  useEffect(() => {
    const token = localStorage.getItem("outsidehub_token");
    if (!token) return;
    fetchChannels();
    fetchMessages(true);
    const unsubscribe = subscribeRealtime((event) => {
      if (event.type === "sync" || event.type === "channels:changed") {
        fetchChannels();
      }
      if (event.type === "sync" || event.type === "users:changed") {
        fetchMessages(false);
      }
      if (event.type === "chat:changed" && (!event.channel || event.channel === currentChannel)) {
        fetchMessages(false);
      }
    });
    const interval = setInterval(() => {
      fetchChannels();
      fetchMessages(false);
    }, 5000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [fetchChannels, fetchMessages]);

  const sendMessage = async (content: string, replyTo?: string, attachments: ChatAttachment[] = []) => {
    const res = await api.post("/chat/messages", { content, channel: currentChannel, replyTo, attachments });
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
        channels,
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
