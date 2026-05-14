import React, { useState, useEffect } from 'react';
import { Menu, X, Moon, Sun, Bell } from 'lucide-react';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import { useTheme } from '@/contexts/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
  onProfileClick?: () => void;
  onPrivacyClick?: () => void;
}

export default function Layout({
  children,
  currentPage,
  onPageChange,
  onProfileClick = () => {},
  onPrivacyClick = () => {},
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [logoUrl, setLogoUrl] = useState(localStorage.getItem('outsidehub_logo') || '🔵');
  const [notifications, setNotifications] = useState<any[]>(() => {
    const stored = localStorage.getItem('outsidehub_notifications');
    return stored ? JSON.parse(stored) : [];
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleLogoUpdate = (event: any) => {
      setLogoUrl(event.detail);
    };
    window.addEventListener('logoUpdated', handleLogoUpdate);
    return () => window.removeEventListener('logoUpdated', handleLogoUpdate);
  }, []);

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Left Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        currentPage={currentPage}
        onPageChange={onPageChange}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="glass-dark h-16 flex items-center justify-between px-6 border-b border-white/10 sticky top-0 z-40">
          {/* Left: Menu Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Center: Site Name with Logo */}
          <div className="flex-1 flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden flex-shrink-0">
              {logoUrl.startsWith('data:') ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                logoUrl
              )}
            </div>
            <h1 className="text-lg font-bold gradient-text">OUTSIDEHUB</h1>
          </div>

          {/* Right: Theme Toggle, Notifications */}
          <div className="flex items-center gap-3">

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200"
              title={`Mudar para ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

              {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications && notifications.length > 0) {
                    const audio = new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==');
                    audio.play().catch(() => {});
                  }
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 relative group"
                title="Notificações"
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 glass-premium rounded-xl p-4 z-50 border border-white/10 max-h-96 overflow-y-auto bg-opacity-95 backdrop-blur-xl animate-slide-in">
                  {notifications.length > 0 ? (
                    <div className="space-y-3">
                      {notifications.map((notif: any) => (
                        <div key={notif.id} className="p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                          <div className="font-semibold text-white text-sm">{notif.title}</div>
                          <div className="text-xs text-white/60 mt-1">{notif.message}</div>
                          <div className="text-xs text-white/40 mt-2">{new Date(notif.createdAt).toLocaleString('pt-BR')}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-white/60 text-center py-4">Nenhuma notificação</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Right Sidebar */}
      <RightSidebar />
    </div>
  );
}
