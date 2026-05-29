"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_PROFILE } from "@/lib/profiles";

interface SOSAlertData {
  _id: string;
  user: {
    name: string;
    phone: string;
    bloodGroup: string;
    emergencyContacts: { name: string; phone: string; relation: string }[];
    medicalConditions: string[];
    allergies: string[];
    vehicleNumber?: string;
    vehicleType?: string;
  };
  location: {
    type: string;
    coordinates: [number, number];
  };
  severity: string;
  status: "active" | "responding" | "resolved";
  description: string;
  canSelfReach?: boolean | null;
  escalatedToCritical?: boolean;
  nearestHospital?: {
    name: string;
    distance: number;
    eta: number;
    lat: number;
    lng: number;
  };
  survey?: {
    injuryLevel: string;
    bloodGroup: string;
    numberOfPatients: number;
    canDrive: boolean;
    needAmbulance: boolean;
    description: string;
  };
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  liveLocation?: {
    lat: number;
    lng: number;
    updatedAt: string;
    speed?: number;
    heading?: number;
  };
  locationHistory?: {
    lat: number;
    lng: number;
    timestamp: string;
  }[];
}

const statusConfig = {
  active: {
    color: "text-red-400",
    bg: "bg-red-500/15",
    border: "border-red-500/30",
    ring: "ring-red-500/20",
    label: "ACTIVE",
    dot: "bg-red-500",
    cardClass: "active",
    accent: "from-red-500 to-rose-500",
    muted: "text-red-400/60",
  },
  responding: {
    color: "text-amber-400",
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
    ring: "ring-amber-500/20",
    label: "RESPONDING",
    dot: "bg-amber-500",
    cardClass: "responding",
    accent: "from-amber-500 to-orange-500",
    muted: "text-amber-400/60",
  },
  resolved: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
    ring: "ring-emerald-500/20",
    label: "RESOLVED",
    dot: "bg-emerald-500",
    cardClass: "resolved",
    accent: "from-emerald-500 to-teal-500",
    muted: "text-emerald-400/60",
  },
};

