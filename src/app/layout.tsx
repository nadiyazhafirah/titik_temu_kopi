import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Titik Temu Kopi | POS",
  description: "Sistem kasir dan pemesanan kafe modern",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
