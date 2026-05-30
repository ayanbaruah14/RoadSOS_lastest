"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import SOSButton from "@/components/SOSButton";
import TrafficPanel from "@/components/TrafficPanel";
import ChatbotPanel from "@/components/ChatbotPanel";
import { getUserProfile, type UserProfile } from "@/lib/profiles";
import { prefetchEmergencyRoute, isCacheFresh, hasUserMoved } from "@/lib/offlineCache";
import type { ServiceType, ServiceData, RouteData } from "@/components/Map";
import { hasValidPhone } from "@/components/Map";
import { Motion } from "@capacitor/motion";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

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

const categories: { id: ServiceType | "all"; label: string; icon: string; color: string; }[] = [
  { id: "all",       label: "All",       icon: "🗺️", color: "from-slate-500 to-slate-700" },
  { id: "hospital",  label: "Hospitals", icon: "🏥", color: "from-red-500 to-red-700" },
  { id: "police",    label: "Police",    icon: "👮", color: "from-blue-500 to-blue-700" },
  { id: "ambulance", label: "Ambulance", icon: "🚑", color: "from-emerald-500 to-emerald-700" },
  { id: "towing",    label: "Towing",    icon: "🚗", color: "from-amber-500 to-amber-700" },
  { id: "repair",    label: "Repair",    icon: "🔧", color: "from-violet-500 to-violet-700" },
];

