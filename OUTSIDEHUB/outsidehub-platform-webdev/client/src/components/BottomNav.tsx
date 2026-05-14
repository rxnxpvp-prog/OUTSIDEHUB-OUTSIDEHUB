import React, { useState, useRef, useEffect } from 'react';
import { User, Lock, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface BottomNavProps {
  onProfileClick: () => void;
  onPrivacyClick: () => void;
}

export default function BottomNav({ onProfileClick, onPrivacyClick }: BottomNavProps) {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    <div className="fixed bottom-0 left-0 right-0 glass-dark border-t border-white/10 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* User Info */}
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
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
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-left hover:opacity-80 transition-opacity"
            >
              <div className="font-semibold text-white truncate hover:text-cyan-400">{user.name}</div>
              <div className="text-xs text-cyan-400 font-medium">
                {user.role === 'admin' ? '👑 Admin' : '👤 Usuário'}
              </div>
            </button>
          </div>
        </div>

        {/* Menu Dropdown */}
        {isOpen && (
          <div
            ref={menuRef}
            className="absolute bottom-20 right-6 glass-premium rounded-xl overflow-hidden border border-white/10 z-50 min-w-48"
          >
            <button
              onClick={handleProfileClick}
              className="w-full px-4 py-3 text-left text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 flex items-center gap-2 text-sm border-b border-white/10"
            >
              <User size={16} className="text-cyan-400" />
              Meu Perfil
            </button>

            {user.role === 'admin' && (
              <button
                onClick={handlePrivacyClick}
                className="w-full px-4 py-3 text-left text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 flex items-center gap-2 text-sm border-b border-white/10"
              >
                <Lock size={16} className="text-purple-400" />
                Privacidade
              </button>
            )}

            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 text-left text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all duration-200 flex items-center gap-2 text-sm"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
