import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'supervisor' | 'agent';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  company: string;
  companyId: string;
  lastLogin?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string, remember?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (userData: { name: string; email: string; pass: string; role: UserRole; company?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'whatscrm_auth_user_v2';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = async (email: string, pass: string, remember = true): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Authenticate with backend server database
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: pass })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Credenciales incorrectas.' };
      }

      const activeUserData: AuthUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        avatar: data.user.avatar,
        company: data.user.company || 'Mi Empresa',
        companyId: data.companyId || 'comp-demo-nexodigital',
        lastLogin: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setUser(activeUserData);
      if (remember) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(activeUserData));
      }
      return { success: true };
    } catch (err: any) {
      console.error('Error al iniciar sesión:', err);
      return { success: false, error: 'No se pudo conectar con el servidor de autenticación. Intenta nuevamente.' };
    }
  };

  const register = async (userData: {
    name: string;
    email: string;
    pass: string;
    role: UserRole;
    company?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Register with backend server database (creates new isolated company workspace)
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userData.name,
          email: userData.email,
          password: userData.pass,
          role: userData.role,
          companyName: userData.company
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Error al registrar usuario.' };
      }

      const authUser: AuthUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        avatar: data.user.avatar,
        company: data.user.company,
        companyId: data.companyId,
        lastLogin: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setUser(authUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      return { success: true };
    } catch (err: any) {
      console.error('Registration error:', err);
      return { success: false, error: err.message || 'Error al crear la cuenta en el servidor.' };
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.warn(e);
    }
  };

  const updateProfile = (updates: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
