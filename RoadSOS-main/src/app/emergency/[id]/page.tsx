"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getUserProfile } from "@/lib/profiles";
import { loadEmergencyCache } from "@/lib/offlineCache";

type Phase = "loading" | "timer" | "escalated" | "survey" | "done";

interface HospitalInfo {
  name: string;
  distance: number;
  eta: number;
  lat: number;
  lng: number;
  phone: string;
}

function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, byte;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

/* ─── Inline styles injected once ─── */
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');

  :root {
    --bg:        #080810;
    --surface:   #0e0e1a;
    --border:    rgba(255,255,255,0.07);
    --border-hi: rgba(255,255,255,0.13);
    --red:       #ff3b3b;
    --red-dim:   rgba(255,59,59,0.12);
    --amber:     #ffb830;
    --amber-dim: rgba(255,184,48,0.10);
    --green:     #22d87a;
    --green-dim: rgba(34,216,122,0.10);
    --blue:      #3d8bff;
    --blue-dim:  rgba(61,139,255,0.12);
    --purple:    #a78bfa;
    --text:      rgba(255,255,255,0.88);
    --muted:     rgba(255,255,255,0.40);
    --faint:     rgba(255,255,255,0.15);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; }

  .font-display { font-family: 'Syne', sans-serif; }
  .font-mono    { font-family: 'Space Mono', monospace; }

  /* Glass card */
  .mp-card {
    background: rgba(255,255,255,0.028);
    border: 1px solid var(--border);
    border-radius: 16px;
    backdrop-filter: blur(12px);
  }
  .mp-card-hi {
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border-hi);
    border-radius: 16px;
  }

  /* Noise texture overlay */
  .noise::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
    pointer-events: none;
    border-radius: inherit;
  }

  /* Glow ring */
  .glow-red  { box-shadow: 0 0 0 1px rgba(255,59,59,0.25), 0 0 24px rgba(255,59,59,0.12); }
  .glow-green{ box-shadow: 0 0 0 1px rgba(34,216,122,0.25), 0 0 24px rgba(34,216,122,0.12); }
  .glow-blue { box-shadow: 0 0 0 1px rgba(61,139,255,0.25), 0 0 24px rgba(61,139,255,0.12); }

  /* Pulse dot */
  @keyframes pulse-dot {
    0%,100% { opacity:1; transform:scale(1); }
    50%      { opacity:.4; transform:scale(.7); }
  }
  .pulse-dot { animation: pulse-dot 1.4s ease-in-out infinite; }

  /* Fade up */
  @keyframes fade-up {
    from { opacity:0; transform:translateY(14px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .fade-up { animation: fade-up .45s cubic-bezier(.22,.9,.36,1) both; }

  /* Scale in */
  @keyframes scale-in {
    from { opacity:0; transform:scale(.88); }
    to   { opacity:1; transform:scale(1); }
  }
  .scale-in { animation: scale-in .5s cubic-bezier(.22,.9,.36,1) both; }

  /* Timer ring flash */
  @keyframes ring-flash {
    0%,100% { opacity:1; }
    50%     { opacity:.5; }
  }
  .ring-flash { animation: ring-flash 1s ease-in-out infinite; }

  /* Gradient sweep on CTA */
  @keyframes sweep {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  .sweep-btn {
    background: linear-gradient(120deg, #22c55e, #16a34a, #15803d, #22c55e);
    background-size: 300% 100%;
    animation: sweep 3s linear infinite;
  }
  .sweep-btn-blue {
    background: linear-gradient(120deg, #3d8bff, #2563eb, #1d4ed8, #3d8bff);
    background-size: 300% 100%;
    animation: sweep 3s linear infinite;
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

  /* Centered content container */
  .mp-inner {
    max-width: 480px;
    width: 100%;
    margin: 0 auto;
  }

  /* Selection button active state */
  .sel-btn {
    border: 1px solid var(--border);
    background: rgba(255,255,255,0.03);
    border-radius: 10px;
    color: var(--muted);
    cursor: pointer;
    transition: all .18s ease;
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
  }
  .sel-btn:hover { background: rgba(255,255,255,0.06); color: var(--text); }

  .sel-red    { border-color: rgba(255,59,59,0.35) !important; background: rgba(255,59,59,0.10) !important; color: var(--red) !important; }
  .sel-amber  { border-color: rgba(255,184,48,0.35) !important; background: rgba(255,184,48,0.10) !important; color: var(--amber) !important; }
  .sel-blue   { border-color: rgba(61,139,255,0.35) !important; background: rgba(61,139,255,0.10) !important; color: var(--blue) !important; }
  .sel-green  { border-color: rgba(34,216,122,0.35) !important; background: rgba(34,216,122,0.10) !important; color: var(--green) !important; }
  .sel-purple { border-color: rgba(167,139,250,0.35) !important; background: rgba(167,139,250,0.10) !important; color: var(--purple) !important; }

  /* Leaflet map override */
  .leaflet-container { background: #080810 !important; }

  /* Stagger delays */
  .d1 { animation-delay: .05s; }
  .d2 { animation-delay: .12s; }
  .d3 { animation-delay: .20s; }
  .d4 { animation-delay: .28s; }
  .d5 { animation-delay: .36s; }
  .d6 { animation-delay: .44s; }
`;

/* ─── Helper: label chip ─── */
function Chip({ color, children }: { color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    red: "rgba(255,59,59,0.14) border-[rgba(255,59,59,0.25)] text-[#ff5f5f]",
    green: "rgba(34,216,122,0.14) border-[rgba(34,216,122,0.25)] text-[#22d87a]",
    amber: "rgba(255,184,48,0.14) border-[rgba(255,184,48,0.25)] text-[#ffb830]",
    blue: "rgba(61,139,255,0.14) border-[rgba(61,139,255,0.25)] text-[#3d8bff]",
  };
  return (
    <span style={{ background: colors[color]?.split(" ")[0] || "transparent" }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colors[color]?.split(" ").slice(1).join(" ")}`}>
      {children}
    </span>
  );
}

export default function EmergencyPage() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem("roadsos_token");
    if (!token) router.replace("/signup");
  }, [router]);

  const params = useParams();
  const searchParams = useSearchParams();
  const alertId = params.id as string;
  const userLat = parseFloat(searchParams.get("lat") || "28.6139");
  const userLng = parseFloat(searchParams.get("lng") || "77.209");

  const [phase, setPhase] = useState<Phase>("loading");
  const [timer, setTimer] = useState(10);
  const [hospital, setHospital] = useState<HospitalInfo | null>(null);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [alertStatus, setAlertStatus] = useState<string>("active");
  const [adminNotification, setAdminNotification] = useState<string | null>(null);

  const userProfile = typeof window !== "undefined" ? getUserProfile() : null;

  const [injuryLevel, setInjuryLevel] = useState("minor");
  const [bloodGroup, setBloodGroup] = useState(userProfile?.bloodGroup || "O+");
  const [numPatients, setNumPatients] = useState(1);
  const [canDrive, setCanDrive] = useState(true);
  const [needAmbulance, setNeedAmbulance] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gpsWatchRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);
  const [gpsActive, setGpsActive] = useState(false);

  const updateAlert = useCallback(async (data: Record<string, unknown>) => {
    try {
      await fetch(`/api/sos/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (err) { console.error("Failed to update alert:", err); }
  }, [alertId]);

  useEffect(() => {
    if (phase === "done" || !alertId) return;
    if (!navigator.geolocation) return;
    const sendLocation = (lat: number, lng: number, speed: number | null, heading: number | null) => {
      const now = Date.now();
      if (now - lastSentRef.current < 5000) return;
      lastSentRef.current = now;
      fetch(`/api/sos/alerts/${alertId}/location`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, speed, heading }),
      }).catch(() => {});
    };
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => { setGpsActive(true); sendLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.speed, pos.coords.heading); },
      () => setGpsActive(false),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
    return () => { if (gpsWatchRef.current !== null) { navigator.geolocation.clearWatch(gpsWatchRef.current); gpsWatchRef.current = null; } };
  }, [alertId, phase]);

  useEffect(() => {
    if (!alertId || phase === "loading") return;
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/sos/alerts/${alertId}`);
        if (res.ok) {
          const data = await res.json();
          const newStatus = data.alert?.status;
          if (newStatus && newStatus !== alertStatus) {
            if (newStatus === "responding" && alertStatus === "active") { setAdminNotification("responding"); setTimeout(() => setAdminNotification(null), 10000); }
            else if (newStatus === "resolved") setAdminNotification("resolved");
            setAlertStatus(newStatus);
          }
        }
      } catch { /* ignore */ }
    };
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [alertId, alertStatus, phase]);

  useEffect(() => {
    async function findHospital() {
      let hospitals: { name: string; lat: number; lng: number; phone: string; distance: number }[] = [];
      try {
        const res = await fetch(`/api/services/scrape?lat=${userLat}&lng=${userLng}&radius=10000`);
        if (res.ok) { const data = await res.json(); const h = (data.services || []).filter((s: { type: string }) => s.type === "hospital"); hospitals = h.map((s: { name: string; location: { coordinates: [number, number] }; phone: string[]; distance: number }) => ({ name: s.name, lat: s.location.coordinates[1], lng: s.location.coordinates[0], phone: s.phone?.[0] || "102", distance: s.distance })); }
      } catch { /* ignore */ }
      if (hospitals.length === 0) {
        try {
          const res = await fetch(`/api/services/nearby?lat=${userLat}&lng=${userLng}&radius=15&type=hospital`);
          if (res.ok) { const data = await res.json(); hospitals = (data.services || []).map((s: { name: string; location: { coordinates: [number, number] }; phone: string[]; distance: number }) => ({ name: s.name, lat: s.location.coordinates[1], lng: s.location.coordinates[0], phone: s.phone?.[0] || "102", distance: s.distance })); }
        } catch { /* ignore */ }
      }
      if (hospitals.length === 0) {
        const cached = loadEmergencyCache();
        if (cached) {
          const info: HospitalInfo = { name: cached.hospital.name, lat: cached.hospital.lat, lng: cached.hospital.lng, phone: cached.hospital.phone, distance: cached.hospital.distance, eta: cached.hospital.eta };
          setHospital(info); setRoutePoints(cached.routePoints);
          updateAlert({ nearestHospital: { name: info.name, distance: info.distance, eta: info.eta, lat: info.lat, lng: info.lng } }).catch(() => {});
          setPhase("timer"); return;
        }
        hospitals = [{ name: "Nearest Hospital", lat: userLat + 0.008, lng: userLng + 0.012, phone: "102", distance: 1.5 }];
      }
      const closest = hospitals[0];
      let eta = Math.round(closest.distance * 3);
      let geometry: [number, number][] = [];
      try {
        const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${closest.lng},${closest.lat}?overview=full&geometries=polyline`);
        if (osrmRes.ok) { const osrmData = await osrmRes.json(); if (osrmData.code === "Ok" && osrmData.routes?.length) { eta = Math.round(osrmData.routes[0].duration / 60); geometry = decodePolyline(osrmData.routes[0].geometry); } }
      } catch { /* ignore */ }
      const info: HospitalInfo = { ...closest, eta };
      setHospital(info); setRoutePoints(geometry);
      await updateAlert({ nearestHospital: { name: info.name, distance: info.distance, eta: info.eta, lat: info.lat, lng: info.lng } });
      setPhase("timer");
    }
    findHospital();
  }, [userLat, userLng, updateAlert]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !hospital) return;
    const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 19 }).addTo(map);
    const userIcon = L.divIcon({ className: "", html: `<div style="width:14px;height:14px;background:#3d8bff;border:2.5px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(61,139,255,0.25),0 0 16px rgba(61,139,255,0.5);"></div>`, iconSize: [14, 14], iconAnchor: [7, 7] });
    L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
    const hospIcon = L.divIcon({ className: "", html: `<div style="width:38px;height:38px;background:linear-gradient(135deg,#ff3b3b,#cc0000);border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(255,59,59,0.45);border:1.5px solid rgba(255,255,255,0.2);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 2v20M2 12h20"/></svg></div>`, iconSize: [38, 38], iconAnchor: [19, 19] });
    L.marker([hospital.lat, hospital.lng], { icon: hospIcon }).addTo(map);
    if (routePoints.length > 0) L.polyline(routePoints, { color: "#3d8bff", weight: 4, opacity: 0.75, dashArray: "10, 7" }).addTo(map);
    map.fitBounds(L.latLngBounds([[userLat, userLng], [hospital.lat, hospital.lng]]), { padding: [50, 50] });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [hospital, routePoints, userLat, userLng]);

  useEffect(() => {
    if (phase !== "timer") return;
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); timerRef.current = null; setPhase("escalated"); updateAlert({ canSelfReach: false, escalatedToCritical: true, severity: "critical" }); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, updateAlert]);

  const handleCanReach = () => { if (timerRef.current) clearInterval(timerRef.current); setPhase("survey"); updateAlert({ canSelfReach: true, severity: "high" }); };

  const handleSubmitSurvey = async () => {
    setSubmitting(true);
    await updateAlert({ survey: { injuryLevel, bloodGroup, numberOfPatients: numPatients, canDrive, needAmbulance, description }, severity: needAmbulance ? "critical" : injuryLevel === "severe" ? "critical" : injuryLevel === "moderate" ? "high" : "medium" });
    setPhase("done"); setSubmitting(false);
  };

  const handleFalseAlarm = async () => { await updateAlert({ canSelfReach: true, escalatedToCritical: false, severity: "low", status: "resolved" }); setPhase("done"); };

  const timerPct = (timer / 10) * 100;
  const circumference = 2 * Math.PI * 52; // r=52

  // Phase-derived header info
  const headerBadge =
    phase === "escalated" ? { emoji: "🚨", label: "CRITICAL — ESCALATED", labelColor: "#ff3b3b", bg: "rgba(255,59,59,0.10)", border: "rgba(255,59,59,0.25)" } :
    phase === "done"      ? { emoji: "✅", label: "Help Confirmed",        labelColor: "#22d87a", bg: "rgba(34,216,122,0.10)", border: "rgba(34,216,122,0.25)" } :
                            { emoji: "🆘", label: "Emergency Active",      labelColor: "#ff6b6b", bg: "rgba(255,59,59,0.10)", border: "rgba(255,59,59,0.25)" };

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column", overflow: "auto", position: "relative" }}>

        {/* ── Top ambient glow ── */}
        <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: 600, height: 300, background: phase === "escalated" ? "radial-gradient(ellipse at 50% 0%, rgba(255,59,59,0.09) 0%, transparent 70%)" : "radial-gradient(ellipse at 50% 0%, rgba(255,59,59,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

        {/* ─── HEADER ─── */}
        <header style={{ flexShrink: 0, padding: "16px 16px 14px", borderBottom: "1px solid var(--border)", position: "relative", zIndex: 10 }}>
          <div className="mp-inner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Badge icon */}
              <div style={{ width: 42, height: 42, borderRadius: 13, background: headerBadge.bg, border: `1px solid ${headerBadge.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                {headerBadge.emoji}
              </div>
              <div>
                <div className="font-display" style={{ fontSize: 15, fontWeight: 800, color: headerBadge.labelColor, letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                  {headerBadge.label}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                  <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'Space Mono', monospace" }}>
                    {userProfile?.name || "User"} · #{alertId.slice(-6).toUpperCase()}
                  </span>
                  {gpsActive && phase !== "done" && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#22d87a" }}>
                      <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#22d87a", display: "inline-block" }} />
                      LIVE
                    </span>
                  )}
                </div>
              </div>
            </div>

            {phase === "done" && (
              <Link href="/user" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--muted)", fontSize: 12, fontWeight: 500, textDecoration: "none", transition: "all .18s" }}>
                ← Map
              </Link>
            )}
          </div>
        </header>

        {/* ─── ADMIN NOTIFICATIONS ─── */}
        {adminNotification === "responding" && (
          <div className="fade-up" style={{ flexShrink: 0, padding: "10px 16px 0" }}>
            <div className="mp-inner">
            <div style={{ background: "rgba(34,216,122,0.07)", border: "1px solid rgba(34,216,122,0.20)", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(34,216,122,0.14)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>🚑</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#22d87a", fontFamily: "'Syne', sans-serif" }}>Authorities alerted!</div>
                <div style={{ fontSize: 11, color: "rgba(34,216,122,0.6)", marginTop: 2 }}>Emergency services are responding. Stay calm and visible.</div>
              </div>
              <button onClick={() => setAdminNotification(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(34,216,122,0.4)", fontSize: 16, lineHeight: 1, padding: 4 }}>×</button>
            </div>
            </div>
          </div>
        )}
        {adminNotification === "resolved" && (
          <div className="fade-up" style={{ flexShrink: 0, padding: "10px 16px 0" }}>
            <div className="mp-inner">
            <div style={{ background: "rgba(61,139,255,0.07)", border: "1px solid rgba(61,139,255,0.20)", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(61,139,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>✅</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#3d8bff", fontFamily: "'Syne', sans-serif" }}>Emergency Resolved</div>
                <div style={{ fontSize: 11, color: "rgba(61,139,255,0.6)", marginTop: 2 }}>Marked resolved by control room. Stay safe!</div>
              </div>
            </div>
            </div>
          </div>
        )}

        {/* ─── MAP ─── */}
        <div style={{ flexShrink: 0, height: "36vh", position: "relative" }}>
          {phase === "loading" && (
            <div className="fade-up" style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)", gap: 14 }}>
              {/* Spinner */}
              <div style={{ position: "relative", width: 48, height: 48 }}>
                <svg width="48" height="48" viewBox="0 0 48 48" style={{ animation: "spin 1s linear infinite" }}>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,59,59,0.15)" strokeWidth="3" />
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#ff3b3b" strokeWidth="3" strokeDasharray="32 94" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>Locating nearest hospital</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Scanning within 15 km radius…</div>
              </div>
            </div>
          )}
          <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
          {/* Map bottom fade */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "linear-gradient(to bottom, transparent, var(--bg))", pointerEvents: "none" }} />
        </div>

        {/* ─── HOSPITAL CARD ─── */}
        {hospital && (
          <div className="fade-up" style={{ flexShrink: 0, padding: "0 16px", marginTop: -8, position: "relative", zIndex: 10 }}>
            <div className="mp-inner">
            <div className="mp-card-hi" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              {/* Icon */}
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #ff3b3b, #b91c1c)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 16px rgba(255,59,59,0.3)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2v20M2 12h20"/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{hospital.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{hospital.distance} km</span>
                  <span style={{ color: "var(--faint)" }}>·</span>
                  <span>~{hospital.eta} min ETA</span>
                </div>
              </div>
              <a href={`tel:${hospital.phone}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 10, background: "rgba(34,216,122,0.12)", border: "1px solid rgba(34,216,122,0.25)", color: "#22d87a", fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013 5.18a2 2 0 012-2.18h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L9.91 10a16 16 0 006.09 6.09l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
                Call
              </a>
            </div>
            </div>
          </div>
        )}

        {/* ─── PHASE CONTENT ─── */}
        <div style={{ flex: 1, padding: "20px 16px 36px", position: "relative", zIndex: 5 }}>
          <div className="mp-inner">

          {/* ══ TIMER PHASE ══ */}
          {phase === "timer" && (
            <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Timer ring */}
              <div style={{ textAlign: "center" }}>
                <div style={{ position: "relative", width: 136, height: 136, margin: "0 auto 12px" }}>
                  <svg className={timer <= 3 ? "ring-flash" : ""} width="136" height="136" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
                    {/* Track */}
                    <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                    {/* Progress */}
                    <circle cx="60" cy="60" r="52" fill="none"
                      stroke={timer <= 3 ? "#ff3b3b" : timer <= 6 ? "#ffb830" : "#3d8bff"}
                      strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={`${(timerPct / 100) * circumference} ${circumference}`}
                      style={{ transition: "stroke-dasharray 1s linear, stroke .4s ease" }}
                    />
                  </svg>
                  {/* Center number */}
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span className="font-mono" style={{ fontSize: 42, fontWeight: 700, color: timer <= 3 ? "#ff3b3b" : timer <= 6 ? "#ffb830" : "var(--text)", lineHeight: 1, letterSpacing: "-2px" }}>
                      {String(timer).padStart(2, "0")}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, letterSpacing: "0.05em" }}>SEC</span>
                  </div>
                </div>
              </div>

              {/* Info card */}
              <div className="mp-card" style={{ padding: "14px 16px", background: "rgba(255,184,48,0.05)", borderColor: "rgba(255,184,48,0.18)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ffb830", marginBottom: 6, fontFamily: "'Syne', sans-serif" }}>
                  Can you reach the hospital yourself?
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.65 }}>
                  If you don&apos;t respond within{" "}
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>{timer} seconds</span>, your alert will be{" "}
                  <span style={{ color: "#ff3b3b", fontWeight: 700 }}>ESCALATED TO CRITICAL</span>{" "}
                  and emergency services will be dispatched automatically.
                </div>
              </div>

              {/* CTA */}
              <button onClick={handleCanReach} className="sweep-btn"
                style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", color: "white", fontSize: 14, fontWeight: 800, fontFamily: "'Syne', sans-serif", letterSpacing: "0.02em", cursor: "pointer", boxShadow: "0 8px 32px rgba(34,197,94,0.30)", transition: "opacity .18s, transform .12s" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = ".9")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                onMouseDown={e => (e.currentTarget.style.transform = "scale(.98)")}
                onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
              >
                ✅ &nbsp; I CAN REACH THE HOSPITAL
              </button>

              <p style={{ textAlign: "center", fontSize: 10.5, color: "var(--faint)" }}>
                Tap only if you can safely drive or walk to the hospital
              </p>
            </div>
          )}

          {/* ══ ESCALATED PHASE ══ */}
          {phase === "escalated" && (
            <div className="scale-in" style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", textAlign: "center" }}>

              {/* Icon */}
              <div style={{ width: 88, height: 88, borderRadius: 26, background: "rgba(255,59,59,0.10)", border: "1px solid rgba(255,59,59,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, boxShadow: "0 0 40px rgba(255,59,59,0.15)" }}>
                🚨
              </div>

              <div>
                <div className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "#ff3b3b", letterSpacing: "-0.03em", marginBottom: 8 }}>
                  SITUATION ESCALATED
                </div>
                <p style={{ fontSize: 13, color: "var(--muted)", maxWidth: 320, margin: "0 auto", lineHeight: 1.7 }}>
                  Your emergency has been flagged as{" "}
                  <span style={{ color: "#ff3b3b", fontWeight: 700 }}>CRITICAL</span>. Emergency services and the control room have been notified with your live location.
                </p>
              </div>

              {/* Status list */}
              <div className="mp-card" style={{ width: "100%", padding: "14px 16px", textAlign: "left", display: "flex", flexDirection: "column", gap: 10, borderColor: "rgba(255,59,59,0.18)", background: "rgba(255,59,59,0.04)" }}>
                {[
                  { icon: "✓", label: "Admin control room alerted", color: "#22d87a", done: true },
                  { icon: "✓", label: "Location shared with responders", color: "#22d87a", done: true },
                  { icon: "✓", label: "Nearest hospital notified", color: "#22d87a", done: true },
                  { icon: "⋯", label: "Emergency contacts being notified", color: "#ffb830", done: false },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 7, background: item.done ? "rgba(34,216,122,0.12)" : "rgba(255,184,48,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: item.color, fontWeight: 700, flexShrink: 0 }}>
                      {item.icon}
                    </div>
                    <span style={{ fontSize: 12, color: item.done ? "var(--text)" : "var(--muted)", fontWeight: 500 }}>{item.label}</span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 13, color: "#22d87a", fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>
                Help is on the way — stay visible
              </div>

              <button onClick={handleFalseAlarm}
                style={{ width: "100%", padding: "12px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", color: "var(--muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .18s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "var(--text)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "var(--muted)"; }}
              >
                I&apos;m OK — Cancel Escalation
              </button>
            </div>
          )}

          {/* ══ SURVEY PHASE ══ */}
          {phase === "survey" && (
            <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 22 }}>

              {/* Header */}
              <div style={{ textAlign: "center" }}>
                <div className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "#3d8bff", letterSpacing: "-0.03em", marginBottom: 4 }}>
                  Quick Assessment
                </div>
                <p style={{ fontSize: 12, color: "var(--muted)" }}>Takes 20 seconds · helps responders prepare</p>
              </div>

              {/* ── Injury Level ── */}
              <div>
                <Label>Injury Level</Label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 8 }}>
                  {[
                    { v: "none",     label: "None",     color: "sel-green" },
                    { v: "minor",    label: "Minor",    color: "sel-blue" },
                    { v: "moderate", label: "Moderate", color: "sel-amber" },
                    { v: "severe",   label: "Severe",   color: "sel-red" },
                  ].map(({ v, label, color }) => (
                    <button key={v} onClick={() => setInjuryLevel(v)}
                      className={`sel-btn ${injuryLevel === v ? color : ""}`}
                      style={{ padding: "10px 4px", fontSize: 11.5, textAlign: "center" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Blood Group ── */}
              <div>
                <Label>Blood Group</Label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 8 }}>
                  {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                    <button key={bg} onClick={() => setBloodGroup(bg)}
                      className={`sel-btn ${bloodGroup === bg ? "sel-red" : ""}`}
                      style={{ padding: "9px 4px", fontSize: 12 }}>
                      {bg}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── # Patients ── */}
              <div>
                <Label>Patients Involved</Label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginTop: 8 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setNumPatients(n)}
                      className={`sel-btn ${numPatients === n ? "sel-purple" : ""}`}
                      style={{ padding: "10px 4px", fontSize: 13, fontWeight: 700 }}>
                      {n}{n === 5 ? "+" : ""}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Can Drive + Need Ambulance ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <Label>Can Drive?</Label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                    {[true, false].map((v) => (
                      <button key={String(v)} onClick={() => setCanDrive(v)}
                        className={`sel-btn ${canDrive === v ? (v ? "sel-green" : "sel-red") : ""}`}
                        style={{ padding: "10px", fontSize: 12 }}>
                        {v ? "Yes" : "No"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Ambulance?</Label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                    {[true, false].map((v) => (
                      <button key={String(v)} onClick={() => setNeedAmbulance(v)}
                        className={`sel-btn ${needAmbulance === v ? (v ? "sel-red" : "sel-green") : ""}`}
                        style={{ padding: "10px", fontSize: 12 }}>
                        {v ? "Yes" : "No"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Description ── */}
              <div>
                <Label>Description <span style={{ color: "var(--faint)", fontWeight: 400 }}>(optional)</span></Label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Minor fender bender, airbag didn't deploy…"
                  rows={2}
                  style={{ marginTop: 8, width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 13px", fontSize: 12, color: "var(--text)", fontFamily: "'DM Sans', sans-serif", resize: "none", outline: "none", transition: "border-color .18s", lineHeight: 1.6, caretColor: "#3d8bff" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(61,139,255,0.35)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </div>

              {/* Submit */}
              <button onClick={handleSubmitSurvey} disabled={submitting} className="sweep-btn-blue"
                style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", color: "white", fontSize: 14, fontWeight: 800, fontFamily: "'Syne', sans-serif", letterSpacing: "0.02em", cursor: "pointer", boxShadow: "0 8px 32px rgba(37,99,235,0.28)", opacity: submitting ? 0.6 : 1, transition: "opacity .18s, transform .12s" }}
                onMouseDown={e => (e.currentTarget.style.transform = "scale(.99)")}
                onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
              >
                {submitting ? "Sending…" : "Submit & Navigate to Hospital →"}
              </button>

              <button onClick={() => setPhase("done")}
                style={{ background: "none", border: "none", color: "var(--faint)", fontSize: 12, cursor: "pointer", padding: "4px 0", textAlign: "center" }}>
                Skip survey
              </button>
            </div>
          )}

          {/* ══ DONE PHASE ══ */}
          {phase === "done" && (
            <div className="scale-in" style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "center", textAlign: "center", paddingTop: 8 }}>

              <div style={{ width: 80, height: 80, borderRadius: 24, background: "rgba(34,216,122,0.10)", border: "1px solid rgba(34,216,122,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, boxShadow: "0 0 36px rgba(34,216,122,0.12)" }}>
                ✅
              </div>

              <div>
                <div className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "#22d87a", letterSpacing: "-0.03em", marginBottom: 5 }}>
                  Information Sent
                </div>
                <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.65 }}>
                  Admin has been notified with all your details and your live location.
                </p>
              </div>

              {hospital && (
                <a href={`https://www.google.com/maps/dir/${userLat},${userLng}/${hospital.lat},${hospital.lng}`}
                  target="_blank" rel="noopener noreferrer" className="sweep-btn-blue"
                  style={{ display: "block", width: "100%", padding: "14px", borderRadius: 13, color: "white", fontSize: 14, fontWeight: 800, fontFamily: "'Syne', sans-serif", textDecoration: "none", boxShadow: "0 8px 32px rgba(37,99,235,0.28)" }}>
                  🗺️ &nbsp;Navigate to {hospital.name}
                </a>
              )}

              <Link href="/user"
                style={{ display: "block", width: "100%", padding: "12px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", color: "var(--muted)", fontSize: 12, fontWeight: 600, textDecoration: "none", transition: "all .18s" }}>
                ← Back to Map
              </Link>
            </div>
          )}

        </div>{/* mp-inner */}
        </div>
      </div>
    </>
  );
}

/* ── Small helper ── */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.30)", textTransform: "uppercase", letterSpacing: "0.09em", fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>
      {children}
    </div>
  );
}