"use client";

import { FormEvent, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { Product } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";

export default function StockAdjustModal({
  product,
  onClose,
  onUpdated,
}: {
  product: Product | null;
  onClose: () => void;
  onUpdated: (productId: number, stock: number) => void;
}) {
  const [stock, setStock] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setStock(product ? String(product.stok) : "");
    setError("");
  }, [product]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product || saving) return;
    const nextStock = Number(stock);
    if (!Number.isSafeInteger(nextStock) || nextStock < 0 || nextStock > 2147483647) {
      setError("Masukkan jumlah stok bulat antara 0 dan 2.147.483.647.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const { data, error: updateError } = await supabase
        .from("products")
        .update({ stok: nextStock })
        .eq("id", product.id)
        .select("id, stok")
        .single();
      if (updateError || !data) {
        setError("Stok gagal diperbarui. Pastikan akun memiliki akses admin.");
        return;
      }
      onUpdated(data.id, data.stok);
      onClose();
    } catch {
      setError("Koneksi bermasalah. Stok belum berhasil diperbarui.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-neu-text/30 backdrop-blur-sm sm:items-center sm:px-4"
          onClick={onClose}
        >
          <motion.form
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
            className="neu-raised w-full max-w-sm rounded-b-none p-6 sm:rounded-b-[28px] sm:p-8"
            aria-labelledby="stock-dialog-title"
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-neu-muted">Kelola stok</p>
                <h2 id="stock-dialog-title" className="mt-1 font-display text-lg font-semibold text-neu-text">
                  {product.nama}
                </h2>
              </div>
              <button type="button" aria-label="Tutup" onClick={onClose} className="neu-raised-sm neu-btn flex h-9 w-9 items-center justify-center text-neu-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 text-sm text-neu-muted">Stok saat ini: {product.stok}. Masukkan jumlah stok baru.</p>
            <label className="block text-xs font-medium text-neu-muted">
              Jumlah stok baru
              <input
                autoFocus
                required
                min={0}
                max={2147483647}
                step={1}
                type="number"
                inputMode="numeric"
                value={stock}
                onChange={(event) => setStock(event.target.value)}
                className="neu-pressed mt-1 w-full rounded-xl bg-transparent px-4 py-3 text-base text-neu-text"
              />
            </label>
            {error && <p role="alert" className="mt-3 text-sm text-neu-danger">{error}</p>}
            <button type="submit" disabled={saving} className="neu-raised-sm neu-btn mt-5 w-full py-3 text-sm font-semibold uppercase tracking-widest text-neu-accent-dark disabled:opacity-60">
              {saving ? "Menyimpan..." : "Simpan stok"}
            </button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
