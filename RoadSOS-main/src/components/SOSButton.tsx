"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UserProfile {
  name: string;
  phone: string;
  bloodGroup: string;
  emergencyContacts: { name: string; phone: string; relation: string }[];
  medicalConditions: string[];
  allergies: string[];
  vehicleNumber?: string;
  vehicleType?: string;
}

interface SOSButtonProps {
  userProfile: UserProfile;
  userLocation: { lat: number; lng: number } | null;
  onTriggered?: (alertId: string) => void;
  externalTrigger?: boolean;
}

export default function SOSButton({
  userProfile,
  userLocation,
  onTriggered,
  externalTrigger,
}: SOSButtonProps) {
  const [triggered, setTriggered] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdown = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCountdown(null);
  }, []);

  const triggerSOS = async () => {
    setSending(true);

    const lat = userLocation?.lat || 28.6139;
    const lng = userLocation?.lng || 77.209;

    try {
      const res = await fetch("/api/sos/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: userProfile,
          latitude: lat,
          longitude: lng,
          description: "SOS Emergency Triggered",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to trigger SOS on server");
      }

      const data = await res.json();
      setTriggered(true);

      if (onTriggered && data.alertId) {
        onTriggered(data.alertId);
      }

      setTimeout(() => setTriggered(false), 5000);
    } catch (error) {
      console.error(error);

      // Fallback: If server is unreachable, attempt to open SMS app locally
      alert("Network error: Falling back to local SMS");

      const emergencyMessage =
        `🚨 Emergency Alert!\n\n` +
        `Possible accident detected.\n\n` +
        `User: ${userProfile.name}\n` +
        `Blood Group: ${userProfile.bloodGroup}\n\n` +
        `Location:\n` +
        `https://maps.google.com/?q=${lat},${lng}`;

      const contacts = userProfile.emergencyContacts
        .map((c) => c.phone)
        .join(",");

      window.location.href = `sms:${contacts}?body=${encodeURIComponent(emergencyMessage)}`;
    } finally {
      setSending(false);
    }
  };

  const handleSOS = () => {
    if (triggered || sending) return;
    let count = 3;
    setCountdown(count);

    intervalRef.current = setInterval(() => {
      count--;
      if (count <= 0) {
        clearCountdown();
        triggerSOS();
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  useEffect(() => {
    if (externalTrigger) {
      triggerSOS();
    }
  }, [externalTrigger]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      {/* ── SOS Button ── */}
      <button
        onClick={handleSOS}
        disabled={triggered || sending}
        className={`relative w-[82px] h-[82px] rounded-full flex items-center justify-center font-black text-white text-base tracking-wider transition-all duration-300 cursor-pointer shadow-2xl before:content-[''] before:absolute before:inset-[-9px] before:rounded-full before:border before:border-white/12 before:bg-white/[0.03] before:backdrop-blur-md after:content-[''] after:absolute after:inset-[7px] after:rounded-full after:border after:border-white/20 after:pointer-events-none ${
          triggered
            ? "bg-gradient-to-br from-emerald-400 to-teal-700 scale-95 shadow-emerald-500/35"
            : sending
              ? "bg-gradient-to-br from-amber-400 to-orange-700 scale-95 shadow-amber-500/35"
              : "bg-gradient-to-br from-rose-400 via-red-500 to-orange-700 hover:from-rose-300 hover:via-red-400 hover:to-orange-600 sos-pulse hover:scale-105 active:scale-95 shadow-red-500/40"
        }`}
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {triggered ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : sending ? (
          <div className="w-6 h-6 border-[3px] border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="relative z-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">SOS</span>
        )}
      </button>

      {/* ── Countdown — inline below button, no overlay ── */}
      {countdown !== null && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            animation: "sos-fade-up 0.2s ease both",
          }}
        >
          <style>{`
            @keyframes sos-fade-up {
              from { opacity: 0; transform: translateY(6px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* Number + label row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(140,20,20,0.95)",
              border: "1px solid rgba(239,68,68,0.50)",
              borderRadius: 12,
              padding: "7px 16px",
              boxShadow: "0 4px 20px rgba(239,68,68,0.35)",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 800,
                fontSize: 22,
                color: "#fff",
                lineHeight: 1,
                minWidth: 18,
                textAlign: "center",
              }}
            >
              {countdown}
            </span>
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600,
                fontSize: 12,
                color: "rgba(255,255,255,0.75)",
              }}
            >
              Sending SOS in {countdown}s…
            </span>
          </div>

          {/* Cancel */}
          <button
            onClick={clearCountdown}
            style={{
              padding: "7px 22px",
              borderRadius: 50,
              border: "1px solid rgba(239,68,68,0.35)",
              background: "rgba(239,68,68,0.10)",
              color: "#f87171",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              transition: "all .18s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.22)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.55)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.10)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.35)"; }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Sent confirmation ── */}
      {triggered && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#140505", // Fully opaque dark red-black (prevents map camouflage)
            border: "1px solid rgba(239, 68, 68, 0.55)", // Highly visible red border
            color: "#ff4d4d", // High-visibility vibrant premium red
            borderRadius: 12,
            padding: "7px 14px",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.5), 0 0 12px rgba(239, 68, 68, 0.18)", // Elevation shadow + glow
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700, // High-contrast bold weight
            fontSize: 12,
            whiteSpace: "nowrap",
          }}
        >
          🚨 SOS Triggered — Stay Safe!
        </div>
      )}
    </div>
  );
}