function timeAgo(dateStr: string, now: number): string {
  if (!now) return "--";
  const seconds = Math.floor(
    (now - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminPage() {
  const router = useRouter();

  // Auth guard: redirect to signup if not authenticated
  useEffect(() => {
    const token = localStorage.getItem("roadsos_token");
    if (!token) {
      router.replace("/signup");
      return;
    }
    try {
      const auth = JSON.parse(localStorage.getItem("roadsos_auth") || "{}");
      if (auth.role !== "admin") {
        router.replace("/user");
      }
    } catch {
      router.replace("/signup");
    }
  }, [router]);

  const [alerts, setAlerts] = useState<SOSAlertData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [newAlertFlash, setNewAlertFlash] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const prevCountRef = useRef(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "sse" | "polling">("connecting");
  const [currentTime, setCurrentTime] = useState(0);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/sos/alerts");
      if (res.ok) {
        const data = await res.json();
        const newAlerts: SOSAlertData[] = data.alerts || [];

        if (
          prevCountRef.current > 0 &&
          newAlerts.length > prevCountRef.current
        ) {
          setNewAlertFlash(true);
          setTimeout(() => setNewAlertFlash(false), 3000);
        }
        prevCountRef.current = newAlerts.length;
        setAlerts(newAlerts);
      }
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // SSE real-time connection + fallback polling
  useEffect(() => {
    const initialFetch = setTimeout(fetchAlerts, 0);

    let eventSource: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    try {
      eventSource = new EventSource("/api/sse/alerts");

      eventSource.onopen = () => {
        setConnectionStatus("sse");
        // With SSE active, use slow polling as backup (every 30s)
        fallbackInterval = setInterval(fetchAlerts, 30000);
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === "connected" || payload.type === "heartbeat") return;

          // Any real event → re-fetch alerts immediately
          if (["new_alert", "alert_updated", "alert_escalated", "alert_resolved", "survey_submitted"].includes(payload.type)) {
            fetchAlerts();

            // Flash for new alerts and escalations
            if (payload.type === "new_alert" || payload.type === "alert_escalated") {
              setNewAlertFlash(true);
              setTimeout(() => setNewAlertFlash(false), 3000);
            }
          }
        } catch {
          // Ignore parse errors (heartbeat comments etc)
        }
      };

      eventSource.onerror = () => {
        setConnectionStatus("polling");
        eventSource?.close();
        // Fall back to fast polling
        if (fallbackInterval) clearInterval(fallbackInterval);
        fallbackInterval = setInterval(fetchAlerts, 5000);
      };
    } catch {
      // SSE not supported, use polling
      setTimeout(() => setConnectionStatus("polling"), 0);
      fallbackInterval = setInterval(fetchAlerts, 5000);
    }

    return () => {
      clearTimeout(initialFetch);
      eventSource?.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [fetchAlerts]);

  useEffect(() => {
    const updateClock = () => setCurrentTime(Date.now());
    const initialClock = setTimeout(updateClock, 0);
    const clockInterval = setInterval(updateClock, 30000);

    return () => {
      clearTimeout(initialClock);
      clearInterval(clockInterval);
    };
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/sos/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchAlerts();
    } catch (err) {
      console.error("Failed to update:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const activeCount = alerts.filter((a) => a.status === "active").length;
  const respondingCount = alerts.filter(
    (a) => a.status === "responding"
  ).length;
  const resolvedCount = alerts.filter((a) => a.status === "resolved").length;
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const escalatedCount = alerts.filter((a) => a.escalatedToCritical).length;
  const gpsLiveCount = alerts.filter(
    (a) => a.liveLocation && a.status !== "resolved"
  ).length;
  const latestAlert = alerts[0];
  const query = searchQuery.trim().toLowerCase();
  const filteredAlerts = alerts.filter((alert) => {
    const matchesStatus =
      statusFilter === "all" || alert.status === statusFilter;
    if (!matchesStatus) return false;
    if (!query) return true;

    const searchable = [
      alert.user.name,
      alert.user.phone,
      alert.user.vehicleNumber,
      alert.user.vehicleType,
      alert.severity,
      alert.status,
      alert.nearestHospital?.name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(query);
  });

  const filterOptions = [
    { id: "all", label: "All", count: alerts.length, activeClass: "bg-white/10 text-white border-white/20 shadow-lg shadow-white/5" },
    { id: "active", label: "Active", count: activeCount, activeClass: "bg-red-500/15 text-red-400 border-red-500/25 shadow-lg shadow-red-500/10" },
    { id: "responding", label: "Responding", count: respondingCount, activeClass: "bg-amber-500/15 text-amber-400 border-amber-500/25 shadow-lg shadow-amber-500/10" },
    { id: "resolved", label: "Resolved", count: resolvedCount, activeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 shadow-lg shadow-emerald-500/10" },
  ];

  const statCards = [
    { label: "Total", value: alerts.length, helper: "alerts logged", statColor: "rgba(255,255,255,0.26)", textClass: "bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent" },
    { label: "Active", value: activeCount, helper: "needs triage", statColor: "rgba(255,48,79,0.64)", textClass: "text-red-400", pulse: activeCount > 0 },
    { label: "Responding", value: respondingCount, helper: "teams moving", statColor: "rgba(245,158,11,0.64)", textClass: "text-amber-400" },
    { label: "Critical", value: criticalCount, helper: "highest risk", statColor: "rgba(244,63,94,0.64)", textClass: "text-rose-400", pulse: criticalCount > 0 },
    { label: "GPS Live", value: gpsLiveCount, helper: "tracking now", statColor: "rgba(34,197,94,0.64)", textClass: "text-emerald-400", pulse: gpsLiveCount > 0 },
  ];

  return (
    <div className="min-h-screen w-full overflow-auto">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-[linear-gradient(180deg,rgba(168,85,247,0.12),rgba(34,211,238,0.045),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(34,211,238,0.04),transparent_34%,rgba(255,48,79,0.05)_74%,transparent)]" />
        {newAlertFlash && (
          <div className="absolute inset-0 bg-red-500/[0.06] animate-pulse" />
        )}
      </div>

      {/* Minimalist Full-Width Header */}
      <div className="relative z-20 w-full border-b border-white/5 bg-black/20 px-6 py-6 backdrop-blur-2xl sm:px-10 animate-fade-in-down flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div className="flex items-center gap-3.5">
            <div>
              <h1 className="text-[17px] font-bold text-white leading-tight tracking-wide" style={{ fontFamily: "Outfit" }}>
                {ADMIN_PROFILE.name}
              </h1>
              <div className="flex items-center gap-2 text-[11px] font-medium tracking-wider uppercase mt-0.5">
                <span className="text-white/40">{ADMIN_PROFILE.role}</span>
                <span className="text-white/10">•</span>
                {connectionStatus === "sse" ? (
                  <span className="text-cyan-400">Live Sync</span>
                ) : connectionStatus === "polling" ? (
                  <span className="text-amber-400">Polling</span>
                ) : (
                  <span className="text-white/30">Connecting</span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Link
            href="/admin/heatmap"
            className="flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium text-white/50 transition-all hover:bg-white/10 hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400/80">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            Live Map
          </Link>
          <button
            onClick={fetchAlerts}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition-all hover:bg-white/10 hover:text-white"
            title="Refresh"
          >
            <svg
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M1 4v6h6" />
              <path d="M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="relative z-10 w-full flex justify-center">
      <div className="w-full max-w-6xl px-5 sm:px-6 pt-8 pb-20">

        {/* Explicit Vertical Spacer */}
        <div style={{ height: '40px', width: '100%' }}></div>

        {/* New alert notification */}
        {newAlertFlash && (
          <div className="mb-4 glass-card p-3.5 border-red-500/30 bg-red-500/10 flex items-center gap-2.5 animate-scale-in">
            <span className="text-lg animate-pulse">🚨</span>
            <span className="text-sm font-semibold text-red-400">
              New SOS Alert Received!
            </span>
            <span className="text-xs text-red-400/50 ml-auto">Just now</span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6 animate-fade-in-up delay-100 sm:grid-cols-3 lg:grid-cols-5" style={{ animationFillMode: "both" }}>
          {statCards.map((s) => (
            <div key={s.label} className="stat-card min-h-[130px] p-5 flex flex-col items-center justify-center text-center" style={{ "--stat-color": s.statColor } as React.CSSProperties}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50" style={{ fontFamily: "Outfit" }}>{s.label}</p>
              <div className="flex items-center justify-center gap-2 my-1">
                <p className={`text-4xl font-bold ${s.textClass}`} style={{ fontFamily: "Outfit" }}>{s.value}</p>
                {s.pulse && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-dot-pulse" />}
              </div>
              <p className="mt-2 text-[11px] text-white/40">{s.helper}</p>
            </div>
          ))}
        </div>

        {/* Explicit Vertical Spacer */}
        <div style={{ height: '32px', width: '100%' }}></div>

        {/* Search + Filter */}
        <div className="mb-10 flex flex-col gap-6 animate-fade-in-up delay-200 lg:flex-row lg:items-center" style={{ animationFillMode: "both" }}>
          <div 
            className="relative flex flex-1 items-center gap-4 rounded-[20px] bg-white/[0.03] border border-white/[0.08] transition-all focus-within:bg-white/[0.05] focus-within:border-cyan-500/40 focus-within:shadow-[0_0_20px_rgba(34,211,238,0.1)] lg:mr-6 mb-4 lg:mb-0"
            style={{ padding: '14px 22px' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400 shrink-0">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search alerts by name, phone, vehicle, or severity..."
              className="min-w-0 flex-1 bg-transparent text-[15px] text-white placeholder-white/40 outline-none font-medium leading-relaxed"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="rounded-full bg-white/10 p-2 text-white/60 transition-colors hover:bg-white/20 hover:text-white shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar p-1">
            {filterOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setStatusFilter(option.id)}
                className={`group flex items-center gap-2.5 whitespace-nowrap rounded-[18px] border text-[13px] font-bold transition-all duration-300 cursor-pointer ${
                  statusFilter === option.id
                    ? option.activeClass
                    : "bg-white/[0.03] border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.08] hover:border-white/20 shadow-lg shadow-black/20"
                }`}
                style={{ fontFamily: "Outfit", padding: '14px 22px' }}
              >
                {option.label}
                <span className={`flex items-center justify-center min-w-[24px] h-6 rounded-md px-1.5 text-[11px] transition-colors ${
                  statusFilter === option.id 
                    ? "bg-black/20 text-current" 
                    : "bg-white/10 text-white/70 group-hover:bg-white/20"
                }`}>
                  {option.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {latestAlert && (
          <div className="mb-5 flex flex-wrap items-center gap-2 text-[11px] text-white/35">
            <span className="rounded-full border border-cyan-400/15 bg-cyan-400/[0.055] px-3 py-1 text-cyan-300/70">
              Latest: {latestAlert.user.name} | {timeAgo(latestAlert.createdAt, currentTime)}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">
              Showing {filteredAlerts.length} of {alerts.length}
            </span>
          </div>
        )}

        {/* Explicit Vertical Spacer */}
        <div style={{ height: '32px', width: '100%' }}></div>

        {/* Alerts List */}
        <div className="space-y-4">
          {loading && alerts.length === 0 && (
            <div className="text-center py-20 animate-fade-in">
              <div className="inline-block w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm text-white/40">Connecting to database...</p>
            </div>
          )}

          {!loading && alerts.length === 0 && (
            <div 
              className="flex flex-col items-center justify-center text-center animate-fade-in-up border border-dashed border-white/10 rounded-[28px] bg-gradient-to-b from-white/[0.03] to-transparent"
              style={{ padding: '64px 20px' }}
            >
              <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-white/10 shadow-[0_0_30px_rgba(168,85,247,0.12)]">
                <div className="absolute inset-0 rounded-[1.5rem] bg-black/40 backdrop-blur-sm" />
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="relative z-10 text-cyan-300">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "Outfit" }}>Command Center Ready</h3>
              <p className="text-white/40 text-[13px] max-w-sm mx-auto leading-relaxed">
                System is fully operational and monitoring for emergency signals. 
                New SOS alerts will appear here instantly.
              </p>
            </div>
          )}

          {!loading && alerts.length > 0 && filteredAlerts.length === 0 && (
            <div 
              className="flex flex-col items-center justify-center text-center animate-fade-in-up border border-dashed border-white/10 rounded-[28px] bg-white/[0.02]"
              style={{ padding: '64px 20px' }}
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-white/[0.05] border border-white/10">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <h3 className="text-[17px] font-bold text-white/80 mb-1.5" style={{ fontFamily: "Outfit" }}>No alerts found</h3>
              <p className="text-[13px] text-white/40">Try adjusting your search terms or status filters</p>
            </div>
          )}

          {filteredAlerts.map((alert, index) => {
            const cfg = statusConfig[alert.status];
            const isExpanded = expandedId === alert._id;
            const lat = alert.location.coordinates[1];
            const lng = alert.location.coordinates[0];
            const responseAge = timeAgo(alert.createdAt, currentTime);

            return (
              <div
                key={alert._id}
                className={`alert-card ${cfg.cardClass} animate-fade-in-up relative`}
                style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
              >
                <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${cfg.accent}`} />
                {/* Alert header */}
                <div
                  className="px-5 py-5 sm:px-6 cursor-pointer hover:bg-white/[0.035] transition-colors"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : alert._id)
                  }
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between mb-4">
                    <div className="flex min-w-0 items-center gap-5">
                      <div
                        className={`w-14 h-14 shrink-0 rounded-2xl ${cfg.bg} border ${cfg.border} ${cfg.ring} ring-4 flex items-center justify-center text-2xl transition-all`}
                      >
                        {alert.status === "active"
                          ? "🚨"
                          : alert.status === "responding"
                            ? "📡"
                            : "✅"}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xl font-bold leading-tight" style={{ fontFamily: "Outfit" }}>
                          {alert.user.name}
                        </h3>
                        <p className="text-xs text-white/40 flex flex-wrap items-center gap-2 mt-1.5">
                          <span>{alert.user.phone}</span>
                          <span className="text-white/15">·</span>
                          <span>{responseAge}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 self-start">
                      <span
                        className={`text-[11px] px-3 py-1.5 rounded-full font-bold ${cfg.bg} ${cfg.color} ${cfg.border} border flex items-center gap-1.5`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${alert.status === "active" ? "animate-dot-pulse" : ""}`}
                        />
                        {cfg.label}
                      </span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`text-white/20 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </div>
                  </div>

                  {/* Quick info row */}
                  <div className="mt-5 grid gap-2 text-xs text-white/42 sm:ml-[4.25rem] sm:grid-cols-2 lg:grid-cols-4">
                    <span className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2">
                      <span className="text-red-400/60">🩸</span>{" "}
                      {alert.survey?.bloodGroup || alert.user.bloodGroup || "N/A"}
                    </span>
                    <span className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2">
                      <span className="text-amber-400/60">🚗</span>{" "}
                      {alert.user.vehicleNumber || "N/A"}
                    </span>
                    <span className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 font-mono text-[11px]">
                      <span className="text-blue-400/60">📍</span>{" "}
                      {lat.toFixed(4)}, {lng.toFixed(4)}
                    </span>
                    <span className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2">
                      <span className="text-red-400/60">⚠️</span>{" "}
                      {alert.severity}
                    </span>
                    {alert.escalatedToCritical && (
                      <span className="flex items-center gap-1 text-red-400 font-bold animate-pulse">
                        🚨 ESCALATED
                      </span>
                    )}
                    {alert.canSelfReach === true && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        ✅ Can self-reach
                      </span>
                    )}
                    {alert.survey && (
                      <span className="flex items-center gap-1 text-cyan-400">
                        📋 Survey filled
                      </span>
                    )}
                    {alert.liveLocation && alert.status !== "resolved" && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-dot-pulse" />
                        GPS Live
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] p-5 sm:p-6 bg-white/[0.015] animate-fade-in flex flex-col gap-5">
                    
                    {/* 1. Escalation Banner (Top priority, full width) */}
                    {alert.escalatedToCritical && (
                      <div className="glass-card p-4 sm:p-5 border-red-500/30 bg-red-500/[0.06] animate-border-glow flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 shadow-lg shadow-red-500/10">
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-2xl animate-pulse">🚨</span>
                          <h4 className="text-sm text-red-400 font-bold uppercase tracking-wider" style={{ fontFamily: "Outfit" }}>Critical Escalation</h4>
                        </div>
                        <p className="text-xs text-red-100/70 leading-relaxed sm:border-l border-red-500/20 sm:pl-4">
                          User did not confirm they could reach hospital within 10 seconds. Situation auto-escalated to CRITICAL.
                        </p>
                      </div>
                    )}

                    {/* 2. Top Info Bar (Location & Timeline) */}
                    <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white/[0.02] p-4 rounded-[1.25rem] border border-white/[0.06] shadow-inner">
                      <div>
                        <h4 className="text-[10px] text-blue-400/70 uppercase tracking-[0.15em] mb-2 font-bold" style={{ fontFamily: "Outfit" }}>
                          📍 Exact Location
                        </h4>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs text-white/70 font-mono bg-white/[0.05] px-2.5 py-1.5 rounded-lg border border-white/5">
                            {lat.toFixed(6)}, {lng.toFixed(6)}
                          </span>
                          <a
                            href={`https://www.google.com/maps?q=${lat},${lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg border border-blue-500/15"
                          >
                            Open Maps ↗
                          </a>
                        </div>
                      </div>
                      <div className="sm:text-right">
                        <h4 className="text-[10px] text-purple-400/70 uppercase tracking-[0.15em] mb-2 font-bold" style={{ fontFamily: "Outfit" }}>
                          🕐 Timeline
                        </h4>
                        <div className="flex flex-col gap-1 text-xs text-white/60">
                          <p><span className="text-white/30 mr-1">Created:</span> {new Date(alert.createdAt).toLocaleString()}</p>
                          {alert.resolvedAt && (
                            <p><span className="text-emerald-400/50 mr-1">Resolved:</span> <span className="text-emerald-400">{new Date(alert.resolvedAt).toLocaleString()}</span></p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 3. Main Data Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      
                      {/* Live GPS Tracking (Spans 2 columns if present) */}
                      {alert.liveLocation && alert.status !== "resolved" && (
                        <div className="glass-card p-5 border-emerald-500/20 bg-emerald-500/[0.04] md:col-span-2 shadow-lg shadow-emerald-500/5">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                            <h4 className="text-[11px] text-emerald-400/90 uppercase tracking-[0.15em] font-bold flex items-center gap-2" style={{ fontFamily: "Outfit" }}>
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-dot-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                              📡 Live Tracking
                            </h4>
                            <span className="text-[10px] font-medium text-emerald-400/60 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              {(() => {
                                const secs = Math.floor(((currentTime || new Date(alert.liveLocation.updatedAt).getTime()) - new Date(alert.liveLocation.updatedAt).getTime()) / 1000);
                                return secs < 10 ? "Just now" : secs < 60 ? `${secs}s ago` : `${Math.floor(secs / 60)}m ago`;
                              })()}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 text-xs text-white/60 bg-black/20 p-3.5 rounded-xl border border-white/5">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Speed</span>
                              <span className="text-white/90 font-medium">{alert.liveLocation.speed != null ? `${(alert.liveLocation.speed * 3.6).toFixed(1)} km/h` : "—"}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Heading</span>
                              <span className="text-white/90 font-medium">{alert.liveLocation.heading != null ? `${alert.liveLocation.heading.toFixed(0)}°` : "—"}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Position</span>
                              <span className="text-emerald-400 font-mono text-[10px]">{alert.liveLocation.lat.toFixed(4)}, {alert.liveLocation.lng.toFixed(4)}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">History</span>
                              <span className="text-white/90 font-medium">{alert.locationHistory?.length || 0} pts</span>
                            </div>
                          </div>
                          <div className="mt-4">
                            <a
                              href={`https://www.google.com/maps?q=${alert.liveLocation.lat},${alert.liveLocation.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 hover:bg-emerald-500/20 transition-all shadow-lg shadow-emerald-500/10"
                            >
                              📍 Track Live ↗
                            </a>
                          </div>
                        </div>
                      )}

                      {/* GPS Ended */}
                      {alert.liveLocation && alert.status === "resolved" && (
                        <div className="glass-card p-5 md:col-span-2">
                          <h4 className="text-[11px] text-white/40 uppercase tracking-[0.15em] mb-3 font-bold" style={{ fontFamily: "Outfit" }}>
                            📡 GPS Tracking (Ended)
                          </h4>
                          <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5 text-xs text-white/50">
                            Last known: <span className="font-mono text-white/70">{alert.liveLocation.lat.toFixed(6)}, {alert.liveLocation.lng.toFixed(6)}</span> · {alert.locationHistory?.length || 0} trail points recorded
                          </div>
                        </div>
                      )}

                      {/* Survey Data (Spans 2 columns if present) */}
                      {alert.survey && (
                        <div className="glass-card p-5 md:col-span-2 shadow-lg shadow-cyan-500/5 border-cyan-500/10">
                          <h4 className="text-[11px] text-cyan-400/80 uppercase tracking-[0.15em] mb-4 font-bold flex items-center gap-2" style={{ fontFamily: "Outfit" }}>
                            📋 Injury Assessment
                          </h4>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex justify-between items-center">
                              <span className="text-white/40 font-medium">Severity</span>
                              <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${alert.survey.injuryLevel === 'severe' ? 'bg-red-500/20 text-red-400' : alert.survey.injuryLevel === 'moderate' ? 'bg-amber-500/20 text-amber-400' : alert.survey.injuryLevel === 'minor' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{alert.survey.injuryLevel}</span>
                            </div>
                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex justify-between items-center">
                              <span className="text-white/40 font-medium">Ambulance</span>
                              <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${alert.survey.needAmbulance ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-emerald-500/20 text-emerald-400'}`}>{alert.survey.needAmbulance ? 'NEEDED' : 'Not Req'}</span>
                            </div>
                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex justify-between items-center">
                              <span className="text-white/40 font-medium">Can Drive</span>
                              <span className={`font-medium ${alert.survey.canDrive ? 'text-emerald-400' : 'text-red-400'}`}>{alert.survey.canDrive ? 'Yes' : 'No'}</span>
                            </div>
                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex justify-between items-center">
                              <span className="text-white/40 font-medium">Patients</span>
                              <span className="text-white/90 font-bold bg-white/10 px-2 py-0.5 rounded">{alert.survey.numberOfPatients}</span>
                            </div>
                            {alert.survey.description && (
                              <div className="col-span-2 bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                <span className="block text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-1">Notes</span>
                                <span className="text-white/70 italic text-[11px] leading-relaxed">{alert.survey.description}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* User Details */}
                      <div className="glass-card p-5">
                        <h4 className="text-[11px] text-blue-400/80 uppercase tracking-[0.15em] mb-4 font-bold" style={{ fontFamily: "Outfit" }}>
                          👤 User Profile
                        </h4>
                        <div className="flex flex-col gap-3 text-xs text-white/70">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <span className="text-white/30 font-medium">Name</span>
                            <span className="font-semibold text-white/90">{alert.user.name}</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <span className="text-white/30 font-medium">Phone</span>
                            <span className="font-medium text-white/80">{alert.user.phone}</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <span className="text-white/30 font-medium">Blood</span>
                            <span className="text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded">{alert.user.bloodGroup || "N/A"}</span>
                          </div>
                          <div className="flex items-center justify-between pt-0.5">
                            <span className="text-white/30 font-medium">Vehicle</span>
                            <span className="text-white/80 text-[11px]">{alert.user.vehicleType || "Unknown"} <span className="text-white/30 mx-1">·</span> <span className="font-mono text-cyan-400/80">{alert.user.vehicleNumber || "N/A"}</span></span>
                          </div>
                        </div>
                      </div>

                      {/* Emergency Contacts */}
                      <div className="glass-card p-5">
                        <h4 className="text-[11px] text-amber-400/80 uppercase tracking-[0.15em] mb-4 font-bold" style={{ fontFamily: "Outfit" }}>
                          📱 Emergency Contacts
                        </h4>
                        <div className="flex flex-col gap-3 text-xs text-white/70">
                          {alert.user.emergencyContacts.length > 0 ? (
                            alert.user.emergencyContacts.map((ec, i) => (
                              <div key={i} className="flex items-center justify-between bg-white/[0.02] p-2.5 rounded-xl border border-white/5 hover:bg-white/[0.04] transition-colors">
                                <div>
                                  <p className="font-bold text-white/80">{ec.name}</p>
                                  <p className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wider">{ec.relation}</p>
                                </div>
                                <a href={`tel:${ec.phone}`} className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 hover:scale-110 transition-all border border-emerald-500/20" title={`Call ${ec.phone}`}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                </a>
                              </div>
                            ))
                          ) : (
                            <div className="h-full flex items-center justify-center p-4 border border-dashed border-white/10 rounded-xl">
                              <p className="text-white/30 italic">No contacts listed</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Nearest Hospital */}
                      {alert.nearestHospital && (
                        <div className="glass-card p-5">
                          <h4 className="text-[11px] text-rose-400/80 uppercase tracking-[0.15em] mb-4 font-bold flex items-center gap-2" style={{ fontFamily: "Outfit" }}>
                            🏥 Nearest Hospital
                          </h4>
                          <div className="flex flex-col gap-3">
                            <p className="font-bold text-white/90 text-sm leading-snug" style={{ fontFamily: "Outfit" }}>{alert.nearestHospital.name}</p>
                            <div className="flex items-center gap-3 text-[11px] font-medium">
                              <span className="bg-white/10 text-white/70 px-2.5 py-1 rounded-md">{alert.nearestHospital.distance} km</span>
                              <span className="bg-rose-500/15 text-rose-300 px-2.5 py-1 rounded-md border border-rose-500/20">~{alert.nearestHospital.eta} min ETA</span>
                            </div>
                            <div className="mt-2">
                              <a href={`https://www.google.com/maps?q=${alert.nearestHospital.lat},${alert.nearestHospital.lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-3.5 py-2 rounded-xl border border-blue-500/15 hover:bg-blue-500/20 w-full justify-center">
                                View Route on Map ↗
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 4. Action buttons */}
                    <div className="flex flex-wrap sm:flex-nowrap gap-3 pt-3 border-t border-white/[0.04] mt-2">
                      {alert.status === "active" && (
                        <button
                          onClick={() => updateStatus(alert._id, "responding")}
                          disabled={updatingId === alert._id}
                          className="flex-[2] sm:flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[13px] font-bold rounded-[14px] hover:opacity-90 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:translate-y-0 shadow-xl shadow-amber-600/20"
                          style={{ fontFamily: "Outfit" }}
                        >
                          {updatingId === alert._id ? "Updating..." : "📡 Mark Responding"}
                        </button>
                      )}
                      {(alert.status === "active" || alert.status === "responding") && (
                        <button
                          onClick={() => updateStatus(alert._id, "resolved")}
                          disabled={updatingId === alert._id}
                          className="flex-[2] sm:flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[13px] font-bold rounded-[14px] hover:opacity-90 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:translate-y-0 shadow-xl shadow-emerald-600/20"
                          style={{ fontFamily: "Outfit" }}
                        >
                          {updatingId === alert._id ? "Updating..." : "✅ Mark Resolved"}
                        </button>
                      )}
                      <a
                        href={`tel:${alert.user.phone}`}
                        className="flex-1 py-3 bg-white/[0.04] text-white/80 text-[13px] font-bold rounded-[14px] hover:bg-white/[0.08] hover:-translate-y-0.5 transition-all border border-white/[0.08] hover:border-white/20 text-center flex items-center justify-center gap-2"
                        style={{ fontFamily: "Outfit" }}
                      >
                        📞 Call User
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}
