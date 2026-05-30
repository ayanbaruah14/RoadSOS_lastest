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
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    ring: "ring-red-500/10",
    label: "ACTIVE",
    dot: "bg-red-400",
    accent: "from-red-500 to-red-400",
    barColor: "#f87171",
  },
  responding: {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    ring: "ring-amber-500/10",
    label: "RESPONDING",
    dot: "bg-amber-400",
    accent: "from-amber-500 to-amber-400",
    barColor: "#fbbf24",
  },
  resolved: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    ring: "ring-emerald-500/10",
    label: "RESOLVED",
    dot: "bg-emerald-400",
    accent: "from-emerald-500 to-emerald-400",
    barColor: "#34d399",
  },
};

function timeAgo(dateStr: string, now: number): string {
  if (!now) return "--";
  const seconds = Math.floor((now - new Date(dateStr).getTime()) / 1000);
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

  useEffect(() => {
    const auth = localStorage.getItem("roadsos_auth");
    if (!auth) {
      router.replace("/signup");
      return;
    }
    const user = JSON.parse(auth);
    if (user.role !== "admin") {
      router.replace("/user");
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
        if (prevCountRef.current > 0 && newAlerts.length > prevCountRef.current) {
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

  useEffect(() => {
    const initialFetch = setTimeout(fetchAlerts, 0);
    let eventSource: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;
    try {
      eventSource = new EventSource("/api/sse/alerts");
      eventSource.onopen = () => {
        setConnectionStatus("sse");
        fallbackInterval = setInterval(fetchAlerts, 30000);
      };
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "connected" || payload.type === "heartbeat") return;
          if (["new_alert", "alert_updated", "alert_escalated", "alert_resolved", "survey_submitted"].includes(payload.type)) {
            fetchAlerts();
            if (payload.type === "new_alert" || payload.type === "alert_escalated") {
              setNewAlertFlash(true);
              setTimeout(() => setNewAlertFlash(false), 3000);
            }
          }
        } catch {}
      };
      eventSource.onerror = () => {
        setConnectionStatus("polling");
        eventSource?.close();
        if (fallbackInterval) clearInterval(fallbackInterval);
        fallbackInterval = setInterval(fetchAlerts, 5000);
      };
    } catch {
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
  const respondingCount = alerts.filter((a) => a.status === "responding").length;
  const resolvedCount = alerts.filter((a) => a.status === "resolved").length;
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const gpsLiveCount = alerts.filter((a) => a.liveLocation && a.status !== "resolved").length;
  const latestAlert = alerts[0];
  const query = searchQuery.trim().toLowerCase();
  const filteredAlerts = alerts.filter((alert) => {
    const matchesStatus = statusFilter === "all" || alert.status === statusFilter;
    if (!matchesStatus) return false;
    if (!query) return true;
    const searchable = [
      alert.user.name, alert.user.phone, alert.user.vehicleNumber,
      alert.user.vehicleType, alert.severity, alert.status, alert.nearestHospital?.name,
    ].filter(Boolean).join(" ").toLowerCase();
    return searchable.includes(query);
  });

  const filterOptions = [
    { id: "all", label: "All", count: alerts.length },
    { id: "active", label: "Active", count: activeCount },
    { id: "responding", label: "Responding", count: respondingCount },
    { id: "resolved", label: "Resolved", count: resolvedCount },
  ];

  const statCards = [
    { label: "Total", value: alerts.length, helper: "alerts logged", color: "#94a3b8" },
    { label: "Active", value: activeCount, helper: "needs triage", color: "#f87171", pulse: activeCount > 0 },
    { label: "Responding", value: respondingCount, helper: "teams moving", color: "#fbbf24" },
    { label: "Critical", value: criticalCount, helper: "highest risk", color: "#fb923c", pulse: criticalCount > 0 },
    { label: "GPS Live", value: gpsLiveCount, helper: "tracking now", color: "#34d399", pulse: gpsLiveCount > 0 },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        :root {
          --bg-base: #080a0f;
          --bg-surface: #0d1017;
          --bg-elevated: #121620;
          --bg-overlay: #171c28;
          --border-subtle: rgba(255,255,255,0.055);
          --border-default: rgba(255,255,255,0.09);
          --border-strong: rgba(255,255,255,0.15);
          --text-primary: #e2e8f0;
          --text-secondary: #94a3b8;
          --text-muted: #475569;
          --text-faint: #2d3748;
          --accent-cyan: #22d3ee;
          --accent-cyan-dim: rgba(34,211,238,0.15);
          --font-display: 'Syne', sans-serif;
          --font-body: 'DM Sans', sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
        }

        * { box-sizing: border-box; }

        .mp-page {
          min-height: 100vh;
          background: var(--bg-base);
          font-family: var(--font-body);
          color: var(--text-primary);
        }

        /* Subtle grid texture */
        .mp-page::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
          z-index: 0;
        }

        /* Top glow */
        .mp-page::after {
          content: '';
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(34,211,238,0.4), transparent);
          z-index: 100;
        }

        /* ── HEADER ── */
        .mp-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(8,10,15,0.92);
          backdrop-filter: blur(24px);
          border-bottom: 1px solid var(--border-subtle);
          padding: 0 32px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .mp-header-left { display: flex; align-items: center; gap: 16px; }
        .mp-header-right { display: flex; align-items: center; gap: 8px; }

        .mp-back-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px; height: 32px;
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          text-decoration: none;
          transition: all 0.15s;
          background: transparent;
        }
        .mp-back-btn:hover {
          border-color: var(--border-default);
          color: var(--text-primary);
          background: var(--bg-elevated);
        }

        .mp-divider-v {
          width: 1px; height: 20px;
          background: var(--border-subtle);
        }

        .mp-brand {
          display: flex; flex-direction: column; gap: 2px;
        }
        .mp-brand-name {
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: 0.01em;
          line-height: 1;
        }
        .mp-brand-sub {
          display: flex; align-items: center; gap: 6px;
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--text-muted);
          letter-spacing: 0.08em;
        }
        .mp-conn-dot {
          width: 5px; height: 5px; border-radius: 50%;
        }
        .mp-conn-dot.sse { background: #34d399; box-shadow: 0 0 6px #34d399; animation: pulse 2s infinite; }
        .mp-conn-dot.polling { background: #fbbf24; box-shadow: 0 0 6px #fbbf24; }
        .mp-conn-dot.connecting { background: var(--text-faint); }

        .mp-header-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
          background: transparent;
          color: var(--text-secondary);
          font-family: var(--font-body);
          font-size: 12px;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.15s;
        }
        .mp-header-btn:hover {
          border-color: var(--border-default);
          color: var(--text-primary);
          background: var(--bg-elevated);
        }

        .mp-icon-btn {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px;
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.15s;
        }
        .mp-icon-btn:hover {
          border-color: var(--border-default);
          color: var(--text-primary);
          background: var(--bg-elevated);
        }

        /* ── LAYOUT ── */
        .mp-content {
          position: relative;
          z-index: 1;
          max-width: 1120px;
          margin: 0 auto;
          padding: 40px 24px 80px;
        }

        /* ── FLASH BANNER ── */
        .mp-flash {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px;
          margin-bottom: 20px;
          border-radius: 10px;
          border: 1px solid rgba(248,113,113,0.25);
          background: rgba(248,113,113,0.06);
          animation: slideDown 0.2s ease;
        }
        .mp-flash-text { font-size: 13px; font-weight: 600; color: #f87171; }
        .mp-flash-time { font-size: 11px; color: rgba(248,113,113,0.5); margin-left: auto; font-family: var(--font-mono); }

        /* ── STAT CARDS ── */
        .mp-stats {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
          margin-bottom: 32px;
        }
        @media (max-width: 900px) { .mp-stats { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 580px) { .mp-stats { grid-template-columns: repeat(2, 1fr); } }

        .mp-stat {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 6px;
          transition: border-color 0.2s;
          position: relative;
          overflow: hidden;
        }
        .mp-stat::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: var(--stat-accent);
          opacity: 0.5;
        }
        .mp-stat:hover { border-color: var(--border-default); }
        .mp-stat-label {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .mp-stat-value {
          font-family: var(--font-body);
          font-size: 34px;
          font-weight: 600;
          line-height: 1;
          color: var(--stat-color);
          letter-spacing: -0.01em;
        }
        .mp-stat-helper {
          font-size: 10px;
          color: var(--text-muted);
          letter-spacing: 0.02em;
        }
        .mp-pulse-dot {
          display: inline-block;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: currentColor;
          animation: pulse 1.5s infinite;
          vertical-align: middle;
          margin-left: 4px;
        }

        /* ── SEARCH + FILTER ── */
        .mp-toolbar {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          align-items: center;
          flex-wrap: wrap;
        }

        .mp-search {
          flex: 1;
          min-width: 240px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
          padding: 10px 14px;
          transition: all 0.15s;
        }
        .mp-search:focus-within {
          border-color: rgba(34,211,238,0.35);
          box-shadow: 0 0 0 3px rgba(34,211,238,0.06);
        }
        .mp-search input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-family: var(--font-body);
          font-size: 13px;
          color: var(--text-primary);
          min-width: 0;
        }
        .mp-search input::placeholder { color: var(--text-muted); }
        .mp-search-clear {
          display: flex; align-items: center; justify-content: center;
          width: 22px; height: 22px;
          border-radius: 6px;
          border: 1px solid var(--border-subtle);
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .mp-search-clear:hover { background: var(--bg-elevated); color: var(--text-primary); }

        .mp-filters {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .mp-filter-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
          background: transparent;
          color: var(--text-secondary);
          font-family: var(--font-body);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .mp-filter-btn:hover { border-color: var(--border-default); color: var(--text-primary); background: var(--bg-elevated); }
        .mp-filter-btn.active-all { border-color: rgba(255,255,255,0.2); background: var(--bg-elevated); color: var(--text-primary); }
        .mp-filter-btn.active-active { border-color: rgba(248,113,113,0.3); background: rgba(248,113,113,0.08); color: #f87171; }
        .mp-filter-btn.active-responding { border-color: rgba(251,191,36,0.3); background: rgba(251,191,36,0.08); color: #fbbf24; }
        .mp-filter-btn.active-resolved { border-color: rgba(52,211,153,0.3); background: rgba(52,211,153,0.08); color: #34d399; }
        .mp-filter-count {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 20px; height: 18px;
          padding: 0 5px;
          border-radius: 4px;
          background: rgba(255,255,255,0.07);
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 600;
          color: var(--text-muted);
        }

        /* ── META ROW ── */
        .mp-meta {
          display: flex; flex-wrap: wrap; gap: 8px;
          margin-bottom: 24px;
          align-items: center;
        }
        .mp-meta-badge {
          font-family: var(--font-mono);
          font-size: 10px;
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          background: var(--bg-surface);
        }
        .mp-meta-badge.cyan { border-color: rgba(34,211,238,0.15); color: rgba(34,211,238,0.65); background: rgba(34,211,238,0.05); }

        /* ── EMPTY STATES ── */
        .mp-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; text-align: center;
          padding: 80px 24px;
          border: 1px dashed var(--border-subtle);
          border-radius: 16px;
          background: var(--bg-surface);
        }
        .mp-empty-icon {
          width: 56px; height: 56px;
          border-radius: 14px;
          border: 1px solid var(--border-default);
          background: var(--bg-elevated);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 16px;
          color: var(--text-muted);
        }
        .mp-empty h3 { font-family: var(--font-display); font-size: 17px; font-weight: 700; margin: 0 0 6px; }
        .mp-empty p { font-size: 13px; color: var(--text-muted); max-width: 300px; line-height: 1.6; margin: 0; }

        /* ── SPINNER ── */
        .mp-loading {
          text-align: center; padding: 80px 0;
        }
        .mp-spinner {
          display: inline-block;
          width: 28px; height: 28px;
          border: 2px solid var(--border-default);
          border-top-color: var(--accent-cyan);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 12px;
        }
        .mp-loading p { font-size: 12px; color: var(--text-muted); font-family: var(--font-mono); }

        /* ── ALERT CARD ── */
        .mp-alert-list { display: flex; flex-direction: column; gap: 8px; }

        .mp-alert {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 14px;
          overflow: hidden;
          transition: border-color 0.15s;
          position: relative;
        }
        .mp-alert:hover { border-color: var(--border-default); }
        .mp-alert.status-active { border-left: 3px solid #f87171; }
        .mp-alert.status-responding { border-left: 3px solid #fbbf24; }
        .mp-alert.status-resolved { border-left: 3px solid #34d399; }

        .mp-alert-head {
          padding: 20px 20px 16px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .mp-alert-head:hover { background: rgba(255,255,255,0.018); }

        .mp-alert-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .mp-alert-identity { display: flex; align-items: center; gap: 12px; min-width: 0; }

        .mp-status-icon {
          width: 42px; height: 42px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
          border: 1px solid var(--border-subtle);
          background: var(--bg-elevated);
        }

        .mp-alert-info { min-width: 0; }
        .mp-alert-name {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
        }
        .mp-alert-sub {
          display: flex; align-items: center; gap: 8px;
          margin-top: 4px;
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--text-muted);
        }
        .mp-alert-sub-dot { color: var(--text-faint); }

        .mp-alert-badges { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

        .mp-status-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px;
          border-radius: 6px;
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.1em;
          border: 1px solid;
        }
        .mp-status-badge.active { color: #f87171; border-color: rgba(248,113,113,0.25); background: rgba(248,113,113,0.08); }
        .mp-status-badge.responding { color: #fbbf24; border-color: rgba(251,191,36,0.25); background: rgba(251,191,36,0.08); }
        .mp-status-badge.resolved { color: #34d399; border-color: rgba(52,211,153,0.25); background: rgba(52,211,153,0.08); }

        .mp-chevron {
          color: var(--text-faint);
          transition: transform 0.25s;
          flex-shrink: 0;
        }
        .mp-chevron.open { transform: rotate(180deg); }

        /* Quick info chips */
        .mp-chips {
          display: flex; flex-wrap: wrap; gap: 6px;
        }
        .mp-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 10px;
          border-radius: 6px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-elevated);
          font-size: 11px;
          color: var(--text-secondary);
          white-space: nowrap;
        }
        .mp-chip-icon { font-size: 10px; opacity: 0.7; }
        .mp-chip.live { border-color: rgba(52,211,153,0.2); color: #34d399; background: rgba(52,211,153,0.06); }
        .mp-chip.survey { border-color: rgba(34,211,238,0.2); color: #22d3ee; background: rgba(34,211,238,0.06); }
        .mp-chip.escalated { border-color: rgba(248,113,113,0.2); color: #f87171; background: rgba(248,113,113,0.06); animation: pulse 1.5s infinite; }
        .mp-chip.self-reach { border-color: rgba(52,211,153,0.2); color: #34d399; background: rgba(52,211,153,0.06); }
        .mp-chip-mono { font-family: var(--font-mono); font-size: 10px; }

        /* ── EXPANDED SECTION ── */
        .mp-expand {
          border-top: 1px solid var(--border-subtle);
          padding: 20px;
          background: rgba(0,0,0,0.2);
          display: flex; flex-direction: column; gap: 16px;
          animation: expandIn 0.18s ease;
        }

        @keyframes expandIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Section label */
        .mp-section-label {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 10px;
        }

        /* Grid of detail cards */
        .mp-detail-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        @media (max-width: 800px) { .mp-detail-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 520px) { .mp-detail-grid { grid-template-columns: 1fr; } }

        .mp-detail-card {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
          padding: 16px;
        }
        .mp-detail-card.span2 { grid-column: span 2; }
        @media (max-width: 520px) { .mp-detail-card.span2 { grid-column: span 1; } }

        /* Escalation banner */
        .mp-escalation {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px;
          border-radius: 10px;
          border: 1px solid rgba(248,113,113,0.2);
          background: rgba(248,113,113,0.05);
        }
        .mp-escalation-title {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #f87171;
          white-space: nowrap;
        }
        .mp-escalation-text {
          font-size: 11px;
          color: rgba(248,200,200,0.6);
          line-height: 1.5;
          border-left: 1px solid rgba(248,113,113,0.15);
          padding-left: 12px;
        }

        /* Location row */
        .mp-location-row {
          display: flex; flex-wrap: wrap; align-items: center;
          justify-content: space-between; gap: 12px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
          padding: 14px 16px;
        }
        .mp-location-coords {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-secondary);
          background: var(--bg-overlay);
          padding: 5px 10px;
          border-radius: 6px;
          border: 1px solid var(--border-subtle);
        }
        .mp-maps-link {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 600;
          color: var(--accent-cyan);
          text-decoration: none;
          padding: 5px 10px;
          border-radius: 6px;
          border: 1px solid rgba(34,211,238,0.2);
          background: rgba(34,211,238,0.07);
          transition: all 0.15s;
        }
        .mp-maps-link:hover { background: rgba(34,211,238,0.14); border-color: rgba(34,211,238,0.35); }

        /* Row label */
        .mp-row-label {
          font-family: var(--font-mono);
          font-size: 9px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 2px;
        }

        /* Timeline */
        .mp-timeline {
          text-align: right;
        }
        .mp-timeline-line { font-size: 11px; color: var(--text-muted); }
        .mp-timeline-line span { color: var(--text-secondary); }

        /* Data rows */
        .mp-data-row {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid var(--border-subtle);
          gap: 8px;
        }
        .mp-data-row:last-child { border-bottom: none; padding-bottom: 0; }
        .mp-data-key { font-size: 11px; color: var(--text-muted); flex-shrink: 0; }
        .mp-data-val { font-size: 12px; color: var(--text-secondary); font-weight: 500; text-align: right; }
        .mp-data-val.mono { font-family: var(--font-mono); font-size: 11px; }
        .mp-blood-badge {
          font-family: var(--font-mono); font-size: 11px; font-weight: 700;
          padding: 2px 8px; border-radius: 4px;
          background: rgba(248,113,113,0.1); color: #f87171;
          border: 1px solid rgba(248,113,113,0.2);
        }

        /* Emergency contact row */
        .mp-contact-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-overlay);
          margin-bottom: 6px;
          transition: border-color 0.15s;
        }
        .mp-contact-row:last-child { margin-bottom: 0; }
        .mp-contact-row:hover { border-color: var(--border-default); }
        .mp-contact-name { font-size: 12px; font-weight: 600; color: var(--text-primary); }
        .mp-contact-rel { font-family: var(--font-mono); font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin-top: 2px; }
        .mp-call-btn {
          display: flex; align-items: center; justify-content: center;
          width: 30px; height: 30px;
          border-radius: 8px;
          border: 1px solid rgba(52,211,153,0.2);
          background: rgba(52,211,153,0.08);
          color: #34d399;
          text-decoration: none;
          transition: all 0.15s;
        }
        .mp-call-btn:hover { background: rgba(52,211,153,0.16); border-color: rgba(52,211,153,0.35); transform: scale(1.05); }

        /* Hospital card */
        .mp-hosp-name { font-family: var(--font-display); font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; line-height: 1.3; }
        .mp-hosp-meta { display: flex; gap: 6px; margin-bottom: 10px; }
        .mp-hosp-pill {
          font-family: var(--font-mono); font-size: 10px; font-weight: 600;
          padding: 3px 8px; border-radius: 5px;
        }
        .mp-hosp-pill.dist { background: var(--bg-overlay); color: var(--text-secondary); border: 1px solid var(--border-subtle); }
        .mp-hosp-pill.eta { background: rgba(251,113,133,0.08); color: #fb7185; border: 1px solid rgba(251,113,133,0.2); }

        /* GPS Live card */
        .mp-gps-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 12px;
          flex-wrap: wrap; gap: 8px;
        }
        .mp-gps-label {
          display: flex; align-items: center; gap: 6px;
          font-family: var(--font-mono); font-size: 9px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase; color: #34d399;
        }
        .mp-live-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 8px rgba(52,211,153,0.8);
          animation: pulse 1.5s infinite;
        }
        .mp-gps-age {
          font-family: var(--font-mono); font-size: 9px; font-weight: 500;
          padding: 3px 8px; border-radius: 5px;
          background: rgba(52,211,153,0.08); color: rgba(52,211,153,0.6);
          border: 1px solid rgba(52,211,153,0.15);
        }
        .mp-gps-grid {
          display: grid; grid-template-columns: repeat(4,1fr);
          gap: 8px;
          background: var(--bg-overlay);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 10px;
        }
        @media (max-width: 600px) { .mp-gps-grid { grid-template-columns: repeat(2,1fr); } }
        .mp-gps-cell { display: flex; flex-direction: column; gap: 3px; }
        .mp-gps-key { font-family: var(--font-mono); font-size: 8px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); }
        .mp-gps-val { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
        .mp-gps-val.mono { font-family: var(--font-mono); font-size: 10px; color: #34d399; }

        .mp-track-btn {
          display: inline-flex; align-items: center; gap: 5px;
          font-family: var(--font-mono); font-size: 10px; font-weight: 700;
          padding: 7px 12px; border-radius: 8px;
          border: 1px solid rgba(52,211,153,0.2);
          background: rgba(52,211,153,0.08);
          color: #34d399; text-decoration: none;
          transition: all 0.15s;
        }
        .mp-track-btn:hover { background: rgba(52,211,153,0.16); border-color: rgba(52,211,153,0.35); }

        /* Survey card */
        .mp-survey-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 6px;
        }
        .mp-survey-cell {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 10px;
          border-radius: 7px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-overlay);
          font-size: 11px;
        }
        .mp-survey-key { color: var(--text-muted); }
        .mp-survey-val { font-weight: 600; font-size: 10px; padding: 2px 6px; border-radius: 4px; }
        .mp-survey-val.severe { background: rgba(248,113,113,0.12); color: #f87171; }
        .mp-survey-val.moderate { background: rgba(251,191,36,0.12); color: #fbbf24; }
        .mp-survey-val.minor { background: rgba(96,165,250,0.12); color: #60a5fa; }
        .mp-survey-val.none { background: rgba(52,211,153,0.12); color: #34d399; }
        .mp-survey-val.needed { background: rgba(248,113,113,0.12); color: #f87171; animation: pulse 1.5s infinite; }
        .mp-survey-val.ok { background: rgba(52,211,153,0.12); color: #34d399; }
        .mp-survey-val.yes { color: #34d399; }
        .mp-survey-val.no { color: #f87171; }
        .mp-survey-notes {
          grid-column: span 2;
          padding: 10px;
          border-radius: 7px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-overlay);
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.6;
          font-style: italic;
        }

        /* Action buttons */
        .mp-actions {
          display: flex; gap: 8px; flex-wrap: wrap;
          padding-top: 14px;
          border-top: 1px solid var(--border-subtle);
        }
        .mp-action-btn {
          flex: 1; min-width: 100px;
          padding: 10px 16px;
          border-radius: 9px;
          border: none;
          font-family: var(--font-body);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          text-align: center;
          text-decoration: none;
          display: flex; align-items: center; justify-content: center;
        }
        .mp-action-btn:hover { transform: translateY(-1px); opacity: 0.92; }
        .mp-action-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .mp-action-btn.respond { background: linear-gradient(135deg,#f59e0b,#d97706); color: #000; }
        .mp-action-btn.resolve { background: linear-gradient(135deg,#10b981,#059669); color: #fff; }
        .mp-action-btn.call {
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          color: var(--text-secondary);
        }
        .mp-action-btn.call:hover { border-color: var(--border-strong); color: var(--text-primary); }

        /* ── ANIMATIONS ── */
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .anim-fade-up { animation: fadeUp 0.3s ease both; }
      `}</style>

      <div className="mp-page">
        {/* ── HEADER ── */}
        <header className="mp-header">
          <div className="mp-header-left">
            <Link href="/" className="mp-back-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
            <div className="mp-divider-v" />
            <div className="mp-brand">
              <div className="mp-brand-name">{ADMIN_PROFILE.name}</div>
              <div className="mp-brand-sub">
                <span style={{ color: "var(--text-faint)" }}>{ADMIN_PROFILE.role}</span>
                <span style={{ color: "var(--text-faint)" }}>·</span>
                <span
                  className={`mp-conn-dot ${connectionStatus}`}
                />
                <span>
                  {connectionStatus === "sse" ? "Live" : connectionStatus === "polling" ? "Polling" : "…"}
                </span>
              </div>
            </div>
          </div>

          <div className="mp-header-right">
            <Link href="/admin/heatmap" className="mp-header-btn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "#fb923c" }}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              Live Map
            </Link>
            <button onClick={fetchAlerts} className="mp-icon-btn" title="Refresh">
              <svg className={loading ? "animate-spin" : ""} style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 4v6h6" />
                <path d="M23 20v-6h-6" />
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
              </svg>
            </button>
          </div>
        </header>

        {/* ── CONTENT ── */}
        <div className="mp-content">

          {/* Flash */}
          {newAlertFlash && (
            <div className="mp-flash">
              <span style={{ fontSize: 16 }}>🚨</span>
              <span className="mp-flash-text">New SOS Alert Received</span>
              <span className="mp-flash-time">Just now</span>
            </div>
          )}

          {/* Stats */}
          <div className="mp-stats anim-fade-up">
            {statCards.map((s) => (
              <div
                key={s.label}
                className="mp-stat"
                style={{ "--stat-color": s.color, "--stat-accent": s.color } as React.CSSProperties}
              >
                <div className="mp-stat-label">{s.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div className="mp-stat-value">{s.value}</div>
                  {s.pulse && s.value > 0 && (
                    <span className="mp-pulse-dot" style={{ color: s.color }} />
                  )}
                </div>
                <div className="mp-stat-helper">{s.helper}</div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="mp-toolbar anim-fade-up" style={{ animationDelay: "0.05s" }}>
            <div className="mp-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--accent-cyan)", flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, phone, vehicle, severity…"
              />
              {searchQuery && (
                <button className="mp-search-clear" onClick={() => setSearchQuery("")}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="mp-filters">
              {filterOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setStatusFilter(opt.id)}
                  className={`mp-filter-btn ${statusFilter === opt.id ? `active-${opt.id}` : ""}`}
                >
                  {opt.label}
                  <span className="mp-filter-count">{opt.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Meta */}
          {latestAlert && (
            <div className="mp-meta">
              <span className="mp-meta-badge cyan">
                Latest: {latestAlert.user.name} · {timeAgo(latestAlert.createdAt, currentTime)}
              </span>
              <span className="mp-meta-badge">
                {filteredAlerts.length} / {alerts.length} shown
              </span>
            </div>
          )}

          {/* List */}
          <div className="mp-alert-list">
            {loading && alerts.length === 0 && (
              <div className="mp-loading">
                <div className="mp-spinner" />
                <p>Connecting to database…</p>
              </div>
            )}

            {!loading && alerts.length === 0 && (
              <div className="mp-empty">
                <div className="mp-empty-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h3>Command Center Ready</h3>
                <p>System is fully operational and monitoring for emergency signals. New SOS alerts will appear here instantly.</p>
              </div>
            )}

            {!loading && alerts.length > 0 && filteredAlerts.length === 0 && (
              <div className="mp-empty">
                <div className="mp-empty-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                  </svg>
                </div>
                <h3>No alerts found</h3>
                <p>Try adjusting your search terms or status filters.</p>
              </div>
            )}

            {filteredAlerts.map((alert, index) => {
              const cfg = statusConfig[alert.status];
              const isExpanded = expandedId === alert._id;
              const lat = alert.location.coordinates[1];
              const lng = alert.location.coordinates[0];

              return (
                <div
                  key={alert._id}
                  className={`mp-alert status-${alert.status} anim-fade-up`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Header row */}
                  <div className="mp-alert-head" onClick={() => setExpandedId(isExpanded ? null : alert._id)}>
                    <div className="mp-alert-top">
                      <div className="mp-alert-identity">
                        <div className="mp-status-icon">
                          {alert.status === "active" ? "🚨" : alert.status === "responding" ? "📡" : "✅"}
                        </div>
                        <div className="mp-alert-info">
                          <div className="mp-alert-name">{alert.user.name}</div>
                          <div className="mp-alert-sub">
                            <span>{alert.user.phone}</span>
                            <span className="mp-alert-sub-dot">·</span>
                            <span>{timeAgo(alert.createdAt, currentTime)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mp-alert-badges">
                        <span className={`mp-status-badge ${alert.status}`}>
                          <span style={{
                            width: 5, height: 5, borderRadius: "50%",
                            background: cfg.barColor,
                            display: "inline-block",
                            ...(alert.status === "active" ? { animation: "pulse 1.5s infinite" } : {})
                          }} />
                          {cfg.label}
                        </span>
                        <svg
                          width="14" height="14" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="2"
                          className={`mp-chevron ${isExpanded ? "open" : ""}`}
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </div>
                    </div>

                    {/* Chips */}
                    <div className="mp-chips">
                      <span className="mp-chip">
                        <span className="mp-chip-icon">🩸</span>
                        {alert.survey?.bloodGroup || alert.user.bloodGroup || "N/A"}
                      </span>
                      <span className="mp-chip">
                        <span className="mp-chip-icon">🚗</span>
                        {alert.user.vehicleNumber || "N/A"}
                      </span>
                      <span className="mp-chip mp-chip-mono">
                        <span className="mp-chip-icon">📍</span>
                        {lat.toFixed(4)}, {lng.toFixed(4)}
                      </span>
                      <span className="mp-chip">
                        <span className="mp-chip-icon">⚠️</span>
                        {alert.severity}
                      </span>
                      {alert.escalatedToCritical && (
                        <span className="mp-chip escalated">🚨 ESCALATED</span>
                      )}
                      {alert.canSelfReach === true && (
                        <span className="mp-chip self-reach">✅ Self-reach</span>
                      )}
                      {alert.survey && (
                        <span className="mp-chip survey">📋 Survey</span>
                      )}
                      {alert.liveLocation && alert.status !== "resolved" && (
                        <span className="mp-chip live">
                          <span className="mp-live-dot" style={{ width: 5, height: 5 }} />
                          GPS Live
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="mp-expand">

                      {/* Escalation */}
                      {alert.escalatedToCritical && (
                        <div className="mp-escalation">
                          <span style={{ fontSize: 18, flexShrink: 0 }}>🚨</span>
                          <div>
                            <div className="mp-escalation-title">Critical Escalation</div>
                          </div>
                          <div className="mp-escalation-text">
                            User did not confirm they could reach hospital within 10 seconds. Situation auto-escalated to CRITICAL.
                          </div>
                        </div>
                      )}

                      {/* Location + Timeline */}
                      <div className="mp-location-row">
                        <div>
                          <div className="mp-row-label">📍 Exact Location</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                            <span className="mp-location-coords">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
                            <a
                              href={`https://www.google.com/maps?q=${lat},${lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mp-maps-link"
                            >Open Maps ↗</a>
                          </div>
                        </div>
                        <div className="mp-timeline">
                          <div className="mp-row-label">🕐 Timeline</div>
                          <div className="mp-timeline-line" style={{ marginTop: 6 }}>
                            <span style={{ color: "var(--text-muted)" }}>Created</span>{" "}
                            <span>{new Date(alert.createdAt).toLocaleString()}</span>
                          </div>
                          {alert.resolvedAt && (
                            <div className="mp-timeline-line" style={{ color: "#34d399" }}>
                              Resolved {new Date(alert.resolvedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Detail grid */}
                      <div className="mp-detail-grid">

                        {/* Live GPS */}
                        {alert.liveLocation && alert.status !== "resolved" && (
                          <div className="mp-detail-card span2" style={{ borderColor: "rgba(52,211,153,0.15)", background: "rgba(52,211,153,0.03)" }}>
                            <div className="mp-gps-head">
                              <div className="mp-gps-label">
                                <span className="mp-live-dot" />
                                Live Tracking
                              </div>
                              <span className="mp-gps-age">
                                {(() => {
                                  const secs = Math.floor(((currentTime || new Date(alert.liveLocation.updatedAt).getTime()) - new Date(alert.liveLocation.updatedAt).getTime()) / 1000);
                                  return secs < 10 ? "Just now" : secs < 60 ? `${secs}s ago` : `${Math.floor(secs / 60)}m ago`;
                                })()}
                              </span>
                            </div>
                            <div className="mp-gps-grid">
                              <div className="mp-gps-cell">
                                <div className="mp-gps-key">Speed</div>
                                <div className="mp-gps-val">{alert.liveLocation.speed != null ? `${(alert.liveLocation.speed * 3.6).toFixed(1)} km/h` : "—"}</div>
                              </div>
                              <div className="mp-gps-cell">
                                <div className="mp-gps-key">Heading</div>
                                <div className="mp-gps-val">{alert.liveLocation.heading != null ? `${alert.liveLocation.heading.toFixed(0)}°` : "—"}</div>
                              </div>
                              <div className="mp-gps-cell">
                                <div className="mp-gps-key">Position</div>
                                <div className="mp-gps-val mono">{alert.liveLocation.lat.toFixed(4)}, {alert.liveLocation.lng.toFixed(4)}</div>
                              </div>
                              <div className="mp-gps-cell">
                                <div className="mp-gps-key">History</div>
                                <div className="mp-gps-val">{alert.locationHistory?.length || 0} pts</div>
                              </div>
                            </div>
                            <a
                              href={`https://www.google.com/maps?q=${alert.liveLocation.lat},${alert.liveLocation.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mp-track-btn"
                            >
                              📍 Track Live ↗
                            </a>
                          </div>
                        )}

                        {/* GPS Ended */}
                        {alert.liveLocation && alert.status === "resolved" && (
                          <div className="mp-detail-card span2">
                            <div className="mp-section-label">📡 GPS Tracking (Ended)</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                              Last known: <span style={{ color: "var(--text-secondary)" }}>{alert.liveLocation.lat.toFixed(6)}, {alert.liveLocation.lng.toFixed(6)}</span>
                              {" "}· {alert.locationHistory?.length || 0} trail points
                            </div>
                          </div>
                        )}

                        {/* Survey */}
                        {alert.survey && (
                          <div className="mp-detail-card span2" style={{ borderColor: "rgba(34,211,238,0.12)", background: "rgba(34,211,238,0.02)" }}>
                            <div className="mp-section-label">📋 Injury Assessment</div>
                            <div className="mp-survey-grid">
                              <div className="mp-survey-cell">
                                <span className="mp-survey-key">Severity</span>
                                <span className={`mp-survey-val ${alert.survey.injuryLevel}`}>{alert.survey.injuryLevel}</span>
                              </div>
                              <div className="mp-survey-cell">
                                <span className="mp-survey-key">Ambulance</span>
                                <span className={`mp-survey-val ${alert.survey.needAmbulance ? "needed" : "ok"}`}>
                                  {alert.survey.needAmbulance ? "NEEDED" : "Not Req"}
                                </span>
                              </div>
                              <div className="mp-survey-cell">
                                <span className="mp-survey-key">Can Drive</span>
                                <span className={`mp-survey-val ${alert.survey.canDrive ? "yes" : "no"}`}>
                                  {alert.survey.canDrive ? "Yes" : "No"}
                                </span>
                              </div>
                              <div className="mp-survey-cell">
                                <span className="mp-survey-key">Patients</span>
                                <span style={{ fontWeight: 700, fontSize: 13 }}>{alert.survey.numberOfPatients}</span>
                              </div>
                              {alert.survey.description && (
                                <div className="mp-survey-notes">{alert.survey.description}</div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* User Profile */}
                        <div className="mp-detail-card">
                          <div className="mp-section-label">👤 User Profile</div>
                          <div className="mp-data-row">
                            <span className="mp-data-key">Name</span>
                            <span className="mp-data-val">{alert.user.name}</span>
                          </div>
                          <div className="mp-data-row">
                            <span className="mp-data-key">Phone</span>
                            <span className="mp-data-val mono">{alert.user.phone}</span>
                          </div>
                          <div className="mp-data-row">
                            <span className="mp-data-key">Blood</span>
                            <span className="mp-blood-badge">{alert.user.bloodGroup || "N/A"}</span>
                          </div>
                          <div className="mp-data-row">
                            <span className="mp-data-key">Type</span>
                            <span className="mp-data-val">{alert.user.vehicleType || "Unknown"}</span>
                          </div>
                          <div className="mp-data-row">
                            <span className="mp-data-key">Vehicle</span>
                            <span className="mp-data-val mono" style={{ color: "var(--accent-cyan)" }}>{alert.user.vehicleNumber || "N/A"}</span>
                          </div>
                        </div>

                        {/* Emergency Contacts */}
                        <div className="mp-detail-card">
                          <div className="mp-section-label">📱 Emergency Contacts</div>
                          {alert.user.emergencyContacts.length > 0 ? (
                            alert.user.emergencyContacts.map((ec, i) => (
                              <div key={i} className="mp-contact-row">
                                <div>
                                  <div className="mp-contact-name">{ec.name}</div>
                                  <div className="mp-contact-rel">{ec.relation}</div>
                                </div>
                                <a href={`tel:${ec.phone}`} className="mp-call-btn" title={`Call ${ec.phone}`}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.21 12 19.79 19.79 0 0 1 1.14 3.4 2 2 0 0 1 3.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                                  </svg>
                                </a>
                              </div>
                            ))
                          ) : (
                            <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 11, fontStyle: "italic", borderRadius: 8, border: "1px dashed var(--border-subtle)" }}>
                              No contacts listed
                            </div>
                          )}
                        </div>

                        {/* Nearest Hospital */}
                        {alert.nearestHospital && (
                          <div className="mp-detail-card">
                            <div className="mp-section-label">🏥 Nearest Hospital</div>
                            <div className="mp-hosp-name">{alert.nearestHospital.name}</div>
                            <div className="mp-hosp-meta">
                              <span className="mp-hosp-pill dist">{alert.nearestHospital.distance} km</span>
                              <span className="mp-hosp-pill eta">~{alert.nearestHospital.eta} min ETA</span>
                            </div>
                            <a
                              href={`https://www.google.com/maps?q=${alert.nearestHospital.lat},${alert.nearestHospital.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mp-maps-link"
                              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}
                            >
                              View Route ↗
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mp-actions">
                        {alert.status === "active" && (
                          <button
                            onClick={() => updateStatus(alert._id, "responding")}
                            disabled={updatingId === alert._id}
                            className="mp-action-btn respond"
                          >
                            {updatingId === alert._id ? "Updating…" : "📡 Mark Responding"}
                          </button>
                        )}
                        {(alert.status === "active" || alert.status === "responding") && (
                          <button
                            onClick={() => updateStatus(alert._id, "resolved")}
                            disabled={updatingId === alert._id}
                            className="mp-action-btn resolve"
                          >
                            {updatingId === alert._id ? "Updating…" : "✅ Mark Resolved"}
                          </button>
                        )}
                        <a href={`tel:${alert.user.phone}`} className="mp-action-btn call">
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
    </>
  );
}