const typeColors: Record<string, string> = {
  hospital:  "bg-red-500/20 text-red-400 border-red-500/30",
  police:    "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ambulance: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  towing:    "bg-amber-500/20 text-amber-400 border-amber-500/30",
  repair:    "bg-violet-500/20 text-violet-400 border-violet-500/30",
  showroom:  "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

export default function UserPage() {
  const router = useRouter();
  const handleLogout = () => {
    localStorage.removeItem("roadsos_auth");
    localStorage.removeItem("roadsos_token");
    localStorage.removeItem("roadsos_user_profile");
    router.replace("/signup");
  };

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeFilter, setActiveFilter] = useState<ServiceType | "all">("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [trafficOpen, setTrafficOpen] = useState(false);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [dbNotice, setDbNotice] = useState<string | null>(null);
  const [offlineCached, setOfflineCached] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [routeLoading, setRouteLoading] = useState<string | null>(null);
  const [acceleration, setAcceleration] = useState(0);
  const [crashDetected, setCrashDetected] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [lastCrashTime, setLastCrashTime] = useState(0);
  const [sosTriggered, setSosTriggered] = useState(false);

  useEffect(() => { setUserProfile(getUserProfile()); }, []);

  useEffect(() => {
    const auth = localStorage.getItem("roadsos_auth");
    if (!auth) router.replace("/signup");
  }, [router]);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCurrentSpeed((pos.coords.speed || 0) * 3.6);
      },
      (err) => console.error("[GPS] Error:", err),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    let accelListener: any;
    const startMotionDetection = async () => {
      accelListener = await Motion.addListener("accel", (event) => {
        const x = event.acceleration.x || 0;
        const y = event.acceleration.y || 0;
        const z = event.acceleration.z || 0;
        let totalAcceleration = Math.sqrt(x * x + y * y + z * z);
        if (totalAcceleration < 1) totalAcceleration = 0;
        setAcceleration(totalAcceleration);
        const now = Date.now();
        if (totalAcceleration > 20 && currentSpeed > 20 && !sosTriggered && !crashDetected && now - lastCrashTime > 30000) {
          setLastCrashTime(now);
          setCrashDetected(true);
          setCountdown(10);
        }
      });
    };
    startMotionDetection();
    return () => { accelListener?.remove(); };
  }, [currentSpeed, sosTriggered, lastCrashTime, crashDetected]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) { setSosTriggered(true); setCrashDetected(false); setCountdown(null); return; }
    const timer = setTimeout(() => setCountdown((prev) => (prev !== null ? prev - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (!userLocation) return;
    if (isCacheFresh() && !hasUserMoved(userLocation.lat, userLocation.lng)) { setOfflineCached(true); return; }
    const timer = setTimeout(async () => {
      const result = await prefetchEmergencyRoute(userLocation.lat, userLocation.lng);
      if (result) setOfflineCached(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [userLocation]);

  const filtered = activeFilter === "all" ? services : services.filter((s) => s.type === activeFilter);

  const fetchRoute = useCallback(async (service: ServiceData) => {
    if (!userLocation) return;
    setRouteLoading(service._id);
    const [destLng, destLat] = service.location.coordinates;
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${destLng},${destLat}?overview=full&geometries=polyline&steps=true`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.code === "Ok" && data.routes?.length) {
          const route = data.routes[0];
          setRouteData({
            points: decodePolyline(route.geometry),
            distance: route.distance,
            duration: route.duration,
            destination: { name: service.name, lat: destLat, lng: destLng, type: service.type },
          });
          setSidebarOpen(false);
        }
      }
    } catch (err) {
      console.error("Failed to fetch route:", err);
    } finally {
      setRouteLoading(null);
    }
  }, [userLocation]);

  const clearRoute = () => setRouteData(null);
  const cancelEmergency = () => { setCrashDetected(false); setCountdown(null); setSosTriggered(false); };

  const sosBottom = routeData ? 188 : 32;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');

        :root {
          --surface: rgba(10,12,22,0.94);
          --surface2: rgba(14,17,30,0.90);
          --border: rgba(255,255,255,0.08);
          --violet: #8b5cf6;
          --cyan: #22d3ee;
          --text-primary: rgba(255,255,255,0.92);
          --text-secondary: rgba(255,255,255,0.50);
          --text-hint: rgba(255,255,255,0.25);
          --font-display: 'Plus Jakarta Sans', sans-serif;
          --font-body: 'DM Sans', sans-serif;
          --blur: blur(24px) saturate(180%);
          --shadow: 0 4px 20px rgba(0,0,0,0.45);
        }

        /* ─── HEADER ─── */
        .up-header {
          position: absolute; top: 0; left: 0; right: 0;
          z-index: 1000; pointer-events: none;
          display: flex; flex-direction: column; gap: 0;
        }
        .up-row1 { display: flex; align-items: center; justify-content: space-between; padding: 12px 12px 0; pointer-events: auto; }
        .up-row2 { padding: 8px 12px 0; pointer-events: auto; }
        .up-row3 { padding: 6px 12px 0; pointer-events: auto; }
        .up-row4 { padding: 6px 12px 0; pointer-events: auto; }

        .up-brand {
          display: flex; align-items: center; gap: 10px;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 14px; padding: 7px 14px 7px 8px;
          backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
          box-shadow: var(--shadow); position: relative; overflow: hidden;
        }
        .up-brand::before {
          content:''; position:absolute; top:0; left:0; right:0; height:1px;
          background: linear-gradient(90deg,transparent,rgba(139,92,246,.55),rgba(34,211,238,.4),transparent);
        }
        .up-brand-badge {
          width:32px; height:32px; border-radius:10px; flex-shrink:0;
          background:linear-gradient(135deg,#ef4444,#b91c1c);
          display:flex; align-items:center; justify-content:center;
          font-family:var(--font-display); font-weight:800; font-size:10px;
          color:#fff; letter-spacing:.06em; box-shadow:0 0 14px rgba(239,68,68,.45);
        }
        .up-brand-name { font-family:var(--font-display); font-weight:700; font-size:15px; color:var(--text-primary); letter-spacing:-.01em; line-height:1; }
        .up-brand-sub  { font-size:10px; color:var(--text-hint); margin-top:2px; font-family:var(--font-body); }

        .up-actions { display:flex; align-items:center; gap:6px; }
        .up-icon-btn {
          width:36px; height:36px; border-radius:11px;
          background:var(--surface); border:1px solid var(--border);
          backdrop-filter:var(--blur); -webkit-backdrop-filter:var(--blur);
          display:flex; align-items:center; justify-content:center;
          color:var(--text-secondary); cursor:pointer; transition:all .2s;
          text-decoration:none; box-shadow:var(--shadow);
        }
        .up-icon-btn:hover { background:rgba(255,255,255,.1); color:var(--text-primary); border-color:rgba(255,255,255,.14); }
        .up-icon-btn.traffic-on { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
        .up-icon-btn svg circle:nth-child(1) { fill: #34d399; stroke: #34d399; }
        .up-icon-btn svg circle:nth-child(2) { fill: #fbbf24; stroke: #fbbf24; }
        .up-icon-btn svg circle:nth-child(3) { fill: #f87171; stroke: #f87171; }

        .up-logout {
          display:flex; align-items:center; gap:6px;
          height:36px; padding:0 12px; border-radius:11px; cursor:pointer;
          background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.28);
          backdrop-filter:var(--blur); -webkit-backdrop-filter:var(--blur);
          color:#f87171; font-family:var(--font-display); font-size:12px; font-weight:700;
          transition:all .2s; box-shadow:var(--shadow); white-space:nowrap;
        }
        .up-logout:hover { background:rgba(239,68,68,.2); border-color:rgba(239,68,68,.45); color:#fca5a5; }

        .up-filters { display:flex; gap:6px; overflow-x:auto; padding-bottom:2px; scrollbar-width:none; }
        .up-filters::-webkit-scrollbar { display:none; }
        .up-filter-btn {
          display:flex; align-items:center; gap:5px;
          padding:6px 12px; border-radius:50px; white-space:nowrap;
          font-family:var(--font-display); font-size:11px; font-weight:600;
          border:1px solid var(--border); cursor:pointer; transition:all .2s;
          background:var(--surface); backdrop-filter:var(--blur); -webkit-backdrop-filter:var(--blur);
          color:var(--text-secondary); box-shadow:0 2px 8px rgba(0,0,0,.3);
        }
        .up-filter-btn:hover { color:var(--text-primary); border-color:rgba(255,255,255,.14); }
        .up-filter-btn.active { color:#fff; border-color:transparent; box-shadow:0 3px 14px rgba(0,0,0,.4); }

        .up-notice {
          display:flex; align-items:center; gap:8px;
          background:rgba(245,158,11,.08); border:1px solid rgba(245,158,11,.22);
          border-radius:12px; padding:8px 12px;
          color:#fbbf24; font-size:12px; backdrop-filter:var(--blur);
        }
        .up-notice-x { background:none; border:none; color:rgba(255,255,255,.3); cursor:pointer; font-size:14px; padding:0; margin-left:auto; }

        .up-telem {
          display:inline-flex; align-items:center; gap:8px;
          background:rgba(6,7,15,.82); border:1px solid rgba(255,255,255,.07);
          border-radius:10px; padding:5px 11px;
          backdrop-filter:var(--blur);
          font-family:var(--font-body); font-size:11px; color:var(--text-secondary);
          white-space:nowrap;
        }
        .up-telem-val { color:var(--cyan); font-weight:600; font-family:var(--font-display); }
        .up-telem-sep { width:1px; height:12px; background:rgba(255,255,255,.1); }

        /* ─── CRASH ─── */
        .up-crash-badge {
          display:flex; align-items:center; gap:10px;
          background:rgba(140,20,20,.95); border:1px solid rgba(239,68,68,.50);
          border-radius:14px; padding:9px 18px;
          animation:cpulse 1s ease-in-out infinite alternate;
          pointer-events:none; white-space:nowrap;
        }
        @keyframes cpulse {
          from { box-shadow:0 0 0 3px rgba(239,68,68,.08),0 6px 24px rgba(239,68,68,.30); }
          to   { box-shadow:0 0 0 6px rgba(239,68,68,.05),0 6px 32px rgba(239,68,68,.52); }
        }
        .up-crash-label { font-family:var(--font-display); font-weight:600; font-size:12px; color:rgba(255,255,255,.80); letter-spacing:.01em; }
        .up-crash-num   { font-family:var(--font-display); font-weight:800; font-size:22px; color:#fff; line-height:1; min-width:22px; text-align:center; }

        .up-sos-triggered {
          display:flex; align-items:center; gap:6px;
          background:rgba(5,150,105,.88); border:1px solid rgba(16,185,129,.35);
          border-radius:12px; padding:8px 16px;
          font-family:var(--font-display); font-weight:600; font-size:13px; color:#fff;
          pointer-events:none; white-space:nowrap;
        }
        .up-cancel-btn {
          padding:8px 24px; border-radius:50px; border:1px solid rgba(239,68,68,.35);
          background:rgba(239,68,68,.10); color:#f87171;
          font-family:var(--font-display); font-weight:700; font-size:12px;
          cursor:pointer; transition:all .2s; white-space:nowrap;
        }
        .up-cancel-btn:hover { background:rgba(239,68,68,.20); border-color:rgba(239,68,68,.55); color:#fca5a5; }

        /* ─── ROUTE PANEL ─── */
        .up-route-panel {
          position:absolute; bottom:100px; left:12px; right:12px;
          z-index:1000; pointer-events:auto;
          animation:slideup .35s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes slideup { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .up-route-card {
          background:rgba(7,9,20,.97); border:1px solid rgba(59,130,246,.26);
          border-radius:20px; padding:16px 18px;
          backdrop-filter:var(--blur);
          box-shadow:0 16px 48px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.04) inset;
          position:relative; overflow:hidden;
        }
        .up-route-card::before {
          content:''; position:absolute; top:0; left:0; right:0; height:1px;
          background:linear-gradient(90deg,transparent,rgba(59,130,246,.7),rgba(34,211,238,.4),transparent);
        }
        .up-route-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
        .up-route-dest { display:flex; align-items:center; gap:12px; }
        .up-route-ico {
          width:40px; height:40px; border-radius:12px; flex-shrink:0;
          background:linear-gradient(135deg,#3b82f6,#1d4ed8);
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 4px 14px rgba(59,130,246,.35);
        }
        .up-route-name { font-family:var(--font-display); font-weight:700; font-size:14px; color:var(--text-primary); }
        .up-route-type { font-size:11px; color:var(--text-hint); margin-top:2px; }
        .up-route-x {
          width:28px; height:28px; border-radius:8px; border:none; cursor:pointer;
          background:rgba(255,255,255,.06); color:var(--text-hint);
          display:flex; align-items:center; justify-content:center; transition:all .2s;
        }
        .up-route-x:hover { background:rgba(255,255,255,.12); color:var(--text-primary); }
        .up-route-stats { display:flex; align-items:center; }
        .up-stat { flex:1; }
        .up-stat-v { font-family:var(--font-display); font-weight:700; font-size:18px; line-height:1; }
        .up-stat-l { font-size:10px; color:var(--text-hint); margin-top:3px; letter-spacing:.06em; text-transform:uppercase; }
        .up-stat-d { width:1px; height:34px; background:var(--border); margin:0 14px; }

        html, body { overflow-x: hidden; max-width: 100vw; }

        /* ─── SOS AREA ─── */
        .up-sos-area {
          position:absolute; left:50%; transform:translateX(-50%);
          z-index:1000; display:flex; flex-direction:column; align-items:center; gap:8px;
          transition:bottom .3s cubic-bezier(.16,1,.3,1);
          max-width: calc(100vw - 24px);
        }

        /* ─── SIDEBAR ─── */
        .up-sidebar { position:absolute; top:0; right:0; height:100%; width:296px; z-index:1001; transition:transform .3s cubic-bezier(.16,1,.3,1); }
        .up-sidebar.closed { transform:translateX(100%); }
        .up-sidebar.open   { transform:translateX(0); }
        .up-sidebar-in {
          height:100%; background:rgba(6,8,18,.97); border-left:1px solid rgba(255,255,255,.07);
          backdrop-filter:var(--blur); display:flex; flex-direction:column;
        }
        .up-sb-head { padding:16px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
        .up-sb-title { font-family:var(--font-display); font-weight:700; font-size:15px; color:var(--text-primary); }
        .up-sb-count { font-size:11px; color:var(--text-hint); margin-top:2px; }
        .up-sb-close {
          width:28px; height:28px; border-radius:8px; border:none; cursor:pointer;
          background:rgba(255,255,255,.05); color:var(--text-hint);
          display:flex; align-items:center; justify-content:center; transition:all .2s;
        }
        .up-sb-close:hover { background:rgba(255,255,255,.1); color:var(--text-primary); }
        .up-sb-list { flex:1; overflow-y:auto; padding:10px; scrollbar-width:thin; scrollbar-color:rgba(255,255,255,.07) transparent; }

        .up-svc { background:rgba(255,255,255,.03); border:1px solid var(--border); border-radius:14px; padding:12px; margin-bottom:8px; transition:all .2s; cursor:pointer; }
        .up-svc:hover { background:rgba(255,255,255,.06); border-color:rgba(255,255,255,.12); }
        .up-svc.active { background:rgba(59,130,246,.07); border-color:rgba(59,130,246,.28); }
        .up-svc-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:6px; }
        .up-svc-name { font-family:var(--font-display); font-weight:600; font-size:13px; color:var(--text-primary); line-height:1.3; flex:1; padding-right:8px; }
        .up-svc-badge { font-size:9px; padding:2px 7px; border-radius:50px; border:1px solid; font-family:var(--font-display); font-weight:700; white-space:nowrap; flex-shrink:0; text-transform:uppercase; letter-spacing:.05em; }
        .up-svc-meta { display:flex; flex-wrap:wrap; gap:6px 10px; font-size:11px; color:var(--text-hint); margin-bottom:6px; }
        .up-svc-addr { font-size:10px; color:rgba(255,255,255,.2); margin-bottom:8px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
        .up-svc-btns { display:flex; gap:7px; }

        /* Call button — active state */
        .up-call {
          flex:1; padding:8px; border-radius:10px; border:none; cursor:pointer;
          background:linear-gradient(135deg,#059669,#065f46);
          color:#fff; font-family:var(--font-display); font-weight:700; font-size:12px;
          text-decoration:none; display:flex; align-items:center; justify-content:center;
          transition:opacity .2s; box-shadow:0 2px 10px rgba(5,150,105,.28);
        }
        .up-call:hover { opacity:.88; }

        /* Call button — disabled/no-phone state */
        .up-call-disabled {
          flex:1; padding:8px; border-radius:10px;
          background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07);
          color:rgba(255,255,255,.22); font-family:var(--font-display); font-weight:700; font-size:12px;
          display:flex; align-items:center; justify-content:center;
          cursor:not-allowed; user-select:none;
        }

        .up-dir {
          flex:1; padding:8px; border-radius:10px; border:1px solid rgba(59,130,246,.30); cursor:pointer;
          background:rgba(59,130,246,.10); color:#60a5fa;
          font-family:var(--font-display); font-weight:600; font-size:12px;
          transition:all .2s; display:flex; align-items:center; justify-content:center; gap:4px;
        }
        .up-dir:hover { background:rgba(59,130,246,.18); color:#93c5fd; border-color:rgba(59,130,246,.45); }
        .up-dir.active { background:rgba(59,130,246,.12); border-color:rgba(59,130,246,.3); color:#60a5fa; }
        .up-dir:disabled { opacity:.4; cursor:not-allowed; }
        .up-spin { width:11px; height:11px; border-radius:50%; border:1.5px solid rgba(255,255,255,.3); border-top-color:#fff; animation:spin .7s linear infinite; display:inline-block; }
        @keyframes spin { to{transform:rotate(360deg)} }
        .up-empty { text-align:center; padding:48px 16px; color:var(--text-hint); }
        .up-empty-icon { font-size:32px; margin-bottom:8px; }
        .up-empty-text { font-size:13px; font-family:var(--font-display); }

        /* ─── ROUTE LOADING TOAST ─── */
        .up-route-loading {
          display:flex; align-items:center; gap:10px;
          background:rgba(59,130,246,.12); border:1px solid rgba(59,130,246,.30);
          border-radius:12px; padding:9px 16px;
          font-family:var(--font-display); font-size:13px; color:#93c5fd;
          pointer-events:none; white-space:nowrap;
          animation:slideup .3s cubic-bezier(.16,1,.3,1) both;
        }
      `}</style>

      <div className="relative h-full w-full" style={{ overflowX: "hidden" }}>
        <Map
          activeFilter={activeFilter}
          routeData={routeData}
          onServicesLoaded={(s) => setServices(s)}
          onLocationReady={(lat, lng) => setUserLocation({ lat, lng })}
          onError={(msg) => setDbNotice(msg)}
          onRouteRequest={fetchRoute}
        />

        {/* ── HEADER ── */}
        <div className="up-header">
          <div className="up-row1">
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div className="up-brand">
                <div className="up-brand-badge">SOS</div>
                <div>
                  <div className="up-brand-name">RoadSOS</div>
                  <div className="up-brand-sub">{userProfile?.name || "User"} · {userProfile?.bloodGroup || "--"}</div>
                </div>
              </div>
            </div>
            <div className="up-actions">
              <Link href="/profile" className="up-icon-btn" title="Profile">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </Link>
              <button onClick={() => setTrafficOpen(!trafficOpen)} className={`up-icon-btn ${trafficOpen ? "traffic-on" : ""}`} title="Live Traffic">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="18" r="2"/></svg>
              </button>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="up-icon-btn" title="Nearby Services">
                {sidebarOpen
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12h18"/><path d="M3 6h18"/><path d="M3 18h18"/></svg>}
              </button>
              <button onClick={handleLogout} className="up-logout">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Logout
              </button>
            </div>
          </div>

          <div className="up-row2">
            <div className="up-filters">
              {categories.map((cat) => (
                <button key={cat.id} onClick={() => setActiveFilter(cat.id)}
                  className={`up-filter-btn ${activeFilter === cat.id ? `active bg-gradient-to-r ${cat.color}` : ""}`}>
                  <span>{cat.icon}</span><span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {dbNotice && (
            <div className="up-row3">
              <div className="up-notice" style={{ width: "fit-content" }}>
                <span>⚠️</span>
                <span style={{ flex:1 }}>{dbNotice}</span>
                <button className="up-notice-x" onClick={() => setDbNotice(null)}>✕</button>
              </div>
            </div>
          )}

          <div className="up-row4">
            <div className="up-telem">
              <span style={{ opacity:.5 }}>📈</span>
              Accel: <span className="up-telem-val">{acceleration.toFixed(2)}</span>
              <div className="up-telem-sep" />
              Speed: <span className="up-telem-val">{currentSpeed.toFixed(1)} km/h</span>
            </div>
          </div>
        </div>

        <TrafficPanel
          userLat={userLocation?.lat || null}
          userLng={userLocation?.lng || null}
          services={services}
          isVisible={trafficOpen}
          onClose={() => setTrafficOpen(false)}
        />

{/* ── ROUTE PANEL ── */}
{routeData && (
  <div
    style={{
      position: "absolute",
      bottom: 136,           // sits above SOS button always
      left: 12,
      right: 12,
      zIndex: 1000,
      animation: "slideup .35s cubic-bezier(.16,1,.3,1) both",
    }}
  >
    <div className="up-route-card">
      <div className="up-route-top">
        <div className="up-route-dest">
          <div className="up-route-ico">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div>
            <div className="up-route-name">{routeData.destination.name}</div>
            <div className="up-route-type" style={{ textTransform: "capitalize" }}>
              {routeData.destination.type}
            </div>
          </div>
        </div>
        <button onClick={clearRoute} className="up-route-x" title="Close route">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div className="up-route-stats">
        <div className="up-stat">
          <div className="up-stat-v" style={{ color: "#60a5fa" }}>
            {(routeData.distance / 1000).toFixed(1)} km
          </div>
          <div className="up-stat-l">Distance</div>
        </div>
        <div className="up-stat-d" />
        <div className="up-stat">
          <div className="up-stat-v" style={{ color: "#34d399" }}>
            ~{Math.round(routeData.duration / 60)} min
          </div>
          <div className="up-stat-l">ETA</div>
        </div>
        <div className="up-stat-d" />
        <div className="up-stat">
          <div className="up-stat-v" style={{ color: "#fbbf24" }}>
            {Math.round(routeData.distance / 1000 / (routeData.duration / 3600))} km/h
          </div>
          <div className="up-stat-l">Avg Speed</div>
        </div>
      </div>
    </div>
  </div>
)}

{/* Route fetching toast */}
{routeLoading && !routeData && (
  <div style={{ position: "absolute", bottom: 136, left: 12, right: 12, zIndex: 1000 }}>
    <div className="up-route-loading">
      <span className="up-spin" style={{ borderTopColor: "#93c5fd", borderColor: "rgba(147,197,253,0.3)" }} />
      Calculating route…
    </div>
  </div>
)}

        {/* ── SOS AREA ── */}
        {/* ── SOS AREA ── */}
<div className="up-sos-area" style={{ bottom: 32 }}>
          <SOSButton
            userProfile={userProfile || getUserProfile()}
            userLocation={userLocation}
            externalTrigger={sosTriggered}
            onTriggered={(id) => {
              const lat = userLocation?.lat || 28.6139;
              const lng = userLocation?.lng || 77.209;
              router.push(`/emergency/${id}?lat=${lat}&lng=${lng}`);
            }}
          />

          {crashDetected && (
            <div className="up-crash-badge">
              <span className="up-crash-label">🚨 Auto SOS in</span>
              <span className="up-crash-num">{countdown}</span>
              <span className="up-crash-label">sec</span>
            </div>
          )}

          {sosTriggered && (
            <div className="up-sos-triggered">
              <span>✅</span> Emergency SOS Triggered
            </div>
          )}

          {(crashDetected || sosTriggered) && (
            <button onClick={cancelEmergency} className="up-cancel-btn">
              Cancel Emergency
            </button>
          )}
        </div>

        {/* ── SIDEBAR ── */}
        <div className={`up-sidebar ${sidebarOpen ? "open" : "closed"}`}>
          <div className="up-sidebar-in">
            <div className="up-sb-head">
              <div>
                <div className="up-sb-title">Nearby Services</div>
                <div className="up-sb-count">{filtered.length} services found</div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="up-sb-close">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="up-sb-list">
              {filtered.map((s) => {
                const isActive = routeData?.destination.name === s.name;
                const phoneOk = hasValidPhone(s.phone);
                return (
                  <div key={s._id} className={`up-svc ${isActive ? "active" : ""}`}>
                    <div className="up-svc-top">
                      <div className="up-svc-name">{s.name}</div>
                      <span className={`up-svc-badge ${typeColors[s.type] || ""}`}>{s.type}</span>
                    </div>
                    <div className="up-svc-meta">
                      {phoneOk
                        ? <span>📞 {s.phone[0]}</span>
                        : <span style={{ color:"rgba(255,255,255,0.18)" }}>📞 No phone available</span>
                      }
                      <span>📏 {s.distance} km</span>
                      <span>⭐ {s.rating}</span>
                    </div>
                    {s.address && <div className="up-svc-addr">📍 {s.address}</div>}
                    <div className="up-svc-btns">
                      {phoneOk ? (
                        <a href={`tel:${s.phone[0]}`} className="up-call">📞 Call</a>
                      ) : (
                        <span className="up-call-disabled">📞 No Phone</span>
                      )}
                      <button
                        onClick={() => fetchRoute(s)}
                        disabled={routeLoading === s._id}
                        className={`up-dir ${isActive ? "active" : ""}`}
                      >
                        {routeLoading === s._id
                          ? <><span className="up-spin" />&nbsp;Loading</>
                          : isActive ? "✓ Active" : "📍Directions"}
                      </button>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="up-empty">
                  <div className="up-empty-icon">📍</div>
                  <div className="up-empty-text">Waiting for location…</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <ChatbotPanel />
    </>
  );
}