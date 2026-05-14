import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';

export default function RightSidebar() {
  const { user } = useAuth();
  const { onlineUsers, setUserOnline } = useChat();
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('outsidehub_users');
    if (stored) {
      setAllUsers(JSON.parse(stored));
    }
  }, []);

  // Simular usuário online quando a página está aberta
  useEffect(() => {
    if (user) {
      setUserOnline(user.id, true);

      // Remover do online quando sair
      return () => {
        setUserOnline(user.id, false);
      };
    }
  }, [user?.id]);

  const isOnline = (userId: string) => {
    return Array.from(onlineUsers).includes(userId);
  };

  return (
    <aside className="w-64 glass-dark h-screen flex flex-col border-l border-white/10 overflow-hidden">
      {/* Header */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-white/10">
        <Users size={20} className="text-cyan-400" />
        <h2 className="font-semibold text-white">Online ({onlineUsers.size})</h2>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
        {allUsers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white/60 text-sm">Nenhum usuário</p>
          </div>
        ) : (
          allUsers.map(u => (
            <div
              key={u.id}
              className="p-3 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                    {u.avatar ? (
                      typeof u.avatar === 'string' && u.avatar.startsWith('data:') ? (
                        <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                      ) : (
                        u.name.charAt(0)
                      )
                    ) : (
                      u.name.charAt(0)
                    )}
                  </div>
                  {/* Online Status Indicator */}
                  <div
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                      isOnline(u.id) ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white text-sm truncate">{u.name}</div>
                  <div className={`text-xs ${isOnline(u.id) ? 'text-green-400' : 'text-gray-400'}`}>
                    {isOnline(u.id) ? 'Online' : 'Offline'}
                  </div>
                </div>

                {/* Badges */}
                {u.badges && u.badges.length > 0 && (
                  <div className="flex gap-1">
                    {u.badges.slice(0, 2).map((badge: any) => (
                      <span key={badge.id} title={badge.name} className="text-sm">
                        {badge.icon}
                      </span>
                    ))}
                    {u.badges.length > 2 && (
                      <span className="text-xs text-white/60">+{u.badges.length - 2}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
