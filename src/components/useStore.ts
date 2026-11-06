"use client";
import { useSyncExternalStore } from "react";
import { store } from "@/lib/store";

export function useStore<T>(read: () => T, server: T) {
  return useSyncExternalStore(store.subscribe, read, () => server);
}
