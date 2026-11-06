import * as THREE from "three";

/**
 * Small geometry kit for building a motorcycle from code:
 * straight tubes between two points, swept tubes along curves, and angular
 * side-profile panels extruded to a width (the faceted streetfighter look).
 */

export type P3 = [number, number, number];
export type P2 = [number, number];

const UP = new THREE.Vector3(0, 1, 0);

/** Transform for a unit cylinder (height 1 along Y) so it spans a → b. */
export function rodTransform(a: P3, b: P3) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const length = dir.length();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
  const position = va.add(vb).multiplyScalar(0.5);
  return { position, quaternion, length };
}

export function sweep(points: P3[], radius: number, segments = 48, radial = 14) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
    false,
    "centripetal",
  );
  return new THREE.TubeGeometry(curve, segments, radius, radial, false);
}

/** Helix along a → b, for coil springs. */
export function coil(a: P3, b: P3, radius: number, turns: number, wire: number) {
  const { position, quaternion, length } = rodTransform(a, b);
  const pts: THREE.Vector3[] = [];
  const n = turns * 24;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const ang = t * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(ang) * radius, (t - 0.5) * length, Math.sin(ang) * radius));
  }
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, wire, 8, false);
  geo.applyQuaternion(quaternion);
  geo.translate(position.x, position.y, position.z);
  return geo;
}

/**
 * Extrude a side-profile polygon (x forward, y up) to `width` across z,
 * centred on `z`, with a crisp bevel so edges catch the light.
 */
export function panel(profile: P2[], width: number, z = 0, bevel = 0.012) {
  const shape = new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x, y)));
  const depth = Math.max(0.001, width - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 12,
  });
  geo.translate(0, 0, z - depth / 2);
  geo.computeVertexNormals();
  return geo;
}
