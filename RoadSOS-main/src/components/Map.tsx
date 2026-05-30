"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ─── Shared phone validation util ────────────────────────────────────────────
export const hasValidPhone = (phone: string[]): boolean =>
  phone.length > 0 &&
  phone[0].trim() !== "" &&
  phone[0] !== "Not Available" &&
  phone[0] !== "N/A" &&
  phone[0] !== "—";

// User location icon
const userIcon = L.divIcon({
  className: "",
  html: `<div style="position:relative;width:20px;height:20px;">
    <div style="width:20px;height:20px;background:radial-gradient(circle,#3b82f6,#1d4ed8);border:3px solid #fff;border-radius:50%;box-shadow:0 0 12px rgba(59,130,246,0.6),0 0 24px rgba(59,130,246,0.3);"></div>
    <div style="position:absolute;top:-4px;left:-4px;width:28px;height:28px;border:2px solid rgba(59,130,246,0.4);border-radius:50%;animation:sosPulse 2s infinite;"></div>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Color-coded service marker icons
const serviceIcons: Record<string, L.DivIcon> = {
  hospital: L.divIcon({
    className: "",
    html: `<div style="width:36px;height:36px;background:linear-gradient(135deg,#dc2626,#991b1b);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(220,38,38,0.4);border:2px solid rgba(255,255,255,0.2);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 2v20M2 12h20"/></svg></div>`,
    iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20],
  }),
  police: L.divIcon({
    className: "",
    html: `<div style="width:36px;height:36px;background:linear-gradient(135deg,#2563eb,#1e40af);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(37,99,235,0.4);border:2px solid rgba(255,255,255,0.2);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>`,
    iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20],
  }),
  ambulance: L.divIcon({
    className: "",
    html: `<div style="width:36px;height:36px;background:linear-gradient(135deg,#059669,#047857);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(5,150,105,0.4);border:2px solid rgba(255,255,255,0.2);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>`,
    iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20],
  }),
  towing: L.divIcon({
    className: "",
    html: `<div style="width:36px;height:36px;background:linear-gradient(135deg,#d97706,#b45309);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(217,119,6,0.4);border:2px solid rgba(255,255,255,0.2);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg></div>`,
    iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20],
  }),
  repair: L.divIcon({
    className: "",
    html: `<div style="width:36px;height:36px;background:linear-gradient(135deg,#7c3aed,#6d28d9);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(124,58,237,0.4);border:2px solid rgba(255,255,255,0.2);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div>`,
    iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20],
  }),
  showroom: L.divIcon({
    className: "",
    html: `<div style="width:36px;height:36px;background:linear-gradient(135deg,#0891b2,#0e7490);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(8,145,178,0.4);border:2px solid rgba(255,255,255,0.2);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></div>`,
    iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20],
  }),
};

export type ServiceType = "hospital" | "police" | "ambulance" | "towing" | "repair" | "showroom";

export interface ServiceData {
  _id: string;
  name: string;
  type: ServiceType;
  phone: string[];
  rating: number;
  distance: number;
  availability: string;
  address: string;
  location: { coordinates: [number, number] };
  specializations?: string[];
  city?: string;
}

export interface RouteData {
  points: [number, number][];
  distance: number;
  duration: number;
  destination: {
    name: string;
    lat: number;
    lng: number;
    type: string;
  };
}

interface MapProps {
  activeFilter: ServiceType | "all";
  routeData?: RouteData | null;
  onLocationReady?: (lat: number, lng: number) => void;
  onServicesLoaded?: (services: ServiceData[]) => void;
  onError?: (msg: string) => void;
  onRouteRequest?: (service: ServiceData) => void;
}

// Attach route request handler to window so popup HTML buttons can call it
declare global {
  interface Window {
    __roadsos_requestRoute: (serviceId: string) => void;
  }
}

