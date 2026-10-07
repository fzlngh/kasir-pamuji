"use client";

import { useEffect, useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";

const BUCKET = "produk-foto";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export default function AddProductModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [nama, setNama] = useState("");
  const [harga, setHarga] = useState("");
  const [stok, setStok] = useState("");
  const [kategori, setKategori] = useState("Umum");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!preview?.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function handleFile(f: File | null) {
    if (
      f &&
      (!IMAGE_EXTENSIONS[f.type] || f.size > MAX_IMAGE_SIZE)
    ) {
      setFile(null);
      setPreview(null);
      setError("Foto harus JPEG, PNG, WebP, atau GIF maksimal 5 MB.");
      return;
    }
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
    setError("");
  }

  function reset() {
    setNama("");
    setHarga("");
    setStok("");
    setKategori("Umum");
    setFile(null);
    setPreview(null);
    setError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedPrice = Number(harga);
    const parsedStock = Number(stok) || 0;
    if (!nama.trim() || !harga) {
      setError("Nama dan harga wajib diisi");
      return;
    }
    if (
      nama.trim().length > 200 ||
      kategori.trim().length > 100 ||
      !Number.isSafeInteger(parsedPrice) ||
      parsedPrice > 999999999999 ||
      !Number.isInteger(parsedStock) ||
      parsedStock > 2147483647
    ) {
      setError("Periksa nama, kategori, harga, dan stok produk.");
      return;
    }
    setSaving(true);
    setError("");

    let foto_url: string | null = null;
    let uploadedPath: string | null = null;

    try {
      if (file) {
        const ext = IMAGE_EXTENSIONS[file.type];
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, file);

        if (uploadError) {
          throw new Error(
            `Gagal upload foto: pastikan bucket "${BUCKET}" sudah dibuat (lihat supabase/schema.sql). (${uploadError.message})`
          );
        }
        uploadedPath = path;

        const { data: publicUrl } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(path);
        foto_url = publicUrl.publicUrl;
      }

      const { error: insertError } = await supabase.from("products").insert({
        nama: nama.trim(),
        harga: parsedPrice,
        stok: parsedStock,
        kategori: kategori.trim() || "Umum",
        foto_url,
      });

      if (insertError) {
        if (uploadedPath) {
          const { error: cleanupError } = await supabase.storage
            .from(BUCKET)
            .remove([uploadedPath]);
          if (cleanupError) {
            throw new Error(
              `${insertError.message}; foto gagal dibersihkan: ${cleanupError.message}`
            );
          }
        }
        throw new Error(insertError.message);
      }

      reset();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan produk");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-neu-text/30 backdrop-blur-sm sm:items-center sm:px-4"
          onClick={onClose}
        >
          <motion.form
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
            className="neu-raised w-full max-w-sm rounded-b-none px-6 pb-8 pt-5 sm:rounded-b-[28px] sm:px-8 sm:py-8"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-neu-text">
                Tambah Produk
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="neu-raised-sm neu-btn flex h-8 w-8 items-center justify-center text-neu-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mb-4 block cursor-pointer">
              <div className="neu-pressed flex h-32 items-center justify-center overflow-hidden p-1.5 sm:h-36">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="Pratinjau"
                    className="h-full w-full rounded-xl object-cover"
                  />
                ) : (
                  <span className="flex flex-col items-center gap-1.5 text-neu-muted">
                    <Upload className="h-5 w-5" />
                    <span className="text-xs">unggah foto produk</span>
                  </span>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <div className="neu-pressed mb-3 px-4 py-2.5">
              <input
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama produk"
                className="w-full bg-transparent text-sm text-neu-text outline-none placeholder:text-neu-muted/70"
              />
            </div>

            <div className="mb-3 flex gap-3">
              <div className="neu-pressed w-1/2 px-4 py-2.5">
                <input
                  value={harga}
                  onChange={(e) => setHarga(e.target.value.replace(/\D/g, ""))}
                  placeholder="Harga (Rp)"
                  inputMode="numeric"
                  className="w-full bg-transparent text-sm text-neu-text outline-none placeholder:text-neu-muted/70"
                />
              </div>
              <div className="neu-pressed w-1/2 px-4 py-2.5">
                <input
                  value={stok}
                  onChange={(e) => setStok(e.target.value.replace(/\D/g, ""))}
                  placeholder="Stok"
                  inputMode="numeric"
                  className="w-full bg-transparent text-sm text-neu-text outline-none placeholder:text-neu-muted/70"
                />
              </div>
            </div>

            <div className="neu-pressed mb-5 px-4 py-2.5">
              <input
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                placeholder="Kategori"
                className="w-full bg-transparent text-sm text-neu-text outline-none placeholder:text-neu-muted/70"
              />
            </div>

            {error && (
              <p className="mb-3 text-xs text-neu-danger">{error}</p>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={saving}
              className="neu-raised-sm neu-btn w-full py-3 text-sm font-semibold uppercase tracking-widest text-neu-accent-dark disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan Produk"}
            </motion.button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
