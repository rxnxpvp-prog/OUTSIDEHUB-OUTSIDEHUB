import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Trash2, MessageCircle, Reply, X, AtSign } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '🔥', '🎉', '✨', '🚀', '💯'];

export default function GlobalChat() {
  const [messageInput, setMessageInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<string[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, addReaction, deleteMessage } = useChat();
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getUniqueUsers = () => {
    const users = new Set(messages.map(m => m.userName));
    if (user) users.add(user.name);
    return Array.from(users);
  };

  const handleMentionInput = (text: string) => {
    setMessageInput(text);
    
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const searchText = text.substring(lastAtIndex + 1).toLowerCase();
      const users = getUniqueUsers().filter(u => 
        u.toLowerCase().includes(searchText) && u !== user?.name
      );
      setMentionSuggestions(users);
      setShowMentions(users.length > 0);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (userName: string) => {
    const lastAtIndex = messageInput.lastIndexOf('@');
    const beforeMention = messageInput.substring(0, lastAtIndex);
    setMessageInput(`${beforeMention}@${userName} `);
    setShowMentions(false);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (user && messageInput.trim()) {
      const mentions = messageInput.match(/@(\w+)/g)?.map(m => m.substring(1)) || [];
      sendMessage(messageInput, user.id, user.name, user.avatar, replyingTo?.id, mentions);
      setMessageInput('');
      setReplyingTo(null);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-background/50">
      {/* Header */}
      <div className="glass-dark border-b border-white/10 p-4 flex items-center gap-3">
        <MessageCircle size={24} className="text-cyan-400" />
        <div>
          <h2 className="font-semibold text-white">Chat Global</h2>
          <p className="text-xs text-white/60">Conectado • {messages.length} mensagens</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className="group">
            {/* Reply Reference */}
            {msg.replyTo && (
              <div className="ml-12 mb-2 pl-3 border-l-2 border-purple-500/30 text-xs text-white/60">
                <div className="font-semibold text-purple-300">↳ Respondendo a mensagem</div>
              </div>
            )}

            <div className="glass-dark p-3 rounded-lg hover:bg-white/10 transition-all">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                    {msg.userAvatar ? (
                      typeof msg.userAvatar === 'string' && msg.userAvatar.startsWith('data:') ? (
                        <img src={msg.userAvatar} alt={msg.userName} className="w-full h-full object-cover" />
                      ) : (
                        msg.userAvatar
                      )
                    ) : (
                      msg.userName.charAt(0)
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white text-xs flex items-center gap-1">
                      {msg.userName}
                      {(msg as any).userRole === 'admin' && <span className="text-red-500">👑</span>}
                      {msg.userAvatar && (msg as any).userBadges && (msg as any).userBadges.length > 0 && (
                        <div className="flex gap-0.5">
                          {(msg as any).userBadges.slice(0, 3).map((badge: any) => (
                            <span key={badge.id} title={badge.name} className="text-xs">
                              {badge.image ? (
                                <img src={badge.image} alt={badge.name} className="w-4 h-4 rounded-full" />
                              ) : (
                                badge.icon
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-white/40">{formatTime(msg.timestamp)}</div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => setReplyingTo(msg)}
                    className="p-1 hover:bg-purple-500/20 rounded transition-all text-purple-400 text-xs"
                    title="Responder"
                  >
                    <Reply size={12} />
                  </button>
                  {user?.id === msg.userId && (
                    <button
                      onClick={() => deleteMessage(msg.id, msg.userId)}
                      className="p-1 hover:bg-red-500/20 rounded transition-all text-red-400 text-xs"
                      title="Deletar"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-white/80 text-xs break-words mb-2 leading-relaxed">
                {msg.content.split(/(@\w+)/g).map((part, idx) => {
                  if (part.startsWith('@')) {
                    const mentionedUser = part.substring(1);
                    const userExists = getUniqueUsers().some(u => u.toLowerCase() === mentionedUser.toLowerCase());
                    return (
                      <span key={idx} className={userExists ? 'text-cyan-300 font-semibold' : 'text-red-300 font-semibold'}>
                        {part}
                      </span>
                    );
                  }
                  return part;
                })}
              </p>

              {/* Reactions */}
              <div className="flex flex-wrap gap-1 items-center">
                {msg.reactions && Object.entries(msg.reactions).map(([emoji, count]) => (
                  <button
                    key={emoji}
                    onClick={() => addReaction(msg.id, emoji)}
                    className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 rounded-full text-xs transition-all border border-white/10 hover:border-white/20"
                  >
                    {emoji} {count}
                  </button>
                ))}
                <button
                  onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                  className="p-0.5 hover:bg-white/10 rounded transition-all text-white/40 hover:text-white"
                >
                  <Smile size={12} />
                </button>
              </div>

              {/* Emoji Picker */}
              {showEmojiPicker === msg.id && (
                <div className="mt-2 p-1.5 bg-white/5 rounded-lg border border-white/10 flex flex-wrap gap-1">
                  {EMOJI_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        addReaction(msg.id, emoji);
                        setShowEmojiPicker(null);
                      }}
                      className="text-sm hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="glass-dark mx-4 mt-4 p-3 rounded-lg border border-purple-500/30 flex items-center justify-between">
          <div className="text-sm">
            <div className="font-semibold text-purple-300">Respondendo {replyingTo.userName}</div>
            <div className="text-white/70 text-xs">{replyingTo.content.substring(0, 60)}...</div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 hover:bg-red-500/20 rounded transition-colors text-red-400"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Input */}
      {user ? (
        <form onSubmit={handleSendMessage} className="glass-dark border-t border-white/10 p-4">
          <div className="relative mb-3">
            <div className="flex gap-3 relative">
              <div className="flex-1 relative">
                <AtSign size={16} className="absolute left-3 top-3 text-white/40 pointer-events-none" />
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => handleMentionInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(e as any)}
                  placeholder="Digite @ para mencionar alguém..."
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={!messageInput.trim()}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send size={16} />
              </button>
            </div>

            {/* Mention Suggestions */}
            {showMentions && mentionSuggestions.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 glass-dark rounded-lg border border-white/10 p-2 space-y-1 z-10">
                {mentionSuggestions.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => insertMention(u)}
                    className="w-full text-left px-3 py-2 hover:bg-white/10 rounded text-white text-sm transition-colors"
                  >
                    @{u}
                  </button>
                ))}
              </div>
            )}
          </div>
        </form>
      ) : (
        <div className="glass-dark border-t border-white/10 p-4 text-center text-white/60 text-sm">
          Faça login para enviar mensagens
        </div>
      )}
    </div>
  );
}
