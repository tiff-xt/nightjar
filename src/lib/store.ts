/**
 * Shared state between the HTML story and the 3D scene. Per-frame values
 * (progress, rpm) are plain mutable fields read by the render loop; choices
 * that change the UI go through emit() so React re-renders only for those.
 */
type Listener = () => void;

class Store {
  /** Continuous story position: section index + fraction (0 = hero). */
  progress = 0;
  paint = "liquid-silver";
  frame = "satin";
  engineOn = false;
  rpm = 0;
  /** User drag rotation in the configurator, radians. */
  spin = 0;

  private listeners = new Set<Listener>();
  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  emit() {
    this.listeners.forEach((l) => l());
  }
  set<K extends "paint" | "frame" | "engineOn">(key: K, value: Store[K]) {
    (this as Store)[key] = value;
    this.emit();
  }
}

export const store = new Store();
