"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type PageState = "verifying" | "ready" | "saving" | "done" | "error";

export default function SetupPasswordPage() {
  const router = useRouter();
  const [state, setState] = useState<PageState>("verifying");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function verifyInvite() {
      const url = new URL(window.location.href);
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");

      if (tokenHash && type === "invite") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "invite",
        });

        if (!active) return;
        if (error) {
          setMessage(
            "Tautan undangan tidak valid atau sudah kedaluwarsa. Minta admin mengirim undangan baru."
          );
          setState("error");
          return;
        }

        window.history.replaceState({}, "", "/auth/setup-password");
        setState("ready");
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error || !data.session) {
        setMessage(
          "Sesi undangan tidak ditemukan. Minta admin mengirim ulang undangan dengan tautan setup password."
        );
        setState("error");
        return;
      }

      setState("ready");
    }

    void verifyInvite().catch(() => {
      if (!active) return;
      setMessage("Gagal memverifikasi undangan. Periksa koneksi lalu coba lagi.");
      setState("error");
    });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 12) {
      setMessage("Password harus terdiri dari minimal 12 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Konfirmasi password tidak sama.");
      return;
    }

    setState("saving");
    setMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage(
          "Password gagal disimpan. Periksa aturan password Supabase dan coba lagi."
        );
        setState("ready");
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setState("done");
    } catch {
      setMessage("Koneksi terputus. Silakan coba simpan password lagi.");
      setState("ready");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="neu-raised w-full max-w-md p-6 sm:p-10">
        <h1 className="text-center font-display text-xl font-semibold text-neu-text sm:text-2xl">
          Buat password
        </h1>
        <p className="mb-6 mt-2 text-center text-sm text-neu-muted">
          Tetapkan password untuk akun kasir Anda.
        </p>

        {state === "verifying" && (
          <p className="text-center text-sm text-neu-muted">
            Memverifikasi tautan undangan...
          </p>
        )}

        {state === "done" ? (
          <div className="text-center">
            <p className="mb-5 text-sm text-neu-accent-dark">
              Password berhasil dibuat. Anda sekarang dapat masuk ke aplikasi.
            </p>
            <Link
              href="/login"
              className="neu-raised-sm neu-btn inline-flex justify-center px-5 py-3 text-sm font-semibold uppercase tracking-widest text-neu-accent-dark"
            >
              Ke halaman login
            </Link>
          </div>
        ) : state !== "verifying" && state !== "error" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-xs font-medium text-neu-muted">
              Password baru
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="neu-pressed mt-1 w-full rounded-xl bg-transparent px-4 py-3 text-sm text-neu-text"
              />
            </label>
            <label className="block text-xs font-medium text-neu-muted">
              Konfirmasi password
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="neu-pressed mt-1 w-full rounded-xl bg-transparent px-4 py-3 text-sm text-neu-text"
              />
            </label>
            <p className="text-xs text-neu-muted">
              Gunakan minimal 12 karakter dan jangan gunakan password yang
              dipakai di layanan lain.
            </p>
            {message && (
              <p role="alert" className="text-sm text-neu-danger">
                {message}
              </p>
            )}
            <button
              type="submit"
              disabled={state === "saving"}
              className="neu-raised-sm neu-btn w-full py-3 text-sm font-semibold uppercase tracking-widest text-neu-accent-dark disabled:opacity-60"
            >
              {state === "saving" ? "Menyimpan..." : "Simpan password"}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <p role="alert" className="mb-5 text-sm text-neu-danger">
              {message}
            </p>
            <button
              type="button"
              onClick={() => router.replace("/login")}
              className="neu-raised-sm neu-btn px-5 py-3 text-sm font-semibold uppercase tracking-widest text-neu-text"
            >
              Kembali ke login
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
