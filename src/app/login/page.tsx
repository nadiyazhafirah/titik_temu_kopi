"use client";
import { useState } from "react";
import { Coffee, LockKeyhole } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Login gagal");
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-art">
        <div className="brand">
          <div className="brand-icon">
            <Coffee size={23} />
          </div>
          <div className="brand-text">
            <h2>Titik Temu Kopi</h2>
            <small>COFFEE & CONVERSATION</small>
          </div>
        </div>
        <div>
          <h1>
            Temukan rasa,
            <br />
            ciptakan cerita.
          </h1>
          <p>
            Satu ruang untuk pesanan, transaksi, dan cerita di balik setiap
            cangkir kopi.
          </p>
        </div>
        <small style={{ color: "#bfa99b" }}>
          © 2026 Titik Temu Kopi · Point of Sale
        </small>
      </section>
      <section className="login-form-wrap">
        <form className="login-form" onSubmit={submit}>
          <div className="kpi-icon" style={{ marginBottom: 22 }}>
            <LockKeyhole />
          </div>
          <h2>Selamat datang!</h2>
          <p className="subtitle">
            Masuk untuk melanjutkan ke dashboard kasir.
          </p>
          <div className="field">
            <label>USERNAME</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              suppressHydrationWarning={true}
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required={true}
              suppressHydrationWarning={true}
            />
          </div>
          <button
            className="btn"
            disabled={false}
            suppressHydrationWarning={true}
          >
            Masuk ke Dashboard →
          </button>{" "}
        </form>
      </section>
    </main>
  );
}
