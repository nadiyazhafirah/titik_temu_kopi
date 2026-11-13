"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Coffee,
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  LogOut,
  Plus,
  Package,
  Search,
  History,
  Pencil,
  Trash2,
} from "lucide-react";
import { rupiah } from "@/lib/format";
import { Sidebar } from "../components/layout/Sidebar";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transaksi", label: "Transaksi Kasir", icon: ShoppingCart },
  { href: "/menu", label: "Menu & Stok", icon: Coffee },
  { href: "/laporan", label: "Laporan", icon: ClipboardList },
  { href: "/riwayat-transaksi", label: "Riwayat Transaksi", icon: History },
];

export default function MenuPage() {
  const [products, setProducts] = useState<any[]>([]),
    [categories, setCategories] = useState<any[]>([]),
    [user, setUser] = useState<any>(null),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [show, setShow] = useState(false),
    [saving, setSaving] = useState(false),
    [editId, setEditId] = useState<number | null>(null);

  const [form, setForm] = useState({
    categoryId: "",
    code: "",
    name: "",
    price: "",
    costPrice: "",
    stock: "",
    minStock: "5",
    unit: "cup",
  });

  async function load() {
    const [p, c, u] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/categories"),
      fetch("/api/auth/me"),
    ]);
    if (!p.ok) {
      location.href = "/login";
      return;
    }
    setProducts((await p.json()).products);
    setCategories((await c.json()).categories);
    if (u.ok) setUser((await u.json()).user);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const url = editId ? `/api/products/${editId}` : "/api/products";
      const method = editId ? "PUT" : "POST";

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          categoryId: Number(form.categoryId),
          price: Number(form.price),
          costPrice: Number(form.costPrice || 0),
          stock: Number(form.stock),
          minStock: Number(form.minStock),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Gagal menyimpan");
      
      closeForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(product: any) {
    setEditId(product.id);
    setForm({
      categoryId: product.categoryId?.toString() || "",
      code: product.code || "",
      name: product.name || "",
      price: product.price?.toString() || "",
      costPrice: product.costPrice?.toString() || "",
      stock: product.stock?.toString() || "",
      minStock: product.minStock?.toString() || "5",
      unit: product.unit || "cup",
    });
    setShow(true);
  }

  async function removeProduct(id: number) {
    if (!confirm("Apakah Anda yakin ingin menghapus menu ini?")) return;
    try {
      const r = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Gagal menghapus");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Terjadi kesalahan saat menghapus");
    }
  }

  function closeForm() {
    setShow(false);
    setEditId(null);
    setForm({
      categoryId: "",
      code: "",
      name: "",
      price: "",
      costPrice: "",
      stock: "",
      minStock: "5",
      unit: "cup",
    });
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/login";
  }

  const isManager = ["ADMIN", "MANAGER"].includes(user?.role);

  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <header className="topbar">
          <div>
            <div className="crumb">Workspace / Inventori</div>
            <b style={{ fontSize: 14 }}>Menu & Stok</b>
          </div>
          <div className="user">
            <div className="avatar">{user?.fullName?.[0] || "A"}</div>
            <div>
              <b>{user?.fullName || "Staff"}</b>
              <div className="muted" style={{ fontSize: 10 }}>
                {user?.role}
              </div>
            </div>
          </div>
        </header>
        <div className="content">
          <div className="heading-row">
            <div>
              <h1 className="page-title">Menu & Persediaan</h1>
              <p className="subtitle">
                Pantau harga jual, kategori, dan ketersediaan menu.
              </p>
            </div>
            {isManager && (
              <button
                className="btn"
                onClick={() => {
                  if (show && editId) {
                    closeForm();
                  } else {
                    setShow(!show);
                  }
                }}
              >
                <Plus size={16} /> {show && !editId ? "Tutup Form" : "Tambah Menu"}
              </button>
            )}
          </div>
          {show && (
            <form className="card" onSubmit={save} style={{ marginBottom: 20 }}>
              <h3 className="card-title">
                {editId ? "Edit Menu Produk" : "Tambah produk baru"}
              </h3>
              <div
                className="grid"
                style={{
                  gridTemplateColumns: "repeat(3,minmax(0,1fr))",
                  marginTop: 15,
                }}
              >
                {[
                  ["code", "Kode produk"],
                  ["name", "Nama menu"],
                  ["price", "Harga jual"],
                  ["costPrice", "Harga pokok"],
                  ["stock", "Stok awal"],
                  ["minStock", "Batas stok minimum"],
                ].map(([key, label]) => (
                  <div className="field" key={key}>
                    <label>{label.toUpperCase()}</label>
                    <input
                      className="input"
                      required={key !== "costPrice" && key !== "minStock"}
                      type={
                        ["price", "costPrice", "stock", "minStock"].includes(
                          key,
                        )
                          ? "number"
                          : "text"
                      }
                      min={
                        ["price", "costPrice", "stock", "minStock"].includes(
                          key,
                        )
                          ? "0"
                          : undefined
                      }
                      value={(form as any)[key]}
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.value })
                      }
                    />
                  </div>
                ))}
                <div className="field">
                  <label>KATEGORI</label>
                  <select
                    required
                    value={form.categoryId}
                    onChange={(e) =>
                      setForm({ ...form, categoryId: e.target.value })
                    }
                  >
                    <option value="">Pilih kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>SATUAN</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  >
                    <option value="cup">Cup</option>
                    <option value="pcs">Pcs</option>
                    <option value="porsi">Porsi</option>
                  </select>
                </div>
              </div>
              {error && <p className="error">{error}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button className="btn" disabled={saving}>
                  {saving
                    ? "Menyimpan..."
                    : editId
                    ? "Perbarui Menu"
                    : "Simpan Menu"}
                </button>
                <button
                  type="button"
                  className="btn light"
                  onClick={closeForm}
                >
                  Batal
                </button>
              </div>
            </form>
          )}
          <div className="grid kpis">
            <div className="card">
              <div className="kpi-top">
                Total Menu{" "}
                <span className="kpi-icon">
                  <Coffee size={18} />
                </span>
              </div>
              <div className="kpi-value">{products.length}</div>
              <div className="kpi-note">Menu aktif terdaftar</div>
            </div>
            <div className="card">
              <div className="kpi-top">
                Stok Menipis{" "}
                <span className="kpi-icon">
                  <Package size={18} />
                </span>
              </div>
              <div className="kpi-value">
                {products.filter((p) => p.stock <= p.minStock).length}
              </div>
              <div className="kpi-note">
                Sama dengan atau di bawah batas minimum
              </div>
            </div>
            <div className="card">
              <div className="kpi-top">
                Kategori{" "}
                <span className="kpi-icon">
                  <ClipboardList size={18} />
                </span>
              </div>
              <div className="kpi-value">{categories.length}</div>
              <div className="kpi-note">Kategori menu aktif</div>
            </div>
            <div className="card">
              <div className="kpi-top">
                Nilai Persediaan{" "}
                <span className="kpi-icon">
                  <Package size={18} />
                </span>
              </div>
              <div className="kpi-value" style={{ fontSize: 22 }}>
                {rupiah(
                  products.reduce(
                    (s, p) => s + Number(p.costPrice) * p.stock,
                    0,
                  ),
                )}
              </div>
              <div className="kpi-note">Perkiraan berdasarkan harga pokok</div>
            </div>
          </div>
          <section className="card table-card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 0",
              }}
            >
              <div style={{ position: "relative", flex: 1, maxWidth: 350 }}>
                <Search
                  size={15}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: 11,
                    color: "#93877d",
                  }}
                />
                <input
                  className="input"
                  style={{ width: "100%", paddingLeft: 33 }}
                  placeholder="Cari kode atau nama menu..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button className="btn light" onClick={load}>
                Refresh
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>KODE</th>
                    <th>NAMA MENU</th>
                    <th>KATEGORI</th>
                    <th>HARGA JUAL</th>
                    <th>HARGA POKOK</th>
                    <th>STOK</th>
                    <th>STATUS STOK</th>
                    {isManager && <th style={{ textAlign: "center" }}>AKSI</th>}
                  </tr>
                </thead>
                <tbody>
                  {products
                    .filter((p) =>
                      `${p.name} ${p.code}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .map((p) => (
                      <tr key={p.id}>
                        <td>{p.code}</td>
                        <td>
                          <b>{p.name}</b>
                        </td>
                        <td>{p.category?.name}</td>
                        <td>{rupiah(p.price)}</td>
                        <td>{rupiah(p.costPrice)}</td>
                        <td>
                          <b>{p.stock}</b> {p.unit}
                        </td>
                        <td>
                          <span
                            className={`status ${
                              p.stock <= p.minStock ? "CANCELLED" : "COMPLETED"
                            }`}
                          >
                            {p.stock <= p.minStock ? "Stok rendah" : "Aman"}
                          </span>
                        </td>
                        {isManager && (
                          <td style={{ textAlign: "center" }}>
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                justifyContent: "center",
                              }}
                            >
                              <button
                                className="btn light"
                                style={{ padding: "6px 10px", fontSize: 12 }}
                                title="Edit Menu"
                                onClick={() => startEdit(p)}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                className="btn light"
                                style={{
                                  padding: "6px 10px",
                                  fontSize: 12,
                                  color: "#e11d48",
                                  borderColor: "#fecdd3",
                                }}
                                title="Hapus Menu"
                                onClick={() => removeProduct(p.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
              {!products.length && (
                <div className="empty">
                  Data menu belum tersedia. Jalankan seeder terlebih dahulu.
                </div>
              )}
            </div>
          </section>
          {!isManager && (
            <p className="subtitle" style={{ marginTop: 12 }}>
              Akun kasir hanya dapat melihat data menu. Gunakan akun
              Admin/Manager untuk menambah, mengubah, atau menghapus menu.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}