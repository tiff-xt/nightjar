"use client";
import { useEffect } from "react";
import { engine, targetRpm } from "@/lib/engineSound";
import { store } from "@/lib/store";

/**
 * Converts page scroll into continuous story progress (section index +
 * fraction, measured from section centres) and feeds scroll speed to the engine.
 */
export function ScrollDriver() {
  useEffect(() => {
    let raf = 0;
    let lastY = scrollY;
    let lastT = performance.now();
    let speed = 0;
    const tick = (now: number) => {
      const sections = [...document.querySelectorAll<HTMLElement>("[data-shot]")];
      const mid = scrollY + innerHeight / 2;
      const centres = sections.map((s) => s.offsetTop + s.offsetHeight / 2);
      let p = 0;
      if (centres.length) {
        if (mid <= centres[0]) p = 0;
        else if (mid >= centres[centres.length - 1]) p = centres.length - 1;
        else {
          const i = centres.findIndex((c, j) => mid >= c && mid < centres[j + 1]);
          p = i + (mid - centres[i]) / (centres[i + 1] - centres[i]);
        }
      }
      store.progress = p;

      const dt = Math.max(1, now - lastT) / 1000;
      const v = (scrollY - lastY) / dt;
      speed += (v - speed) * 0.2;
      lastY = scrollY;
      lastT = now;
      if (engine.running) engine.update(targetRpm(speed, throttle), dt);
      raf = requestAnimationFrame(tick);
    };
    let throttle = false;
    const down = (e: Event) => {
      if ((e.target as HTMLElement).closest?.("[data-throttle]")) throttle = true;
    };
    const up = () => (throttle = false);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);
  return null;
}