export default function Map({ activeFilter, routeData, onLocationReady, onServicesLoaded, onError, onRouteRequest }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const hasFetchedServicesRef = useRef(false);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const allServicesRef = useRef<ServiceData[]>([]);
  const [servicesVersion, setServicesVersion] = useState(0);
  const lastFetchPositionRef = useRef<[number, number] | null>(null);

  // Keep global handler in sync with latest onRouteRequest callback
  useEffect(() => {
    window.__roadsos_requestRoute = (serviceId: string) => {
      const service = allServicesRef.current.find((s) => s._id === serviceId);
      if (service && onRouteRequest) {
        onRouteRequest(service);
        mapRef.current?.closePopup();
      }
    };
  }, [onRouteRequest]);

  // Fallback simulated data — only real/official emergency numbers; no dummy mobile numbers
  function generateFallback(lat: number, lng: number): ServiceData[] {
    const items: {
      name: string;
      type: ServiceType;
      phone: string[];
      rating: number;
      availability: string;
      offset: [number, number];
    }[] = [
      { name: "City Trauma Center",        type: "hospital",  phone: ["112"],  rating: 4.5, availability: "24x7",    offset: [0.008,  0.012]  },
      { name: "District General Hospital", type: "hospital",  phone: ["108"],  rating: 4.2, availability: "24x7",    offset: [-0.005, 0.009]  },
      { name: "Central Police Station",    type: "police",    phone: ["100"],  rating: 4.0, availability: "24x7",    offset: [0.006, -0.008]  },
      { name: "Highway Police Outpost",    type: "police",    phone: ["100"],  rating: 3.8, availability: "24x7",    offset: [-0.01, -0.005]  },
      { name: "Emergency Ambulance",       type: "ambulance", phone: ["108"],  rating: 4.7, availability: "24x7",    offset: [0.003,  0.006]  },
      { name: "Red Cross Ambulance",       type: "ambulance", phone: ["1099"], rating: 4.4, availability: "24x7",    offset: [-0.007, 0.004]  },
      // Towing & repair — no real number available in fallback mode
      { name: "Highway Towing Service",    type: "towing",    phone: [],       rating: 4.1, availability: "24x7",    offset: [0.011, -0.003]  },
      { name: "QuickFix Auto Repair",      type: "repair",    phone: [],       rating: 4.3, availability: "8AM-10PM",offset: [-0.004,-0.011]  },
      { name: "Tyre Point Puncture Shop",  type: "repair",    phone: [],       rating: 3.9, availability: "7AM-9PM", offset: [0.009,  0.003]  },
    ];

    return items.map((s, i) => ({
      _id: `fallback-${i}`,
      name: s.name,
      type: s.type,
      phone: s.phone,
      rating: s.rating,
      availability: s.availability,
      address: "Near your location",
      distance: Math.round(Math.sqrt(s.offset[0] ** 2 + s.offset[1] ** 2) * 111 * 10) / 10,
      location: { coordinates: [lng + s.offset[1], lat + s.offset[0]] as [number, number] },
    }));
  }

  async function fetchServices(lat: number, lng: number) {
    try {
      const response = await fetch(`/api/services/scrape?lat=${lat}&lng=${lng}&radius=10000`);
      if (!response.ok) throw new Error("Failed to fetch from scrape API");

      const data = await response.json();
      const services: ServiceData[] = data.services || [];

      if (services.length > 0) {
        allServicesRef.current = services;
        localStorage.setItem("cachedNearbyServices", JSON.stringify(services));
        setServicesVersion((v) => v + 1);
        onServicesLoaded?.(services);
        onError?.(`📡 Loaded ${services.length} live nearby services`);
      } else {
        throw new Error("No nearby services found");
      }
    } catch (error) {
      console.error(error);
      const cachedServices = localStorage.getItem("cachedNearbyServices");
      if (cachedServices) {
        const parsed = JSON.parse(cachedServices);
        allServicesRef.current = parsed;
        setServicesVersion((v) => v + 1);
        onServicesLoaded?.(parsed);
        onError?.("📦 Offline Mode — Using cached nearby services");
      } else {
        const fallback = generateFallback(lat, lng);
        allServicesRef.current = fallback;
        setServicesVersion((v) => v + 1);
        onServicesLoaded?.(fallback);
        onError?.("Using fallback simulated services");
      }
    }
  }

  function calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    const map = L.map(containerRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    let watchId: number;
    if (navigator.geolocation) {
      // Quick low-accuracy first fix
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          const { latitude, longitude } = pos.coords;
          setUserPos([latitude, longitude]);
          if (!hasFetchedServicesRef.current) {
            fetchServices(latitude, longitude);
            hasFetchedServicesRef.current = true;
            lastFetchPositionRef.current = [latitude, longitude];
          }
          onLocationReady?.(latitude, longitude);
        },
        () => {},
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 10000 }
      );

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (cancelled) return;
          const { latitude, longitude } = pos.coords;
          setUserPos([latitude, longitude]);

          if (!hasFetchedServicesRef.current) {
            fetchServices(latitude, longitude);
            hasFetchedServicesRef.current = true;
            lastFetchPositionRef.current = [latitude, longitude];
          } else if (lastFetchPositionRef.current) {
            const distanceMoved = calculateDistanceMeters(
              lastFetchPositionRef.current[0],
              lastFetchPositionRef.current[1],
              latitude,
              longitude
            );
            if (distanceMoved > 500) {
              fetchServices(latitude, longitude);
              lastFetchPositionRef.current = [latitude, longitude];
            }
          }

          if (!userMarkerRef.current) {
            userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon })
              .addTo(map)
              .bindPopup(
                `<div style="text-align:center;padding:4px;">
                  <div style="font-weight:600;font-size:14px;">📍 You are here</div>
                  <div style="font-size:11px;color:rgba(255,255,255,0.5);">${latitude.toFixed(4)}, ${longitude.toFixed(4)}</div>
                </div>`
              );
          } else {
            userMarkerRef.current.setLatLng([latitude, longitude]);
          }

          onLocationReady?.(latitude, longitude);
        },
        () => {
          if (cancelled) return;
          if (lastFetchPositionRef.current) return;

          const lat = 28.6139, lng = 77.209;
          setUserPos([lat, lng]);

          if (!userMarkerRef.current) {
            userMarkerRef.current = L.marker([lat, lng], { icon: userIcon })
              .addTo(map)
              .bindPopup(
                `<div style="text-align:center;padding:4px;">
                  <div style="font-weight:600;font-size:14px;">📍 Default Location</div>
                  <div style="font-size:11px;color:rgba(255,255,255,0.5);">New Delhi (location denied)</div>
                </div>`
              );
          } else {
            userMarkerRef.current.setLatLng([lat, lng]);
          }

          onLocationReady?.(lat, lng);
        },
        { enableHighAccuracy: true, maximumAge: 4000, timeout: 12000 }
      );
    }

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userPos || !userMarkerRef.current) return;
    userMarkerRef.current.setLatLng([userPos[0], userPos[1]]);
  }, [userPos]);

