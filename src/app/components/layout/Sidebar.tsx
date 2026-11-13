"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Coffee,
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  History,
  LogOut,
} from "lucide-react";

const navigation = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/transaksi",
    label: "Transaksi Kasir",
    icon: ShoppingCart,
  },
  {
    href: "/menu",
    label: "Menu & Stok",
    icon: Coffee,
  },
  {
    href: "/laporan",
    label: "Laporan",
    icon: ClipboardList,
  },
  {
    href: "/riwayat-transaksi",
    label: "Riwayat Transaksi",
    icon: History,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Coffee />
        </div>

        <div className="brand-text">
          <h2>Titik Temu</h2>
          <small>COFFEE &amp; CONVERSATION</small>
        </div>
      </div>

      <div className="nav-label">MENU UTAMA</div>

      {navigation.map((item) => {
        const Icon = item.icon;

        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav ${isActive ? "active" : ""}`}
          >
            <Icon size={17} />
            <span>{item.label}</span>
          </Link>
        );
      })}

      <div className="side-bottom">
        <button
          type="button"
          className="nav sidebar-logout"
          onClick={handleLogout}
        >
          <LogOut size={17} />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
