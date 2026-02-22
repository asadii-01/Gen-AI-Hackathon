"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { User } from "./types";
import {
  registerUser as apiRegister,
  loginUser as apiLogin,
  fetchCurrentUser,
  removeToken,
} from "./api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, try to load existing session
  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (email: string, username: string, password: string) => {
      const res = await apiRegister(email, username, password);
      setUser(res.user);
    },
    []
  );

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const updated = await fetchCurrentUser();
      setUser(updated);
    } catch {
      // Token may have expired
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