useEffect(() => {
  if (!markersRef.current || !mapRef.current) return;
  markersRef.current.clearLayers();

  const services = allServicesRef.current;
  const filtered = activeFilter === "all" ? services : services.filter((s) => s.type === activeFilter);

  const typeLabels: Record<string, string> = {
    hospital: "🏥 Hospital", police: "👮 Police", ambulance: "🚑 Ambulance",
    towing: "🚗 Towing", repair: "🔧 Repair", showroom: "🏪 Showroom",
  };
  const typeColors: Record<string, string> = {
    hospital: "#dc2626", police: "#2563eb", ambulance: "#059669",
    towing: "#d97706", repair: "#7c3aed", showroom: "#0891b2",
  };

  filtered.forEach((service) => {
    const [lng, lat] = service.location.coordinates;
    const icon = serviceIcons[service.type] || serviceIcons.hospital;
    const color = typeColors[service.type] || "#3b82f6";
    const label = typeLabels[service.type] || service.type;
    const phoneValid = hasValidPhone(service.phone);
    const safeId = service._id.replace(/"/g, "&quot;");

    const callButtonHtml = phoneValid
      ? `<button onclick="window.open('tel:${service.phone[0]}')"
            style="flex:1;padding:8px;background:linear-gradient(135deg,#059669,#065f46);color:#fff;border:none;border-radius:9px;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;">
            📞 Call
         </button>`
      : `<button disabled
            style="flex:1;padding:8px;background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.25);border:1px solid rgba(255,255,255,0.08);border-radius:9px;font-weight:700;font-size:12px;cursor:not-allowed;font-family:inherit;">
            No Phone
         </button>`;

    const marker = L.marker([lat, lng], { icon });
    marker.bindPopup(
      `<div style="min-width:200px;padding:10px;font-family:'Plus Jakarta Sans',sans-serif;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
          <span style="background:${color};color:#fff;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;">${label}</span>
        </div>
        <div style="font-weight:700;font-size:14px;color:#fff;margin-bottom:6px;line-height:1.3;">${service.name}</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.55);display:flex;flex-direction:column;gap:3px;margin-bottom:10px;">
          ${phoneValid ? `<span>📞 ${service.phone[0]}</span>` : `<span style="color:rgba(255,255,255,0.25);">📞 No phone available</span>`}
          <span>📏 ${service.distance} km away</span>
          <span>⭐ ${service.rating} · ${service.availability}</span>
          ${service.address ? `<span>📍 ${service.address}</span>` : ""}
        </div>
        <div style="display:flex;gap:7px;">
          ${callButtonHtml}
          <button onclick="window.__roadsos_requestRoute('${safeId}')"
            style="flex:1;padding:8px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;border:none;border-radius:9px;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:4px;">
            🗺️ Directions
          </button>
        </div>
      </div>`,
      { maxWidth: 260 }
    );

    marker.addTo(markersRef.current!);

    // Hide marker immediately if a route is already active
    if (routeData) {
      const el = marker.getElement?.();
      if (el) el.style.display = "none";
    }
  });
}, [activeFilter, servicesVersion, routeData]);

// Draw/clear route when routeData changes
useEffect(() => {
  if (!routeLayerRef.current || !mapRef.current) return;
  routeLayerRef.current.clearLayers();

  // Hide/show all service markers based on whether a route is active
  if (markersRef.current) {
    markersRef.current.eachLayer((layer) => {
      const el = (layer as L.Marker).getElement?.();
      if (el) el.style.display = routeData ? "none" : "";
    });
  }

  if (!routeData || routeData.points.length === 0) return;

  const map = mapRef.current;

  const glowLine = L.polyline(routeData.points, {
    color: "#3b82f6", weight: 12, opacity: 0.15,
    lineCap: "round", lineJoin: "round",
  });
  glowLine.addTo(routeLayerRef.current);

  const mainLine = L.polyline(routeData.points, {
    color: "#60a5fa", weight: 4, opacity: 0.95,
    lineCap: "round", lineJoin: "round",
  });
  mainLine.addTo(routeLayerRef.current);

  // Animated dashed overlay
  const dashedLine = L.polyline(routeData.points, {
    color: "#ffffff", weight: 2, opacity: 0.35,
    lineCap: "round", lineJoin: "round", dashArray: "8, 14",
  });
  dashedLine.addTo(routeLayerRef.current);

  const destIcon = L.divIcon({
    className: "",
    html: `<div style="position:relative;width:52px;height:52px;">
      <div style="position:absolute;top:0;left:0;width:52px;height:52px;border-radius:50%;border:2px solid rgba(59,130,246,0.5);animation:sosPulse 2s infinite;"></div>
      <div style="position:absolute;top:8px;left:8px;width:36px;height:36px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(59,130,246,0.6);border:2px solid rgba(255,255,255,0.5);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
    </div>`,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
  });

  const destMarker = L.marker(
    [routeData.destination.lat, routeData.destination.lng],
    { icon: destIcon }
  );
  destMarker.bindPopup(
    `<div style="text-align:center;padding:8px 4px;">
      <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${routeData.destination.name}</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.5);">${(routeData.distance / 1000).toFixed(1)} km · ~${Math.round(routeData.duration / 60)} min</div>
    </div>`
  );
  destMarker.addTo(routeLayerRef.current);

  const allPoints: [number, number][] = [...routeData.points];
  if (userPos) allPoints.push(userPos);
  const bounds = L.latLngBounds(allPoints);
  // Fit with padding that accounts for the route card at bottom
  map.fitBounds(bounds, { paddingTopLeft: [20, 160], paddingBottomRight: [20, 260], maxZoom: 16 });

}, [routeData, userPos]);

  return (
    <div className="relative w-full h-full" style={{ minHeight: "100vh" }}>
      <div ref={containerRef} className="w-full h-full" style={{ minHeight: "100vh" }} />
      <button
        onClick={() => {
          if (!mapRef.current || !userPos) return;
          mapRef.current.flyTo([userPos[0], userPos[1]], 16, { duration: 1.5 });
        }}
        className="absolute bottom-24 right-4 z-[1000] w-14 h-14"
        style={{
          borderRadius: "50%",
          background: "rgba(34,211,238,0.10)",
          border: "1px solid rgba(34,211,238,0.22)",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(24px) saturate(180%)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </button>
    </div>
  );
}