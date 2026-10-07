"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, UserX } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { isUserLevel, supabase } from "@/lib/supabase";
import type { UserLevel } from "@/lib/supabase";

interface ManagedProfile {
  id: string;
  display_name: string;
  username: string;
  role: UserLevel;
  is_active: boolean;
  created_at: string;
}

const ROLE_LABELS: Record<UserLevel, string> = {
  admin: "Administrator",
  kasir: "Kasir",
  user: "Pengguna",
};

export default function PenggunaPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<ManagedProfile[]>([]);
  const [fetching, setFetching] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState<UserLevel>("kasir");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.level !== "admin") {
      router.replace("/dashboard");
      return;
    }

    async function loadProfiles() {
      try {
        const { data, error: loadError } = await supabase
          .from("profiles")
          .select("id, display_name, username, role, is_active, created_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (loadError) {
          setError("Gagal memuat pengguna. Periksa akses database.");
        } else {
          setProfiles(data as ManagedProfile[]);
        }
      } catch {
        setError("Gagal memuat pengguna. Periksa akses database.");
      } finally {
        setFetching(false);
      }
    }

    void loadProfiles();
  }, [loading, user, router]);

  async function changeRole(profileId: string, role: UserLevel) {
    setUpdatingId(profileId);
    setError("");
    setNotice("");
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", profileId);

      if (updateError) {
        setError("Role gagal diperbarui. Silakan coba lagi.");
      } else {
        setProfiles((current) =>
          current.map((profile) =>
            profile.id === profileId ? { ...profile, role } : profile
          )
        );
        setNotice("Role pengguna berhasil diperbarui.");
      }
    } catch {
      setError("Role gagal diperbarui. Silakan coba lagi.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function requestAdminApi(method: "POST" | "DELETE", body: object) {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error("Sesi login tidak valid. Silakan login kembali.");
    }

    const response = await fetch("/api/admin/users", {
      method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const result: { error?: string; ok?: boolean } = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.error ?? "Permintaan gagal diproses.");
    }
    return result;
  }

  async function inviteUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviting(true);
    setError("");
    setNotice("");
    try {
      const result = await requestAdminApi("POST", {
        email: inviteEmail,
        display_name: inviteName,
        username: inviteUsername,
        role: inviteRole,
      });
      setInviteEmail("");
      setInviteName("");
      setInviteUsername("");
      setInviteRole("kasir");
      if (result.ok) {
        setNotice("Undangan berhasil dikirim. Pengguna akan muncul setelah profil dibuat.");
      }
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : "Gagal mengirim undangan pengguna."
      );
    } finally {
      setInviting(false);
    }
  }

  async function removeUser(profile: ManagedProfile) {
    if (profile.id === user?.id) return;
    const confirmed = window.confirm(
      `Nonaktifkan akun ${profile.display_name} (${profile.username})? Riwayat transaksi akan tetap disimpan.`
    );
    if (!confirmed) return;

    setRemovingId(profile.id);
    setError("");
    setNotice("");
    try {
      await requestAdminApi("DELETE", { user_id: profile.id });
      setProfiles((current) =>
        current.filter((currentProfile) => currentProfile.id !== profile.id)
      );
      setNotice("Akun dinonaktifkan. Riwayat transaksi tetap tersimpan.");
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Gagal menonaktifkan akun."
      );
    } finally {
      setRemovingId(null);
    }
  }

  if (loading || !user || user.level !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-neu-muted">memuat sesi...</span>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="neu-raised-sm neu-btn px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-neu-text"
          >
            Kembali
          </Link>
          <h1 className="font-display text-lg font-semibold text-neu-text sm:text-2xl">
            Kelola Pengguna
          </h1>
        </div>

        <section className="neu-raised p-5 sm:p-8">
          <p className="mb-5 text-xs leading-relaxed text-neu-muted">
            Admin dapat mengundang pengguna, mengatur rolenya, dan
            menonaktifkan akun. Riwayat transaksi tetap dipertahankan. Akun
            admin yang sedang dipakai tidak bisa dinonaktifkan atau diturunkan
            rolenya.
          </p>

          {error && <p className="mb-4 text-sm text-neu-danger">{error}</p>}
          {notice && (
            <p className="mb-4 text-sm text-neu-accent-dark">{notice}</p>
          )}
          <form
            onSubmit={inviteUser}
            className="neu-flat mb-6 grid gap-3 p-4 sm:grid-cols-2"
          >
            <h2 className="flex items-center gap-2 text-sm font-semibold text-neu-text sm:col-span-2">
              <UserPlus className="h-4 w-4" />
              Tambah pengguna
            </h2>
            <label className="text-xs text-neu-muted">
              Nama
              <input
                required
                maxLength={100}
                value={inviteName}
                onChange={(event) => setInviteName(event.target.value)}
                className="neu-pressed mt-1 w-full rounded-xl bg-transparent px-3 py-2.5 text-sm text-neu-text"
              />
            </label>
            <label className="text-xs text-neu-muted">
              Username
              <input
                required
                minLength={3}
                maxLength={32}
                pattern="[a-zA-Z0-9_]+"
                value={inviteUsername}
                onChange={(event) => setInviteUsername(event.target.value)}
                autoCapitalize="none"
                className="neu-pressed mt-1 w-full rounded-xl bg-transparent px-3 py-2.5 text-sm text-neu-text"
              />
            </label>
            <label className="text-xs text-neu-muted">
              Email undangan
              <input
                required
                type="email"
                maxLength={254}
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                autoComplete="email"
                className="neu-pressed mt-1 w-full rounded-xl bg-transparent px-3 py-2.5 text-sm text-neu-text"
              />
            </label>
            <label className="text-xs text-neu-muted">
              Role
              <select
                value={inviteRole}
                onChange={(event) => {
                  if (isUserLevel(event.target.value)) {
                    setInviteRole(event.target.value);
                  }
                }}
                className="neu-pressed mt-1 w-full rounded-xl bg-transparent px-3 py-2.5 text-sm text-neu-text"
              >
                {Object.entries(ROLE_LABELS).map(([role, label]) => (
                  <option key={role} value={role}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={inviting}
              className="neu-raised-sm neu-btn py-3 text-sm font-semibold uppercase tracking-widest text-neu-accent-dark disabled:opacity-60 sm:col-span-2"
            >
              {inviting ? "Mengirim undangan..." : "Kirim undangan"}
            </button>
            <p className="text-xs text-neu-muted sm:col-span-2">
              Pengguna akan menerima email untuk membuat password. Pastikan
              template undangan Supabase diarahkan ke halaman setup password.
            </p>
          </form>

          {fetching ? (
            <p className="text-sm text-neu-muted">Memuat pengguna...</p>
          ) : profiles.length === 0 ? (
            <p className="text-sm text-neu-muted">Belum ada pengguna.</p>
          ) : (
            <div className="space-y-3">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="neu-raised-sm flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-neu-text">
                      {profile.display_name}
                    </p>
                    <p className="mt-1 text-xs text-neu-muted">
                      {profile.username} · {profile.id.slice(0, 8)}
                    </p>
                  </div>
                  <label className="text-xs text-neu-muted">
                    Role
                    <select
                      aria-label={`Role untuk ${profile.display_name}`}
                      value={profile.role}
                      disabled={
                        updatingId === profile.id || profile.id === user.id
                      }
                      onChange={(event) => {
                        if (isUserLevel(event.target.value)) {
                          void changeRole(profile.id, event.target.value);
                        } else {
                          setError("Role yang dipilih tidak valid.");
                        }
                      }}
                      className="neu-pressed ml-2 rounded-xl bg-transparent px-3 py-2 text-sm text-neu-text disabled:opacity-50"
                    >
                      {Object.entries(ROLE_LABELS).map(([role, label]) => (
                        <option key={role} value={role}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {profile.id !== user.id && (
                    <button
                      type="button"
                      disabled={removingId === profile.id}
                      onClick={() => void removeUser(profile)}
                      aria-label={`Nonaktifkan akun ${profile.display_name}`}
                      className="neu-raised-sm neu-btn flex h-10 items-center justify-center gap-2 px-3 text-xs font-semibold text-neu-danger disabled:opacity-50"
                    >
                      <UserX className="h-4 w-4" />
                      {removingId === profile.id ? "Menonaktifkan..." : "Hapus"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
