"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem("roadsos_auth");
    if (auth) router.replace("/");
  }, [router]);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) { setError("Please fill in all fields"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); return; }
      localStorage.setItem("roadsos_auth", JSON.stringify(data.user));
      localStorage.setItem("roadsos_token", data.token);
      if (data.user.role === "user") {
        localStorage.setItem("roadsos_user_profile", JSON.stringify({
          name: data.user.name, phone: data.user.phone,
          bloodGroup: data.user.bloodGroup || "",
          vehicleNumber: data.user.vehicleNumber || "",
          vehicleType: data.user.vehicleType || "",
          age: data.user.age || "", gender: data.user.gender || "",
          emergencyContacts: data.user.emergencyContacts || [],
        }));
      }
      if (data.user.role === "admin") router.push("/admin");
      else router.push("/user");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');

        :root {
          --void: #06070f;
          --surface: #0c0e1a;
          --surface2: #111426;
          --surface3: #161929;
          --border: rgba(255,255,255,0.07);
          --violet: #8b5cf6;
          --violet-bright: #a78bfa;
          --cyan: #22d3ee;
          --red-sos: #ef4444;
          --text-primary: rgba(255,255,255,0.92);
          --text-secondary: rgba(255,255,255,0.45);
          --text-hint: rgba(255,255,255,0.22);
          --font-display: 'Plus Jakarta Sans', sans-serif;
          --font-body: 'DM Sans', sans-serif;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .rl-root {
          min-height: 100vh;
          background: var(--void);
          font-family: var(--font-body);
          display: flex; align-items: center; justify-content: center;
          padding: 48px 20px;
          position: relative; overflow: hidden;
        }

        /* ── Background ── */
        .rl-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
        .rl-orb {
          position: absolute; border-radius: 50%;
          filter: blur(130px); animation: rl-pulse 9s ease-in-out infinite;
        }
        .rl-orb-1 {
          width: 560px; height: 560px; top: -8%; left: -8%;
          background: radial-gradient(circle, rgba(34,211,238,0.09) 0%, transparent 70%);
          animation-delay: 0s;
        }
        .rl-orb-2 {
          width: 500px; height: 500px; bottom: -8%; right: -8%;
          background: radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%);
          animation-delay: -4.5s;
        }
        .rl-orb-3 {
          width: 260px; height: 260px; top: 45%; left: 45%;
          background: radial-gradient(circle, rgba(239,68,68,0.05) 0%, transparent 70%);
          animation-delay: -2s;
        }
        @keyframes rl-pulse {
          0%,100% { transform: scale(1) translate(0,0); opacity: 1; }
          50% { transform: scale(1.1) translate(-15px, 15px); opacity: 0.75; }
        }
        .rl-grid {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.016) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.016) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        /* ── Wrap ── */
        .rl-wrap {
          position: relative; z-index: 10;
          width: 100%; max-width: 440px;
          animation: rl-up 0.65s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes rl-up {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Logo ── */
        .rl-logo {
          display: flex; align-items: center; justify-content: center;
          gap: 14px; margin-bottom: 40px; text-decoration: none;
        }
        .rl-logo-badge {
          width: 52px; height: 52px; border-radius: 16px; flex-shrink: 0;
          background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-weight: 800; font-size: 13px;
          color: #fff; letter-spacing: 0.06em;
          box-shadow: 0 0 0 1px rgba(239,68,68,0.3), 0 8px 32px rgba(239,68,68,0.35);
          transition: transform 0.3s;
        }
        .rl-logo:hover .rl-logo-badge { transform: scale(1.06) rotate(-3deg); }
        .rl-logo-text h1 {
          font-family: var(--font-display); font-weight: 700; font-size: 22px;
          color: var(--text-primary); letter-spacing: -0.01em; line-height: 1;
        }
        .rl-logo-text p {
          font-size: 10px; color: var(--text-hint); margin-top: 3px;
          letter-spacing: 0.18em; text-transform: uppercase; font-family: var(--font-body);
        }

        /* ── Card ── */
        .rl-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px; padding: 40px 36px;
          position: relative; overflow: hidden;
          box-shadow: 0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset;
          transition: border-color 0.4s;
        }
        .rl-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(34,211,238,0.5), rgba(139,92,246,0.4), transparent);
        }
        .rl-card:hover { border-color: rgba(34,211,238,0.15); }
        .rl-card-glow {
          position: absolute; top: -50px; left: 50%; transform: translateX(-50%);
          width: 180px; height: 100px;
          background: radial-gradient(ellipse, rgba(34,211,238,0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        /* ── Header ── */
        .rl-header { text-align: center; margin-bottom: 32px; }
        .rl-header h2 {
          font-family: var(--font-display); font-weight: 700; font-size: 20px;
          color: var(--text-primary); letter-spacing: -0.01em; margin-bottom: 6px;
        }
        .rl-header p { font-size: 13px; color: var(--text-secondary); font-weight: 300; }

        /* ── Error ── */
        .rl-error {
          display: flex; align-items: center; gap: 10px;
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.22);
          border-radius: 12px; padding: 12px 16px;
          color: #f87171; font-size: 13px; margin-bottom: 20px;
          animation: rl-up 0.3s both;
        }

        /* ── Fields ── */
        .rl-form { display: flex; flex-direction: column; gap: 18px; }
        .rl-field { display: flex; flex-direction: column; gap: 8px; }
        .rl-label {
          font-family: var(--font-display); font-size: 10px; font-weight: 600;
          letter-spacing: 0.2em; text-transform: uppercase; color: var(--text-hint);
          padding-left: 4px;
        }
        .rl-input-wrap { position: relative; }
        .rl-icon {
          position: absolute; left: 18px; top: 50%; transform: translateY(-50%);
          color: var(--text-hint); pointer-events: none; display: flex; align-items: center;
          transition: color 0.3s;
        }
        .rl-input-wrap:focus-within .rl-icon { color: var(--cyan); }
        .rl-input {
          width: 100%; background: var(--surface2);
          border: 1px solid var(--border); border-radius: 14px;
          padding: 14px 18px 14px 52px;
          font-family: var(--font-body); font-size: 14px;
          color: var(--text-primary); outline: none; transition: all 0.3s;
          line-height: 1.5; caret-color: var(--cyan);
        }
        .rl-input::placeholder { color: var(--text-hint); font-size: 13px; }
        .rl-input:hover { background: var(--surface3); border-color: rgba(255,255,255,0.12); }
        .rl-input:focus {
          background: var(--surface3);
          border-color: rgba(34,211,238,0.4);
          box-shadow: 0 0 0 3px rgba(34,211,238,0.08), 0 0 20px rgba(34,211,238,0.06);
        }
        .rl-pw-toggle {
          position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: var(--text-hint); cursor: pointer;
          padding: 4px; display: flex; align-items: center; transition: color 0.2s;
        }
        .rl-pw-toggle:hover { color: var(--text-secondary); }

        /* ── Divider between label and forgot ── */
        .rl-pw-row {
          display: flex; align-items: center; justify-content: space-between;
          padding-left: 4px;
        }

        /* ── Submit ── */
        .rl-submit {
          width: 100%; padding: 15px;
          background: linear-gradient(135deg, #06b6d4 0%, #6366f1 50%, #8b5cf6 100%);
          background-size: 200% 200%;
          border: none; border-radius: 14px; cursor: pointer;
          font-family: var(--font-display); font-weight: 700; font-size: 14px;
          color: #fff; letter-spacing: 0.06em; text-transform: uppercase;
          transition: all 0.3s; position: relative; overflow: hidden;
          box-shadow: 0 4px 24px rgba(34,211,238,0.25);
          animation: rl-gradshift 5s ease infinite; margin-top: 8px;
        }
        @keyframes rl-gradshift {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .rl-submit:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 32px rgba(34,211,238,0.35);
        }
        .rl-submit:active { transform: scale(0.98); }
        .rl-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .rl-submit::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 50%);
          pointer-events: none;
        }
        .rl-spinner { display: inline-flex; align-items: center; gap: 10px; }
        .rl-spin {
          width: 15px; height: 15px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
          animation: rl-rotate 0.7s linear infinite;
        }
        @keyframes rl-rotate { to { transform: rotate(360deg); } }

        /* ── Divider ── */
        .rl-divider { display: flex; align-items: center; gap: 16px; margin: 28px 0; }
        .rl-divider-line {
          flex: 1; height: 1px;
          background: linear-gradient(90deg, transparent, var(--border), transparent);
        }
        .rl-divider-text {
          font-size: 10px; color: var(--text-hint);
          text-transform: uppercase; letter-spacing: 0.2em;
        }

        /* ── Footer ── */
        .rl-signup-text {
          text-align: center; font-size: 13px; color: var(--text-secondary);
        }
        .rl-signup-text a {
          color: var(--cyan); font-weight: 500; text-decoration: none;
          border-bottom: 1px solid rgba(34,211,238,0.2); padding-bottom: 1px;
          transition: color 0.2s, border-color 0.2s;
        }
        .rl-signup-text a:hover { color: var(--violet-bright); border-color: rgba(167,139,250,0.3); }

        .rl-version {
          text-align: center; font-size: 10px; color: var(--text-hint);
          margin-top: 20px; letter-spacing: 0.14em; text-transform: uppercase;
          font-family: var(--font-display); font-weight: 500;
        }

        /* ── Decorative side accents ── */
        .rl-accent-tl {
          position: absolute; top: -1px; left: 24px;
          width: 60px; height: 2px;
          background: linear-gradient(90deg, var(--cyan), transparent);
          border-radius: 0 0 4px 4px;
        }
        .rl-accent-tr {
          position: absolute; top: -1px; right: 24px;
          width: 40px; height: 2px;
          background: linear-gradient(270deg, var(--violet), transparent);
          border-radius: 0 0 4px 4px;
        }

        /* ── Lock icon decoration ── */
        .rl-lock-deco {
          width: 48px; height: 48px; border-radius: 14px; margin: 0 auto 20px;
          background: linear-gradient(135deg, rgba(34,211,238,0.12), rgba(139,92,246,0.08));
          border: 1px solid rgba(34,211,238,0.2);
          display: flex; align-items: center; justify-content: center;
          color: var(--cyan);
        }
      `}</style>

      <div className="rl-root">
        <div className="rl-bg">
          <div className="rl-orb rl-orb-1" />
          <div className="rl-orb rl-orb-2" />
          <div className="rl-orb rl-orb-3" />
        </div>
        <div className="rl-grid" />

        <div className="rl-wrap">

          <Link href="/" className="rl-logo">
            <div className="rl-logo-badge">SOS</div>
            <div className="rl-logo-text">
              <h1>RoadSOS</h1>
              <p>Emergency Road Assistance</p>
            </div>
          </Link>

          <div className="rl-card">
            <div className="rl-card-glow" />
            <div className="rl-accent-tl" />
            <div className="rl-accent-tr" />

            <div className="rl-header">
              <div className="rl-lock-deco">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h2>Welcome Back</h2>
              <p>Sign in to your account</p>
            </div>

            {error && (
              <div className="rl-error">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="rl-form">

              <div className="rl-field">
                <label className="rl-label">Email Address</label>
                <div className="rl-input-wrap">
                  <span className="rl-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>
                  </span>
                  <input
                    type="email" value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="you@example.com"
                    className="rl-input" autoComplete="email"
                  />
                </div>
              </div>

              <div className="rl-field">
                <div className="rl-pw-row">
                  <label className="rl-label">Password</label>
                </div>
                <div className="rl-input-wrap">
                  <span className="rl-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    placeholder="••••••••"
                    className="rl-input"
                    style={{ paddingRight: "48px" }}
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="rl-pw-toggle">
                    {showPassword
                      ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="rl-submit">
                {loading
                  ? <span className="rl-spinner"><span className="rl-spin" />Authenticating…</span>
                  : "Sign In"}
              </button>
            </form>

            <div className="rl-divider">
              <div className="rl-divider-line" />
              <span className="rl-divider-text">or</span>
              <div className="rl-divider-line" />
            </div>

            <div className="rl-signup-text">
              Don&apos;t have an account?{" "}
              <Link href="/signup">Create Account</Link>
            </div>
          </div>

          <p className="rl-version">RoadSOS Secure Access v1.0</p>
        </div>
      </div>
    </>
  );
}
