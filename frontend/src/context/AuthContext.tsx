import React, {
  createContext, useContext, useState, useCallback, useEffect
} from 'react';
import type { User, AuthResponse } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  updateQuestionLevel: (level: 0 | 1) => Promise<void>;
}

interface RegisterData {
  username: string;
  password: string;
  display_name: string;
  grade: string;
  role?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'rm_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 從 localStorage 恢復登入狀態
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((r) => r.ok ? r.json() : null)
        .then((data: { user: User } | null) => {
          if (data?.user) {
            setToken(savedToken);
            setUser(data.user);
          } else {
            localStorage.removeItem(TOKEN_KEY);
          }
        })
        .catch(() => localStorage.removeItem(TOKEN_KEY))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const err = await res.json() as { error: string };
      throw new Error(err.error ?? '登入失敗');
    }

    const data = await res.json() as AuthResponse;
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json() as { error: string };
      throw new Error(err.error ?? '註冊失敗');
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // 重新從後端取得最新使用者資料（分數、等級等）
  const refreshUser = useCallback(async () => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` },
      });
      if (res.ok) {
        const data = await res.json() as { user: User };
        if (data?.user) setUser(data.user);
      }
    } catch { /* silent */ }
  }, []);

  // 更新中文姓名（display_name）；後端會驗證長度與字元
  const updateDisplayName = useCallback(async (name: string) => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) throw new Error('尚未登入');
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${savedToken}`,
      },
      body: JSON.stringify({ display_name: name }),
    });
    if (!res.ok) {
      const err = await res.json() as { error?: string };
      throw new Error(err.error ?? '更新失敗');
    }
    // 局部更新避免再呼叫 /me
    setUser((prev) => (prev ? { ...prev, display_name: name.trim() } : prev));
  }, []);

  // 更新出題模式（0 = 重複練習 / 1 = 多樣化）
  const updateQuestionLevel = useCallback(async (level: 0 | 1) => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) throw new Error('尚未登入');
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${savedToken}`,
      },
      body: JSON.stringify({ question_level: level }),
    });
    if (!res.ok) {
      const err = await res.json() as { error?: string };
      throw new Error(err.error ?? '更新失敗');
    }
    setUser((prev) => (prev ? { ...prev, question_level: level } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, refreshUser, updateDisplayName, updateQuestionLevel }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
