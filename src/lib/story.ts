/**
 * The scroll story: one camera keyframe per section, plus the effects that
 * fade in and out across it. Pure functions of `progress`, so they're tested.
 */
export type Vec3 = [number, number, number];
/** shift: horizontal framing (film offset). Positive pushes the bike right, clear of left-aligned copy. */
export type Shot = { id: string; position: Vec3; target: Vec3; fov: number; shift: number };

export const SHOTS: Shot[] = [
  { id: "hero", position: [3.1, 0.9, 3.0], target: [0, 0.62, 0], fov: 30, shift: 4.5 },
  { id: "trellis", position: [0.5, 1.5, 3.3], target: [0.05, 0.78, 0], fov: 30, shift: 5 },
  { id: "twin", position: [0.9, 0.62, 1.9], target: [0.05, 0.52, 0], fov: 32, shift: -6 },
  { id: "exploded", position: [2.8, 2.2, 3.5], target: [0, 0.7, 0], fov: 34, shift: 2 },
  { id: "after-dark", position: [3.6, 0.8, 1.2], target: [0, 0.72, 0], fov: 30, shift: 6 },
  { id: "build", position: [0.2, 1.1, 3.9], target: [0, 0.62, 0], fov: 30, shift: 6.5 },
  { id: "specs", position: [-3.0, 1.0, 2.8], target: [0, 0.6, 0], fov: 32, shift: -6 },
];

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** Camera for a continuous progress value; holds on each shot, eases between. */
export function shotAt(progress: number): Shot {
  const p = clamp(progress, 0, SHOTS.length - 1);
  const i = Math.min(Math.floor(p), SHOTS.length - 2);
  // Hold for the first 35% of each section, then travel.
  const t = smooth(clamp((p - i - 0.35) / 0.65));
  const a = SHOTS[i];
  const b = SHOTS[i + 1];
  return {
    id: t < 0.5 ? a.id : b.id,
    position: lerp3(a.position, b.position, t),
    target: lerp3(a.target, b.target, t),
    fov: lerp(a.fov, b.fov, t),
    shift: lerp(a.shift, b.shift, t),
  };
}

/** A pulse that is 1 across [start, end] with eased ramps of `ramp` either side. */
export function window01(p: number, start: number, end: number, ramp = 0.35) {
  return smooth(clamp((p - (start - ramp)) / ramp)) * (1 - smooth(clamp((p - end) / ramp)));
}

const idx = (id: string) => SHOTS.findIndex((s) => s.id === id);

/** How far the bike is pulled apart. */
export const explodeAt = (p: number) => window01(p, idx("exploded") - 0.1, idx("exploded") + 0.25, 0.45);
/** Headlight on, garage lights down. */
export const nightAt = (p: number) => window01(p, idx("after-dark") - 0.1, idx("after-dark") + 0.3, 0.4);
/** Callout labels for a section are visible near its hold point. */
export const calloutsAt = (p: number, id: string) => window01(p, idx(id) - 0.05, idx(id) + 0.3, 0.2);

/**
 * Story progress from the viewport midline and the section centres (page Y):
 * the section index plus the fraction of the way to the next centre.
 */
export function progressFromCentres(mid: number, centres: number[]): number {
  const n = centres.length;
  if (n === 0 || mid <= centres[0]) return 0;
  if (mid >= centres[n - 1]) return n - 1;
  for (let i = 0; i < n - 1; i++) {
    if (mid >= centres[i] && mid < centres[i + 1]) return i + (mid - centres[i]) / (centres[i + 1] - centres[i]);
  }
  return n - 1;
}

/** Keys that hold the throttle when the "Hold to rev" button has focus (same keys that press a button). */
export const isThrottleKey = (key: string) => key === " " || key === "Enter";
