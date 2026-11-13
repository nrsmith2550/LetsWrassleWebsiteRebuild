import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: 'CUSTOMER' | 'ADMIN';
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login(email: string, password: string): Promise<User>;
  register(data: { name: string; email: string; phone?: string; password: string }): Promise<User>;
  logout(): Promise<void>;
}

const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ user: User | null }>('/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api<{ user: User }>('/auth/login', { body: { email, password } });
    setUser(r.user);
    return r.user;
  }, []);
  const register = useCallback(async (data: any) => {
    const r = await api<{ user: User }>('/auth/register', { body: data });
    setUser(r.user);
    return r.user;
  }, []);
  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}
