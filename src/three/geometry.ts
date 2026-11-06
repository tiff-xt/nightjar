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

/* ─── Detail kit ─────────────────────────────────────────────────── */

/**
 * Tyre: a lathe of a rounded, superelliptic cross-section, turned to spin
 * around Z. `rim` is the bead radius, `outer` the tread radius.
 */
export function tyre(rim: number, outer: number, width: number, segments = 72) {
  const h = outer - rim;
  const pts: THREE.Vector2[] = [];
  const n = 2.6; // squareness of the profile: rounder crown on sport tyres
  for (let i = 0; i <= 28; i++) {
    const th = (i / 28) * Math.PI;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const x = (width / 2) * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
    const r = rim + h * Math.pow(s, 2 / n);
    pts.push(new THREE.Vector2(r, x));
  }
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.rotateX(Math.PI / 2);
  return geo;
}

/** A band of a circle (fenders, hugger): annulus sector extruded across Z. */
export function arcBand(inner: number, outer: number, from: number, to: number, width: number, bevel = 0.004) {
  const s = new THREE.Shape();
  s.absarc(0, 0, outer, from, to, false);
  s.absarc(0, 0, inner, to, from, true);
  s.closePath();
  const depth = Math.max(0.001, width - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 40,
  });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

/** Brake rotor with a ring of drilled holes and a wavy (petal) outer edge. Faces +Z. */
export function rotor(outer: number, inner: number, holes = 24, thickness = 0.005) {
  const s = new THREE.Shape();
  const petals = 12;
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const r = outer * (1 - 0.025 * (0.5 + 0.5 * Math.cos(a * petals)));
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const hub = new THREE.Path();
  hub.absarc(0, 0, inner, 0, Math.PI * 2, true);
  s.holes.push(hub);
  const ringR = (outer + inner) / 2 + (outer - inner) * 0.08;
  for (let i = 0; i < holes; i++) {
    const a = (i / holes) * Math.PI * 2;
    const rr = ringR + (i % 2 ? 0.012 : -0.012);
    const h = new THREE.Path();
    h.absarc(Math.cos(a) * rr, Math.sin(a) * rr, 0.0045, 0, Math.PI * 2, true);
    s.holes.push(h);
  }
  const geo = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false, curveSegments: 10 });
  geo.translate(0, 0, -thickness / 2);
  return geo;
}

/** Sprocket: toothed disc with lightening holes. Faces +Z. */
export function sprocket(radius: number, teeth: number, thickness = 0.006, windows = 5) {
  const s = new THREE.Shape();
  const tip = radius;
  const root = radius - 0.009;
  const steps = teeth * 4;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const phase = i % 4;
    const r = phase === 1 || phase === 2 ? tip : root;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const hub = new THREE.Path();
  hub.absarc(0, 0, radius * 0.22, 0, Math.PI * 2, true);
  s.holes.push(hub);
  if (windows > 0) {
    for (let i = 0; i < windows; i++) {
      const a = (i / windows) * Math.PI * 2;
      const w = new THREE.Path();
      w.absarc(Math.cos(a) * radius * 0.55, Math.sin(a) * radius * 0.55, radius * 0.2, 0, Math.PI * 2, true);
      s.holes.push(w);
    }
  }
  const geo = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false, curveSegments: 8 });
  geo.translate(0, 0, -thickness / 2);
  return geo;
}

/** Split 'Y' wheel spoke from hub to rim, in the XY plane, pointing along +X. Faces +Z. */
export function ySpoke(hub: number, rim: number, thickness = 0.022) {
  const split = hub + (rim - hub) * 0.55;
  const s = new THREE.Shape();
  s.moveTo(hub, -0.016);
  s.lineTo(split, -0.011);
  s.quadraticCurveTo(rim - 0.02, -0.05, rim + 0.004, -0.058);
  s.lineTo(rim + 0.004, -0.04);
  s.quadraticCurveTo(split + 0.04, -0.012, split + 0.035, 0);
  s.quadraticCurveTo(split + 0.04, 0.012, rim + 0.004, 0.04);
  s.lineTo(rim + 0.004, 0.058);
  s.quadraticCurveTo(rim - 0.02, 0.05, split, 0.011);
  s.lineTo(hub, 0.016);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.003,
    bevelSegments: 2,
    curveSegments: 12,
  });
  geo.translate(0, 0, -thickness / 2);
  return geo;
}

/** A closed loop (e.g. a chain) through points, as a thin tube. */
export function loop(points: P3[], radius: number, segments = 160) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
    true,
    "centripetal",
  );
  return new THREE.TubeGeometry(curve, segments, radius, 6, true);
}

/** Sweep with a squarer section (frame spars, swingarm-like beams). */
export function beam(points: P3[], radius: number, segments = 48) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
    false,
    "centripetal",
  );
  return new THREE.TubeGeometry(curve, segments, radius, 6, false);
}

/** Piecewise-linear lookup through [x, value] stops (stops in any x order). */
export function lerpStops(stops: [number, number][], x: number) {
  const st = [...stops].sort((a, b) => a[0] - b[0]);
  if (x <= st[0][0]) return st[0][1];
  for (let i = 1; i < st.length; i++) {
    if (x <= st[i][0]) {
      const [x0, y0] = st[i - 1];
      const [x1, y1] = st[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return st[st.length - 1][1];
}

/**
 * Taper an extruded side panel across its width: z is scaled by a factor
 * looked up from the vertex's x. Turns slab-like extrusions into organic,
 * narrowing shapes (seats, tails, tanks).
 */
export function taperZ(geo: THREE.BufferGeometry, stops: [number, number][]) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getZ(i) * lerpStops(stops, pos.getX(i)));
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * Motorcycle fender: a thin blade following the wheel, widest in the middle
 * and narrowing to its ends, with an optional pointed beak at the leading
 * end. Angles are radians from +x, counter-clockwise; `from` is the beak end.
 */
export function fender(inner: number, outer: number, from: number, to: number, width: number, beak = 0) {
  const s = new THREE.Shape();
  const n = 48;
  const outerAt = (a: number) => {
    const t = (a - from) / (to - from);
    // Slightly thicker crown, thinning at both ends.
    return outer + (outer - inner) * 0.6 * Math.sin(Math.PI * t);
  };
  for (let i = 0; i <= n; i++) {
    const a = from + ((to - from) * i) / n;
    const r = outerAt(a);
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  for (let i = n; i >= 0; i--) {
    const a = from + ((to - from) * i) / n;
    s.lineTo(Math.cos(a) * inner, Math.sin(a) * inner);
  }
  if (beak > 0) {
    // Pointed lip ahead of the leading end.
    const a = from - 0.12;
    s.lineTo(Math.cos(a) * (inner + beak), Math.sin(a) * (inner + beak));
  }
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: width,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.003,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.translate(0, 0, -width / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const a = Math.atan2(pos.getY(i), pos.getX(i));
    const t = Math.min(1, Math.max(0, (a - from) / (to - from)));
    pos.setZ(i, pos.getZ(i) * (0.4 + 0.6 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.5)));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}
