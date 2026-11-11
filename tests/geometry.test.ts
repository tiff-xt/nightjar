import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { tyre } from "@/three/geometry";

/** Count faces whose front side (CCW winding) points away from the tyre's cross-section centre. */
function outwardFaces(geo: THREE.BufferGeometry, sectionRadius: number) {
  const idx = geo.index!;
  const pos = geo.attributes.position;
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3();
  let out = 0,
    total = 0;
  for (let i = 0; i < idx.count; i += 3) {
    a.fromBufferAttribute(pos, idx.getX(i));
    b.fromBufferAttribute(pos, idx.getX(i + 1));
    c.fromBufferAttribute(pos, idx.getX(i + 2));
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    if (n.lengthSq() < 1e-14) continue; // degenerate triangles at the closing seam
    const centre = a.clone().add(b).add(c).divideScalar(3);
    const axis = new THREE.Vector3(centre.x, centre.y, 0).setLength(sectionRadius);
    if (n.dot(centre.clone().sub(axis)) > 0) out++;
    total++;
  }
  return out / total;
}

describe("tyre geometry", () => {
  it("faces point outward, so the tyre is opaque from outside (not back-face culled)", () => {
    const g = tyre(0.214, 0.315, 0.18, 0.144);
    expect(outwardFaces(g, (0.214 + 0.315) / 2)).toBeGreaterThan(0.9);
  });
});
