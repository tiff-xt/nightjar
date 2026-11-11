"use client";
import { useSyncExternalStore } from "react";
import { debugFlags } from "@/lib/debugFlags";

/** Re-renders when any debug flag changes; returns the `on(flag)` reader. */
export function useDebugFlags() {
  useSyncExternalStore(
    debugFlags.subscribe,
    () => debugFlags.version,
    () => 0,
  );
  return debugFlags.on;
}
