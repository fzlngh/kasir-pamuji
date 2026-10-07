"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import { isUserLevel, supabase } from "@/lib/supabase";
import type { AppUser } from "@/lib/supabase";

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  authError: string | null;
  login: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let requestId = 0;

    async function loadProfile(authUserId: string | null) {
      const currentRequest = ++requestId;
      if (!authUserId) {
        if (active) {
          setUser(null);
          setAuthError(null);
          setLoading(false);
        }
        return;
      }

      if (active) setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, display_name, username, role, is_active")
          .eq("id", authUserId)
          .maybeSingle();

        if (!active || currentRequest !== requestId) return;
        if (error || !data || !data.is_active || !isUserLevel(data.role)) {
          setUser(null);
          setAuthError(
            error
              ? "Gagal memuat profil. Periksa koneksi dan konfigurasi database."
              : "Profil pengguna tidak ditemukan atau rolenya tidak valid."
          );
          setLoading(false);
          return;
        }

        setUser({
          id: data.id,
          nama: data.display_name,
          username: data.username,
          level: data.role,
        });
        setAuthError(null);
        setLoading(false);
      } catch {
        if (!active || currentRequest !== requestId) return;
        setUser(null);
        setAuthError("Koneksi terputus saat memuat profil. Silakan coba lagi.");
        setLoading(false);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        void loadProfile(session?.user.id ?? null);
      });
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setAuthError("Gagal memulihkan sesi. Silakan masuk kembali.");
          setLoading(false);
          return;
        }
        void loadProfile(data.session?.user.id ?? null);
      })
      .catch(() => {
        if (!active) return;
        setAuthError("Koneksi terputus saat memulihkan sesi.");
        setLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return { ok: false, message: "Email dan password wajib diisi" };
    }

    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) {
        return { ok: false, message: "Email atau password tidak valid." };
      }
    } catch {
      return { ok: false, message: "Gagal terhubung ke server. Coba lagi." };
    }

    return { ok: true };
  }

  async function logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setAuthError("Gagal mengakhiri sesi. Silakan coba lagi.");
      }
    } catch {
      setAuthError("Koneksi terputus saat mengakhiri sesi.");
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, authError, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
