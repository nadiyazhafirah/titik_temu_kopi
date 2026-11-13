# Titik Temu Kopi — Sistem Kasir Next.js

Aplikasi POS kafe full-stack menggunakan Next.js App Router, TypeScript, Prisma ORM, dan MySQL.

## Fitur
- Login dengan password bcrypt dan session cookie HttpOnly bertanda tangan.
- Role Admin/Manager dan Kasir/Waiter.
- Dashboard omzet harian, jumlah pesanan, menu terlaris, stok rendah, grafik 7 hari, dan transaksi terbaru.
- Transaksi dine-in/takeaway, keranjang multi-item, catatan khusus, PB1 10%, diskon, metode pembayaran, kembalian, invoice otomatis, dan cetak struk.
- Validasi stok dan pembayaran; penyimpanan header/detail dan pengurangan stok dalam database transaction.
- Pengelolaan daftar menu dan stok; tambah menu khusus Admin/Manager.
- Laporan periode, metode pembayaran, ringkasan, ekspor CSV, dan cetak ke PDF melalui dialog print browser.

## Persyaratan
- Node.js 20 atau lebih baru
- MySQL 8+
- npm

## Instalasi di VS Code
1. Ekstrak ZIP lalu buka folder project di VS Code.
2. Jalankan `npm install`.
3. Salin `.env.example` menjadi `.env`.
4. Sesuaikan `DATABASE_URL` dengan username/password MySQL lokal. Pastikan database `titik_temu_kopi` sudah dibuat.
   ```sql
   CREATE DATABASE titik_temu_kopi;
   ```
5. Ganti `SESSION_SECRET` dengan string acak yang panjang.
6. Jalankan migrasi:
   ```bash
   npx prisma migrate dev --name init
   ```
7. Isi data demo:
   ```bash
   npm run db:seed
   ```
8. Jalankan aplikasi:
   ```bash
   npm run dev
   ```
9. Buka http://localhost:3000

## Akun demo
- Admin/Manager: `admin` / `admin123`
- Kasir: `kasir` / `kasir123`

Ganti password demo sebelum aplikasi dipakai secara nyata.

## Struktur utama
```text
src/
  app/
    api/             # Route handlers backend
    login/
    transaksi/
    menu/
    laporan/
    page.tsx         # Dashboard
    globals.css
  lib/
    auth.ts          # Session dan auth helper
    prisma.ts        # Prisma client singleton
prisma/
  schema.prisma      # Skema MySQL
  seed.ts            # Data demo
```

## Endpoint API
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/dashboard`
- `GET /api/products`, `POST /api/products`
- `GET /api/categories`
- `GET /api/orders`, `POST /api/orders`
- `PATCH /api/orders/:id/status`
- `GET /api/reports`

## Catatan keamanan & pengembangan
- Session cookie HttpOnly, SameSite=Lax, Secure pada production, dan memiliki masa berlaku 12 jam.
- Password disimpan dalam bentuk bcrypt hash.
- Server tetap memvalidasi peran pada endpoint yang sensitif.
- Untuk deployment publik, tambahkan rate limiting login, audit log, proteksi CSRF yang sesuai, tes otomatis, dan kebijakan backup.
- Endpoint laporan saat ini mendukung filter tanggal dan metode pembayaran. Filter kategori dapat ditambahkan sebagai pengembangan lanjutan.
- Invoice menggunakan prefix tanggal dan nomor urut. Untuk beban transaksi tinggi, pertimbangkan tabel counter/sequence dengan locking agar nomor tetap unik saat beberapa transaksi bersamaan.
- Cetak/PDF menggunakan fitur Print browser (Save as PDF); ekspor CSV bisa dibuka dengan Excel.

## Catatan implementasi
Lembar praktik menyebut manajemen resep bahan baku. Starter project ini mengelola stok produk/menu. Jika penilaian mewajibkan stok bahan baku berdasarkan resep, kembangkan model `Ingredient`, `RecipeItem`, dan proses pengurangan bahan baku per transaksi.
