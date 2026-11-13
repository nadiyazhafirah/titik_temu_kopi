"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Coffee,
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Package,
  LogOut,
  TrendingUp,
  ReceiptText,
  CupSoda,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import { rupiah } from "@/lib/format";
import { Sidebar } from "./components/layout/Sidebar";

type Dashboard = {
  totalRevenue: number;
  orderCount: number;
  bestSeller: string;
  lowStockCount: number;
  lowStock: any[];
  recentOrders: any[];
  chart: { label: string; total: number }[];
};
type User = { fullName: string; role: string };
const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transaksi", label: "Transaksi Kasir", icon: ShoppingCart },
  { href: "/menu", label: "Menu & Stok", icon: Coffee },
  { href: "/laporan", label: "Laporan", icon: ClipboardList },
];
const statusLabel: any = {
  PROCESSING: "Diproses",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};
export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  async function load() {
    try {
      const [d, u] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/auth/me"),
      ]);
      if (!d.ok || !u.ok) {
        window.location.href = "/login";
        return;
      }
      setData(await d.json());
      setUser((await u.json()).user);
    } catch {
      setError("Tidak dapat memuat dashboard.");
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <div className="shell">
      < Sidebar />
      <main className="main">
        <header className="topbar">
          <div>
            <div className="crumb">Workspace / Overview</div>
            <b style={{ fontSize: 14 }}>Dashboard</b>
          </div>
          <div className="user">
            <div className="avatar">{user?.fullName?.[0] || "A"}</div>
            <div>
              <b>{user?.fullName || "Memuat..."}</b>
              <div className="muted" style={{ fontSize: 10 }}>
                {user?.role || "POS Staff"}
              </div>
            </div>
          </div>
        </header>
        <div className="content">
          <div className="heading-row">
            <div>
              <h1 className="page-title">Selamat datang kembali 👋</h1>
              <p className="subtitle">
                Berikut ringkasan aktivitas kafe hari ini.
              </p>
            </div>
            <Link href="/transaksi" className="btn">
              <Plus size={16} /> Transaksi Baru
            </Link>
          </div>
          {error && <p className="error">{error}</p>}
          <div className="grid kpis">
            <div className="card">
              <div className="kpi-top">
                Total Omzet Hari Ini{" "}
                <span className="kpi-icon">
                  <TrendingUp size={18} />
                </span>
              </div>
              <div className="kpi-value">{rupiah(data?.totalRevenue || 0)}</div>
              <div className="kpi-note">Transaksi bukan dibatalkan</div>
            </div>
            <div className="card">
              <div className="kpi-top">
                Jumlah Pesanan{" "}
                <span className="kpi-icon">
                  <ReceiptText size={18} />
                </span>
              </div>
              <div className="kpi-value">{data?.orderCount || 0}</div>
              <div className="kpi-note">Pesanan hari ini</div>
            </div>
            <div className="card">
              <div className="kpi-top">
                Menu Terlaris{" "}
                <span className="kpi-icon">
                  <CupSoda size={18} />
                </span>
              </div>
              <div className="kpi-value" style={{ fontSize: 21 }}>
                {data?.bestSeller || "—"}
              </div>
              <div className="kpi-note">Berdasarkan jumlah item terjual</div>
            </div>
            <div className="card">
              <div className="kpi-top">
                Stok Menipis{" "}
                <span className="kpi-icon">
                  <AlertTriangle size={18} />
                </span>
              </div>
              <div className="kpi-value">
                {data?.lowStockCount || 0}{" "}
                <span
                  style={{
                    fontSize: 13,
                    fontFamily: "DM Sans",
                    fontWeight: 500,
                  }}
                >
                  menu
                </span>
              </div>
              <div className="kpi-note">Perlu pemeriksaan stok</div>
            </div>
          </div>
          <div className="grid dashboard-lower">
            <section className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div>
                  <h3 className="card-title">Tren Penjualan</h3>
                  <div className="card-sub">Omzet 7 hari terakhir</div>
                </div>
                <span className="kpi-icon">
                  <TrendingUp size={17} />
                </span>
              </div>
              <div className="chart">
                {(
                  data?.chart ||
                  Array.from({ length: 7 }, (_, i) => ({
                    label: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"][i],
                    total: 0,
                  }))
                ).map((v, i) => {
                  const max = Math.max(
                    ...(data?.chart || []).map((x) => x.total),
                    1,
                  );
                  return (
                    <div className="bar-wrap" key={i}>
                      <div
                        className={`bar ${i === 6 ? "today" : ""}`}
                        style={{
                          height: `${Math.max(3, (v.total / max) * 100)}%`,
                        }}
                        title={rupiah(v.total)}
                      ></div>
                      <div className="bar-label">{v.label}</div>
                    </div>
                  );
                })}
              </div>
              <div
                style={{ fontSize: 10, color: "#9a8f85", textAlign: "center" }}
              >
                Grafik diperbarui berdasarkan data transaksi tersimpan.
              </div>
            </section>
            <section className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                }}
              >
                <div>
                  <h3 className="card-title">Perlu Restock</h3>
                  <div className="card-sub">Menu dengan stok ≤ 5 unit</div>
                </div>
                <AlertTriangle size={18} color="#a66b3e" />
              </div>
              <div className="low-list">
                {data?.lowStock?.length ? (
                  data.lowStock.map((p) => (
                    <div className="low-item" key={p.id}>
                      <div>
                        <div className="low-name">{p.name}</div>
                        <div className="low-cat">
                          {p.category?.name || "Menu"}
                        </div>
                      </div>
                      <span className="stock-pill">{p.stock} tersisa</span>
                    </div>
                  ))
                ) : (
                  <div className="empty">Semua stok dalam kondisi aman 🎉</div>
                )}
              </div>
              <Link
                href="/menu"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  color: "#80583e",
                  fontWeight: 700,
                  marginTop: 18,
                }}
              >
                Kelola stok <ArrowUpRight size={14} />
              </Link>
            </section>
          </div>
          <section className="card" style={{ marginTop: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div>
                <h3 className="card-title">Transaksi Terbaru</h3>
                <div className="card-sub">Aktivitas pesanan terakhir</div>
              </div>
              <button className="btn light" onClick={load}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>NO. INVOICE</th>
                    <th>WAKTU</th>
                    <th>KASIR</th>
                    <th>TIPE</th>
                    <th>TOTAL</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recentOrders?.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <b>{o.invoiceNumber}</b>
                      </td>
                      <td>
                        {new Date(o.createdAt).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td>{o.user?.fullName}</td>
                      <td>
                        {o.orderType === "DINE_IN" ? "Dine-in" : "Takeaway"}
                      </td>
                      <td>
                        <b>{rupiah(o.grandTotal)}</b>
                      </td>
                      <td>
                        <span className={`status ${o.status}`}>
                          {statusLabel[o.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data?.recentOrders?.length && (
                <div className="empty">
                  Belum ada transaksi. Mulai dari tombol Transaksi Baru.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
