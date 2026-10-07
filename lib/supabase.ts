import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "[supabase] NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY wajib diisi."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserLevel = "admin" | "kasir" | "user";

const USER_LEVELS = new Set<string>(["admin", "kasir", "user"]);

export function isUserLevel(value: string): value is UserLevel {
  return USER_LEVELS.has(value);
}

export interface AppUser {
  id: string;
  nama: string;
  username: string;
  level: UserLevel;
}

export interface Product {
  id: number;
  nama: string;
  harga: number;
  stok: number;
  kategori: string;
  foto_url: string | null;
  created_at?: string;
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
