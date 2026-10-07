"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase, Product } from "@/lib/supabase";
import ProductCard from "@/components/ProductCard";
import AddProductModal from "@/components/AddProductModal";
import StockAdjustModal from "@/components/StockAdjustModal";
import TillDisplay from "@/components/TillDisplay";

export default function ProdukPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [notice, setNotice] = useState("");

  const loadProducts = useCallback(async () => {
    setFetching(true);
    setError("");
    try {
      const { data, error: loadError } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (loadError) {
        setError("Gagal memuat produk. Silakan coba lagi.");
        return;
      }
      setProducts((data ?? []) as Product[]);
    } catch {
      setError("Gagal memuat produk. Silakan coba lagi.");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (user) loadProducts();
  }, [loading, user, router, loadProducts]);

  async function handleDelete(id: number) {
    if (!window.confirm("Yakin ingin menghapus produk ini?")) return;

    try {
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", id);
      if (deleteError) {
        setError("Produk gagal dihapus. Periksa koneksi atau hak akses akun.");
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError("Produk gagal dihapus. Periksa koneksi atau hak akses akun.");
    }
  }

  function handleStockUpdated(productId: number, stock: number) {
    setProducts((current) =>
      current.map((product) =>
        product.id === productId ? { ...product, stok: stock } : product
      )
    );
    setNotice("Stok produk berhasil diperbarui.");
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-neu-muted">memuat sesi...</span>
      </main>
    );
  }

  const canManage = user.level === "admin";

  return (
    <main className="min-h-screen px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
          <Link
            href="/dashboard"
            className="neu-raised-sm neu-btn flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-neu-text"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali
          </Link>
          <TillDisplay />
        </div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="neu-raised p-5 sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neu-muted sm:text-xs">
                Etalase
              </p>
              <h1 className="mt-1 font-display text-lg font-semibold text-neu-text sm:text-2xl">
                Daftar Produk
              </h1>
            </div>

            {canManage && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setModalOpen(true)}
                className="neu-raised-sm neu-btn flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-neu-accent-dark"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Produk
              </motion.button>
            )}
          </div>

          <div className="my-5 sm:my-6" />

          {notice && <p role="status" className="mb-4 text-sm text-neu-accent-dark">{notice}</p>}
          {error ? (
            <p className="text-xs text-neu-danger">{error}</p>
          ) : fetching ? (
            <p className="text-xs text-neu-muted">memuat produk...</p>
          ) : products.length === 0 ? (
            <p className="text-xs text-neu-muted">
              Belum ada produk. {canManage && "Tambahkan produk pertama kamu."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  canManage={canManage}
                  onDelete={handleDelete}
                  onAdjustStock={setStockProduct}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <AddProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={loadProducts}
      />
      <StockAdjustModal
        product={stockProduct}
        onClose={() => setStockProduct(null)}
        onUpdated={handleStockUpdated}
      />
    </main>
  );
}
