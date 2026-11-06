import { describe, expect, it } from "vitest";
import { SHOTS, calloutsAt, explodeAt, nightAt, shotAt, window01 } from "@/lib/story";

describe("camera story", () => {
  it("holds exactly on each shot at its section", () => {
    SHOTS.forEach((s, i) => expect(shotAt(i).position).toEqual(s.position));
  });

  it("is continuous between shots (no jumps)", () => {
    let prev = shotAt(0).position;
    for (let p = 0.01; p <= SHOTS.length - 1; p += 0.01) {
      const cur = shotAt(p).position;
      const d = Math.hypot(cur[0] - prev[0], cur[1] - prev[1], cur[2] - prev[2]);
      expect(d).toBeLessThan(0.15);
      prev = cur;
    }
  });

  it("clamps outside the story", () => {
    expect(shotAt(-5)).toEqual(shotAt(0));
    expect(shotAt(99).position).toEqual(SHOTS.at(-1)!.position);
  });
});

describe("effect windows", () => {
  it("window01 is 0 far away and 1 inside", () => {
    expect(window01(0, 3, 3.5)).toBe(0);
    expect(window01(3.2, 3, 3.5)).toBe(1);
    expect(window01(10, 3, 3.5)).toBe(0);
  });

  it("explodes only around the anatomy section and lights up only after dark", () => {
    const exploded = SHOTS.findIndex((s) => s.id === "exploded");
    const dark = SHOTS.findIndex((s) => s.id === "after-dark");
    expect(explodeAt(0)).toBe(0);
    expect(explodeAt(exploded)).toBe(1);
    expect(nightAt(exploded)).toBe(0);
    expect(nightAt(dark)).toBe(1);
    expect(calloutsAt(0, "twin")).toBe(0);
  });
});
