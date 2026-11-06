"use client";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { store } from "@/lib/store";
import { calloutsAt } from "@/lib/story";
import { ANCHORS } from "./Bike";

type Callout = { anchor: keyof typeof ANCHORS; section: string; label: string; value: string; side: "left" | "right" };

const CALLOUTS: Callout[] = [
  { anchor: "trellis", section: "trellis", label: "Frame", value: "Chromoly trellis, 9.1 kg", side: "left" },
  { anchor: "tank", section: "trellis", label: "Tank", value: "14 L, faceted aluminium", side: "right" },
  { anchor: "cylinders", section: "twin", label: "Engine", value: "890 cc 75° V-twin", side: "right" },
  { anchor: "engine", section: "twin", label: "Output", value: "121 hp · 98 Nm", side: "left" },
  { anchor: "shock", section: "twin", label: "Rear shock", value: "Fully adjustable", side: "left" },
];

/** HTML labels pinned to points on the bike, with a leader line. */
export function Callouts() {
  return (
    <>
      {CALLOUTS.map((c) => (
        <Pin key={c.anchor} c={c} />
      ))}
    </>
  );
}

function Pin({ c }: { c: Callout }) {
  const el = useRef<HTMLDivElement>(null);
  useFrame(() => {
    const o = calloutsAt(store.progress, c.section);
    if (el.current) {
      el.current.style.opacity = String(o);
      el.current.style.transform = `translateY(${(1 - o) * 8}px)`;
    }
  });
  return (
    <Html position={ANCHORS[c.anchor]} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <div ref={el} className={`callout callout-${c.side}`} style={{ opacity: 0 }}>
        <span className="callout-dot" />
        <span className="callout-line" />
        <span className="callout-text">
          <span className="callout-label">{c.label}</span>
          <span className="callout-value">{c.value}</span>
        </span>
      </div>
    </Html>
  );
}
