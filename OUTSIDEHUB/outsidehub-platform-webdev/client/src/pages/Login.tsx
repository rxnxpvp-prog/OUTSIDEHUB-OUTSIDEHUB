import React, { useState } from 'react';
import { User, Lock, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(username, password);
    
    if (success) {
      onLoginSuccess();
    } else {
      setError('Usuário ou senha inválidos');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
            O
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">OUTSIDEHUB</h1>
          <p className="text-white/60">Plataforma de Leads & Email</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="glass-dark p-8 rounded-2xl space-y-6">
            {/* Username Input */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">Usuário</label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 text-white/40" size={20} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all"
                  placeholder="seu_usuário"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-white/40" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <LogIn size={18} />
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>

          {/* Demo Info */}
          <div className="glass-dark p-4 rounded-xl text-center text-sm text-white/60">
            <p className="mb-2">Credenciais de demo:</p>
            <p className="font-mono text-xs text-white/80">admin</p>
            <p className="font-mono text-xs text-white/80">admin123</p>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-white/40 text-sm">
          <p>© 2024 OUTSIDEHUB. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
