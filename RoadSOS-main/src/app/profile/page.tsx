"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUserProfile, saveUserProfile, type UserProfile } from "@/lib/profiles";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const VEHICLE_TYPES = ["Sedan", "SUV", "Hatchback", "Motorcycle", "Truck", "Van", "Auto", "Other"];
const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

/* ─── Global styles ─── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Plus+Jakarta+Sans:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');

  :root {
    --bg:      #080810;
    --s1:      rgba(255,255,255,0.025);
    --s2:      rgba(255,255,255,0.04);
    --border:  rgba(255,255,255,0.07);
    --bhi:     rgba(255,255,255,0.12);
    --text:    rgba(255,255,255,0.88);
    --muted:   rgba(255,255,255,0.38);
    --faint:   rgba(255,255,255,0.13);
    --blue:    #3d8bff;
    --amber:   #ffb830;
    --red:     #ff4d4d;
    --green:   #22d87a;
    --purple:  #a78bfa;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; }

  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }

  /* ── Card ── */
  .pc {
    background: var(--s1);
    border: 1px solid var(--border);
    border-radius: 20px;
  }

  /* ── Inputs ── */
  .mp-input {
    width: 100%;
    background: rgba(255,255,255,0.025);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 11px 14px 11px 44px;
    font-size: 13px;
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color .2s, background .2s, box-shadow .2s;
    line-height: 1.5;
  }
  .mp-input::placeholder { color: rgba(255,255,255,0.18); }
  .mp-input:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.13); }

  .mp-input.blue:focus   { border-color: rgba(61,139,255,0.4); box-shadow: 0 0 0 3px rgba(61,139,255,0.07); }
  .mp-input.amber:focus  { border-color: rgba(255,184,48,0.4); box-shadow: 0 0 0 3px rgba(255,184,48,0.07); }
  .mp-input.red:focus    { border-color: rgba(255,77,77,0.4);  box-shadow: 0 0 0 3px rgba(255,77,77,0.07);  }
  .mp-input.green:focus  { border-color: rgba(34,216,122,0.4); box-shadow: 0 0 0 3px rgba(34,216,122,0.07); }

  .mp-input-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    transition: color .2s;
    color: rgba(255,255,255,0.18);
  }
  .mp-input-wrap:focus-within .mp-input-icon { color: rgba(255,255,255,0.38); }

  /* ── Pill select buttons ── */
  .pill {
    border: 1px solid var(--border);
    background: var(--s1);
    border-radius: 10px;
    color: var(--muted);
    font-size: 12px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all .17s ease;
    padding: 9px 6px;
    text-align: center;
  }
  .pill:hover { background: var(--s2); color: var(--text); }
  .pill.active-blue   { background: rgba(61,139,255,0.12);  border-color: rgba(61,139,255,0.30);  color: var(--blue); }
  .pill.active-red    { background: rgba(255,77,77,0.12);   border-color: rgba(255,77,77,0.30);   color: var(--red); }
  .pill.active-amber  { background: rgba(255,184,48,0.12);  border-color: rgba(255,184,48,0.30);  color: var(--amber); }
  .pill.active-green  { background: rgba(34,216,122,0.12);  border-color: rgba(34,216,122,0.30);  color: var(--green); }
  .pill.active-purple { background: rgba(167,139,250,0.12); border-color: rgba(167,139,250,0.30); color: var(--purple); }

  /* ── Tag chips ── */
  .tag-red    { background: rgba(255,77,77,0.10);   border: 1px solid rgba(255,77,77,0.20);   color: #ff7070; }
  .tag-amber  { background: rgba(255,184,48,0.10);  border: 1px solid rgba(255,184,48,0.20);  color: #ffc955; }
  .tag-green  { background: rgba(34,216,122,0.10);  border: 1px solid rgba(34,216,122,0.20);  color: #4de89a; }

  /* ── Tab nav ── */
  .tab {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 13px;
    border-radius: 11px;
    border: 1px solid transparent;
    font-size: 12px; font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all .2s;
    color: var(--muted);
    background: transparent;
    white-space: nowrap;
    flex-shrink: 0;
    line-height: 1;
  }
  .tab-icon { font-size: 13px; line-height: 1; display: inline-block; width: 16px; text-align: center; }
  .tab:hover { color: var(--text); background: var(--s2); }
  .tab.active { background: rgba(61,139,255,0.10); border-color: rgba(61,139,255,0.22); color: var(--blue); }
  /* Section icon emoji */
  .sicon-inner { font-size: 15px; line-height: 1; display: block; }

  /* ── Section label ── */
  .slabel {
    font-size: 10px; font-weight: 700;
    font-family: 'Space Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(255,255,255,0.28);
    margin-bottom: 8px;
    display: block;
  }

  /* ── Animations ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-up { animation: fadeUp .38s cubic-bezier(.22,.9,.36,1) both; }
  .d1 { animation-delay: .05s; }
  .d2 { animation-delay: .11s; }
  .d3 { animation-delay: .18s; }

  /* ── Sweep CTA ── */
  @keyframes sweep {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  .cta-blue {
    background: linear-gradient(120deg, #3d8bff, #2563eb, #1d4ed8, #3d8bff);
    background-size: 300% 100%;
    animation: sweep 3.5s linear infinite;
  }
  .cta-green {
    background: linear-gradient(120deg, #22d87a, #16a34a, #15803d, #22d87a);
    background-size: 300% 100%;
    animation: sweep 3.5s linear infinite;
  }

  /* ── Avatar ring ── */
  .avatar-ring {
    background: conic-gradient(from 0deg, #3d8bff, #22d87a, #ffb830, #ff4d4d, #a78bfa, #3d8bff);
    border-radius: 28px;
    padding: 2px;
  }
  .avatar-inner {
    background: linear-gradient(135deg, #1a1a2e, #0f0f1a);
    border-radius: 26px;
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
  }

  /* ── Section icon ── */
  .sicon-blue, .sicon-amber, .sicon-red, .sicon-green {
    overflow: hidden;
    flex-shrink: 0;
  }
  .sicon-blue   { background: rgba(61,139,255,0.10);  border: 1px solid rgba(61,139,255,0.20);  color: #3d8bff; }
  .sicon-amber  { background: rgba(255,184,48,0.10);  border: 1px solid rgba(255,184,48,0.20);  color: #ffb830; }
  .sicon-red    { background: rgba(255,77,77,0.10);   border: 1px solid rgba(255,77,77,0.20);   color: #ff4d4d; }
  .sicon-green  { background: rgba(34,216,122,0.10);  border: 1px solid rgba(34,216,122,0.20);  color: #22d87a; }
  .sicon-inner  { font-size: 15px; line-height: 1; display: block; }

  /* ── Divider ── */
  .divider { height: 1px; background: var(--border); margin: 0; }

  /* ── Contact row ── */
  .contact-row {
    display: flex; align-items: center; justify-content: space-between;
    background: var(--s1); border: 1px solid var(--border);
    border-radius: 14px; padding: 12px 14px;
    transition: background .18s, border-color .18s;
  }
  .contact-row:hover { background: var(--s2); border-color: var(--bhi); }

  /* ── Small inline input ── */
  .sm-input {
    width: 100%;
    min-width: 0;
    background: rgba(255,255,255,0.025);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 9px 12px;
    font-size: 12px; color: var(--text);
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color .2s;
  }
  .sm-input::placeholder { color: rgba(255,255,255,0.18); }
  .sm-input:focus { border-color: rgba(61,139,255,0.35); }
`;

/* ─── InputField ─── */
function InputField({ label, icon, value, onChange, placeholder, type = "text", accent = "blue" }: {
  label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void;
  placeholder: string; type?: string; accent?: string;
}) {
  return (
    <div>
      <span className="slabel">{label}</span>
      <div className="mp-input-wrap" style={{ position: "relative" }}>
        <span className="mp-input-icon">{icon}</span>
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`mp-input ${accent}`}
        />
      </div>
    </div>
  );
}

/* ─── Icon SVGs ─── */
const Icon = {
  user: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  phone: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  age: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>,
  car: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-3m-9 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0m9 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0"/></svg>,
  plate: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h10M7 14h6"/></svg>,
  color: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>,
  shield: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  doc: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>,
  trash: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  back: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>,
};

export default function ProfilePage() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem("roadsos_token");
    if (!token) router.replace("/signup");
  }, [router]);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState("personal");
  const [newContact, setNewContact] = useState({ name: "", phone: "", relation: "" });
  const [addingContact, setAddingContact] = useState(false);
  const [newMedical, setNewMedical] = useState("");
  const [newAllergy, setNewAllergy] = useState("");

  useEffect(() => { setProfile(getUserProfile()); }, []);
  if (!profile) return null;

  const update = (field: keyof UserProfile, value: unknown) => {
    setProfile(p => p ? { ...p, [field]: value } : p);
    setSaved(false);
  };

  const handleSave = () => {
    if (!profile) return;
    saveUserProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const addEmergencyContact = () => {
    if (!newContact.name || !newContact.phone) return;
    update("emergencyContacts", [...profile.emergencyContacts, { ...newContact }]);
    setNewContact({ name: "", phone: "", relation: "" });
    setAddingContact(false);
  };

  const addMedical = () => { if (!newMedical.trim()) return; update("medicalConditions", [...profile.medicalConditions, newMedical.trim()]); setNewMedical(""); };
  const addAllergy = () => { if (!newAllergy.trim()) return; update("allergies", [...profile.allergies, newAllergy.trim()]); setNewAllergy(""); };

  const tabs = [
    { id: "personal", label: "Personal", icon: "👤" },
    { id: "vehicle",  label: "Vehicle",  icon: "🚗" },
    { id: "medical",  label: "Medical",  icon: "💊" },
    { id: "emergency",label: "Contacts", icon: "📱" },
  ];

  const initials = profile.name ? profile.name.charAt(0).toUpperCase() : "U";

  return (
    <>
      <style>{STYLES}</style>

      {/* Ambient top glow */}
      <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: 500, height: 260, background: "radial-gradient(ellipse at 50% 0%, rgba(61,139,255,0.07) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ minHeight: "100dvh", background: "var(--bg)", position: "relative", overflowX: "hidden" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "0 16px 120px", position: "relative", zIndex: 1 }}>

{/* ─── HEADER ─── */}
<div className="fade-up" style={{ paddingTop: 32, paddingBottom: 28 }}>
  
  {/* Top row: back button left, avatar centered */}
<div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, height: 76 }}>
  
  <Link href="/user" style={{ position: "absolute", left: 0, top: 0, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted)", textDecoration: "none", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--s1)", transition: "all .18s" }}>
    {Icon.back} Back to Map
  </Link>

  <div className="avatar-ring" style={{ width: 76, height: 76 }}>
    <div className="avatar-inner">
      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 800, color: "var(--text)" }}>{initials}</span>
    </div>
  </div>

</div>

  <div style={{ textAlign: "center" }}>
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 19, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em", marginBottom: 4 }}>
      My Profile
    </div>
    <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'Space Mono', monospace" }}>
      {profile.name || "Complete your profile"}
    </div>
  </div>

</div>

          {/* ─── TABS ─── */}
          <div className="fade-up d1" style={{ display: "flex", gap: 6, marginBottom: 24, overflowX: "auto", paddingBottom: 2, flexWrap: "nowrap", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveSection(t.id)} className={`tab ${activeSection === t.id ? "active" : ""}`}>
                <span className="tab-icon">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* ══ PERSONAL ══ */}
          {activeSection === "personal" && (
            <div className="fade-up d2 pc" style={{ padding: "24px 20px" }}>
              {/* Section header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
                <div className="sicon-blue" style={{ width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span className="sicon-inner">👤</span></div>
                <div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Personal Info</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>Basic details & identification</div>
                </div>
              </div>
              <div className="divider" style={{ marginBottom: 22 }} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <InputField label="Full Name" icon={Icon.user} value={profile.name} onChange={v => update("name", v)} placeholder="Your full name" accent="blue" />
                </div>
                <InputField label="Phone" icon={Icon.phone} value={profile.phone} onChange={v => update("phone", v)} placeholder="+91 XXXXX XXXXX" type="tel" accent="blue" />
                <InputField label="Age" icon={Icon.age} value={profile.age} onChange={v => update("age", v)} placeholder="e.g. 28" accent="blue" />
              </div>

              {/* Gender */}
              <div style={{ marginBottom: 20 }}>
                <span className="slabel">Gender</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {GENDERS.map(g => (
                    <button key={g} onClick={() => update("gender", g)} className={`pill ${profile.gender === g ? "active-blue" : ""}`} style={{ fontSize: 11 }}>{g}</button>
                  ))}
                </div>
              </div>

              {/* Blood Group */}
              <div>
                <span className="slabel">Blood Group</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {BLOOD_GROUPS.map(bg => (
                    <button key={bg} onClick={() => update("bloodGroup", bg)} className={`pill ${profile.bloodGroup === bg ? "active-red" : ""}`} style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{bg}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ VEHICLE ══ */}
          {activeSection === "vehicle" && (
            <div className="fade-up d2 pc" style={{ padding: "24px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
                <div className="sicon-amber" style={{ width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span className="sicon-inner">🚗</span></div>
                <div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Vehicle Info</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>Registration, insurance & more</div>
                </div>
              </div>
              <div className="divider" style={{ marginBottom: 22 }} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                <InputField label="Vehicle Number" icon={Icon.plate} value={profile.vehicleNumber} onChange={v => update("vehicleNumber", v)} placeholder="DL 01 AB 1234" accent="amber" />
                <InputField label="Vehicle Model" icon={Icon.car} value={profile.vehicleModel} onChange={v => update("vehicleModel", v)} placeholder="e.g. Honda City" accent="amber" />
                <InputField label="Color" icon={Icon.color} value={profile.vehicleColor} onChange={v => update("vehicleColor", v)} placeholder="e.g. White" accent="amber" />
                <InputField label="Driving License" icon={Icon.doc} value={profile.drivingLicense} onChange={v => update("drivingLicense", v)} placeholder="DL number" accent="amber" />
                <div style={{ gridColumn: "1 / -1" }}>
                  <InputField label="Insurance ID" icon={Icon.shield} value={profile.insuranceId} onChange={v => update("insuranceId", v)} placeholder="Policy number" accent="amber" />
                </div>
              </div>

              <div>
                <span className="slabel">Vehicle Type</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {VEHICLE_TYPES.map(vt => (
                    <button key={vt} onClick={() => update("vehicleType", vt)} className={`pill ${profile.vehicleType === vt ? "active-amber" : ""}`}>{vt}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ MEDICAL ══ */}
          {activeSection === "medical" && (
            <div className="fade-up d2" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Conditions */}
              <div className="pc" style={{ padding: "22px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <div className="sicon-red" style={{ width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span className="sicon-inner">💊</span></div>
                  <div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Medical Conditions</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>Chronic or ongoing conditions</div>
                  </div>
                </div>
                <div className="divider" style={{ marginBottom: 16 }} />

                {/* Tags */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, minHeight: 36, marginBottom: 14 }}>
                  {profile.medicalConditions.length === 0 && (
                    <span style={{ fontSize: 12, color: "var(--faint)", fontStyle: "italic" }}>No conditions added yet</span>
                  )}
                  {profile.medicalConditions.map((mc, i) => (
                    <span key={i} className="tag-red" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, padding: "5px 12px", borderRadius: 30, fontWeight: 500 }}>
                      {mc}
                      <button onClick={() => update("medicalConditions", profile.medicalConditions.filter((_, j) => j !== i))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,112,112,0.4)", fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
                    </span>
                  ))}
                </div>

                {/* Add row */}
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="sm-input" style={{ flex: 1 }} value={newMedical} onChange={e => setNewMedical(e.target.value)} onKeyDown={e => e.key === "Enter" && addMedical()} placeholder="e.g. Diabetes, Asthma…" />
                  <button onClick={addMedical} style={{ padding: "9px 16px", borderRadius: 10, background: "rgba(255,77,77,0.10)", border: "1px solid rgba(255,77,77,0.20)", color: "#ff7070", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", transition: "all .18s" }}>+ Add</button>
                </div>
              </div>

              {/* Allergies */}
              <div className="pc" style={{ padding: "22px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <div className="sicon-amber" style={{ width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span className="sicon-inner">⚠️</span></div>
                  <div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Allergies</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>Drug, food & environmental</div>
                  </div>
                </div>
                <div className="divider" style={{ marginBottom: 16 }} />

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, minHeight: 36, marginBottom: 14 }}>
                  {profile.allergies.length === 0 && (
                    <span style={{ fontSize: 12, color: "var(--faint)", fontStyle: "italic" }}>No allergies added yet</span>
                  )}
                  {profile.allergies.map((al, i) => (
                    <span key={i} className="tag-amber" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, padding: "5px 12px", borderRadius: 30, fontWeight: 500 }}>
                      {al}
                      <button onClick={() => update("allergies", profile.allergies.filter((_, j) => j !== i))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,184,48,0.4)", fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
                    </span>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <input className="sm-input" style={{ flex: 1 }} value={newAllergy} onChange={e => setNewAllergy(e.target.value)} onKeyDown={e => e.key === "Enter" && addAllergy()} placeholder="e.g. Penicillin, Peanuts…" />
                  <button onClick={addAllergy} style={{ padding: "9px 16px", borderRadius: 10, background: "rgba(255,184,48,0.10)", border: "1px solid rgba(255,184,48,0.20)", color: "#ffc955", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", transition: "all .18s" }}>+ Add</button>
                </div>
              </div>
            </div>
          )}

          {/* ══ EMERGENCY CONTACTS ══ */}
          {activeSection === "emergency" && (
            <div className="fade-up d2 pc" style={{ padding: "22px 20px" }}>
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="sicon-green" style={{ width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span className="sicon-inner">📱</span></div>
                  <div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Emergency Contacts</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{profile.emergencyContacts.length} saved</div>
                  </div>
                </div>
                <button onClick={() => setAddingContact(!addingContact)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 10, background: addingContact ? "rgba(255,77,77,0.08)" : "rgba(61,139,255,0.08)", border: `1px solid ${addingContact ? "rgba(255,77,77,0.20)" : "rgba(61,139,255,0.20)"}`, color: addingContact ? "#ff7070" : "var(--blue)", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all .2s" }}>
                  {addingContact ? "✕ Cancel" : "+ Add"}
                </button>
              </div>
              <div className="divider" style={{ marginBottom: 16 }} />

              {/* Contact list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: addingContact ? 16 : 0 }}>
                {profile.emergencyContacts.length === 0 && !addingContact && (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "var(--faint)" }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📵</div>
                    <div style={{ fontSize: 12 }}>No emergency contacts yet</div>
                  </div>
                )}
                {profile.emergencyContacts.map((ec, i) => (
                  <div key={i} className="contact-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {/* Avatar */}
                      <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(34,216,122,0.10)", border: "1px solid rgba(34,216,122,0.20)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 15, color: "#22d87a", flexShrink: 0 }}>
                        {ec.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{ec.name}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, fontFamily: "'Space Mono', monospace" }}>
                          {ec.relation} · {ec.phone}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <a href={`tel:${ec.phone}`} style={{ fontSize: 11, fontWeight: 700, color: "#22d87a", background: "rgba(34,216,122,0.10)", border: "1px solid rgba(34,216,122,0.20)", padding: "5px 10px", borderRadius: 8, textDecoration: "none" }}>Call</a>
                      <button onClick={() => update("emergencyContacts", profile.emergencyContacts.filter((_, j) => j !== i))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--faint)", padding: 4, display: "flex", transition: "color .18s" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#ff7070")}
                        onMouseLeave={e => (e.currentTarget.style.color = "var(--faint)")}>
                        {Icon.trash}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add contact form */}
              {addingContact && (
                <div style={{ background: "rgba(61,139,255,0.04)", border: "1px solid rgba(61,139,255,0.14)", borderRadius: 14, padding: "16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--blue)", fontFamily: "'Space Mono', monospace", marginBottom: 12 }}>NEW CONTACT</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <input className="sm-input" style={{ gridColumn: "1 / -1" }} value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} placeholder="Full name" />
                    <input className="sm-input" value={newContact.phone} onChange={e => setNewContact({ ...newContact, phone: e.target.value })} type="tel" placeholder="Phone number" />
                    <input className="sm-input" value={newContact.relation} onChange={e => setNewContact({ ...newContact, relation: e.target.value })} placeholder="Relation" />
                  </div>
                  <button onClick={addEmergencyContact} disabled={!newContact.name || !newContact.phone} className="cta-blue"
                    style={{ width: "100%", padding: "11px", borderRadius: 11, border: "none", color: "white", fontSize: 12, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: "pointer", marginTop: 4, opacity: (!newContact.name || !newContact.phone) ? 0.5 : 1, transition: "opacity .18s" }}>
                    Add Contact
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ─── STICKY SAVE ─── */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20 }}>
          <div style={{ maxWidth: 520, margin: "0 auto", padding: "12px 16px 24px", background: "linear-gradient(to top, #080810 60%, transparent)" }}>
            <button onClick={handleSave} className={saved ? "cta-green" : "cta-blue"}
              style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", color: "white", fontSize: 12, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "0.01em", cursor: "pointer", boxShadow: saved ? "0 8px 28px rgba(34,216,122,0.25)" : "0 8px 28px rgba(61,139,255,0.22)", transition: "box-shadow .3s" }}>
              {saved ? "✅  Profile Saved!" : "💾  Save Profile"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}