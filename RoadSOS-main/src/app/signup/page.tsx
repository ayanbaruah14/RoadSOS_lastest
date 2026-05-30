"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const vehicleTypes = ["Sedan", "SUV", "Hatchback", "Motorcycle", "Truck", "Bus", "Auto", "Other"];

const emailIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" /></svg>;
const userIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const phoneIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
const lockIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
const carIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 17h4V5H2v12h3M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" /><circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg>;

function InputField({ label, icon, value, onChange, type = "text", placeholder, required = false, autoComplete }: {
  label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void; type?: string; placeholder: string; required?: boolean; autoComplete?: string;
}) {
  return (
    <div className="rsos-field">
      <label className="rsos-label">
        {label} {required && <span className="rsos-required">*</span>}
      </label>
      <div className="rsos-input-wrap">
        <span className="rsos-input-icon">{icon}</span>
        <input
          type={type} value={value}
          onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="rsos-input"
          autoComplete={autoComplete}
        />
      </div>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
    role: "user" as "user" | "admin",
    bloodGroup: "", vehicleNumber: "", vehicleType: "", age: "", gender: "",
    ecName: "", ecPhone: "", ecRelation: "",
  });

  useEffect(() => {
    const auth = localStorage.getItem("roadsos_auth");
    if (auth) router.replace("/signup");
  }, [router]);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const nextStep = () => {
    if (step === 1) {
      if (!form.role) { setError("Please select a role"); return; }
    }
    if (step === 2) {
      if (!form.name || !form.email || !form.phone || !form.password) {
        setError("Please fill all required fields"); return;
      }
      if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
      if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
    }
    setError("");
    setStep((s) => s + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const emergencyContacts = form.ecName && form.ecPhone
      ? [{ name: form.ecName, phone: form.ecPhone, relation: form.ecRelation || "Other" }]
      : [];

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, email: form.email, phone: form.phone,
          password: form.password, role: form.role,
          bloodGroup: form.bloodGroup, vehicleNumber: form.vehicleNumber,
          vehicleType: form.vehicleType, age: form.age, gender: form.gender,
          emergencyContacts,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed"); return; }

      localStorage.setItem("roadsos_auth", JSON.stringify(data.user));
      localStorage.setItem("roadsos_token", data.token);

      if (data.user.role === "user") {
        localStorage.setItem("roadsos_user_profile", JSON.stringify({
          name: form.name, phone: form.phone, bloodGroup: form.bloodGroup,
          vehicleNumber: form.vehicleNumber, vehicleType: form.vehicleType,
          emergencyContacts,
        }));
      }

      router.push(data.user.role === "admin" ? "/admin" : "/user");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ["Choose role", "Account details", "Additional info"];

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
          --border-hover: rgba(139,92,246,0.35);
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

        .rsos-root {
          min-height: 100vh;
          background: var(--void);
          font-family: var(--font-body);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 20px;
          position: relative;
          overflow: hidden;
        }

        .rsos-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
        .rsos-orb {
          position: absolute; border-radius: 50%;
          filter: blur(120px); animation: rsos-pulse 8s ease-in-out infinite;
        }
        .rsos-orb-1 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%);
          top: -10%; right: -5%; animation-delay: 0s;
        }
        .rsos-orb-2 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%);
          bottom: -10%; left: -5%; animation-delay: -4s;
        }
        .rsos-orb-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 70%);
          top: 50%; left: 40%; animation-delay: -2s;
        }
        @keyframes rsos-pulse {
          0%,100% { transform: scale(1) translate(0,0); opacity: 1; }
          50% { transform: scale(1.12) translate(20px,-20px); opacity: 0.7; }
        }

        .rsos-grid {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .rsos-wrap {
          position: relative; z-index: 10;
          width: 100%; max-width: 480px;
          animation: rsos-fadein 0.6s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes rsos-fadein {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── Logo ── */
        .rsos-logo-wrap {
          display: flex; align-items: center; justify-content: center;
          gap: 14px; margin-bottom: 36px; text-decoration: none;
        }
        .rsos-logo-badge {
          width: 52px; height: 52px; border-radius: 16px;
          background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-weight: 800; font-size: 13px;
          color: #fff; letter-spacing: 0.06em;
          box-shadow: 0 0 0 1px rgba(239,68,68,0.3), 0 8px 32px rgba(239,68,68,0.35);
          transition: transform 0.3s; flex-shrink: 0;
        }
        .rsos-logo-wrap:hover .rsos-logo-badge { transform: scale(1.06) rotate(-3deg); }
        .rsos-logo-text h1 {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 22px;
          color: var(--text-primary);
          letter-spacing: -0.01em;
          line-height: 1;
          font-stretch: normal;
        }
        .rsos-logo-text p {
          font-size: 10px; color: var(--text-hint); margin-top: 3px;
          letter-spacing: 0.18em; text-transform: uppercase;
          font-family: var(--font-body);
        }

        /* ── Steps ── */
        .rsos-steps {
          display: flex; align-items: center; justify-content: center;
          gap: 0; margin-bottom: 32px;
        }
        .rsos-step-item { display: flex; align-items: center; }
        .rsos-step-node {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-weight: 700; font-size: 12px;
          transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        .rsos-step-node.done {
          background: linear-gradient(135deg, var(--violet) 0%, var(--cyan) 100%);
          color: #fff; box-shadow: 0 0 20px rgba(139,92,246,0.5);
        }
        .rsos-step-node.active {
          background: linear-gradient(135deg, var(--violet) 0%, var(--cyan) 100%);
          color: #fff;
          box-shadow: 0 0 0 4px rgba(139,92,246,0.18), 0 0 24px rgba(139,92,246,0.4);
        }
        .rsos-step-node.inactive {
          background: var(--surface2); color: var(--text-hint);
          border: 1px solid var(--border);
        }
        .rsos-step-line { width: 48px; height: 1px; transition: all 0.5s; }
        .rsos-step-line.filled { background: linear-gradient(90deg, var(--violet), var(--cyan)); }
        .rsos-step-line.empty { background: var(--border); }
        .rsos-step-label {
          text-align: center; font-size: 10px; color: var(--text-hint);
          letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 24px;
          font-family: var(--font-display); font-weight: 600;
        }

        /* ── Card ── */
        .rsos-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 36px 32px;
          position: relative;
          overflow: hidden;
          transition: border-color 0.4s;
          box-shadow: 0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset;
        }
        .rsos-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139,92,246,0.6), rgba(34,211,238,0.4), transparent);
        }
        .rsos-card:hover { border-color: rgba(139,92,246,0.2); }
        .rsos-card-glow {
          position: absolute; top: -60px; left: 50%; transform: translateX(-50%);
          width: 200px; height: 120px;
          background: radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        /* ── Card header ── */
        .rsos-card-header { text-align: center; margin-bottom: 28px; }
        .rsos-card-title {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 20px;
          color: var(--text-primary);
          letter-spacing: -0.01em;
          margin-bottom: 6px;
          font-stretch: normal;
        }
        .rsos-card-sub {
          font-size: 13px; color: var(--text-secondary);
          font-weight: 300; letter-spacing: 0.01em;
        }

        /* ── Error ── */
        .rsos-error {
          display: flex; align-items: center; gap: 10px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.22);
          border-radius: 12px; padding: 12px 16px;
          color: #f87171; font-size: 13px; margin-bottom: 20px;
          animation: rsos-fadein 0.3s both;
        }

        /* ── Fields ── */
        .rsos-field { display: flex; flex-direction: column; gap: 8px; }
        .rsos-label {
          font-family: var(--font-display); font-size: 10px; font-weight: 600;
          letter-spacing: 0.2em; text-transform: uppercase; color: var(--text-hint);
          padding-left: 4px;
        }
        .rsos-required { color: rgba(248,113,113,0.6); }
        .rsos-input-wrap { position: relative; }
        .rsos-input-icon {
          position: absolute; left: 18px; top: 50%; transform: translateY(-50%);
          color: var(--text-hint); transition: color 0.3s; pointer-events: none;
          display: flex; align-items: center;
        }
        .rsos-input-wrap:focus-within .rsos-input-icon { color: var(--violet-bright); }
        .rsos-input {
          width: 100%; background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 14px; padding: 14px 18px 14px 52px;
          font-family: var(--font-body); font-size: 14px;
          color: var(--text-primary); outline: none;
          transition: all 0.3s; line-height: 1.5;
          caret-color: var(--violet-bright);
        }
        .rsos-input::placeholder { color: var(--text-hint); font-size: 13px; }
        .rsos-input:hover { background: var(--surface3); border-color: rgba(255,255,255,0.12); }
        .rsos-input:focus {
          background: var(--surface3);
          border-color: rgba(139,92,246,0.45);
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1), 0 0 20px rgba(139,92,246,0.08);
        }

        /* ── Select ── */
        .rsos-select-wrap { position: relative; }
        .rsos-select {
          width: 100%; background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 14px; padding: 13px 40px 13px 18px;
          font-family: var(--font-body); font-size: 14px;
          color: var(--text-primary); outline: none; cursor: pointer;
          appearance: none; transition: all 0.3s;
        }
        .rsos-select:hover { background: var(--surface3); border-color: rgba(255,255,255,0.12); }
        .rsos-select:focus {
          background: var(--surface3);
          border-color: rgba(139,92,246,0.45);
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
        }
        .rsos-select option { background: #0c0e1a; }
        .rsos-chevron {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          pointer-events: none; color: var(--text-hint);
        }

        /* ── Role cards ── */
        .rsos-role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .rsos-role-card {
          padding: 20px 16px; border-radius: 18px;
          border: 1px solid var(--border); background: var(--surface2);
          cursor: pointer; text-align: left; transition: all 0.3s;
          position: relative; overflow: hidden;
        }
        .rsos-role-card:hover {
          border-color: rgba(255,255,255,0.14); background: var(--surface3);
          transform: translateY(-2px);
        }
        .rsos-role-card.selected-user {
          border-color: rgba(34,211,238,0.4);
          background: rgba(34,211,238,0.06);
          box-shadow: 0 0 0 1px rgba(34,211,238,0.12), inset 0 1px 0 rgba(34,211,238,0.1);
        }
        .rsos-role-card.selected-admin {
          border-color: rgba(139,92,246,0.45);
          background: rgba(139,92,246,0.07);
          box-shadow: 0 0 0 1px rgba(139,92,246,0.15), inset 0 1px 0 rgba(139,92,246,0.1);
        }
        .rsos-role-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 14px;
        }
        .rsos-role-icon-user {
          background: linear-gradient(135deg, rgba(34,211,238,0.2), rgba(34,211,238,0.08));
          border: 1px solid rgba(34,211,238,0.25); color: var(--cyan);
        }
        .rsos-role-icon-admin {
          background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.08));
          border: 1px solid rgba(139,92,246,0.25); color: var(--violet-bright);
        }
        .rsos-role-name {
          font-family: var(--font-display); font-weight: 700; font-size: 14px;
          color: var(--text-primary); margin-bottom: 4px; letter-spacing: -0.01em;
        }
        .rsos-role-desc {
          font-size: 11px; color: var(--text-secondary); line-height: 1.6; font-weight: 300;
        }
        .rsos-role-check {
          position: absolute; top: 12px; right: 12px;
          width: 18px; height: 18px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transform: scale(0.5); transition: all 0.3s;
        }
        .rsos-role-card.selected-user .rsos-role-check,
        .rsos-role-card.selected-admin .rsos-role-check { opacity: 1; transform: scale(1); }
        .rsos-role-card.selected-user .rsos-role-check { background: var(--cyan); }
        .rsos-role-card.selected-admin .rsos-role-check { background: var(--violet); }

        /* ── Section headers ── */
        .rsos-section-head { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
        .rsos-section-pip { width: 3px; height: 16px; border-radius: 2px; }
        .rsos-section-title {
          font-family: var(--font-display); font-size: 10px; font-weight: 700;
          letter-spacing: 0.2em; text-transform: uppercase; color: var(--text-secondary);
        }

        /* ── Buttons ── */
        .rsos-btn-primary {
          width: 100%; padding: 14px;
          background: linear-gradient(135deg, var(--violet) 0%, #6366f1 50%, #06b6d4 100%);
          background-size: 200% 200%;
          border: none; border-radius: 14px; cursor: pointer;
          font-family: var(--font-display); font-weight: 700; font-size: 14px;
          color: #fff; letter-spacing: 0.03em;
          transition: all 0.3s; position: relative; overflow: hidden;
          box-shadow: 0 4px 24px rgba(139,92,246,0.35);
          animation: rsos-gradshift 4s ease infinite;
        }
        @keyframes rsos-gradshift {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .rsos-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 32px rgba(139,92,246,0.45);
        }
        .rsos-btn-primary:active { transform: scale(0.98); }
        .rsos-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .rsos-btn-primary::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 50%);
          pointer-events: none;
        }
        .rsos-btn-ghost {
          padding: 13px 20px; border-radius: 14px; cursor: pointer;
          background: var(--surface2); border: 1px solid var(--border);
          font-family: var(--font-display); font-weight: 600; font-size: 13px;
          color: var(--text-secondary); transition: all 0.3s;
        }
        .rsos-btn-ghost:hover { background: var(--surface3); border-color: rgba(255,255,255,0.12); color: var(--text-primary); }
        .rsos-btn-row { display: flex; gap: 10px; padding-top: 8px; }

        /* ── Password toggle ── */
        .rsos-pw-toggle {
          position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: var(--text-hint); cursor: pointer;
          padding: 4px; display: flex; align-items: center; transition: color 0.2s;
        }
        .rsos-pw-toggle:hover { color: var(--text-secondary); }

        /* ── Divider ── */
        .rsos-divider { display: flex; align-items: center; gap: 16px; margin: 24px 0; }
        .rsos-divider-line {
          flex: 1; height: 1px;
          background: linear-gradient(90deg, transparent, var(--border), transparent);
        }
        .rsos-divider-text {
          font-size: 10px; color: var(--text-hint);
          text-transform: uppercase; letter-spacing: 0.18em;
        }

        /* ── Admin note ── */
        .rsos-admin-note { text-align: center; padding: 32px 16px; }
        .rsos-admin-shield {
          width: 64px; height: 64px; border-radius: 20px; margin: 0 auto 16px;
          background: linear-gradient(135deg, rgba(139,92,246,0.12), rgba(236,72,153,0.08));
          border: 1px solid rgba(139,92,246,0.2);
          display: flex; align-items: center; justify-content: center; font-size: 28px;
        }
        .rsos-admin-note p:first-of-type {
          font-family: var(--font-display); font-weight: 700; font-size: 15px;
          color: var(--text-primary); margin-bottom: 8px;
        }
        .rsos-admin-note p:last-of-type {
          font-size: 13px; color: var(--text-secondary); line-height: 1.7;
          font-weight: 300; max-width: 280px; margin: 0 auto;
        }

        /* ── Grid & spacing ── */
        .rsos-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .rsos-space-4 { display: flex; flex-direction: column; gap: 16px; }
        .rsos-space-5 { display: flex; flex-direction: column; gap: 20px; }
        .rsos-section { padding-top: 8px; }
        .rsos-section-sep {
          height: 1px; margin: 8px 0;
          background: linear-gradient(90deg, transparent, var(--border), transparent);
        }

        /* ── Footer ── */
        .rsos-footer-text {
          text-align: center; font-size: 13px; color: var(--text-secondary); padding-bottom: 4px;
        }
        .rsos-footer-text a { color: var(--cyan); font-weight: 500; text-decoration: none; }
        .rsos-footer-text a:hover { color: var(--violet-bright); }
        .rsos-version {
          text-align: center; font-size: 10px; color: var(--text-hint);
          margin-top: 20px; letter-spacing: 0.1em;
        }

        /* ── Spinner ── */
        .rsos-spinner { display: inline-flex; align-items: center; gap: 8px; }
        .rsos-spin {
          width: 15px; height: 15px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
          animation: rsos-rotate 0.7s linear infinite;
        }
        @keyframes rsos-rotate { to { transform: rotate(360deg); } }

        /* ── Step animation ── */
        .rsos-step-content {
          animation: rsos-stepfade 0.35s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes rsos-stepfade {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div className="rsos-root">
        <div className="rsos-bg">
          <div className="rsos-orb rsos-orb-1" />
          <div className="rsos-orb rsos-orb-2" />
          <div className="rsos-orb rsos-orb-3" />
        </div>
        <div className="rsos-grid" />

        <div className="rsos-wrap">
          {/* Logo */}
          <Link href="/" className="rsos-logo-wrap">
            <div className="rsos-logo-badge">SOS</div>
            <div className="rsos-logo-text">
              <h1>RoadSOS</h1>
              <p>Emergency Road Assistance</p>
            </div>
          </Link>

          {/* Steps */}
          <div className="rsos-steps">
            {[1, 2, 3].map((s) => (
              <div key={s} className="rsos-step-item">
                <div className={`rsos-step-node ${step > s ? "done" : step === s ? "active" : "inactive"}`}>
                  {step > s
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                    : s}
                </div>
                {s < 3 && <div className={`rsos-step-line ${step > s ? "filled" : "empty"}`} />}
              </div>
            ))}
          </div>
          <p className="rsos-step-label">{stepLabels[step - 1]}</p>

          {/* Card */}
          <div className="rsos-card">
            <div className="rsos-card-glow" />

            <div className="rsos-card-header">
              <h2 className="rsos-card-title">Create Account</h2>
              <p className="rsos-card-sub">Join the emergency response network</p>
            </div>

            {error && (
              <div className="rsos-error">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" /></svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>

              {/* Step 1 */}
              {step === 1 && (
                <div className="rsos-step-content rsos-space-4">
                  <p className="rsos-label" style={{ marginBottom: 4 }}>Select your role</p>
                  <div className="rsos-role-grid">
                    <button type="button" onClick={() => update("role", "user")}
                      className={`rsos-role-card ${form.role === "user" ? "selected-user" : ""}`}>
                      <div className="rsos-role-check">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M20 6L9 17l-5-5" /></svg>
                      </div>
                      <div className="rsos-role-icon rsos-role-icon-user">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      </div>
                      <div className="rsos-role-name">User</div>
                      <div className="rsos-role-desc">Report emergencies, SOS alerts, get nearby help</div>
                    </button>
                    <button type="button" onClick={() => update("role", "admin")}
                      className={`rsos-role-card ${form.role === "admin" ? "selected-admin" : ""}`}>
                      <div className="rsos-role-check">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M20 6L9 17l-5-5" /></svg>
                      </div>
                      <div className="rsos-role-icon rsos-role-icon-admin">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                      </div>
                      <div className="rsos-role-name">Admin</div>
                      <div className="rsos-role-desc">Monitor alerts, coordinate emergency responses</div>
                    </button>
                  </div>
                  <button type="button" onClick={nextStep} className="rsos-btn-primary" style={{ marginTop: 8 }}>
                    Continue
                  </button>
                </div>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <div className="rsos-step-content rsos-space-4">
                  <InputField label="Full Name" icon={userIcon} value={form.name} onChange={(v) => update("name", v)} placeholder="John Doe" required autoComplete="name" />
                  <InputField label="Email Address" icon={emailIcon} value={form.email} onChange={(v) => update("email", v)} type="email" placeholder="you@example.com" required autoComplete="email" />
                  <InputField label="Phone Number" icon={phoneIcon} value={form.phone} onChange={(v) => update("phone", v)} type="tel" placeholder="+91 98765 43210" required autoComplete="tel" />
                  <div className="rsos-field">
                    <label className="rsos-label">Password <span className="rsos-required">*</span></label>
                    <div className="rsos-input-wrap">
                      <span className="rsos-input-icon">{lockIcon}</span>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => update("password", e.target.value)}
                        placeholder="Min. 6 characters"
                        className="rsos-input"
                        style={{ paddingRight: "48px" }}
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="rsos-pw-toggle">
                        {showPassword
                          ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                          : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
                      </button>
                    </div>
                  </div>
                  <InputField label="Confirm Password" icon={lockIcon} value={form.confirmPassword} onChange={(v) => update("confirmPassword", v)} type="password" placeholder="Re-enter password" required autoComplete="new-password" />
                  <div className="rsos-btn-row" style={{ paddingTop: 12 }}>
                    <button type="button" onClick={() => setStep(1)} className="rsos-btn-ghost">Back</button>
                    <button type="button" onClick={nextStep} className="rsos-btn-primary" style={{ flex: 2 }}>Continue</button>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <div className="rsos-step-content">
                  {form.role === "user" && (
                    <div className="rsos-space-5">
                      <div className="rsos-section">
                        <div className="rsos-section-head">
                          <div className="rsos-section-pip" style={{ background: "var(--cyan)" }} />
                          <span className="rsos-section-title">Identity & Health</span>
                        </div>
                        <div className="rsos-space-4">
                          <div className="rsos-grid-2">
                            <div className="rsos-field">
                              <label className="rsos-label">Blood Group</label>
                              <div className="rsos-select-wrap">
                                <select value={form.bloodGroup} onChange={(e) => update("bloodGroup", e.target.value)} className="rsos-select">
                                  <option value="">Select</option>
                                  {bloodGroups.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                                </select>
                                <span className="rsos-chevron"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6" /></svg></span>
                              </div>
                            </div>
                            <div className="rsos-field">
                              <label className="rsos-label">Gender</label>
                              <div className="rsos-select-wrap">
                                <select value={form.gender} onChange={(e) => update("gender", e.target.value)} className="rsos-select">
                                  <option value="">Select</option>
                                  <option value="Male">Male</option>
                                  <option value="Female">Female</option>
                                  <option value="Other">Other</option>
                                </select>
                                <span className="rsos-chevron"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6" /></svg></span>
                              </div>
                            </div>
                          </div>
                          <InputField label="Age" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4m0-4h.01" /></svg>} value={form.age} onChange={(v) => update("age", v)} placeholder="e.g. 25" />
                        </div>
                      </div>
                      <div className="rsos-section-sep" />
                      <div className="rsos-section">
                        <div className="rsos-section-head">
                          <div className="rsos-section-pip" style={{ background: "#f59e0b" }} />
                          <span className="rsos-section-title">Vehicle Information</span>
                        </div>
                        <div className="rsos-grid-2">
                          <div className="rsos-field">
                            <label className="rsos-label">Vehicle Type</label>
                            <div className="rsos-select-wrap">
                              <select value={form.vehicleType} onChange={(e) => update("vehicleType", e.target.value)} className="rsos-select">
                                <option value="">Select</option>
                                {vehicleTypes.map((v) => <option key={v} value={v}>{v}</option>)}
                              </select>
                              <span className="rsos-chevron"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6" /></svg></span>
                            </div>
                          </div>
                          <InputField label="Vehicle Number" icon={carIcon} value={form.vehicleNumber} onChange={(v) => update("vehicleNumber", v)} placeholder="DL 01 AB 1234" />
                        </div>
                      </div>
                      <div className="rsos-section-sep" />
                      <div className="rsos-section">
                        <div className="rsos-section-head">
                          <div className="rsos-section-pip" style={{ background: "var(--violet-bright)" }} />
                          <span className="rsos-section-title">Emergency Contact</span>
                        </div>
                        <div className="rsos-space-4">
                          <InputField label="Contact Name" icon={userIcon} value={form.ecName} onChange={(v) => update("ecName", v)} placeholder="Priya Sharma" />
                          <div className="rsos-grid-2">
                            <InputField label="Contact Phone" icon={phoneIcon} value={form.ecPhone} onChange={(v) => update("ecPhone", v)} type="tel" placeholder="+91 87654 32100" />
                            <InputField label="Relation" icon={userIcon} value={form.ecRelation} onChange={(v) => update("ecRelation", v)} placeholder="Spouse" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {form.role === "admin" && (
                    <div className="rsos-admin-note">
                      <div className="rsos-admin-shield">🛡️</div>
                      <p>Admin Account</p>
                      <p>
                        You&apos;ll have access to the command center — monitor SOS alerts, coordinate responses, and manage the emergency network.
                      </p>
                    </div>
                  )}
                  <div className="rsos-btn-row" style={{ marginTop: 24 }}>
                    <button type="button" onClick={() => setStep(2)} className="rsos-btn-ghost">Back</button>
                    <button type="submit" disabled={loading} className="rsos-btn-primary" style={{ flex: 2 }}>
                      {loading
                        ? <span className="rsos-spinner"><span className="rsos-spin" /> Creating…</span>
                        : "Create Account"}
                    </button>
                  </div>
                </div>
              )}
            </form>

            <div className="rsos-divider">
              <div className="rsos-divider-line" />
              <span className="rsos-divider-text">or</span>
              <div className="rsos-divider-line" />
            </div>

            <div className="rsos-footer-text">
              Already have an account?{" "}
              <Link href="/login">Sign In</Link>
            </div>
          </div>

          <p className="rsos-version">RoadSOS v0.1 · Emergency Response Platform</p>
        </div>
      </div>
    </>
  );
}