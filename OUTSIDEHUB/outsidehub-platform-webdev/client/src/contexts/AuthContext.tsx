import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string;
  bio?: string;
  theme?: string;
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  createUser: (name: string, email: string, password: string, role: 'admin' | 'user') => Promise<boolean>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Seed de usuários iniciais
const SEED_USERS = [
  {
    id: 'admin-001',
    name: 'Admin',
    username: 'admin',
    email: 'admin@outsidehub.com',
    password: 'admin123',
    role: 'admin',
    avatar: '',
    bio: 'Administrador da plataforma',
    theme: 'dark',
    createdAt: new Date().toISOString(),
  },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Inicializar com seed se localStorage estiver vazio
  useEffect(() => {
    const initializeAuth = () => {
      const stored = localStorage.getItem('outsidehub_users');
      
      // Se não houver usuários salvos, criar seed
      if (!stored || JSON.parse(stored).length === 0) {
        localStorage.setItem('outsidehub_users', JSON.stringify(SEED_USERS));
      }

      // Carregar usuário logado se existir
      const storedUser = localStorage.getItem('outsidehub_user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          localStorage.removeItem('outsidehub_user');
        }
      }
    };

    initializeAuth();
  }, []);

  const login = async (usernameOrEmail: string, password: string): Promise<boolean> => {
    const users = JSON.parse(localStorage.getItem('outsidehub_users') || '[]');
    const foundUser = users.find((u: any) => (u.username === usernameOrEmail || u.email === usernameOrEmail) && u.password === password);
    
    if (foundUser) {
      const { password, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem('outsidehub_user', JSON.stringify(userWithoutPassword));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('outsidehub_user');
  };

  const createUser = async (name: string, email: string, password: string, role: 'admin' | 'user'): Promise<boolean> => {
    if (!user?.role || user.role !== 'admin') {
      return false;
    }

    const users = JSON.parse(localStorage.getItem('outsidehub_users') || '[]');
    if (users.some((u: any) => u.email === email)) {
      return false;
    }

    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password,
      role,
      avatar: '',
      bio: '',
      theme: 'dark',
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem('outsidehub_users', JSON.stringify(users));
    return true;
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...updates };
      setUser(updated);
      localStorage.setItem('outsidehub_user', JSON.stringify(updated));

      const users = JSON.parse(localStorage.getItem('outsidehub_users') || '[]');
      const index = users.findIndex((u: any) => u.id === user.id);
      if (index !== -1) {
        users[index] = { ...users[index], ...updates };
        localStorage.setItem('outsidehub_users', JSON.stringify(users));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        login,
        logout,
        createUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
