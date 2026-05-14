import React, { createContext, useContext, useState, useEffect } from "react";
import api from "@/lib/api";

export interface Badge {
  id: string;
  name: string;
  icon: string;
  image?: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "admin" | "user";
  avatar?: string;
  bio?: string;
  badges: Badge[];
  createdAt: string;
  twoFactorEnabled?: boolean;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  login: (username: string, password: string, otp?: string) => Promise<{ success: boolean; requires2fa?: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: { name?: string; bio?: string; avatar?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("outsidehub_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem("outsidehub_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string, otp?: string) => {
    try {
      const res = await api.post("/auth/login", { username, password, otp });
      if (res.data.requires2fa) {
        return {
          success: false,
          requires2fa: true,
          error: res.data.message || "Código 2FA necessário",
        } as const;
      }
      localStorage.setItem("outsidehub_token", res.data.token);
      setUser(res.data.user);
      return { success: true } as const;
    } catch (err: any) {
      const requires2fa = Boolean(err.response?.data?.requires2fa);
      return {
        success: false,
        requires2fa,
        error:
          err.response?.data?.error ||
          (requires2fa ? err.response?.data?.message || "Código 2FA necessário" : "Erro ao fazer login"),
      } as const;
    }
  };

  const logout = () => {
    localStorage.removeItem("outsidehub_token");
    setUser(null);
  };

  const updateProfile = async (updates: { name?: string; bio?: string; avatar?: string }) => {
    const res = await api.put("/auth/profile", updates);
    setUser(res.data);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        loading,
        login,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
