import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Message {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: string;
  replyTo?: string;
  mentions?: string[];
  reactions?: Record<string, number>;
  channel?: string;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface ChatContextType {
  messages: Message[];
  channels: Channel[];
  currentChannel: string;
  onlineUsers: Set<string>;
  sendMessage: (content: string, userId: string, userName: string, userAvatar?: string, replyTo?: string, mentions?: string[]) => void;
  addReaction: (messageId: string, emoji: string) => void;
  deleteMessage: (messageId: string, userId: string) => void;
  setCurrentChannel: (channelId: string) => void;
  addChannel: (name: string, description?: string) => void;
  setUserOnline: (userId: string, online: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const SEED_CHANNELS = [
  { id: 'general', name: 'General', description: 'Canal geral de discussão', createdAt: new Date().toISOString() },
  { id: 'random', name: 'Random', description: 'Conversas aleatórias', createdAt: new Date().toISOString() },
  { id: 'announcements', name: 'Announcements', description: 'Anúncios importantes', createdAt: new Date().toISOString() },
];

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const stored = localStorage.getItem('outsidehub_messages');
    return stored ? JSON.parse(stored) : [];
  });

  const [channels, setChannels] = useState<Channel[]>(() => {
    const stored = localStorage.getItem('outsidehub_channels');
    return stored ? JSON.parse(stored) : SEED_CHANNELS;
  });

  const [currentChannel, setCurrentChannel] = useState('general');
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // Persist messages
  useEffect(() => {
    localStorage.setItem('outsidehub_messages', JSON.stringify(messages));
  }, [messages]);

  // Persist channels
  useEffect(() => {
    localStorage.setItem('outsidehub_channels', JSON.stringify(channels));
  }, [channels]);

  // Persist online users
  useEffect(() => {
    localStorage.setItem('outsidehub_online_users', JSON.stringify(Array.from(onlineUsers)));
  }, [onlineUsers]);

  // Load online users on mount
  useEffect(() => {
    const stored = localStorage.getItem('outsidehub_online_users');
    if (stored) {
      setOnlineUsers(new Set(JSON.parse(stored)));
    }
  }, []);

  const sendMessage = (content: string, userId: string, userName: string, userAvatar?: string, replyTo?: string, mentions?: string[]) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      userId,
      userName,
      userAvatar,
      timestamp: new Date().toISOString(),
      replyTo,
      mentions,
      reactions: {},
      channel: currentChannel,
    };

    setMessages([...messages, newMessage]);
  };

  const addReaction = (messageId: string, emoji: string) => {
    setMessages(messages.map(msg => {
      if (msg.id === messageId) {
        const reactions = msg.reactions || {};
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return { ...msg, reactions };
      }
      return msg;
    }));
  };

  const deleteMessage = (messageId: string, userId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message && (message.userId === userId || userId === 'admin')) {
      setMessages(messages.filter(m => m.id !== messageId));
    }
  };

  const addChannel = (name: string, description?: string) => {
    const newChannel: Channel = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      description,
      createdAt: new Date().toISOString(),
    };
    setChannels([...channels, newChannel]);
  };

  const setUserOnline = (userId: string, online: boolean) => {
    const updated = new Set(onlineUsers);
    if (online) {
      updated.add(userId);
    } else {
      updated.delete(userId);
    }
    setOnlineUsers(updated);
  };

  return (
    <ChatContext.Provider
      value={{
        messages: messages.filter(m => m.channel === currentChannel),
        channels,
        currentChannel,
        onlineUsers,
        sendMessage,
        addReaction,
        deleteMessage,
        setCurrentChannel,
        addChannel,
        setUserOnline,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}
