"use client";
import { useEffect } from "react";
import { engine, targetRpm } from "@/lib/engineSound";
import { store } from "@/lib/store";
import { isThrottleKey, progressFromCentres } from "@/lib/story";

const onThrottle = (e: Event) => !!(e.target as HTMLElement | null)?.closest?.("[data-throttle]");

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
    // Section centres are measured only when layout changes, not every frame:
    // reading offsetTop after the scene writes styles forces a synchronous reflow.
    let centres: number[] = [];
    const measure = () => {
      centres = [...document.querySelectorAll<HTMLElement>("[data-shot]")].map((s) => s.offsetTop + s.offsetHeight / 2);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);

    const tick = (now: number) => {
      store.progress = progressFromCentres(scrollY + innerHeight / 2, centres);

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
      if (onThrottle(e)) throttle = true;
    };
    const up = () => (throttle = false);
    // Keyboard: hold Space or Enter on the focused "Hold to rev" button.
    const keyDown = (e: KeyboardEvent) => {
      if (!isThrottleKey(e.key) || !onThrottle(e)) return;
      e.preventDefault();
      throttle = true;
    };
    const keyUp = (e: KeyboardEvent) => {
      if (isThrottleKey(e.key)) throttle = false;
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", up);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", up);
    };
  }, []);
  return null;
}
