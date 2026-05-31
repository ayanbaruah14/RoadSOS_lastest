import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/connection";
import EmergencyService from "@/lib/db/models/EmergencyService";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");
    const radius = parseFloat(searchParams.get("radius") || "10");
    const type = searchParams.get("type");

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "lat and lng query parameters are required" },
        { status: 400 }
      );
    }

    const query: Record<string, unknown> = {
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat], // GeoJSON is [lng, lat]
          },
          $maxDistance: radius * 1000, // Convert km to meters
        },
      },
    };

    if (type && type !== "all") {
      query.type = type;
    }

    const services = await EmergencyService.find(query).limit(50).lean();

    const servicesWithDistance = services.map((s) => {
      const [sLng, sLat] = s.location.coordinates;
      const dist = haversineDistance(lat, lng, sLat, sLng);
      return {
        ...s,
        distance: Math.round(dist * 10) / 10, // 1 decimal
      };
    });

    return NextResponse.json({
      count: servicesWithDistance.length,
      services: servicesWithDistance,
    });
  } catch (error) {
    console.error("Nearby services error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
