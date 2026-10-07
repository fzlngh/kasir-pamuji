"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Package, ShoppingBag } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { formatRupiah, supabase } from "@/lib/supabase";
import type { Product } from "@/lib/supabase";
import TillDisplay from "@/components/TillDisplay";

export default function PublicCatalogPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadProducts() {
      try {
        const { data, error: queryError } = await supabase
          .from("products")
          .select("id, nama, harga, stok, kategori, foto_url, created_at")
          .order("nama");
        if (!active) return;
        if (queryError) setError("Katalog belum dapat dimuat. Silakan coba lagi nanti.");
        else setProducts((data ?? []) as Product[]);
      } catch {
        if (active) setError("Katalog belum dapat dimuat. Silakan coba lagi nanti.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProducts();
    return () => { active = false; };
  }, []);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <TillDisplay />
          <Link
            href={user ? "/dashboard" : "/login"}
            className="neu-raised-sm neu-btn inline-flex min-h-11 items-center justify-center gap-2 px-5 text-xs font-semibold uppercase tracking-widest text-neu-accent-dark"
          >
            {user ? "Panel saya" : "Login"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </header>

        <section className="neu-raised overflow-hidden p-6 sm:p-10">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neu-accent-dark">Katalog produk</p>
              <h1 className="mt-3 max-w-2xl font-display text-3xl font-semibold leading-tight text-neu-text sm:text-5xl">
                Selamat datang di toko kami
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-neu-muted sm:text-base">
                Jelajahi produk yang tersedia. Untuk mengelola transaksi atau akun, silakan masuk ke aplikasi.
              </p>
            </div>
            <div className="neu-raised-sm hidden h-24 w-24 items-center justify-center text-neu-accent sm:flex">
              <ShoppingBag className="h-10 w-10" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="catalog-heading">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 id="catalog-heading" className="font-display text-xl font-semibold text-neu-text">Produk kami</h2>
              <p className="mt-1 text-sm text-neu-muted">Harga dan ketersediaan stok terkini</p>
            </div>
            <span className="hidden items-center gap-2 text-xs text-neu-muted sm:flex">
              <Package className="h-4 w-4" aria-hidden="true" /> {products.length} produk
            </span>
          </div>
          <div className="neu-raised min-h-40 p-4 sm:p-6">
            {error ? (
              <p role="alert" className="py-8 text-center text-sm text-neu-danger">{error}</p>
            ) : loading ? (
              <p className="py-8 text-center text-sm text-neu-muted" aria-live="polite">Memuat katalog...</p>
            ) : products.length === 0 ? (
              <div className="py-8 text-center">
                <Package className="mx-auto h-8 w-8 text-neu-muted" aria-hidden="true" />
                <p className="mt-3 text-sm text-neu-muted">Belum ada produk untuk ditampilkan.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                {products.map((product) => (
                  <article key={product.id} className="neu-raised-sm overflow-hidden p-3">
                    <div className="neu-pressed flex aspect-square items-center justify-center overflow-hidden p-1.5">
                      {product.foto_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.foto_url} alt={product.nama} loading="lazy" className="h-full w-full rounded-xl object-cover" />
                      ) : (
                        <Package className="h-9 w-9 text-neu-muted/50" aria-hidden="true" />
                      )}
                    </div>
                    <p className="mt-3 truncate text-[10px] font-medium uppercase tracking-widest text-neu-accent-dark">{product.kategori}</p>
                    <h3 className="mt-1 truncate text-sm font-semibold text-neu-text">{product.nama}</h3>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs">
                      <span className="font-semibold text-neu-text">{formatRupiah(product.harga)}</span>
                      <span className={product.stok > 0 ? "text-neu-muted" : "font-semibold text-neu-danger"}>
                        {product.stok > 0 ? `Stok ${product.stok}` : "Habis"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
        <p className="mt-6 text-center text-xs text-neu-muted">
          Pegawai? <Link href="/login" className="font-semibold text-neu-accent-dark underline underline-offset-2">Login ke panel kasir</Link>
        </p>
      </div>
    </main>
  );
}
