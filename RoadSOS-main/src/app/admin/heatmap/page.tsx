"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
  severity: string;
  status: string;
  escalated: boolean;
  hospital: string | null;
  userName: string;
  createdAt: string;
}

interface HeatmapStats {
  total: number;
  critical: number;
  escalated: number;
  resolved: number;
  active: number;
}

export default function HeatmapPage() {
  const router = useRouter();

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

  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [stats, setStats] = useState<HeatmapStats>({ total: 0, critical: 0, escalated: 0, resolved: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const heatLayerRef = useRef<L.Layer | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/sos/alerts/heatmap");
      if (res.ok) {
        const data = await res.json();
        setPoints(data.points || []);
        setStats(data.stats || { total: 0, critical: 0, escalated: 0, resolved: 0, active: 0 });
      }
    } catch (err) {
      console.error("Failed to fetch heatmap data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initMap = async () => {
      if (mapRef.current) return;
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (mapRef.current || !mapContainerRef.current) return;

      leafletRef.current = L;
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        center: [22.5, 78.9],
        zoom: 5,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      mapRef.current = map;
      markersRef.current = L.layerGroup().addTo(map);
      setMapReady(true);
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !mapReady || points.length === 0) return;

    const filtered = filter === "all"
      ? points
      : filter === "critical"
        ? points.filter((p) => p.severity === "critical")
        : filter === "escalated"
          ? points.filter((p) => p.escalated)
          : filter === "active"
            ? points.filter((p) => p.status === "active")
            : points;

    if (heatLayerRef.current) map.removeLayer(heatLayerRef.current);
    if (markersRef.current) markersRef.current.clearLayers();

    filtered.forEach((point) => {
      const severityColors: Record<string, string> = {
        critical: "#f87171",
        high: "#fb923c",
        medium: "#fbbf24",
        low: "#34d399",
      };
      const color = severityColors[point.severity] || "#fbbf24";
      const radius = point.weight * 30 + 10;

      L.circleMarker([point.lat, point.lng], {
        radius: radius + 15,
        fillColor: color,
        fillOpacity: 0.08,
        stroke: false,
      }).addTo(markersRef.current!);

      L.circleMarker([point.lat, point.lng], {
        radius: radius,
        fillColor: color,
        fillOpacity: 0.2,
        stroke: false,
      }).addTo(markersRef.current!);

      const marker = L.circleMarker([point.lat, point.lng], {
        radius: 6,
        fillColor: color,
        fillOpacity: 0.95,
        weight: 1.5,
        color: "rgba(255,255,255,0.2)",
      }).addTo(markersRef.current!);

      const time = new Date(point.createdAt).toLocaleString();
      marker.bindPopup(
        `<div style="font-family:'DM Sans',sans-serif;font-size:12px;color:#cbd5e1;min-width:190px;background:#0d1017;border-radius:10px;">
          <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:13px;margin-bottom:8px;color:#e2e8f0;">${point.userName}</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;">
            <span style="background:${color}18;color:${color};padding:2px 8px;border-radius:5px;font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;border:1px solid ${color}25;">${point.severity}</span>
            ${point.escalated ? `<span style="background:#f8717118;color:#f87171;padding:2px 8px;border-radius:5px;font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;border:1px solid #f8717125;">ESCALATED</span>` : ""}
            <span style="background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.4);padding:2px 8px;border-radius:5px;font-size:9px;border:1px solid rgba(255,255,255,0.08);">${point.status}</span>
          </div>
          ${point.hospital ? `<div style="color:rgba(255,255,255,0.4);font-size:10px;margin-bottom:4px;">🏥 ${point.hospital}</div>` : ""}
          <div style="color:rgba(255,255,255,0.25);font-size:10px;font-family:'JetBrains Mono',monospace;">${time}</div>
        </div>`,
        { className: "mp-popup" }
      );
    });

    if (filtered.length > 0) {
      const bounds = L.latLngBounds(filtered.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    }
  }, [points, filter, mapReady]);

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return `${Math.floor(diff / 60000)}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const filterOptions = [
    { label: "All", value: stats.total, key: "all" },
    { label: "Critical", value: stats.critical, key: "critical" },
    { label: "Escalated", value: stats.escalated, key: "escalated" },
    { label: "Active", value: stats.active, key: "active" },
  ];

  const filteredPoints = filter === "all" ? points : points.filter((p) =>
    filter === "critical" ? p.severity === "critical" :
    filter === "escalated" ? p.escalated :
    filter === "active" ? p.status === "active" : true
  );

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
          --font-display: 'Syne', sans-serif;
          --font-body: 'DM Sans', sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
        }

        * { box-sizing: border-box; }

        .hm-page {
          height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          background: var(--bg-base);
          font-family: var(--font-body);
          color: var(--text-primary);
          overflow: hidden;
        }

        /* Top accent line */
        .hm-page::before {
          content: '';
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(251,146,60,0.5), rgba(248,113,113,0.4), transparent);
          z-index: 100;
        }

        /* ── HEADER ── */
        .hm-header {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          height: 60px;
          background: rgba(8,10,15,0.95);
          backdrop-filter: blur(24px);
          border-bottom: 1px solid var(--border-subtle);
          z-index: 20;
          gap: 16px;
        }

        .hm-header-left { display: flex; align-items: center; gap: 14px; }

        .hm-back {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px;
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          text-decoration: none;
          transition: all 0.15s;
          background: transparent;
          flex-shrink: 0;
        }
        .hm-back:hover { border-color: var(--border-default); color: var(--text-primary); background: var(--bg-elevated); }

        .hm-divider { width: 1px; height: 20px; background: var(--border-subtle); }

        .hm-title-block { display: flex; align-items: center; gap: 10px; }

        .hm-icon {
          width: 34px; height: 34px;
          border-radius: 9px;
          background: linear-gradient(135deg, #f97316, #ef4444);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(249,115,22,0.25);
        }

        .hm-title {
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1;
        }
        .hm-subtitle {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 3px;
          letter-spacing: 0.04em;
        }

        .hm-refresh-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
          background: transparent;
          color: var(--text-muted);
          font-family: var(--font-body);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .hm-refresh-btn:hover { border-color: var(--border-default); color: var(--text-primary); background: var(--bg-elevated); }

        /* ── FILTER BAR ── */
        .hm-filterbar {
          flex-shrink: 0;
          padding: 10px 24px;
          border-bottom: 1px solid var(--border-subtle);
          background: rgba(8,10,15,0.85);
          backdrop-filter: blur(16px);
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
        }
        .hm-filterbar::-webkit-scrollbar { display: none; }

        .hm-filter-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px;
          border-radius: 7px;
          border: 1px solid var(--border-subtle);
          background: transparent;
          color: var(--text-muted);
          font-family: var(--font-body);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }
        .hm-filter-btn:hover { border-color: var(--border-default); color: var(--text-secondary); background: var(--bg-elevated); }
        .hm-filter-btn.active-all { border-color: rgba(255,255,255,0.18); background: var(--bg-elevated); color: var(--text-primary); }
        .hm-filter-btn.active-critical { border-color: rgba(248,113,113,0.3); background: rgba(248,113,113,0.08); color: #f87171; }
        .hm-filter-btn.active-escalated { border-color: rgba(251,146,60,0.3); background: rgba(251,146,60,0.08); color: #fb923c; }
        .hm-filter-btn.active-active { border-color: rgba(251,191,36,0.3); background: rgba(251,191,36,0.08); color: #fbbf24; }

        .hm-filter-count {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 600;
          padding: 1px 5px;
          border-radius: 4px;
          background: rgba(255,255,255,0.07);
          color: var(--text-muted);
        }

        /* ── MAP AREA ── */
        .hm-map-area {
          flex: 1;
          position: relative;
          overflow: hidden;
        }

        .hm-map-container {
          position: absolute;
          inset: 0;
          z-index: 0;
        }

        /* Loading overlay */
        .hm-loading {
          position: absolute;
          inset: 0;
          z-index: 30;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-base);
          flex-direction: column;
          gap: 12px;
        }
        .hm-spinner {
          width: 28px; height: 28px;
          border: 2px solid var(--border-default);
          border-top-color: #fb923c;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .hm-loading p { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); }

        /* Legend */
        .hm-legend {
          position: absolute;
          bottom: 20px; left: 16px;
          z-index: 20;
          background: rgba(13,16,23,0.92);
          backdrop-filter: blur(20px);
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
          padding: 12px 14px;
          min-width: 110px;
        }
        .hm-legend-title {
          font-family: var(--font-mono);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .hm-legend-row {
          display: flex; align-items: center; gap: 7px;
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 5px;
        }
        .hm-legend-row:last-child { margin-bottom: 0; }
        .hm-legend-dot {
          width: 9px; height: 9px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* Sidebar */
        .hm-sidebar {
          position: absolute;
          top: 14px; right: 14px;
          z-index: 20;
          width: 256px;
          max-height: calc(100% - 28px);
          overflow-y: auto;
          background: rgba(13,16,23,0.92);
          backdrop-filter: blur(20px);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          padding: 14px;
        }
        .hm-sidebar::-webkit-scrollbar { display: none; }

        .hm-sidebar-title {
          font-family: var(--font-mono);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 10px;
        }

        .hm-incident-row {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 9px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
          margin-bottom: 3px;
        }
        .hm-incident-row:last-child { margin-bottom: 0; }
        .hm-incident-row:hover { background: rgba(255,255,255,0.04); }

        .hm-incident-badge {
          width: 30px; height: 30px;
          border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          flex-shrink: 0;
          border: 1px solid;
        }
        .hm-incident-badge.critical { color: #f87171; background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.2); }
        .hm-incident-badge.high { color: #fb923c; background: rgba(251,146,60,0.1); border-color: rgba(251,146,60,0.2); }
        .hm-incident-badge.medium { color: #fbbf24; background: rgba(251,191,36,0.1); border-color: rgba(251,191,36,0.2); }
        .hm-incident-badge.low { color: #34d399; background: rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.2); }

        .hm-incident-name {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
        }
        .hm-incident-meta {
          display: flex; align-items: center; gap: 5px;
          margin-top: 2px;
          font-family: var(--font-mono);
          font-size: 9px;
          color: var(--text-muted);
        }
        .hm-status-dot {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.04em;
        }
        .hm-status-dot.active { color: #f87171; }
        .hm-status-dot.responding { color: #fbbf24; }
        .hm-status-dot.resolved { color: #34d399; }

        /* Leaflet popup override */
        .mp-popup .leaflet-popup-content-wrapper {
          background: #0d1017 !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          border-radius: 10px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important;
          padding: 0 !important;
        }
        .mp-popup .leaflet-popup-content {
          margin: 12px 14px !important;
        }
        .mp-popup .leaflet-popup-tip {
          background: #0d1017 !important;
        }
        .mp-popup .leaflet-popup-close-button {
          color: rgba(255,255,255,0.3) !important;
          font-size: 16px !important;
          top: 6px !important; right: 8px !important;
        }
        .mp-popup .leaflet-popup-close-button:hover { color: rgba(255,255,255,0.7) !important; }

        .leaflet-control-zoom {
          border: 1px solid var(--border-default) !important;
          border-radius: 8px !important;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important;
        }
        .leaflet-control-zoom a {
          background: rgba(13,16,23,0.95) !important;
          color: var(--text-secondary) !important;
          border-bottom: 1px solid var(--border-subtle) !important;
          width: 30px !important; height: 30px !important;
          line-height: 30px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          transition: background 0.15s !important;
        }
        .leaflet-control-zoom a:hover { background: var(--bg-elevated) !important; color: var(--text-primary) !important; }
        .leaflet-control-zoom-out { border-bottom: none !important; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .anim-fade-up { animation: fadeUp 0.25s ease both; }
      `}</style>

      <div className="hm-page">

        <header className="hm-header">
          <div className="hm-header-left">
            <Link href="/admin" className="hm-back">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
            <div className="hm-divider" />
            <div className="hm-title-block">
              <div className="hm-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              </div>
              <div>
                <div className="hm-title">Incident Heatmap</div>
                <div className="hm-subtitle">Accident hotspot analysis · {stats.total} incidents</div>
              </div>
            </div>
          </div>

          <button onClick={fetchData} className="hm-refresh-btn">
            <svg
              style={{ width: 13, height: 13 }}
              className={loading ? "animate-spin" : ""}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            >
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            Refresh
          </button>
        </header>

        <div className="hm-filterbar">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`hm-filter-btn ${filter === opt.key ? `active-${opt.key}` : ""}`}
            >
              {opt.label}
              <span className="hm-filter-count">{opt.value}</span>
            </button>
          ))}
        </div>

        <div className="hm-map-area">
          {loading && points.length === 0 && (
            <div className="hm-loading">
              <div className="hm-spinner" />
              <p>Loading incident data…</p>
            </div>
          )}

          <div ref={mapContainerRef} className="hm-map-container" />

          <div className="hm-legend anim-fade-up">
            <div className="hm-legend-title">Severity</div>
            {[
              { label: "Critical", color: "#f87171" },
              { label: "High", color: "#fb923c" },
              { label: "Medium", color: "#fbbf24" },
              { label: "Low", color: "#34d399" },
            ].map((s) => (
              <div key={s.label} className="hm-legend-row">
                <span
                  className="hm-legend-dot"
                  style={{ background: s.color, boxShadow: `0 0 6px ${s.color}50` }}
                />
                {s.label}
              </div>
            ))}
          </div>

          {points.length > 0 && (
            <div className="hm-sidebar anim-fade-up">
              <div className="hm-sidebar-title">Recent Incidents</div>
              {filteredPoints.slice(0, 8).map((point, i) => (
                <div
                  key={i}
                  className="hm-incident-row"
                  onClick={() => {
                    mapRef.current?.flyTo([point.lat, point.lng], 15, { duration: 1.5 });
                  }}
                >
                  <div className={`hm-incident-badge ${point.severity}`}>
                    {point.severity.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="hm-incident-name">{point.userName}</div>
                    <div className="hm-incident-meta">
                      <span>{timeAgo(point.createdAt)}</span>
                      {point.escalated && <span style={{ color: "#f87171" }}>⚡</span>}
                      <span className={`hm-status-dot ${point.status}`}>{point.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
