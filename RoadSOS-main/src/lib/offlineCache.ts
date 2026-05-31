const CACHE_KEY = "roadsos_emergency_cache";
const CACHE_MAX_AGE = 10 * 60 * 1000;

export interface EmergencyCache {
  userLat: number;
  userLng: number;
  hospital: {
    name: string;
    lat: number;
    lng: number;
    phone: string;
    distance: number;
    eta: number;
  };
  routeGeometry: string;
  routePoints: [number, number][];
  cachedAt: number;
}

export function saveEmergencyCache(data: EmergencyCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    console.log("[Offline] Emergency cache saved:", data.hospital.name);
  } catch (err) {
    console.error("[Offline] Failed to save cache:", err);
  }
}

export function loadEmergencyCache(): EmergencyCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const data: EmergencyCache = JSON.parse(raw);

    if (Date.now() - data.cachedAt > CACHE_MAX_AGE) {
      console.log("[Offline] Cache expired, will refresh");
      return data;
    }

    return data;
  } catch {
    return null;
  }
}

export function isCacheFresh(): boolean {
  const cache = loadEmergencyCache();
  if (!cache) return false;
  return Date.now() - cache.cachedAt < CACHE_MAX_AGE;
}

export function hasUserMoved(currentLat: number, currentLng: number, thresholdKm: number = 0.5): boolean {
  const cache = loadEmergencyCache();
  if (!cache) return true;

  const dLat = cache.userLat - currentLat;
  const dLng = cache.userLng - currentLng;
  const distKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111;

  return distKm > thresholdKm;
}

export async function prefetchEmergencyRoute(lat: number, lng: number): Promise<EmergencyCache | null> {
  try {

    let hospitals: { name: string; lat: number; lng: number; phone: string; distance: number }[] = [];

    const scrapeRes = await fetch(`/api/services/scrape?lat=${lat}&lng=${lng}&radius=10000`);
    if (scrapeRes.ok) {
      const data = await scrapeRes.json();
      hospitals = (data.services || [])
        .filter((s: { type: string }) => s.type === "hospital")
        .map((s: { name: string; location: { coordinates: [number, number] }; phone: string[]; distance: number }) => ({
          name: s.name,
          lat: s.location.coordinates[1],
          lng: s.location.coordinates[0],
          phone: s.phone?.[0] || "102",
          distance: s.distance,
        }));
    }

    if (hospitals.length === 0) {
      console.log("[Offline] No hospitals found to cache");
      return null;
    }

    const closest = hospitals[0];

    let eta = Math.round(closest.distance * 3);
    let routeGeometry = "";
    let routePoints: [number, number][] = [];

    try {
      const osrmRes = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${closest.lng},${closest.lat}?overview=full&geometries=polyline`
      );
      if (osrmRes.ok) {
        const osrmData = await osrmRes.json();
        if (osrmData.code === "Ok" && osrmData.routes?.length) {
          eta = Math.round(osrmData.routes[0].duration / 60);
          routeGeometry = osrmData.routes[0].geometry;

          routePoints = decodePolylineForCache(routeGeometry);
        }
      }
    } catch {

      routePoints = [[lat, lng], [closest.lat, closest.lng]];
    }

    const cache: EmergencyCache = {
      userLat: lat,
      userLng: lng,
      hospital: { ...closest, eta },
      routeGeometry,
      routePoints,
      cachedAt: Date.now(),
    };

    saveEmergencyCache(cache);
    return cache;
  } catch (err) {
    console.error("[Offline] Prefetch failed:", err);
    return null;
  }
}

function decodePolylineForCache(encoded: string): [number, number][] {
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
