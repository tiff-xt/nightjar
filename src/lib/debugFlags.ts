/**
 * Render-debug switches, enabled with ?debug in the URL. Lets a viewer turn
 * individual graphics features off live to isolate GPU-specific artefacts.
 * With no ?debug, every feature is on and the panel never renders.
 */
export const FLAGS = {
  post: "All post-processing",
  bloom: "Bloom (glow)",
  chroma: "Chromatic aberration",
  grain: "Film grain",
  vignette: "Vignette",
  smaa: "SMAA anti-aliasing",
  haze: "Spotlight haze",
  shadows: "Shadows",
  ground: "Ground shadow",
  floor: "Floor",
  motion: "Camera parallax + turntable",
} as const;
export type Flag = keyof typeof FLAGS;

type Listener = () => void;

class DebugFlags {
  enabled = false;
  private off = new Set<Flag>();
  private listeners = new Set<Listener>();
  version = 0;

  init() {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(location.search);
    this.enabled = q.has("debug");
    for (const f of (q.get("off") ?? "").split(",")) if (f in FLAGS) this.off.add(f as Flag);
  }
  on = (f: Flag) => !this.off.has(f);
  toggle(f: Flag) {
    if (this.off.has(f)) this.off.delete(f);
    else this.off.add(f);
    this.version++;
    // Keep the state in the URL so a configuration can be shared or reloaded.
    const url = new URL(location.href);
    if (this.off.size) url.searchParams.set("off", [...this.off].join(","));
    else url.searchParams.delete("off");
    history.replaceState(null, "", url);
    this.listeners.forEach((l) => l());
  }
  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
}

export const debugFlags = new DebugFlags();
debugFlags.init();
