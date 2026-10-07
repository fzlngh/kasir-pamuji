"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Trash2, PackageX, Boxes } from "lucide-react";
import { Product, formatRupiah } from "@/lib/supabase";

export default function ProductCard({
  product,
  index,
  canManage,
  onDelete,
  onAdjustStock,
}: {
  product: Product;
  index: number;
  canManage: boolean;
  onDelete?: (id: number) => void;
  onAdjustStock?: (product: Product) => void;
}) {
  const habis = product.stok <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * index, duration: 0.35, ease: "easeOut" }}
      className="neu-raised-sm group relative p-3 sm:p-3.5"
    >
      <div className="neu-pressed relative aspect-square w-full overflow-hidden p-1.5">
        <div className="relative h-full w-full overflow-hidden rounded-xl">
          {product.foto_url ? (
            <Image
              src={product.foto_url}
              alt={product.nama}
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-neu-muted/50">
              <PackageX className="h-8 w-8" />
            </div>
          )}

          {habis && (
            <div className="absolute inset-0 flex items-center justify-center bg-neu-bg/75 backdrop-blur-[1px]">
              <span className="neu-raised-sm px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-neu-danger sm:text-xs">
                Stok Habis
              </span>
            </div>
          )}
        </div>

        {canManage && (
          <div className="absolute right-3 top-3 flex gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            {onAdjustStock && (
              <button
                type="button"
                aria-label={`Sesuaikan stok ${product.nama}`}
                onClick={() => onAdjustStock(product)}
                className="neu-raised-sm neu-btn flex h-8 w-8 items-center justify-center text-neu-accent-dark"
                title="Sesuaikan stok"
              >
                <Boxes className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                aria-label={`Hapus ${product.nama}`}
                onClick={() => onDelete(product.id)}
                className="neu-raised-sm neu-btn flex h-8 w-8 items-center justify-center text-neu-danger"
                title="Hapus produk"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="px-1 pt-3">
        <span className="text-[10px] font-medium uppercase tracking-widest text-neu-accent">
          {product.kategori}
        </span>
        <p className="mt-0.5 truncate text-sm font-semibold text-neu-text">
          {product.nama}
        </p>
        <div className="mt-1.5 flex items-center justify-between text-xs text-neu-muted">
          <span className="font-semibold text-neu-text">
            {formatRupiah(product.harga)}
          </span>
          <span>stok {product.stok}</span>
        </div>
      </div>
    </motion.div>
  );
}
