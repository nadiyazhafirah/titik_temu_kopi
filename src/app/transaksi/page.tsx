"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Coffee,
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  LogOut,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle,
} from "lucide-react";
import { rupiah } from "@/lib/format";
import { Sidebar } from "../components/layout/Sidebar";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transaksi", label: "Transaksi Kasir", icon: ShoppingCart },
  { href: "/menu", label: "Menu & Stok", icon: Coffee },
  { href: "/laporan", label: "Laporan", icon: ClipboardList },
];

type Product = {
  id: number;
  name: string;
  code: string;
  price: string | number;
  stock: number;
  category: { name: string };
};

type CartItem = { product: Product; qty: number; note: string };

export default function TransactionPage() {
  const [products, setProducts] = useState<Product[]>([]),
    [cart, setCart] = useState<CartItem[]>([]),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState("Semua");
  const [orderType, setOrderType] = useState("DINE_IN"),
    [table, setTable] = useState("1"),
    [customer, setCustomer] = useState(""),
    [discount, setDiscount] = useState("0"),
    [method, setMethod] = useState("CASH"),
    [paid, setPaid] = useState(""),
    [error, setError] = useState(""),
    [success, setSuccess] = useState<any>(null),
    [previewOrder, setPreviewOrder] = useState<any>(null),
    [loading, setLoading] = useState(false),
    [user, setUser] = useState<any>(null);

  async function load() {
    const [p, u] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/auth/me"),
    ]);
    if (!p.ok) {
      location.href = "/login";
      return;
    }
    setProducts((await p.json()).products);
    if (u.ok) setUser((await u.json()).user);
  }

  useEffect(() => {
    load();
  }, []);

  const categories = [
    "Semua",
    ...Array.from(
      new Set(products.map((p) => p.category?.name).filter(Boolean)),
    ),
  ];

  const filtered = products.filter(
    (p) =>
      (category === "Semua" || p.category?.name === category) &&
      `${p.name} ${p.code}`.toLowerCase().includes(search.toLowerCase()),
  );

  const subtotal = cart.reduce(
      (s, i) => s + Number(i.product.price) * i.qty,
      0,
    ),
    discountNum = Math.min(Math.max(Number(discount) || 0, 0), subtotal),
    tax = Math.round((subtotal - discountNum) * 0.1),
    total = subtotal - discountNum + tax,
    change = Math.max(0, Number(paid || 0) - total);

  function add(p: Product) {
    setCart((old) => {
      const found = old.find((i) => i.product.id === p.id);
      if (found) {
        if (found.qty >= p.stock) return old;
        return old.map((i) =>
          i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [...old, { product: p, qty: 1, note: "" }];
    });
  }

  function qty(id: number, d: number) {
    setCart((old) =>
      old
        .map((i) =>
          i.product.id === id
            ? { ...i, qty: Math.max(0, Math.min(i.product.stock, i.qty + d)) }
            : i,
        )
        .filter((i) => i.qty > 0),
    );
  }

  async function checkout() {
    setError("");
    if (!cart.length) {
      setError("Tambahkan minimal satu menu.");
      return;
    }
    if (orderType === "DINE_IN" && !table.trim()) {
      setError("Nomor meja wajib diisi.");
      return;
    }
    if (method === "CASH" && Number(paid) < total) {
      setError("Uang pembayaran belum mencukupi.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType,
          tableNumber: table,
          customerName: customer,
          discount: discountNum,
          paymentMethod: method,
          amountPaid: method === "CASH" ? Number(paid) : total,
          status: "COMPLETED",
          items: cart.map((i) => ({
            productId: i.product.id,
            quantity: i.qty,
            note: i.note,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Transaksi gagal");

      const newOrder = data.order;
      setSuccess(newOrder);
      setPreviewOrder(newOrder);
      setCart([]);
      setPaid("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/login";
  }

  return (
    <div className="shell">
<Sidebar/>
      <main className="main">
        <header className="topbar">
          <div>
            <div className="crumb">Workspace / Penjualan</div>
            <b style={{ fontSize: 14 }}>Transaksi Kasir</b>
          </div>
          <div className="user">
            <div className="avatar">{user?.fullName?.[0] || "K"}</div>
            <div>
              <b>{user?.fullName || "Kasir"}</b>
              <div className="muted" style={{ fontSize: 10 }}>
                {user?.role || "CASHIER"}
              </div>
            </div>
          </div>
        </header>
        <div className="content">
          <div className="heading-row">
            <div>
              <h1 className="page-title">Buat Pesanan</h1>
              <p className="subtitle">
                Pilih menu, lengkapi pesanan, lalu proses pembayaran.
              </p>
            </div>
            <span className="status PROCESSING">PESANAN BARU</span>
          </div>
          {success && (
            <div
              className="card"
              style={{ marginBottom: 18, borderColor: "#b8d5bd" }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <CheckCircle color="#39734c" />
                <div style={{ flex: 1 }}>
                  <b>Transaksi berhasil disimpan!</b>
                  <div className="subtitle">
                    {success.invoiceNumber} · Total {rupiah(success.grandTotal)}
                  </div>
                </div>
                <button
                  className="btn light"
                  onClick={() => setPreviewOrder(success)}
                  suppressHydrationWarning
                >
                  <Printer size={14} /> Lihat/Cetak Struk
                </button>
                <button 
                  className="btn light" 
                  onClick={() => setSuccess(null)}
                  suppressHydrationWarning
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
          <div className="grid two-col">
            <section>
              <div className="card" style={{ marginBottom: 15 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <Search
                      size={15}
                      style={{
                        position: "absolute",
                        left: 11,
                        top: 11,
                        color: "#93877d",
                      }}
                    />
                    <input
                      className="input"
                      style={{ width: "100%", paddingLeft: 34 }}
                      placeholder="Cari nama menu..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      suppressHydrationWarning
                    />
                  </div>
                  <button 
                    className="btn light" 
                    onClick={load}
                    suppressHydrationWarning
                  >
                    Refresh
                  </button>
                </div>
                <div className="filters" style={{ marginBottom: 0 }}>
                  {categories.map((c) => (
                    <button
                      key={c}
                      className={`btn ${category === c ? "" : "light"}`}
                      style={{ padding: "8px 12px" }}
                      onClick={() => setCategory(c)}
                      suppressHydrationWarning
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid products-grid">
                {filtered.map((p) => (
                  <button
                    className="product-card"
                    key={p.id}
                    onClick={() => add(p)}
                    disabled={p.stock < 1}
                    style={{ opacity: p.stock < 1 ? 0.5 : 1 }}
                    suppressHydrationWarning
                  >
                    <div className="product-emoji">
                      {/coffee|kopi|latte|espresso/i.test(p.name)
                        ? "☕"
                        : /tea|teh|matcha/i.test(p.name)
                          ? "🍵"
                          : /cake|pastry|roti|croissant/i.test(p.name)
                            ? "🥐"
                            : /rice|nasi|food|sandwich/i.test(p.name)
                              ? "🍽️"
                              : "🥤"}
                    </div>
                    <div className="product-name">{p.name}</div>
                    <div className="product-price">{rupiah(p.price)}</div>
                    <div className="product-stock">
                      Stok: {p.stock} · {p.category?.name}
                    </div>
                    <div
                      style={{ fontSize: 10, color: "#80583e", marginTop: 3 }}
                    >
                      + Tambah ke pesanan
                    </div>
                  </button>
                ))}
              </div>
              {!filtered.length && (
                <div className="empty">Menu tidak ditemukan.</div>
              )}
            </section>
            <aside
              className="card"
              style={{ alignSelf: "start", position: "sticky", top: 15 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3 className="card-title">Pesanan Anda</h3>
                <span className="status PROCESSING">
                  {cart.reduce((s, i) => s + i.qty, 0)} item
                </span>
              </div>
              <div className="field" style={{ marginTop: 18 }}>
                <label>TIPE PESANAN</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  suppressHydrationWarning
                >
                  <option value="DINE_IN">Dine-in</option>
                  <option value="TAKEAWAY">Takeaway</option>
                </select>
              </div>
              <div
                className="grid"
                style={{
                  gridTemplateColumns:
                    orderType === "DINE_IN" ? "1fr 1fr" : "1fr",
                  marginTop: 10,
                }}
              >
                {orderType === "DINE_IN" && (
                  <div className="field">
                    <label>NO. MEJA *</label>
                    <input
                      className="input"
                      value={table}
                      onChange={(e) => setTable(e.target.value)}
                      placeholder="Contoh: 01"
                      suppressHydrationWarning
                    />
                  </div>
                )}
                <div className="field">
                  <label>NAMA PEMESAN</label>
                  <input
                    className="input"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    placeholder="Opsional"
                    suppressHydrationWarning
                  />
                </div>
              </div>
              <div style={{ marginTop: 15 }}>
                {cart.map((i) => (
                  <div className="cart-line" key={i.product.id}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="cart-line-name">{i.product.name}</div>
                      <div className="cart-line-note">
                        {rupiah(i.product.price)} / item
                      </div>
                      <input
                        className="input"
                        style={{
                          width: "100%",
                          marginTop: 7,
                          padding: "7px 8px",
                        }}
                        placeholder="Catatan: less sugar..."
                        value={i.note}
                        onChange={(e) =>
                          setCart((old) =>
                            old.map((x) =>
                              x.product.id === i.product.id
                                ? { ...x, note: e.target.value }
                                : x,
                            ),
                          )
                        }
                        suppressHydrationWarning
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "end",
                        justifyContent: "space-between",
                        gap: 7,
                      }}
                    >
                      <b style={{ fontSize: 12 }}>
                        {rupiah(Number(i.product.price) * i.qty)}
                      </b>
                      <div className="qty">
                        <button 
                          onClick={() => qty(i.product.id, -1)}
                          suppressHydrationWarning
                        >
                          <Minus size={11} />
                        </button>
                        <span style={{ fontSize: 12 }}>{i.qty}</span>
                        <button 
                          onClick={() => qty(i.product.id, 1)}
                          suppressHydrationWarning
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                      <button
                        onClick={() =>
                          setCart((old) =>
                            old.filter((x) => x.product.id !== i.product.id),
                          )
                        }
                        style={{
                          border: 0,
                          background: "transparent",
                          color: "#a54136",
                        }}
                        suppressHydrationWarning
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {!cart.length && (
                  <div className="empty">
                    Keranjang masih kosong.
                    <br />
                    Pilih menu untuk memulai pesanan.
                  </div>
                )}
              </div>
              <div className="field" style={{ marginTop: 16 }}>
                <label>DISKON (RP)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  suppressHydrationWarning
                />
              </div>
              <div className="summary-line">
                <span>Subtotal</span>
                <b>{rupiah(subtotal)}</b>
              </div>
              <div className="summary-line">
                <span>Diskon</span>
                <b>{rupiah(discountNum)}</b>
              </div>
              <div className="summary-line">
                <span>Pajak PB1 (10%)</span>
                <b>{rupiah(tax)}</b>
              </div>
              <div className="summary-total">
                <span>Total</span>
                <span>{rupiah(total)}</span>
              </div>
              <div className="field" style={{ marginTop: 17 }}>
                <label>METODE PEMBAYARAN</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  suppressHydrationWarning
                >
                  <option value="CASH">Tunai</option>
                  <option value="QRIS">QRIS</option>
                  <option value="BANK_TRANSFER">Transfer Bank</option>
                  <option value="DEBIT">Kartu Debit</option>
                </select>
              </div>
              {method === "CASH" && (
                <>
                  <div className="field" style={{ marginTop: 10 }}>
                    <label>UANG DIBAYAR (RP)</label>
                    <input
                      className="input"
                      type="number"
                      min={total}
                      value={paid}
                      onChange={(e) => setPaid(e.target.value)}
                      placeholder="Masukkan uang pelanggan"
                      suppressHydrationWarning
                    />
                  </div>
                  <div className="summary-line">
                    <span>Kembalian</span>
                    <b>{rupiah(change)}</b>
                  </div>
                </>
              )}
              {error && <p className="error">{error}</p>}
              <button
                className="btn"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  marginTop: 15,
                }}
                disabled={loading || !cart.length}
                onClick={checkout}
                suppressHydrationWarning
              >
                {loading
                  ? "Menyimpan..."
                  : `Proses Pembayaran · ${rupiah(total)}`}
              </button>
              <button
                className="btn light"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  marginTop: 8,
                }}
                onClick={() => {
                  setCart([]);
                  setError("");
                }}
                suppressHydrationWarning
              >
                Kosongkan Pesanan
              </button>
            </aside>
          </div>
        </div>
      </main>

      {/* Modal Preview Invoice */}
      {previewOrder && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "8px",
              width: "380px",
              maxWidth: "90%",
              fontFamily: "monospace",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <h2 style={{ textAlign: "center", margin: "0 0 4px 0" }}>
              TITIK TEMU KOPI
            </h2>
            <p
              style={{
                textAlign: "center",
                fontSize: "11px",
                margin: "0 0 12px 0",
              }}
            >
              COFFEE & CONVERSATION
            </p>
            <hr style={{ border: "0.5px dashed #ccc" }} />
            <p style={{ fontSize: "12px", margin: "4px 0" }}>
              <b>No. Faktur:</b> {previewOrder.invoiceNumber}
            </p>
            <p style={{ fontSize: "12px", margin: "4px 0" }}>
              <b>Tanggal:</b>{" "}
              {new Date(previewOrder.createdAt).toLocaleString("id-ID")}
            </p>
            <p style={{ fontSize: "12px", margin: "4px 0" }}>
              <b>Tipe:</b>{" "}
              {previewOrder.orderType === "DINE_IN"
                ? `Dine-in (Meja ${previewOrder.tableNumber || "-"})`
                : "Takeaway"}
            </p>
            <hr style={{ border: "0.5px dashed #ccc" }} />
            <div
              style={{
                fontSize: "12px",
                maxHeight: "150px",
                overflowY: "auto",
                margin: "8px 0",
              }}
            >
              {previewOrder.details?.map((d: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span>
                    {d.product?.name} x{d.quantity}
                  </span>
                  <span>{rupiah(d.subtotal || d.price * d.quantity)}</span>
                </div>
              ))}
            </div>
            <hr style={{ border: "0.5px dashed #ccc" }} />
            <div style={{ fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Subtotal</span>
                <span>{rupiah(previewOrder.subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Diskon</span>
                <span>{rupiah(previewOrder.discount || 0)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Pajak (10%)</span>
                <span>{rupiah(previewOrder.tax)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: "bold",
                  marginTop: "6px",
                  fontSize: "14px",
                }}
              >
                <span>Total</span>
                <span>{rupiah(previewOrder.grandTotal)}</span>
              </div>
            </div>
            <hr style={{ border: "0.5px dashed #ccc" }} />
            <p style={{ textAlign: "center", fontSize: "11px", margin: "8px 0" }}>
              Terima kasih atas kunjungan Anda! ☕
            </p>

            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button
                className="btn"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => {
                  window.print();
                }}
                suppressHydrationWarning
              >
                Cetak Invoice
              </button>
              <button
                className="btn light"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => setPreviewOrder(null)}
                suppressHydrationWarning
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}