"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem("roadsos_auth");

    if (!auth) {
      router.replace("/signup");
      return;
    }

    try {
      const user = JSON.parse(auth);

      if (user.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/user");
      }
    } catch (error) {
      localStorage.removeItem("roadsos_auth");
      localStorage.removeItem("roadsos_token");
      router.replace("/signup");
    }
  }, [router]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <p
          className="text-sm text-white/40"
          style={{ fontFamily: "Outfit" }}
        >
          Loading RoadSOS...
        </p>
      </div>
    </div>
  );
}
