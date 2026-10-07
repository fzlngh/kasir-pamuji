"use client";

import { Printer, X } from "lucide-react";

export interface ReceiptSaleItem {
  id: number;
  nama_produk: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface ReceiptSale {
  id: number | string;
  cashier_id?: string;
  total_amount: number;
  payment_method: "cash" | "qris" | "other";
  paid_amount: number;
  change_amount: number;
  created_at: string;
  sale_items: ReceiptSaleItem[];
}

const PAYMENT_LABELS = {
  cash: "Tunai",
  qris: "QRIS",
  other: "Non-tunai lainnya",
};

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PrintReceipt({
  sale,
  onClose,
}: {
  sale: ReceiptSale | null;
  onClose: () => void;
}) {
  if (!sale) return null;
  const createdAt = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(sale.created_at));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neu-text/40 p-4 print:static print:block print:overflow-visible print:bg-white print:p-0">
      <section className="receipt-sheet w-full max-w-sm bg-white p-6 text-black shadow-xl print:max-w-none print:shadow-none">
        <div className="mb-5 flex justify-end gap-2 print:hidden">
          <button type="button" onClick={() => window.print()} className="neu-raised-sm neu-btn inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-neu-accent-dark">
            <Printer className="h-4 w-4" /> Cetak struk
          </button>
          <button type="button" onClick={onClose} aria-label="Tutup struk" className="neu-raised-sm neu-btn flex h-9 w-9 items-center justify-center text-neu-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold">STRUK BELANJA</h2>
          <p className="mt-1 text-xs">Bukti transaksi</p>
          <div className="my-4 border-t border-dashed border-black" />
        </div>
        <dl className="space-y-1 text-xs">
          <div className="flex justify-between gap-3"><dt>No. transaksi</dt><dd>#{sale.id}</dd></div>
          <div className="flex justify-between gap-3"><dt>Tanggal</dt><dd>{createdAt}</dd></div>
        </dl>
        <div className="my-4 border-t border-dashed border-black" />
        <ul className="space-y-3 text-xs">
          {sale.sale_items.map((item) => (
            <li key={item.id}>
              <div className="font-semibold">{item.nama_produk}</div>
              <div className="mt-1 flex justify-between gap-3">
                <span>{item.quantity} × {rupiah(item.unit_price)}</span>
                <span>{rupiah(item.line_total)}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="my-4 border-t border-dashed border-black" />
        <dl className="space-y-1.5 text-xs">
          <div className="flex justify-between font-bold text-sm"><dt>Total</dt><dd>{rupiah(sale.total_amount)}</dd></div>
          <div className="flex justify-between"><dt>Pembayaran</dt><dd>{PAYMENT_LABELS[sale.payment_method]}</dd></div>
          {sale.payment_method === "cash" && (
            <>
              <div className="flex justify-between"><dt>Diterima</dt><dd>{rupiah(sale.paid_amount)}</dd></div>
              <div className="flex justify-between"><dt>Kembalian</dt><dd>{rupiah(sale.change_amount)}</dd></div>
            </>
          )}
        </dl>
        <div className="my-4 border-t border-dashed border-black" />
        <p className="text-center text-xs">Terima kasih atas kunjungan Anda</p>
      </section>
    </div>
  );
}
