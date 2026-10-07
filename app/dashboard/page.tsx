"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import DashboardMenu from "@/components/DashboardMenu";
import TypewriterText from "@/components/TypewriterText";
import TillDisplay from "@/components/TillDisplay";

const LEVEL_LABEL: Record<string, string> = {
  admin: "Administrator",
  kasir: "Kasir",
  user: "Pengguna",
};

export default function DashboardPage() {
  const { user, loading, logout, authError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <main className="flex min-h-screen items-center justify-center"><span className="text-sm text-neu-muted">memuat sesi...</span></main>;
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <TillDisplay />
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileTap={{ scale: 0.96 }}
            onClick={logout}
            className="neu-raised-sm neu-btn flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-neu-danger"
          >
            <LogOut className="h-3.5 w-3.5" /> Keluar
          </motion.button>
        </div>
        {authError && <p role="alert" className="mb-4 text-sm text-neu-danger">{authError}</p>}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="neu-raised p-5 sm:p-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neu-muted sm:text-xs">Panel Kasir</p>
          <h1 className="mt-2 min-h-[1.6em] font-display text-lg font-semibold text-neu-text sm:text-2xl">
            <TypewriterText text={`SELAMAT DATANG, ${user.nama.toUpperCase()}`} />
          </h1>
          <p className="mt-1 text-xs text-neu-muted sm:text-sm">Level akses: {LEVEL_LABEL[user.level] ?? user.level}</p>
          <div className="my-5 sm:my-6"><DashboardMenu level={user.level} /></div>
        </motion.div>
        <p className="mt-5 text-center text-[10px] text-neu-muted/70 sm:text-xs">profil dan hak akses disinkronkan dari Supabase</p>
      </div>
    </main>
  );
}
