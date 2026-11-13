"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Coffee,
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  LogOut,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
} from "lucide-react";
import { rupiah } from "@/lib/format";
import { Sidebar } from "../components/layout/Sidebar";

type OrderDetail = {
  id?: string;
  quantity: number;
  product?: {
    name?: string;
  };
};

type Order = {
  id: string;
  invoiceNumber?: string;
  createdAt: string;
  orderType?: string;
  subtotal: number;
  discount?: number;
  tax: number;
  grandTotal: number;
  status: string;
  paymentMethod?: string;
  user?: {
    fullName?: string;
  };
  details?: OrderDetail[];
};

type Summary = {
  gross?: number;
  discount?: number;
  tax?: number;
  net?: number;
  average?: number;
};

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transaksi", label: "Transaksi Kasir", icon: ShoppingCart },
  { href: "/menu", label: "Menu & Stok", icon: Coffee },
  { href: "/laporan", label: "Laporan", icon: ClipboardList },
];

const statusLabel: Record<string, string> = {
  PROCESSING: "Diproses",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

function getLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function ReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<Summary>({});
  const [user, setUser] = useState<any>(null);
  const [from, setFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return getLocalDate(date);
  });
  const [to, setTo] = useState(() => getLocalDate(new Date()));
  const [method, setMethod] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const userResponse = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      if (!userResponse.ok) {
        window.location.href = "/login";
        return;
      }

      const userData = await userResponse.json();
      const currentUser = userData.user;

      if (!currentUser) {
        window.location.href = "/login";
        return;
      }

      setUser(currentUser);

      if (!["ADMIN", "MANAGER"].includes(currentUser.role)) {
        setOrders([]);
        setSummary({});
        setError(
          "Laporan lengkap hanya dapat diakses oleh Admin atau Manager.",
        );
        return;
      }

      if (!from || !to || from > to) {
        setError("Tanggal awal tidak boleh melebihi tanggal akhir.");
        return;
      }

      const params = new URLSearchParams({ from, to });

      if (method) {
        params.set("method", method);
      }

      // Diubah dari /api/laporan menjadi /api/reports agar sesuai dengan backend
      const response = await fetch(`/api/reports?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Gagal mengambil data laporan dari server.",
        );
      }

      if (!Array.isArray(data.orders)) {
        throw new Error(
          "Format data laporan tidak sesuai. Periksa API /api/reports.",
        );
      }

      setOrders(data.orders);
      setSummary(data.summary || {});
    } catch (err) {
      console.error("Kesalahan laporan:", err);
      setOrders([]);
      setSummary({});
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memuat laporan.",
      );
    } finally {
      setLoading(false);
    }
  }, [from, to, method]);

  useEffect(() => {
    load();
  }, [load]);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  function csv() {
    if (orders.length === 0) {
      setError("Tidak ada data transaksi untuk diekspor.");
      return;
    }

    const rows = [
      [
        "No Faktur",
        "Tanggal",
        "Kasir",
        "Tipe",
        "Metode Pembayaran",
        "Item Terjual",
        "Subtotal",
        "Diskon",
        "Pajak",
        "Grand Total",
        "Status",
      ],
      ...orders.map((order) => [
        order.invoiceNumber,
        new Date(order.createdAt).toLocaleString("id-ID"),
        order.user?.fullName,
        order.orderType,
        order.paymentMethod,
        order.details
          ?.map(
            (detail) =>
              `${detail.product?.name || "Produk"} x${detail.quantity}`,
          )
          .join("; "),
        order.subtotal,
        order.discount ?? 0,
        order.tax,
        order.grandTotal,
        statusLabel[order.status] || order.status,
      ]),
    ];

    const content =
      "\ufeff" +
      rows
        .map((row) =>
          row
            .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\r\n");

    const blob = new Blob([content], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `laporan-pos-${from}-${to}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function pdf() {
    window.print();
  }

  return (
    <div className="shell">
      <Sidebar />

      <main className="main">
        <header className="topbar">
          <div>
            <div className="crumb">Workspace / Analitik</div>
            <b style={{ fontSize: 14 }}>Laporan Penjualan</b>
          </div>

          <div className="user">
            <div className="avatar">{user?.fullName?.[0] || "A"}</div>
            <div>
              <b>{user?.fullName || "Staff"}</b>
              <div className="muted" style={{ fontSize: 10 }}>
                {user?.role || ""}
              </div>
            </div>
          </div>
        </header>

        <div className="content">
          <div className="heading-row">
            <div>
              <h1 className="page-title">Laporan Penjualan</h1>
              <p className="subtitle">
                Analisis transaksi dan performa penjualan kafe.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                className="btn light"
                onClick={csv}
                disabled={loading || orders.length === 0}
              >
                <FileSpreadsheet size={15} />
                Ekspor CSV
              </button>

              <button
                className="btn"
                onClick={pdf}
                disabled={loading}
                suppressHydrationWarning
              >
                <FileText size={15} />
                Cetak / PDF
              </button>
            </div>
          </div>

          {error && (
            <div className="card" style={{ marginBottom: 18 }} role="alert">
              <p className="error">{error}</p>

              {user && !["ADMIN", "MANAGER"].includes(user.role) && (
                <Link href="/" className="btn">
                  Kembali ke Dashboard
                </Link>
              )}

              {user && ["ADMIN", "MANAGER"].includes(user.role) && (
                <button className="btn" onClick={load} disabled={loading}>
                  Coba Lagi
                </button>
              )}
            </div>
          )}

          {!error && (
            <>
              <div className="card" style={{ marginBottom: 18 }}>
                <div
                  className="filters"
                  style={{ margin: 0, alignItems: "end" }}
                >
                  <div className="field">
                    <label>DARI TANGGAL</label>
                    <input
                      className="input filter-input"
                      type="date"
                      value={from}
                      max={to}
                      onChange={(event) => setFrom(event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label>SAMPAI TANGGAL</label>
                    <input
                      className="input filter-input"
                      type="date"
                      value={to}
                      min={from}
                      onChange={(event) => setTo(event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label>METODE PEMBAYARAN</label>
                    <select
                      className="filter-input"
                      value={method}
                      onChange={(event) => setMethod(event.target.value)}
                    >
                      <option value="">Semua metode</option>
                      <option value="CASH">Tunai</option>
                      <option value="QRIS">QRIS</option>
                      <option value="BANK_TRANSFER">Transfer Bank</option>
                      <option value="DEBIT">Debit</option>
                    </select>
                  </div>

                  <button className="btn" onClick={load} disabled={loading}>
                    <RefreshCw size={15} />
                    {loading ? "Memuat..." : "Terapkan Filter"}
                  </button>
                </div>
              </div>

              <div className="grid kpis">
                <div className="card">
                  <div className="kpi-top">Omzet Bruto</div>
                  <div className="kpi-value" style={{ fontSize: 22 }}>
                    {rupiah(summary.gross ?? 0)}
                  </div>
                  <div className="kpi-note">Sebelum diskon</div>
                </div>

                <div className="card">
                  <div className="kpi-top">Diskon</div>
                  <div className="kpi-value" style={{ fontSize: 22 }}>
                    {rupiah(summary.discount ?? 0)}
                  </div>
                  <div className="kpi-note">Total potongan</div>
                </div>

                <div className="card">
                  <div className="kpi-top">Pajak Terkumpul</div>
                  <div className="kpi-value" style={{ fontSize: 22 }}>
                    {rupiah(summary.tax ?? 0)}
                  </div>
                  <div className="kpi-note">Total pajak transaksi</div>
                </div>

                <div className="card">
                  <div className="kpi-top">Omzet Bersih</div>
                  <div className="kpi-value" style={{ fontSize: 22 }}>
                    {rupiah(summary.net ?? 0)}
                  </div>
                  <div className="kpi-note">
                    Rata-rata: {rupiah(summary.average ?? 0)} / transaksi
                  </div>
                </div>
              </div>

              <section className="card table-card">
                <div
                  style={{
                    padding: "12px 0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h3 className="card-title">Detail Transaksi</h3>
                    <div className="card-sub">
                      {loading
                        ? "Sedang mengambil data..."
                        : `${orders.length} transaksi ditemukan`}
                    </div>
                  </div>

                  <button
                    className="btn light"
                    onClick={csv}
                    disabled={loading || orders.length === 0}
                  >
                    <Download size={14} />
                    Unduh CSV
                  </button>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>NO. FAKTUR</th>
                        <th>TANGGAL & JAM</th>
                        <th>KASIR</th>
                        <th>TIPE PESANAN</th>
                        <th>ITEM TERJUAL</th>
                        <th>SUBTOTAL</th>
                        <th>PAJAK</th>
                        <th>GRAND TOTAL</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>

                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id}>
                          <td>
                            <b>{order.invoiceNumber || "-"}</b>
                          </td>

                          <td>
                            {new Date(order.createdAt).toLocaleString("id-ID", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>

                          <td>{order.user?.fullName || "-"}</td>

                          <td>
                            {order.orderType === "DINE_IN"
                              ? "Dine-in"
                              : order.orderType === "TAKEAWAY"
                                ? "Takeaway"
                                : order.orderType || "-"}
                          </td>

                          <td>
                            {order.details?.length
                              ? order.details
                                  .map(
                                    (detail) =>
                                      `${detail.product?.name || "Produk"} ×${detail.quantity}`,
                                  )
                                  .join(", ")
                              : "-"}
                          </td>

                          <td>{rupiah(order.subtotal ?? 0)}</td>
                          <td>{rupiah(order.tax ?? 0)}</td>

                          <td>
                            <b>{rupiah(order.grandTotal ?? 0)}</b>
                          </td>

                          <td>
                            <span className={`status ${order.status}`}>
                              {statusLabel[order.status] || order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!loading && orders.length === 0 && (
                    <div className="empty">
                      Tidak ada transaksi pada periode ini.
                      <div style={{ marginTop: 6 }}>
                        Periksa tanggal, metode pembayaran, atau data transaksi
                        di database.
                      </div>
                    </div>
                  )}

                  {loading && (
                    <div className="empty">Memuat data laporan...</div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
