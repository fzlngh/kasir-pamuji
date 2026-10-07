# Kasir App — Next.js + Supabase (tema "Struk Printer")

Aplikasi kasir **Next.js 14 (App Router) + TypeScript + Tailwind** dengan
autentikasi dan data tersimpan di **Supabase**. Beranda menampilkan katalog
publik, sementara panel staf, pengelolaan stok, checkout, riwayat, dan cetak
struk tersedia sesuai role akun.

## Konsep desain

- **Panel mesin kasir** (hijau tua, LED hijau menyala) sebagai latar.
- **Struk kertas** meluncur turun dari "printer slot" berisi form login,
  dengan tepi robek zig-zag khas kertas thermal.
- Field diketik dengan font monospace bergaya dot-matrix; tombol submit
  seperti tombol kasir fisik (ada efek "tertekan").
- Login salah → struk "macet" (jitter) + cap merah "DITOLAK".
  Login benar → confetti uang beterbangan lalu masuk ke dashboard.
- Dashboard tampil sebagai panel LED kasir dengan pesan "SELAMAT DATANG"
  yang diketik huruf-per-huruf, dan menu berbentuk tombol kasir yang
  jumlah & isinya menyesuaikan level user (admin / kasir / user) — persis
  seperti versi asli.
- **Halaman Produk (`/produk`)** — admin bisa menambah/menghapus produk,
  menyesuaikan stok produk yang ada, sedangkan kasir dan user hanya melihat
  katalog.
- **Transaksi (`/transaksi`)** — kasir memilih produk, jumlah, dan pembayaran
  tunai, QRIS, atau non-tunai lainnya. Harga dan stok divalidasi database;
  checkout mengunci stok dan menyimpan transaksi secara atomik.
- **Riwayat (`/riwayat`)** — kasir melihat transaksi sendiri; admin melihat
  seluruh transaksi (100 transaksi terbaru); struk dapat dicetak dari riwayat
  maupun setelah checkout.
- **Beranda (`/`)** — katalog produk yang dapat dilihat publik dengan tautan
  login yang jelas. Form login ada di `/login`.
- **Pengguna (`/pengguna`)** — admin mengundang akun melalui email, mengatur
  role, dan menonaktifkan akun. Riwayat transaksi dipertahankan untuk audit.

## Struktur proyek

```
kasir-app-next/
├── app/
│   ├── layout.tsx        # font + AuthProvider
│   ├── page.tsx           # katalog publik
│   ├── globals.css        # tema dan aturan cetak struk
│   ├── dashboard/page.tsx # panel setelah login
│   ├── produk/page.tsx    # etalase dan pengelolaan produk
│   ├── login/page.tsx     # login Supabase Auth
│   ├── transaksi/page.tsx # checkout kasir
│   ├── riwayat/page.tsx   # riwayat transaksi
│   ├── pengguna/page.tsx  # undang/nonaktifkan pengguna, kelola role
│   └── api/admin/users/route.ts # operasi Auth admin sisi server
├── components/
│   ├── ReceiptLogin.tsx   # form login bertema struk (signature UI)
│   ├── DashboardMenu.tsx  # menu per level, gaya tombol kasir
│   ├── ProductCard.tsx    # kartu produk dengan foto
│   ├── AddProductModal.tsx# form tambah produk + upload foto (admin)
│   ├── StockAdjustModal.tsx # penyesuaian stok oleh admin
│   ├── PrintReceipt.tsx   # struk siap cetak
│   ├── TypewriterText.tsx
│   └── TillDisplay.tsx    # jam LED ambient
├── lib/
│   ├── supabase.ts        # client Supabase + tipe Product
│   └── auth-context.tsx   # Supabase Auth + pemuatan profil/role
└── supabase/schema.sql    # profil, katalog, transaksi, RLS + storage
```

## Setup

1. Buat project Supabase, lalu jalankan `supabase/schema.sql` di SQL Editor.
   Script membuat profil, produk, transaksi, checkout atomik, kebijakan RLS,
   dan bucket foto tanpa menghapus data yang sudah ada.
