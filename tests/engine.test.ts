import { describe, expect, it } from "vitest";
import { firingHz, IDLE_RPM, REDLINE, targetRpm } from "@/lib/engineSound";
import { FRAMES, PAINTS } from "@/lib/colorways";

describe("engine model", () => {
  it("fires a 4-stroke twin at rpm/60", () => {
    expect(firingHz(1200)).toBe(20);
    expect(firingHz(6000)).toBe(100);
  });

  it("idles when still and revs with scroll speed or throttle", () => {
    expect(targetRpm(0, false)).toBe(IDLE_RPM);
    expect(targetRpm(1250, false)).toBeGreaterThan(IDLE_RPM);
    expect(targetRpm(-5000, false)).toBe(targetRpm(5000, false));
    expect(targetRpm(0, true)).toBeLessThan(REDLINE);
  });
});

describe("finishes", () => {
  it("are physically plausible", () => {
    for (const f of [...PAINTS, ...FRAMES]) {
      expect(f.color).toMatch(/^#[0-9a-f]{6}$/i);
      for (const v of [f.metalness, f.roughness, f.clearcoat]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
    expect(new Set(PAINTS.map((p) => p.id)).size).toBe(PAINTS.length);
  });
});
