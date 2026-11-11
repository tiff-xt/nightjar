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
      {/*
        Sized to the *largest* viewport (100lvh), not the current one, so the
        mobile address bar showing/hiding while scrolling never resizes the
        canvas (a resize rebuilds every render target and flashes black).
      */}
      <div className="fixed inset-x-0 top-0 -z-10 h-lvh">
        <Garage />
      </div>
      <div aria-hidden className="veil" />
    </>
  );
}
