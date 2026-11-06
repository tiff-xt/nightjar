"use client";
import dynamic from "next/dynamic";
import { useEffect } from "react";

const Garage = dynamic(() => import("@/three/Garage"), { ssr: false });

/** Fixed full-screen 3D layer behind the story. */
export function Stage() {
  useEffect(() => {
    // Lift the veil shortly after mount; the spotlight flicker does the reveal.
    const t = setTimeout(() => (document.documentElement.dataset.scene = "ready"), 400);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      <div className="fixed inset-0 -z-10">
        <Garage />
      </div>
      <div aria-hidden className="veil" />
    </>
  );
}
