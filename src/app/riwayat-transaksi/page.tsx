"use client";

import { Sidebar } from "../components/layout/Sidebar";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Coffee,
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  History,
  LogOut,
  Search,
  RefreshCw,
  Eye,
} from "lucide-react";
import { rupiah } from "@/lib/format";

type OrderDetail = {
  id?: string;
  quantity: number;
  price?: number;
  unitPrice?: number;
  subtotal?: number;
  totalPrice?: number;
  total?: number;
  product?: {
    name?: string;
    price?: number;
  };
};

type Order = {
  id: string;
  invoiceNumber?: string;
  createdAt: string;
  orderType?: string;
  tableNumber?: string | number | null;
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

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transaksi", label: "Transaksi Kasir", icon: ShoppingCart },
  { href: "/menu", label: "Menu & Stok", icon: Coffee },
  { href: "/laporan", label: "Laporan", icon: ClipboardList },
  {
    href: "/riwayat-transaksi",
    label: "Riwayat Transaksi",
    icon: History,
  },
];

const statusLabel: Record<string, string> = {
  PROCESSING: "Diproses",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatInvoiceDate(value: string) {
  const date = new Date(value);

  return {
    date: date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    time: date
      .toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      .replace(/:/g, "."),
  };
}

function getItemTotal(detail: OrderDetail) {
  if (detail.subtotal != null) return Number(detail.subtotal);
  if (detail.totalPrice != null) return Number(detail.totalPrice);
  if (detail.total != null) return Number(detail.total);

  const price = Number(
    detail.price ?? detail.unitPrice ?? detail.product?.price ?? 0,
  );

  return price * Number(detail.quantity || 0);
}

export default function RiwayatTransaksiPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [user, setUser] = useState<any>(null);
  const [search, setSearch] = useState("");

  const [from, setFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return localDate(date);
  });

  const [to, setTo] = useState(() => localDate(new Date()));
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const authResponse = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      if (!authResponse.ok) {
        window.location.href = "/login";
        return;
      }

      const authData = await authResponse.json();

      if (!authData.user) {
        window.location.href = "/login";
        return;
      }

      setUser(authData.user);

      if (!from || !to || from > to) {
        throw new Error("Rentang tanggal tidak valid.");
      }

      const params = new URLSearchParams({ from, to });

      if (method) {
        params.set("method", method);
      }

      // Menggunakan API reports yang sudah tersedia.
      const response = await fetch(`/api/reports?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      const contentType = response.headers.get("content-type");

      if (!contentType?.includes("application/json")) {
        throw new Error(
          `API reports tidak mengembalikan JSON. Status: ${response.status}. Periksa lokasi route.ts.`,
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            `Gagal mengambil riwayat transaksi (${response.status}).`,
        );
      }

      if (!Array.isArray(data.orders)) {
        throw new Error("Data transaksi tidak ditemukan dalam respons API.");
      }

      setOrders(data.orders);
    } catch (err) {
      console.error("Riwayat transaksi:", err);
      setOrders([]);

      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengambil data.",
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
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      window.location.href = "/login";
    }
  }

  const filteredOrders = orders.filter((order) => {
    const keyword = search.toLowerCase();

    const matchesSearch =
      (order.invoiceNumber || "").toLowerCase().includes(keyword) ||
      (order.user?.fullName || "").toLowerCase().includes(keyword) ||
      (order.details || []).some((detail) =>
        (detail.product?.name || "").toLowerCase().includes(keyword),
      );

    const matchesStatus = !status || order.status === status;

    return matchesSearch && matchesStatus;
  });

  const totalPenjualan = filteredOrders
    .filter((order) => order.status === "COMPLETED")
    .reduce((total, order) => total + Number(order.grandTotal || 0), 0);

  const completedCount = filteredOrders.filter(
    (order) => order.status === "COMPLETED",
  ).length;

  function exportCSV() {
    if (!filteredOrders.length) {
      setError("Tidak ada transaksi untuk diekspor.");
      return;
    }

    const rows = [
      [
        "No Invoice",
        "Tanggal",
        "Kasir",
        "Tipe Pesanan",
        "Metode Pembayaran",
        "Subtotal",
        "Diskon",
        "Pajak",
        "Total",
        "Status",
      ],
      ...filteredOrders.map((order) => [
        order.invoiceNumber,
        new Date(order.createdAt).toLocaleString("id-ID"),
        order.user?.fullName,
        order.orderType,
        order.paymentMethod,
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
    link.download = `riwayat-transaksi-${from}-${to}.csv`;
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function printInvoice() {
    window.print();
  }

  return (
    <div className="shell">
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <main className="main">
        <header className="topbar">
          <div>
            <div className="crumb">Workspace / Transaksi</div>
            <b style={{ fontSize: 14 }}>Riwayat Transaksi</b>
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
          {/* JUDUL HALAMAN */}
          <div className="heading-row">
            <div>
              <h1 className="page-title">Riwayat Transaksi</h1>
              <p className="subtitle">
                Lihat dan telusuri transaksi penjualan Titik Temu Kopi.
              </p>
            </div>

            <button
              className="btn light"
              onClick={exportCSV}
              disabled={loading || filteredOrders.length === 0}
            >
              <RefreshCw size={15} />
              Ekspor CSV
            </button>
          </div>

          {/* RINGKASAN */}
          <div className="grid kpis">
            <div className="card">
              <div className="kpi-top">Total Transaksi</div>
              <div className="kpi-value">{filteredOrders.length}</div>
              <div className="kpi-note">Sesuai filter</div>
            </div>

            <div className="card">
              <div className="kpi-top">Transaksi Selesai</div>
              <div className="kpi-value">{completedCount}</div>
              <div className="kpi-note">Status selesai</div>
            </div>

            <div className="card">
              <div className="kpi-top">Total Penjualan Selesai</div>
              <div className="kpi-value" style={{ fontSize: 22 }}>
                {rupiah(totalPenjualan)}
              </div>
              <div className="kpi-note">Tidak termasuk transaksi batal</div>
            </div>
          </div>

          {/* FILTER */}
          <section className="card" style={{ marginBottom: 18 }}>
            <h3 className="card-title" style={{ marginBottom: 16 }}>
              Filter Riwayat
            </h3>

            <div className="filters" style={{ margin: 0, alignItems: "end" }}>
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
                <label>STATUS TRANSAKSI</label>
                <select
                  className="filter-input"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="">Semua status</option>
                  <option value="COMPLETED">Selesai</option>
                  <option value="PROCESSING">Diproses</option>
                  <option value="CANCELLED">Dibatalkan</option>
                </select>
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
          </section>

          {/* TABEL RIWAYAT */}
          <section className="card table-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                padding: "12px 0",
              }}
            >
              <div>
                <h3 className="card-title">Daftar Transaksi</h3>
                <div className="card-sub">
                  {loading
                    ? "Sedang memuat data..."
                    : `${filteredOrders.length} transaksi ditemukan`}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Search size={17} />

                <input
                  className="input"
                  placeholder="Cari invoice, kasir, menu..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  style={{ minWidth: 220 }}
                />
              </div>
            </div>

            {error && (
              <div className="error" role="alert" style={{ padding: 12 }}>
                {error}

                <button
                  className="btn light"
                  onClick={load}
                  style={{ marginLeft: 10 }}
                >
                  Coba lagi
                </button>
              </div>
            )}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>NO. INVOICE</th>
                    <th>TANGGAL</th>
                    <th>KASIR</th>
                    <th>TIPE PESANAN</th>
                    <th>PEMBAYARAN</th>
                    <th>TOTAL</th>
                    <th>STATUS</th>
                    <th>AKSI</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <b>{order.invoiceNumber || "-"}</b>
                      </td>

                      <td>
                        {new Date(order.createdAt).toLocaleString("id-ID")}
                      </td>

                      <td>{order.user?.fullName || "-"}</td>

                      <td>
                        {order.orderType === "DINE_IN"
                          ? "Dine-in"
                          : order.orderType === "TAKEAWAY"
                            ? "Takeaway"
                            : order.orderType || "-"}
                      </td>

                      <td>{order.paymentMethod || "-"}</td>

                      <td>
                        <b>{rupiah(order.grandTotal || 0)}</b>
                      </td>

                      <td>
                        <span className={`status ${order.status}`}>
                          {statusLabel[order.status] || order.status}
                        </span>
                      </td>

                      <td>
                        <button
                          className="btn light"
                          onClick={() => setSelectedOrder(order)}
                          title="Lihat detail transaksi"
                        >
                          <Eye size={15} />
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!loading && !error && filteredOrders.length === 0 && (
                <div className="empty">
                  Tidak ada riwayat transaksi yang sesuai.
                </div>
              )}

              {loading && (
                <div className="empty">Memuat riwayat transaksi...</div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* MODAL INVOICE */}
      {selectedOrder && (
        <div className="invoice-overlay" onClick={() => setSelectedOrder(null)}>
          <div
            className="invoice-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="invoice-header">
              <h2>TITIK TEMU KOPI</h2>
              <p>COFFEE &amp; CONVERSATION</p>
            </div>

            <div className="invoice-info">
              <p>
                <strong>No. Faktur:</strong>{" "}
                {selectedOrder.invoiceNumber || "-"}
              </p>

              <p>
                <strong>Tanggal:</strong>{" "}
                {formatInvoiceDate(selectedOrder.createdAt).date}
                {", "}
                {formatInvoiceDate(selectedOrder.createdAt).time}
              </p>

              <p>
                <strong>Tipe:</strong>{" "}
                {selectedOrder.orderType === "DINE_IN"
                  ? `Dine-in${
                      selectedOrder.tableNumber
                        ? ` (Meja ${selectedOrder.tableNumber})`
                        : ""
                    }`
                  : selectedOrder.orderType === "TAKEAWAY"
                    ? "Takeaway"
                    : selectedOrder.orderType || "-"}
              </p>
            </div>

            <div className="invoice-items">
              {selectedOrder.details?.map((detail, index) => (
                <div
                  className="invoice-item"
                  key={`${selectedOrder.id}-${detail.id || index}`}
                >
                  <span>
                    {detail.product?.name || "Produk"} x{detail.quantity}
                  </span>

                  <span>{rupiah(getItemTotal(detail))}</span>
                </div>
              ))}

              {(!selectedOrder.details ||
                selectedOrder.details.length === 0) && (
                <p className="invoice-empty">Detail item tidak tersedia.</p>
              )}
            </div>

            <div className="invoice-totals">
              <div>
                <span>Subtotal</span>
                <span>{rupiah(selectedOrder.subtotal || 0)}</span>
              </div>

              <div>
                <span>Diskon</span>
                <span>{rupiah(selectedOrder.discount || 0)}</span>
              </div>

              <div>
                <span>
                  Pajak
                  {(selectedOrder.subtotal || 0) > 0
                    ? ` (${Math.round(
                        ((selectedOrder.tax || 0) / selectedOrder.subtotal) *
                          100,
                      )}%)`
                    : ""}
                </span>

                <span>{rupiah(selectedOrder.tax || 0)}</span>
              </div>

              <div className="invoice-grand-total">
                <strong>Total</strong>
                <strong>{rupiah(selectedOrder.grandTotal || 0)}</strong>
              </div>
            </div>

            <div className="invoice-thanks">
              Terima kasih atas kunjungan Anda! ☕
            </div>

            <div className="invoice-actions">
              <button
                type="button"
                className="invoice-print-btn"
                onClick={printInvoice}
              >
                Cetak Invoice
              </button>

              <button
                type="button"
                className="invoice-close-btn"
                onClick={() => setSelectedOrder(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STYLE INVOICE */}
      <style jsx global>{`
        .invoice-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 16px;
          overflow-y: auto;
          background: rgba(0, 0, 0, 0.48);
        }

        .invoice-modal {
          width: 100%;
          max-width: 475px;
          max-height: calc(100vh - 32px);
          overflow-y: auto;
          padding: 28px 30px;
          border-radius: 12px;
          background: #fff;
          color: #38271f;
          box-shadow: 0 15px 45px rgba(0, 0, 0, 0.2);
          font-family: "Courier New", monospace;
          font-size: 14px;
        }

        .invoice-header {
          padding-bottom: 16px;
          border-bottom: 1px dashed #bdbdbd;
          text-align: center;
        }

        .invoice-header h2 {
          margin: 4px 0 8px;
          font-family: inherit;
          font-size: 15px;
          font-weight: 500;
          letter-spacing: 1px;
        }

        .invoice-header p {
          margin: 0;
          font-size: 13px;
        }

        .invoice-info {
          padding: 7px 0;
          border-bottom: 1px dashed #bdbdbd;
        }

        .invoice-info p {
          margin: 6px 0;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .invoice-info strong {
          margin-right: 4px;
        }

        .invoice-items {
          padding: 8px 0;
          border-bottom: 1px dashed #bdbdbd;
        }

        .invoice-item {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 5px 0;
        }

        .invoice-item span:first-child {
          overflow-wrap: anywhere;
        }

        .invoice-item span:last-child {
          flex-shrink: 0;
          white-space: nowrap;
        }

        .invoice-empty {
          margin: 5px 0;
          color: #777;
        }

        .invoice-totals {
          padding-top: 8px;
        }

        .invoice-totals > div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin: 5px 0;
        }

        .invoice-grand-total {
          margin-top: 8px !important;
          padding: 5px 0;
          border-bottom: 1px dashed #bdbdbd;
          font-size: 16px;
        }

        .invoice-thanks {
          margin: 16px 0 22px;
          text-align: center;
          line-height: 1.6;
        }

        .invoice-actions {
          display: flex;
          gap: 10px;
        }

        .invoice-actions button {
          flex: 1;
          min-height: 50px;
          padding: 12px;
          border-radius: 11px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .invoice-print-btn {
          border: 1px solid #4b3026;
          background: #4b3026;
          color: #fff;
        }

        .invoice-close-btn {
          border: 1px solid #eadfd6;
          background: #fff;
          color: #4b3026;
        }

        .invoice-print-btn:hover {
          background: #624235;
        }

        .invoice-close-btn:hover {
          background: #faf5f0;
        }

        @media (max-width: 480px) {
          .invoice-modal {
            padding: 22px 18px;
          }

          .invoice-actions button {
            font-size: 12px;
          }
        }

        @media print {
          @page {
            margin: 8mm;
          }

          body * {
            visibility: hidden !important;
          }

          .invoice-overlay,
          .invoice-overlay * {
            visibility: visible !important;
          }

          .invoice-overlay {
            position: absolute !important;
            inset: 0 !important;
            display: block !important;
            overflow: visible !important;
            padding: 0 !important;
            background: white !important;
          }

          .invoice-modal {
            width: 100% !important;
            max-width: 380px !important;
            max-height: none !important;
            overflow: visible !important;
            margin: 0 auto !important;
            padding: 12px !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          .invoice-actions {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
