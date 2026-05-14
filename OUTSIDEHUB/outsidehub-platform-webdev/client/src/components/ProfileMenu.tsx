import React, { useState, useRef, useEffect } from 'react';
import { User, Lock, LogOut, Settings, Eye, EyeOff, BadgeIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileMenuProps {
  onProfileClick: () => void;
  onPrivacyClick: () => void;
}

export default function ProfileMenu({ onProfileClick, onPrivacyClick }: ProfileMenuProps) {
  const { user, logout, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    onProfileClick();
    setIsOpen(false);
  };

  const handlePrivacyClick = () => {
    onPrivacyClick();
    setIsOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden hover:ring-2 transition-all duration-200 ${
          user.role === 'admin' 
            ? 'bg-gradient-to-br from-red-500 to-orange-500 hover:ring-red-400' 
            : 'bg-gradient-to-br from-purple-500 to-cyan-500 hover:ring-purple-400'
        }`}
      >
        {user.avatar ? (
          typeof user.avatar === 'string' && user.avatar.startsWith('data:') ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            user.name.charAt(0)
          )
        ) : (
          user.name.charAt(0)
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 glass-premium rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-50 animate-slide-in">
          {/* Header */}
          <div className={`p-4 border-b border-white/10 ${
            user.role === 'admin' ? 'bg-red-500/10' : 'bg-purple-500/10'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0 overflow-hidden ${
                user.role === 'admin' 
                  ? 'bg-gradient-to-br from-red-500 to-orange-500' 
                  : 'bg-gradient-to-br from-purple-500 to-cyan-500'
              }`}>
                {user.avatar ? (
                  typeof user.avatar === 'string' && user.avatar.startsWith('data:') ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name.charAt(0)
                  )
                ) : (
                  user.name.charAt(0)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate text-sm">{user.name}</div>
                <div className="text-xs text-white/50 truncate">@{(user as any).username || user.email}</div>
                <div className={`text-xs font-bold mt-1 flex items-center gap-1 ${
                  user.role === 'admin' ? 'text-red-400' : 'text-cyan-400'
                }`}>
                  {user.role === 'admin' ? '👑 Administrador' : '👤 Usuário'}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={handleProfileClick}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-all duration-200 text-white/80 hover:text-white"
            >
              <User size={18} className="text-cyan-400 flex-shrink-0" />
              <span className="text-sm font-medium">Meu Perfil</span>
            </button>

            <button
              onClick={handlePrivacyClick}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-all duration-200 text-white/80 hover:text-white"
            >
              <Eye size={18} className="text-purple-400 flex-shrink-0" />
              <span className="text-sm font-medium">Privacidade</span>
            </button>

            <button
              onClick={handleProfileClick}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-all duration-200 text-white/80 hover:text-white"
            >
              <Settings size={18} className="text-blue-400 flex-shrink-0" />
              <span className="text-sm font-medium">Configurações</span>
            </button>

            {isAdmin && (
              <>
                <div className="border-t border-white/10 my-2" />
                <a
                  href="#admin"
                  onClick={(e) => {
                    e.preventDefault();
                    onPrivacyClick();
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-500/20 transition-all duration-200 text-red-400 hover:text-red-300"
                >
                  <BadgeIcon size={18} className="flex-shrink-0" />
                  <span className="text-sm font-medium">Painel Admin</span>
                </a>
              </>
            )}

            <div className="border-t border-white/10 my-2" />

            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-500/20 transition-all duration-200 text-red-400 hover:text-red-300"
            >
              <LogOut size={18} className="flex-shrink-0" />
              <span className="text-sm font-medium">Sair</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
