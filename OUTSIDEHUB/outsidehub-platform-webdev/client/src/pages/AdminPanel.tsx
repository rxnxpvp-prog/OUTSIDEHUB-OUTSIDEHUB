import React, { useState } from 'react';
import { Plus, Trash2, Lock, Upload, X, Settings, AlertCircle, CheckCircle, Power, Bell, Users, BadgeIcon, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface MaintenanceItem {
  id: string;
  name: string;
  status: 'online' | 'maintenance' | string;
  icon: string;
}

interface NewUser {
  name: string;
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
}

export default function AdminPanel() {
  const { user, createUser, isAdmin, updateUser } = useAuth();
  const [users, setUsers] = useState(() => {
    const stored = localStorage.getItem('outsidehub_users');
    return stored ? JSON.parse(stored) : [];
  });

  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>(() => {
    const stored = localStorage.getItem('outsidehub_maintenance');
    const defaultItems: MaintenanceItem[] = [
      { id: '1', name: 'Feed', status: 'online', icon: '📰' },
      { id: '2', name: 'Chat', status: 'online', icon: '💬' },
      { id: '3', name: 'Search', status: 'online', icon: '🔍' },
      { id: '4', name: 'Builders', status: 'online', icon: '⚙️' },
      { id: '5', name: 'Logs', status: 'online', icon: '📋' },
      { id: '6', name: 'Scraper', status: 'online', icon: '🕷️' },
    ];
    return stored ? (JSON.parse(stored) as MaintenanceItem[]) : defaultItems;
  });

  const [logoUrl, setLogoUrl] = useState(() => {
    return localStorage.getItem('outsidehub_logo') || '🔵';
  });

  const [newUser, setNewUser] = useState<NewUser>({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'user',
  });

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newBadgeName, setNewBadgeName] = useState('');
  const [newBadgeIcon, setNewBadgeIcon] = useState<string | null>(null);
  const [newBadgeImage, setNewBadgeImage] = useState<string | null>(null);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');

  if (!isAdmin) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="glass-dark p-12 rounded-xl text-center border border-white/10">
          <Lock size={48} className="mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold text-white mb-2">Acesso Negado</h2>
          <p className="text-white/60">Apenas administradores podem acessar este painel</p>
        </div>
      </div>
    );
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 200000) {
        alert('Logo muito grande. Máximo 200KB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const limited = dataUrl.substring(0, 50000);
        try {
          localStorage.setItem('outsidehub_logo', limited);
          setLogoUrl(limited);
          window.dispatchEvent(new CustomEvent('logoUpdated', { detail: limited }));
        } catch (error) {
          alert('Erro ao salvar logo. Tente com uma imagem menor.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name.trim() || !newUser.username.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      alert('Preencha todos os campos');
      return;
    }

    const success = await createUser(newUser.name, newUser.email, newUser.password, newUser.role);
    if (success) {
      alert('Usuário criado com sucesso!');
      setNewUser({ name: '', username: '', email: '', password: '', role: 'user' });
      const updated = JSON.parse(localStorage.getItem('outsidehub_users') || '[]');
      setUsers(updated);
    } else {
      alert('Erro ao criar usuário');
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === user?.id) {
      alert('Você não pode deletar sua própria conta');
      return;
    }

    const updated = users.filter((u: any) => u.id !== userId);
    setUsers(updated);
    localStorage.setItem('outsidehub_users', JSON.stringify(updated));
    alert('Usuário deletado com sucesso!');
  };

  const toggleMaintenance = (itemId: string) => {
    const updated = maintenanceItems.map((item: any) =>
      item.id === itemId
        ? { ...item, status: item.status === 'online' ? 'maintenance' : 'online' }
        : item
    );
    setMaintenanceItems(updated);
    localStorage.setItem('outsidehub_maintenance', JSON.stringify(updated));
  };

  const sendNotification = () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      alert('Preencha título e mensagem');
      return;
    }

    const notifications = JSON.parse(localStorage.getItem('outsidehub_notifications') || '[]');
    notifications.push({
      id: Date.now().toString(),
      title: notificationTitle,
      message: notificationMessage,
      timestamp: new Date().toISOString(),
    });

    localStorage.setItem('outsidehub_notifications', JSON.stringify(notifications));
    alert('Notificação enviada!');
    setNotificationTitle('');
    setNotificationMessage('');
  };

  const addBadgeToUser = (userEmail: string) => {
    if (!newBadgeName.trim()) {
      alert('Digite o nome da badge');
      return;
    }

    const updated = users.map((u: any) => {
      if (u.email === userEmail) {
        const badges = u.badges || [];
        if (badges.length >= 10) {
          alert('Máximo de 10 badges por usuário.');
          return u;
        }
        badges.push({
          id: Date.now().toString(),
          name: newBadgeName,
          icon: newBadgeIcon || '⭐',
          image: newBadgeImage,
        });
        return { ...u, badges };
      }
      return u;
    });

    try {
      setUsers(updated);
      localStorage.setItem('outsidehub_users', JSON.stringify(updated));
      setNewBadgeName('');
      setNewBadgeIcon(null);
      setNewBadgeImage(null);
      setSelectedUser(null);
    } catch (error) {
      alert('Erro ao salvar. localStorage cheio.');
    }
  };

  const changeUserRole = (userEmail: string, newRole: 'admin' | 'user') => {
    const updated = users.map((u: any) => {
      if (u.email === userEmail) {
        return { ...u, role: newRole };
      }
      return u;
    });

    setUsers(updated);
    localStorage.setItem('outsidehub_users', JSON.stringify(updated));
    if (user?.email === userEmail) {
      updateUser({ role: newRole });
    }
    alert(`Cargo de ${users.find((u: any) => u.email === userEmail)?.name} atualizado!`);
  };

  const handleBadgeImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50000) {
        alert('Imagem muito grande. Máximo 50KB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewBadgeImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <Crown size={32} className="text-red-500" />
          Painel de Administração
        </h1>
        <p className="text-white/60">Gerenciar usuários, badges, manutenção e configurações</p>
      </div>

      {/* Site Settings */}
      <div className="glass-dark p-6 rounded-xl border border-white/10 animate-fade-in">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Settings size={24} className="text-purple-400" />
          Configurações do Site
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-white mb-3">Logo do Site</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold overflow-hidden border border-white/10">
                {logoUrl.startsWith('data:') ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  logoUrl
                )}
              </div>
              <label className="px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-purple-300 cursor-pointer transition-all duration-200 flex items-center gap-2">
                <Upload size={18} />
                Fazer Upload
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance Status */}
      <div className="glass-dark p-6 rounded-xl border border-white/10 animate-fade-in">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Power size={24} className="text-cyan-400" />
          Status de Manutenção
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {maintenanceItems.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleMaintenance(item.id)}
              className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                item.status === 'online'
                  ? 'glass-dark border-green-500/30 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/20'
                  : 'glass-dark border-yellow-500/30 hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/20'
              }`}
            >
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="font-semibold text-white text-sm">{item.name}</div>
              <div className={`text-xs mt-2 flex items-center gap-1 ${
                item.status === 'online' ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {item.status === 'online' ? (
                  <>
                    <CheckCircle size={14} />
                    Online
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} />
                    Manutenção
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="glass-dark p-6 rounded-xl border border-white/10 animate-fade-in">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Bell size={24} className="text-yellow-400" />
          Enviar Notificação
        </h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Título da notificação"
            value={notificationTitle}
            onChange={(e) => setNotificationTitle(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <textarea
            placeholder="Mensagem da notificação"
            value={notificationMessage}
            onChange={(e) => setNotificationMessage(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors resize-none h-24"
          />
          <button
            onClick={sendNotification}
            className="w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg font-medium hover:shadow-lg hover:shadow-yellow-500/50 transition-all duration-200 hover:scale-105"
          >
            Enviar Notificação
          </button>
        </div>
      </div>

      {/* Create New User */}
      <div className="glass-dark p-6 rounded-xl border border-white/10 animate-fade-in">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Plus size={24} className="text-cyan-400" />
          Criar Novo Usuário
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            placeholder="Nome completo"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <input
            type="text"
            placeholder="Nome de usuário"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <input
            type="email"
            placeholder="Email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <input
            type="password"
            placeholder="Senha"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <select
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'user' })}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors md:col-span-2"
          >
            <option value="user">👤 Usuário Regular</option>
            <option value="admin">👑 Administrador</option>
          </select>
        </div>
        <button
          onClick={handleCreateUser}
          className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-200 hover:scale-105"
        >
          Criar Usuário
        </button>
      </div>

      {/* Users List */}
      <div className="glass-dark p-6 rounded-xl border border-white/10 animate-fade-in">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Users size={24} className="text-cyan-400" />
          Usuários ({users.length})
        </h2>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {users.map((u: any) => (
            <div key={u.id} className={`p-4 rounded-lg border transition-all duration-200 flex items-center justify-between ${
              u.role === 'admin' 
                ? 'glass-dark border-red-500/30 bg-red-500/5' 
                : 'glass-dark border-white/10 hover:bg-white/10'
            }`}>
              <div className="flex-1">
                <div className="font-semibold text-white flex items-center gap-2">
                  {u.name}
                  {u.role === 'admin' && <span className="text-red-500">👑</span>}
                </div>
                <div className="text-xs text-white/60">@{u.username} • {u.email}</div>
                <div className={`text-xs mt-1 font-medium ${
                  u.role === 'admin' ? 'text-red-400' : 'text-cyan-400'
                }`}>
                  {u.role === 'admin' ? 'Administrador' : 'Usuário Regular'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={u.role}
                  onChange={(e) => changeUserRole(u.email, e.target.value as 'admin' | 'user')}
                  className="px-3 py-1 bg-white/10 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 transition-all"
                  title="Alterar cargo"
                >
                  <option value="user">👤 Usuário</option>
                  <option value="admin">👑 Admin</option>
                </select>
                <button
                  onClick={() => setSelectedUser(u.email)}
                  className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-purple-300 text-sm transition-all duration-200 flex items-center gap-1"
                  title="Gerenciar badges"
                >
                  <BadgeIcon size={14} />
                  Badges
                </button>
                {u.id !== user?.id && (
                  <button
                    onClick={() => handleDeleteUser(u.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-all duration-200 text-red-400"
                    title="Deletar usuário"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Badge Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="glass-premium rounded-2xl p-8 max-w-md w-full border border-white/10 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <BadgeIcon size={24} className="text-purple-400" />
                Adicionar Badge
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nome da Badge"
                value={newBadgeName}
                onChange={(e) => setNewBadgeName(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
              />
              <input
                type="text"
                placeholder="Ícone/Emoji"
                value={newBadgeIcon || ''}
                onChange={(e) => setNewBadgeIcon(e.target.value || null)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
                maxLength={2}
              />
              <label className="block">
                <span className="text-sm font-semibold text-white mb-2 block">Upload de Imagem PNG (opcional)</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleBadgeImageUpload}
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm file:bg-purple-500/20 file:border-0 file:rounded file:px-3 file:py-1 file:text-purple-300 file:cursor-pointer"
                />
                <p className="text-xs text-white/50 mt-1">PNG ou JPG, máx 50KB</p>
              </label>
              {newBadgeImage && (
                <div className="flex items-center gap-2 p-2 bg-purple-500/20 rounded-lg">
                  <img src={newBadgeImage} alt="Preview" className="w-12 h-12 rounded object-cover" />
                  <p className="text-sm text-white">Imagem selecionada</p>
                </div>
              )}
              <button
                onClick={() => addBadgeToUser(selectedUser)}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-200 hover:scale-105"
              >
                Adicionar Badge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