2. Atur **Authentication → URL Configuration → Site URL** ke origin aplikasi
   dan pastikan URL aplikasi `/auth/setup-password` termasuk Redirect URLs.
   Buka **Authentication → Email Templates → Invite user** dan arahkan tautan
   template ke halaman setup password yang memverifikasi token undangan:

   ```html
   <a href="{{ .SiteURL }}/auth/setup-password?token_hash={{ .TokenHash }}&type=invite">
     Terima undangan dan buat password
   </a>
   ```

   Undang akun melalui **Authentication → Users → Invite user**. Penerima
   mengikuti tautan tersebut dan membuat password di halaman aplikasi.
   Setelah template diperbarui, kirim ulang undangan yang lama jika tautannya
   sudah dipakai atau kedaluwarsa.
3. Tambahkan `SUPABASE_SERVICE_ROLE_KEY` sebagai environment variable
   server-only di deployment (atau `.env.local` untuk lokal). Variabel ini
   diperlukan endpoint admin untuk membuat undangan dan mencabut sesi. Jangan
   beri awalan `NEXT_PUBLIC_` dan jangan mengirim key ke browser.
4. Setelah akun terverifikasi dan password dibuat, promosikan akun tersebut
   sebagai admin pertama di SQL Editor:

   ```sql
   DO $$
   DECLARE
     target_user_id uuid;
     updated_count integer;
   BEGIN
     SELECT id INTO STRICT target_user_id
     FROM auth.users
     WHERE lower(email) = lower('admin@example.com')
       AND email_confirmed_at IS NOT NULL;

     UPDATE public.profiles
     SET role = 'admin'
     WHERE id = target_user_id;

     GET DIAGNOSTICS updated_count = ROW_COUNT;
     IF updated_count <> 1 THEN
       RAISE EXCEPTION 'Profil akun admin tidak ditemukan atau tidak unik';
     END IF;
   END $$;
   ```

   Ganti email contoh dengan email akun yang diundang. Buat akun berikutnya
   melalui Supabase Authentication; profil baru otomatis ber-role `user`.
   Admin dapat mengubah role pengguna dari halaman Pengguna. Buat akun kasir
   melalui Supabase Auth, kemudian ubah rolenya menjadi `kasir`.
5. Buat `.env.local` dan isi dengan
   **Project URL** dan **anon public key** dari Settings → API di
   dashboard Supabase:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key
   ```

6. Install dependency & jalankan:

   ```bash
   npm install
   npm run dev
   ```

7. Buka http://localhost:3000 untuk melihat katalog publik, atau
   http://localhost:3000/login untuk masuk dengan akun Supabase Auth.

## Role dan keamanan

- `admin`: mengelola produk/pengguna dan melihat semua transaksi.
- `kasir`: checkout dan melihat transaksinya sendiri.
- `user`: membaca katalog produk. Katalog publik juga tersedia tanpa login.
- Semua tabel menggunakan RLS; pembatasan menu di UI bukan satu-satunya
  lapisan otorisasi. Checkout mengambil harga/stok dari database.
- Katalog produk dapat dibaca pengunjung tanpa login; perubahan produk/stok
  tetap dibatasi untuk admin oleh RLS.
- Penghapusan dari panel menonaktifkan akun (profil dan riwayat tetap ada);
  admin terakhir dilindungi agar tidak dapat dinonaktifkan.
- QRIS/non-tunai dicatat setelah kasir memverifikasi pembayaran secara manual;
  integrasi payment gateway dan rekonsiliasi otomatis belum disertakan.
- Jika instalasi lama memiliki `public.users`, script membatasi aksesnya tetapi
  sengaja tidak menghapus data/password lama. Migrasikan akun ke Supabase Auth,
  lalu hapus data legacy setelah prosedur backup/retensi Anda terpenuhi.
- Jangan pernah mengirim Supabase `service_role` key ke browser atau
  menyimpannya di variabel `NEXT_PUBLIC_*`.
- Sebelum deployment, tinjau konfigurasi domain, verifikasi email/MFA,
  kebijakan registrasi, backup/PITR, serta prosedur pemulihan.

## Library eksternal yang dipakai

- **framer-motion** — semua animasi (struk meluncur, tombol, jitter, typewriter)
- **canvas-confetti** — efek uang beterbangan saat login sukses
- **lucide-react** — ikon menu
- **@supabase/supabase-js** — koneksi ke database Supabase
