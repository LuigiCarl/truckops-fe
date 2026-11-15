"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api, getStoredToken, setStoredToken } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.resolve()
      .then(() => {
        if (!active) return null;
        const savedToken = getStoredToken();
        if (!savedToken) {
          return null;
        }

        setToken(savedToken);
        return api.auth.user().then((currentUser) => {
          if (active) {
            setUser(currentUser);
          }
        });
      })
      .catch(() => {
        if (active) {
          setStoredToken(null);
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.auth.login(email, password);
      setStoredToken(response.token);
      setToken(response.token);
      setUser(response.user);
      router.push("/dashboard");
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // Clear local session even if server token already expired
    } finally {
      setStoredToken(null);
      setToken(null);
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
    }),
    [user, token, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
