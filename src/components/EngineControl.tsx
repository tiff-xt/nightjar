"use client";
import { useEffect, useRef } from "react";
import { engine, REDLINE } from "@/lib/engineSound";
import { store } from "@/lib/store";
import { useStore } from "./useStore";

/** Ignition + throttle + a live tachometer. */
export function EngineControl() {
  const on = useStore(() => store.engineOn, false);
  const needle = useRef<HTMLSpanElement>(null);
  const readout = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const tick = () => {
      const r = engine.rpm;
      if (needle.current) needle.current.style.transform = `scaleX(${Math.min(1, r / REDLINE)})`;
      if (readout.current) readout.current.textContent = String(Math.round(r / 50) * 50).padStart(5, " ");
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);

  const toggle = async () => {
    if (on) engine.stop();
    else await engine.start();
    store.set("engineOn", !on);
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 sm:bottom-6 sm:right-6">
      {on && (
        <div className="hud flex h-11 items-center gap-3 rounded-full px-4" aria-hidden>
          <span className="relative block h-1 w-20 overflow-hidden rounded-full bg-white/10">
            <span
              ref={needle}
              className="absolute inset-0 origin-left bg-[var(--ember)]"
              style={{ transform: "scaleX(0)" }}
            />
          </span>
          <span ref={readout} className="w-12 text-right font-mono text-[11px] tabular-nums text-white/80" />
          <span className="font-mono text-[10px] text-white/40">RPM</span>
        </div>
      )}
      {on && (
        <button
          type="button"
          data-throttle
          className="hud h-11 select-none rounded-full px-4 font-mono text-[11px] uppercase tracking-widest text-white active:bg-white/15"
        >
          Hold to rev
        </button>
      )}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        className="hud group flex h-11 items-center gap-2 rounded-full pl-3 pr-4 font-mono text-[11px] uppercase tracking-widest text-white"
      >
        <span
          className={`size-2 rounded-full transition-colors ${on ? "bg-[var(--ember)] shadow-[0_0_10px_var(--ember)]" : "bg-white/30"}`}
        />
        {on ? "Kill engine" : "Start engine"}
      </button>
    </div>
  );
}
