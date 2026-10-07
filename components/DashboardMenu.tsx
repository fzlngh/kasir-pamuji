"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  LayoutGrid,
  Package,
  Users,
  Receipt,
  History,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import type { UserLevel } from "@/lib/supabase";

interface MenuItem {
  label: string;
  icon: LucideIcon;
  href?: string;
}

const MENUS: Record<UserLevel, MenuItem[]> = {
  admin: [
    { label: "Dashboard", icon: LayoutGrid, href: "/dashboard" },
    { label: "Kelola Produk", icon: Package, href: "/produk" },
    { label: "Kelola User", icon: Users, href: "/pengguna" },
    { label: "Riwayat Transaksi", icon: History, href: "/riwayat" },
  ],
  kasir: [
    { label: "Kasir", icon: Receipt, href: "/transaksi" },
    { label: "Produk", icon: Package, href: "/produk" },
    { label: "Riwayat", icon: History, href: "/riwayat" },
  ],
  user: [
    { label: "Lihat Produk", icon: ShoppingBag, href: "/produk" },
  ],
};

export default function DashboardMenu({ level }: { level: UserLevel }) {
  const items = MENUS[level];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item, i) => {
        const Icon = item.icon;
        const content = (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.07, duration: 0.35, ease: "easeOut" }}
            whileTap={item.href ? { scale: 0.96 } : undefined}
            className={`neu-btn flex flex-col items-center gap-2.5 px-4 py-5 sm:py-6 ${
              item.href
                ? "neu-raised-sm cursor-pointer text-neu-text"
                : "neu-flat cursor-default text-neu-muted/70"
            }`}
            title={item.href ? undefined : "Segera hadir"}
          >
            <Icon
              className={`h-6 w-6 ${item.href ? "text-neu-accent" : "text-neu-muted/60"}`}
            />
            <span className="text-center text-xs font-medium tracking-wide sm:text-sm">
              {item.label}
            </span>
          </motion.div>
        );

        return item.href ? (
          <Link key={item.label} href={item.href}>
            {content}
          </Link>
        ) : (
          <div key={item.label}>{content}</div>
        );
      })}
    </div>
  );
}
