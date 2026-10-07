"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import PrintReceipt from "@/components/PrintReceipt";
import type { ReceiptSale } from "@/components/PrintReceipt";

interface SaleItem {
  id: number;
  nama_produk: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface Sale {
  id: number;
  cashier_id: string;
  total_amount: number;
  payment_method: "cash" | "qris" | "other";
  paid_amount: number;
  change_amount: number;
  created_at: string;
  sale_items: SaleItem[];
}

const PAYMENT_LABELS = {
  cash: "Tunai",
  qris: "QRIS",
  other: "Non-tunai lainnya",
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

const formatDate = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function RiwayatPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [receiptSale, setReceiptSale] = useState<ReceiptSale | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.level === "user") {
      router.replace("/dashboard");
      return;
    }

    async function loadSales() {
      try {
        const { data, error: loadError } = await supabase
          .from("sales")
          .select(
            "id, cashier_id, total_amount, payment_method, paid_amount, change_amount, created_at, sale_items(id, nama_produk, quantity, unit_price, line_total)"
          )
          .order("created_at", { ascending: false })
          .limit(100);

        if (loadError) {
          setError("Gagal memuat riwayat transaksi. Silakan coba lagi.");
        } else {
          setSales(data as Sale[]);
        }
      } catch {
        setError("Gagal memuat riwayat transaksi. Silakan coba lagi.");
      } finally {
        setFetching(false);
      }
    }

    void loadSales();
  }, [loading, user, router]);

  if (loading || !user || user.level === "user") {
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
            Riwayat Transaksi
          </h1>
        </div>

        <section className="neu-raised p-5 sm:p-8">
          {error ? (
            <p className="text-sm text-neu-danger">{error}</p>
          ) : fetching ? (
            <p className="text-sm text-neu-muted">Memuat transaksi...</p>
          ) : sales.length === 0 ? (
            <p className="text-sm text-neu-muted">Belum ada transaksi.</p>
          ) : (
            <ul className="space-y-4">
              {sales.map((sale) => (
                <li key={sale.id} className="neu-raised-sm p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-neu-text">
                        Transaksi #{sale.id}
                      </h2>
                      <p className="mt-1 text-xs text-neu-muted">
                        {formatDate.format(new Date(sale.created_at))}
                        {user.level === "admin" &&
                          ` · kasir ${sale.cashier_id.slice(0, 8)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-neu-text">
                        {formatRupiah(sale.total_amount)}
                      </p>
                      <p className="mt-1 text-xs text-neu-muted">
                        {PAYMENT_LABELS[sale.payment_method]}
                      </p>
                      <button
                        type="button"
                        onClick={() => setReceiptSale(sale as ReceiptSale)}
                        className="mt-2 text-xs font-semibold text-neu-accent-dark underline underline-offset-2"
                      >
                        Cetak struk
                      </button>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-1 border-t border-neu-muted/20 pt-3">
                    {sale.sale_items.map((item) => (
                      <li
                        key={item.id}
                        className="flex justify-between gap-3 text-xs text-neu-muted"
                      >
                        <span className="min-w-0 truncate">
                          {item.nama_produk} × {item.quantity}
                        </span>
                        <span className="shrink-0">
                          {formatRupiah(item.line_total)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {sale.payment_method === "cash" && (
                    <p className="mt-3 text-right text-xs text-neu-muted">
                      Diterima {formatRupiah(sale.paid_amount)} · kembalian{" "}
                      {formatRupiah(sale.change_amount)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {user.level === "kasir" && (
            <Link
              href="/transaksi"
              className="neu-raised-sm neu-btn mt-5 inline-flex px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-neu-accent-dark"
            >
              Transaksi baru
            </Link>
          )}
        </section>
      </div>
      <PrintReceipt sale={receiptSale} onClose={() => setReceiptSale(null)} />
    </main>
  );
}
