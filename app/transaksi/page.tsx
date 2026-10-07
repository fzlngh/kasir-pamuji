"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/lib/supabase";
import PrintReceipt from "@/components/PrintReceipt";
import type { ReceiptSale } from "@/components/PrintReceipt";

type PaymentMethod = "cash" | "qris" | "other";

function isPaymentMethod(value: string): value is PaymentMethod {
  return value === "cash" || value === "qris" || value === "other";
}

function formatRupiah(value: bigint) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function TransaksiPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [completedSaleId, setCompletedSaleId] = useState<string | null>(null);
  const [receiptSale, setReceiptSale] = useState<ReceiptSale | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const loadProducts = useCallback(async () => {
    setFetching(true);
    try {
      const { data, error: loadError } = await supabase
        .from("products")
        .select("*")
        .gt("stok", 0)
        .order("nama");

      if (loadError) {
        setError("Gagal memuat produk. Silakan muat ulang halaman.");
        return;
      }
      setProducts((data ?? []) as Product[]);
    } catch {
      setError("Gagal memuat produk. Silakan muat ulang halaman.");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.level !== "kasir") {
      router.replace("/dashboard");
      return;
    }
    void loadProducts();
  }, [loading, user, router, loadProducts]);

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([productId, quantity]) => ({
          product: products.find((product) => product.id === Number(productId)),
          quantity,
        }))
        .filter(
          (item): item is { product: Product; quantity: number } =>
            item.product !== undefined
        ),
    [cart, products]
  );

  const total = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) =>
          sum + BigInt(item.product.harga) * BigInt(item.quantity),
        BigInt(0)
      ),
    [cartItems]
  );
  const received =
    paymentMethod === "cash" && /^\d+$/.test(cashReceived)
      ? BigInt(cashReceived)
      : paymentMethod === "cash"
        ? BigInt(0)
        : total;
  const change = received >= total ? received - total : BigInt(0);

  function setQuantity(product: Product, quantity: number) {
    setCart((current) => {
      if (quantity <= 0) {
        const next = { ...current };
        delete next[product.id];
        return next;
      }
      return { ...current, [product.id]: Math.min(quantity, product.stok) };
    });
    setError("");
    setCompletedSaleId(null);
    setReceiptSale(null);
    setReceiptOpen(false);
  }

  async function submitSale() {
    if (cartItems.length === 0 || submitting) return;
    const maxSupportedAmount = BigInt(Number.MAX_SAFE_INTEGER);
    if (total > maxSupportedAmount || received > maxSupportedAmount) {
      setError("Nominal transaksi melebihi batas yang didukung sistem.");
      return;
    }
    if (paymentMethod === "cash" && received < total) {
      setError("Uang tunai yang diterima belum mencukupi total transaksi.");
      return;
    }

    setSubmitting(true);
    setError("");
    setCompletedSaleId(null);
    setReceiptSale(null);
    setReceiptOpen(false);
    try {
      const { data, error: checkoutError } = await supabase.rpc("checkout", {
        p_items: cartItems.map(({ product, quantity }) => ({
          product_id: product.id,
          quantity,
        })),
        p_payment_method: paymentMethod,
        p_paid_amount: received.toString(),
      });

      if (checkoutError) {
        setError(
          "Transaksi gagal diproses. Stok mungkin berubah; periksa keranjang lalu coba lagi."
        );
        return;
      }

      setCart({});
      setCashReceived("");
      setCompletedSaleId(String(data));
      const { data: saleData, error: receiptError } = await supabase
        .from("sales")
        .select("id, cashier_id, total_amount, payment_method, paid_amount, change_amount, created_at, sale_items(id, nama_produk, quantity, unit_price, line_total)")
        .eq("id", data)
        .single();
      if (receiptError || !saleData) {
        setError(
          "Transaksi tersimpan, tetapi struk belum dapat dimuat. Anda dapat mencetaknya dari halaman riwayat."
        );
      } else {
        setReceiptSale(saleData as ReceiptSale);
      }
      await loadProducts();
    } catch {
      setError(
        "Koneksi terputus saat memproses transaksi. Periksa riwayat sebelum mencoba lagi."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user || user.level !== "kasir") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-neu-muted">memuat sesi...</span>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="neu-raised-sm neu-btn px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-neu-text"
          >
            Kembali
          </Link>
          <h1 className="font-display text-lg font-semibold text-neu-text sm:text-2xl">
            Transaksi Kasir
          </h1>
        </div>

        {completedSaleId && (
          <p className="neu-raised-sm mb-4 p-4 text-sm text-neu-accent-dark">
            Transaksi #{completedSaleId} berhasil disimpan.{" "}
            {receiptSale && (
              <button type="button" onClick={() => setReceiptOpen(true)} className="ml-2 font-semibold underline">
                Lihat / cetak struk
              </button>
            )}{" "}
            <Link className="font-semibold underline" href="/riwayat">
              Lihat riwayat
            </Link>
          </p>
        )}

        {error && <p className="mb-4 text-sm text-neu-danger">{error}</p>}

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <section className="neu-raised p-5 sm:p-7">
            <h2 className="mb-4 font-display text-base font-semibold text-neu-text">
              Produk tersedia
            </h2>
            {fetching ? (
              <p className="text-sm text-neu-muted">Memuat produk...</p>
            ) : products.length === 0 ? (
              <p className="text-sm text-neu-muted">Tidak ada produk tersedia.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="neu-raised-sm flex items-center justify-between gap-3 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neu-text">
                        {product.nama}
                      </p>
                      <p className="mt-1 text-xs text-neu-muted">
                        {formatRupiah(BigInt(product.harga))} · stok {product.stok}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity(product, (cart[product.id] ?? 0) + 1)
                      }
                      aria-label={`Tambah ${product.nama}`}
                      className="neu-raised-sm neu-btn flex h-9 w-9 shrink-0 items-center justify-center text-neu-accent-dark"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="neu-raised h-fit p-5 sm:p-7">
            <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-neu-text">
              <ShoppingCart className="h-4 w-4" />
              Keranjang
            </h2>

            {cartItems.length === 0 ? (
              <p className="py-5 text-sm text-neu-muted">
                Pilih produk untuk memulai transaksi.
              </p>
            ) : (
              <ul className="divide-y divide-neu-muted/20">
                {cartItems.map(({ product, quantity }) => (
                  <li key={product.id} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neu-text">
                          {product.nama}
                        </p>
                        <p className="text-xs text-neu-muted">
                          {formatRupiah(BigInt(product.harga) * BigInt(quantity))}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Hapus ${product.nama} dari keranjang`}
                        onClick={() => setQuantity(product, 0)}
                        className="text-neu-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        aria-label={`Kurangi jumlah ${product.nama}`}
                        onClick={() => setQuantity(product, quantity - 1)}
                        className="neu-raised-sm neu-btn flex h-7 w-7 items-center justify-center"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-5 text-center text-sm">{quantity}</span>
                      <button
                        type="button"
                        aria-label={`Tambah jumlah ${product.nama}`}
                        disabled={quantity >= product.stok}
                        onClick={() => setQuantity(product, quantity + 1)}
                        className="neu-raised-sm neu-btn flex h-7 w-7 items-center justify-center disabled:opacity-40"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 border-t border-neu-muted/30 pt-4">
              <div className="flex justify-between text-sm font-semibold text-neu-text">
                <span>Total</span>
                <span>{formatRupiah(total)}</span>
              </div>

              <label className="mt-4 block text-xs font-medium text-neu-muted">
                Metode pembayaran
                <select
                  value={paymentMethod}
                  onChange={(event) => {
                    if (isPaymentMethod(event.target.value)) {
                      setPaymentMethod(event.target.value);
                      setError("");
                    } else {
                      setError("Metode pembayaran tidak valid.");
                    }
                  }}
                  className="neu-pressed mt-1 w-full rounded-xl bg-transparent px-3 py-2.5 text-sm text-neu-text"
                >
                  <option value="cash">Tunai</option>
                  <option value="qris">QRIS</option>
                  <option value="other">Non-tunai lainnya</option>
                </select>
              </label>
              {paymentMethod !== "cash" && (
                <p className="mt-2 text-xs text-neu-muted">
                  Pastikan pembayaran non-tunai sudah diterima sebelum
                  menyelesaikan transaksi.
                </p>
              )}

              {paymentMethod === "cash" && (
                <>
                  <label className="mt-3 block text-xs font-medium text-neu-muted">
                    Uang diterima
                    <input
                      inputMode="numeric"
                      value={cashReceived}
                      onChange={(event) =>
                        setCashReceived(event.target.value.replace(/\D/g, ""))
                      }
                      className="neu-pressed mt-1 w-full rounded-xl bg-transparent px-3 py-2.5 text-sm text-neu-text"
                      placeholder="Masukkan nominal"
                    />
                  </label>
                  <p className="mt-2 flex justify-between text-xs text-neu-muted">
                    <span>Kembalian</span>
                    <span>{formatRupiah(change)}</span>
                  </p>
                </>
              )}

              <button
                type="button"
                disabled={cartItems.length === 0 || submitting || fetching}
                onClick={() => void submitSale()}
                className="neu-raised-sm neu-btn mt-5 w-full py-3 text-sm font-semibold uppercase tracking-widest text-neu-accent-dark disabled:opacity-50"
              >
                {submitting ? "Memproses..." : "Selesaikan transaksi"}
              </button>
            </div>
          </aside>
        </div>
      </div>
      <PrintReceipt
        sale={receiptOpen ? receiptSale : null}
        onClose={() => setReceiptOpen(false)}
      />
    </main>
  );
}
