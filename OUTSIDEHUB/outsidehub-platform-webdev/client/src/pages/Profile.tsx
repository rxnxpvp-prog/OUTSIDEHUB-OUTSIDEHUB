import React, { useState } from 'react';
import { Upload, Save, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showActivity, setShowActivity] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Limitar tamanho de arquivo para 5MB
      if (file.size > 5000000) {
        alert('Arquivo muito grande. Máximo 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setAvatar(result); // Permitir imagem completa até 5MB
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (user) {
      try {
        updateUser({
          name,
          bio,
          avatar,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (error) {
        alert('Erro ao salvar. localStorage cheio. Tente com uma imagem menor.');
      }
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass-dark p-12 rounded-xl text-center">
          <p className="text-white/60">Faça login para acessar seu perfil</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Meu Perfil</h1>
        <p className="text-white/60">Personalize sua conta e preferências</p>
      </div>

      {/* Avatar Section */}
      <div className="glass-dark p-6 rounded-xl">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Upload size={24} />
          Avatar
        </h2>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold text-3xl flex-shrink-0 overflow-hidden">
            {avatar ? (
              typeof avatar === 'string' && avatar.startsWith('data:') ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                name.charAt(0)
              )
            ) : (
              name.charAt(0)
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-3">Upload Novo Avatar</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
            />
            <p className="text-xs text-white/50 mt-2">PNG, JPG ou GIF (máx 2MB)</p>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="glass-dark p-6 rounded-xl">
        <h2 className="text-xl font-bold text-white mb-6">Informações Pessoais</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte algo sobre você..."
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors resize-none"
              rows={4}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Username</label>
            <input
              type="text"
              value={(user as any).username || ''}
              disabled
              className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white/60 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Cargo</label>
            <input
              type="text"
              value={user.role === 'admin' ? '👑 Administrador' : '👤 Usuário'}
              disabled
              className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white/60 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Badges */}
      {user && (
        <div className="glass-dark p-6 rounded-xl animate-fade-in">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="text-2xl">🎖️</span>
            Badges
          </h2>
          <div className="flex flex-wrap gap-3">
            {user && (user as any).badges && (user as any).badges.length > 0 ? (
              (user as any).badges.map((badge: any) => (
                <div key={badge.id} className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 rounded-full text-sm text-white flex items-center gap-2 hover:from-purple-500/30 hover:to-cyan-500/30 transition-all duration-200 hover:scale-105">
                  {badge.image ? (
                    <img src={badge.image} alt={badge.name} className="w-6 h-6 rounded-full" />
                  ) : (
                    <span className="text-base">{badge.icon || '⭐'}</span>
                  )}
                  <span className="font-medium">{badge.name}</span>
                </div>
              ))
            ) : (
              <p className="text-white/60 text-sm">Nenhuma badge ainda. Ganhe badges participando da comunidade!</p>
            )}
          </div>
          <p className="text-xs text-white/50 mt-4">As badges são atribuídas pelos administradores e mostram suas conquistas!</p>
        </div>
      )}

      {/* Privacy Settings */}
      <div className="glass-dark p-6 rounded-xl">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Lock size={24} />
          Privacidade
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center gap-3">
              <Eye size={20} className="text-cyan-400" />
              <div>
                <div className="font-semibold text-white">Status Online</div>
                <p className="text-xs text-white/60">Mostrar quando você está online</p>
              </div>
            </div>
            <button
              onClick={() => setShowOnlineStatus(!showOnlineStatus)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                showOnlineStatus
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'bg-white/5 text-white/60 border border-white/10'
              }`}
            >
              {showOnlineStatus ? 'Ativo' : 'Oculto'}
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center gap-3">
              <Eye size={20} className="text-cyan-400" />
              <div>
                <div className="font-semibold text-white">Atividade</div>
                <p className="text-xs text-white/60">Mostrar seu histórico de atividades</p>
              </div>
            </div>
            <button
              onClick={() => setShowActivity(!showActivity)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                showActivity
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'bg-white/5 text-white/60 border border-white/10'
              }`}
            >
              {showActivity ? 'Ativo' : 'Oculto'}
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center justify-center gap-2"
        >
          <Save size={20} />
          Salvar Alterações
        </button>
      </div>

      {saved && (
        <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 text-center">
          ✓ Perfil atualizado com sucesso!
        </div>
      )}
    </div>
  );
}
