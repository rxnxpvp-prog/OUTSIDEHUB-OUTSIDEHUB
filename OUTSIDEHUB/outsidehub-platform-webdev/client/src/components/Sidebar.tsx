import React, { useEffect, useState } from 'react';
import { 
  MessageCircle, 
  Zap,
  Mail,
  Send,
  Settings,
  Search,
  Download,
  Activity,
  Database,
  FileText,
  ChevronLeft,
  ChevronRight,
  User,
  Eye,
  LogOut,
  BadgeIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const PAGES = [
  { id: 'feed', label: 'Feed', icon: Activity },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'tempmail', label: 'TempMail', icon: Mail },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'builders', label: 'Builders', icon: Zap },
  { id: 'logs', label: 'Logs', icon: FileText },
  { id: 'scraper', label: 'Scraper', icon: Download },
  { id: 'admin', label: 'Admin', icon: Settings },
];

export default function Sidebar({ isOpen, currentPage, onPageChange }: SidebarProps) {
  const { user, isAdmin, logout } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string>(localStorage.getItem('outsidehub_logo') || '🔵');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const handleLogoUpdate = (event: any) => {
      setLogoUrl(event.detail);
    };
    window.addEventListener('logoUpdated', handleLogoUpdate);
    return () => window.removeEventListener('logoUpdated', handleLogoUpdate);
  }, []);

  const visiblePages = isAdmin ? PAGES : PAGES.filter(p => p.id !== 'admin');

  return (
    <aside className={`${
      isOpen ? 'w-64' : 'w-20'
    } glass-dark h-screen flex flex-col border-r border-white/10 transition-all duration-300 overflow-hidden`}>
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
        {isOpen && (
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden flex-shrink-0">
              {logoUrl.startsWith('data:') ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                logoUrl
              )}
            </div>
            <div>
              <div className="font-bold text-sm gradient-text">OUTSIDEHUB</div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-2">
        {visiblePages.map((page) => {
          const Icon = page.icon;
          const isActive = currentPage === page.id;

          return (
            <button
              key={page.id}
              onClick={() => onPageChange(page.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-purple-500/30 to-cyan-500/30 border border-purple-500/50 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
              title={page.label}
            >
              <Icon size={20} className="flex-shrink-0" />
              {isOpen && <span className="text-sm font-medium">{page.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-white/10 p-3 space-y-3">
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 text-white/70 hover:text-white relative group"
        >
          <div className={`w-10 h-10 rounded-full ${user?.role === 'admin' ? 'bg-gradient-to-br from-red-500 to-orange-500' : 'bg-gradient-to-br from-purple-500 to-cyan-500'} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden`}>
            {user?.avatar ? (
              typeof user.avatar === 'string' && user.avatar.startsWith('data:') ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0)
              )
            ) : (
              user?.name.charAt(0) || 'A'
            )}
          </div>
          {isOpen && (
            <div className="text-left flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.name}</div>
              <div className="text-xs text-white/50 truncate">{user?.role}</div>
            </div>
          )}
        </button>

        {/* Profile Menu Dropdown */}
        {showProfileMenu && isOpen && (
          <div className="bg-white/5 rounded-lg border border-white/10 p-2 space-y-1 animate-slide-in">
            <button
              onClick={() => {
                onPageChange('profile');
                setShowProfileMenu(false);
              }}
              className="w-full px-3 py-2 flex items-center gap-2 hover:bg-white/10 rounded-lg transition-all duration-200 text-white/80 hover:text-white text-sm"
            >
              <User size={16} className="text-cyan-400 flex-shrink-0" />
              <span>Meu Perfil</span>
            </button>

            <button
              className="w-full px-3 py-2 flex items-center gap-2 hover:bg-white/10 rounded-lg transition-all duration-200 text-white/80 hover:text-white text-sm"
            >
              <Eye size={16} className="text-purple-400 flex-shrink-0" />
              <span>Privacidade</span>
            </button>

            <button
              className="w-full px-3 py-2 flex items-center gap-2 hover:bg-white/10 rounded-lg transition-all duration-200 text-white/80 hover:text-white text-sm"
            >
              <Settings size={16} className="text-blue-400 flex-shrink-0" />
              <span>Configurações</span>
            </button>

            {isAdmin && (
              <>
                <div className="border-t border-white/10 my-1" />
                <button
                  onClick={() => {
                    onPageChange('admin');
                    setShowProfileMenu(false);
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-red-500/20 rounded-lg transition-all duration-200 text-red-400 hover:text-red-300 text-sm"
                >
                  <BadgeIcon size={16} className="flex-shrink-0" />
                  <span>Painel Admin</span>
                </button>
              </>
            )}

            <div className="border-t border-white/10 my-1" />

            <button
              onClick={() => {
                logout();
                setShowProfileMenu(false);
              }}
              className="w-full px-3 py-2 flex items-center gap-2 hover:bg-red-500/20 rounded-lg transition-all duration-200 text-red-400 hover:text-red-300 text-sm"
            >
              <LogOut size={16} className="flex-shrink-0" />
              <span>Sair</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
