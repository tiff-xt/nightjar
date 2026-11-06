"use client";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { frameById, paintById } from "@/lib/colorways";
import { store } from "@/lib/store";
import { explodeAt, nightAt } from "@/lib/story";
import { coil, panel, rodTransform, sweep, type P2, type P3 } from "./geometry";

/*
 * Nightjar: an original naked streetfighter, modelled in code.
 * Units are metres. x = forward, y = up, z = rider's left.
 * Wheelbase 1.45 m, 17" wheels.
 */

const REAR: P3 = [-0.72, 0.31, 0];
const FRONT: P3 = [0.73, 0.31, 0];
const HEAD: P3 = [0.47, 0.97, 0];
const PIVOT: P3 = [-0.13, 0.5, 0];
const ACCENT = "#ff3b1f";

/** Exploded-view offsets per assembly (metres at full explode). */
const EXPLODE: Record<string, P3> = {
  bodywork: [0.05, 0.42, 0],
  seat: [-0.12, 0.36, 0],
  front: [0.42, 0.08, 0],
  rear: [-0.42, 0, 0],
  engine: [0, -0.18, 0],
  exhaust: [0, -0.06, 0.42],
  frame: [0, 0.12, 0],
};

type Mats = ReturnType<typeof createMaterials>;

/** One set of materials for the one bike; mutated per frame by the configurator. */
let materials: Mats | null = null;
const getMaterials = () => (materials ??= createMaterials());

function createMaterials() {
  return (() => {
    const physical = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p);
    return {
      paint: physical({ color: "#eef1f6", metalness: 0.82, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 }),
      frame: physical({ color: "#c8ccd3", metalness: 1, roughness: 0.3 }),
      chrome: physical({ color: "#f2f4f8", metalness: 1, roughness: 0.06 }),
      gloss: physical({ color: "#0b0c0f", metalness: 0.2, roughness: 0.28, clearcoat: 0.8 }),
      satinBlack: physical({ color: "#121317", metalness: 0.5, roughness: 0.55 }),
      rubber: physical({ color: "#0a0a0b", metalness: 0, roughness: 0.92 }),
      engine: physical({ color: "#2b2d33", metalness: 0.85, roughness: 0.42 }),
      fins: physical({ color: "#8d929c", metalness: 1, roughness: 0.35 }),
      titanium: physical({ color: "#a89c86", metalness: 1, roughness: 0.28, iridescence: 0.6, iridescenceIOR: 1.6 }),
      carbon: physical({ color: "#16171a", metalness: 0.4, roughness: 0.32, clearcoat: 1 }),
      seat: physical({
        color: "#141416",
        metalness: 0,
        roughness: 0.78,
        sheen: 1,
        sheenColor: new THREE.Color("#3a3a40"),
      }),
      accent: physical({ color: ACCENT, metalness: 0.3, roughness: 0.35, clearcoat: 0.6 }),
      disc: physical({ color: "#b7bcc5", metalness: 1, roughness: 0.25 }),
      headlight: new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#e8f0ff", emissiveIntensity: 0.2 }),
      lens: physical({ color: "#0a0c10", metalness: 0, roughness: 0.05, transmission: 0, clearcoat: 1 }),
      tail: new THREE.MeshStandardMaterial({ color: "#2a0000", emissive: "#ff1a1a", emissiveIntensity: 0.7 }),
    };
  })();
}

function Rod({ a, b, r, material }: { a: P3; b: P3; r: number; material: THREE.Material }) {
  const t = useMemo(() => rodTransform(a, b), [a, b]);
  return (
    <mesh position={t.position} quaternion={t.quaternion} material={material} castShadow>
      <cylinderGeometry args={[r, r, t.length, 16]} />
    </mesh>
  );
}

/** Mirror a part across the bike's centre plane. */
function Pair({ children }: { children: (side: 1 | -1) => React.ReactNode }) {
  return (
    <>
      {children(1)}
      {children(-1)}
    </>
  );
}

function Wheel({ at, width, m, front }: { at: P3; width: number; m: Mats; front?: boolean }) {
  const spokes = 5;
  return (
    <group position={at}>
      {/* Tyre */}
      <mesh material={m.rubber} scale={[1, 1, width]} castShadow>
        <torusGeometry args={[0.252, 0.058, 20, 64]} />
      </mesh>
      {/* Rim lips and accent pinstripe */}
      <Pair>
        {(s) => (
          <mesh key={s} position={[0, 0, s * 0.045 * width]} material={m.gloss}>
            <torusGeometry args={[0.205, 0.011, 10, 64]} />
          </mesh>
        )}
      </Pair>
      <mesh position={[0, 0, 0.056 * width]} material={m.accent}>
        <torusGeometry args={[0.197, 0.0022, 6, 64]} />
      </mesh>
      {/* Split spokes */}
      {Array.from({ length: spokes }, (_, i) =>
        [-0.11, 0.11].map((off) => {
          const a = (i / spokes) * Math.PI * 2 + off;
          return (
            <mesh
              key={`${i}${off}`}
              rotation={[0, 0, a]}
              position={[Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0]}
              material={m.gloss}
            >
              <boxGeometry args={[0.17, 0.016, 0.03]} />
            </mesh>
          );
        }),
      )}
      {/* Hub */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={m.satinBlack}>
        <cylinderGeometry args={[0.045, 0.045, 0.16 * width, 24]} />
      </mesh>
      {/* Brake discs and calipers */}
      {(front ? [1, -1] : [-1]).map((s) => (
        <group key={s} position={[0, 0, s * 0.075 * width]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={m.disc}>
            <cylinderGeometry args={[front ? 0.16 : 0.12, front ? 0.16 : 0.12, 0.005, 48]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={m.satinBlack}>
            <cylinderGeometry args={[0.06, 0.06, 0.008, 24]} />
          </mesh>
          <mesh
            position={front ? [-0.1, 0.11, s * 0.01] : [-0.06, -0.09, s * 0.01]}
            rotation={[0, 0, front ? 0.8 : -0.5]}
            material={m.accent}
          >
            <boxGeometry args={[0.1, 0.04, 0.035]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Frame({ m }: { m: Mats }) {
  // Trellis nodes on each side (z = ±0.11); triangulated like the real thing.
  const n = (x: number, y: number, s: number): P3 => [x, y, s * 0.11];
  const tubes = (s: 1 | -1): [P3, P3][] => {
    const A = n(0.41, 0.93, s),
      B = n(0.14, 0.9, s),
      C = n(-0.1, 0.86, s),
      D = n(-0.12, 0.54, s),
      E = n(0.3, 0.68, s),
      F = n(0.1, 0.63, s),
      G = n(-0.04, 0.73, s);
    const head: P3 = [HEAD[0] - 0.03, HEAD[1] - 0.02, 0];
    return [
      [head, A],
      [[HEAD[0] - 0.05, HEAD[1] - 0.16, 0], E],
      [A, B],
      [B, C],
      [A, E],
      [E, B],
      [E, F],
      [B, F],
      [F, G],
      [B, G],
      [G, C],
      [G, D],
      [C, D],
      // Subframe up to the tail
      [C, n(-0.58, 0.96, s * 0.7)],
      [D, n(-0.48, 0.88, s * 0.75)],
      [n(-0.48, 0.88, s * 0.75), n(-0.58, 0.96, s * 0.7)],
    ];
  };
  return (
    <group>
      {/* Steering head */}
      <Rod
        a={[HEAD[0] - 0.04, HEAD[1] - 0.12, 0]}
        b={[HEAD[0] + 0.01, HEAD[1] + 0.02, 0]}
        r={0.034}
        material={m.frame}
      />
      <Pair>
        {(s) => tubes(s).map(([a, b], i) => <Rod key={`${s}${i}`} a={a} b={b} r={0.0125} material={m.frame} />)}
      </Pair>
    </group>
  );
}

function Engine({ m }: { m: Mats }) {
  const fins = (count: number) =>
    Array.from({ length: count }, (_, i) => (
      <mesh key={i} position={[0, -0.1 + i * 0.026, 0]} material={m.fins}>
        <boxGeometry args={[0.19, 0.008, 0.23]} />
      </mesh>
    ));
  return (
    <group position={[0.02, 0, 0]}>
      {/* Crankcase */}
      <mesh position={[0, 0.43, 0]} material={m.engine} castShadow>
        <boxGeometry args={[0.42, 0.24, 0.27]} />
      </mesh>
      <mesh position={[-0.06, 0.32, 0]} material={m.engine}>
        <boxGeometry args={[0.3, 0.1, 0.2]} />
      </mesh>
      {/* 75° V: front and rear cylinders with cooling fins */}
      <group position={[0.14, 0.64, 0]} rotation={[0, 0, -0.66]}>
        <mesh material={m.engine}>
          <boxGeometry args={[0.15, 0.28, 0.2]} />
        </mesh>
        {fins(8)}
        <mesh position={[0, 0.16, 0]} material={m.satinBlack}>
          <boxGeometry args={[0.17, 0.05, 0.22]} />
        </mesh>
      </group>
      <group position={[-0.1, 0.66, 0]} rotation={[0, 0, 0.66]}>
        <mesh material={m.engine}>
          <boxGeometry args={[0.15, 0.28, 0.2]} />
        </mesh>
        {fins(8)}
        <mesh position={[0, 0.16, 0]} material={m.satinBlack}>
          <boxGeometry args={[0.17, 0.05, 0.22]} />
        </mesh>
      </group>
      {/* Side covers: clutch (right) and stator (left), with accent rings */}
      {[1, -1].map((s) => (
        <group key={s} position={[s > 0 ? -0.02 : 0.04, 0.43, s * 0.142]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh material={m.fins}>
            <cylinderGeometry args={[0.105, 0.115, 0.03, 40]} />
          </mesh>
          <mesh position={[0, s * 0.017, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.accent}>
            <torusGeometry args={[0.08, 0.005, 8, 48]} />
          </mesh>
        </group>
      ))}
      {/* Radiator */}
      <group position={[0.37, 0.62, 0]} rotation={[0, 0, 0.12]}>
        <mesh material={m.satinBlack}>
          <boxGeometry args={[0.05, 0.3, 0.34]} />
        </mesh>
        {Array.from({ length: 12 }, (_, i) => (
          <mesh key={i} position={[0.027, -0.13 + i * 0.024, 0]} material={m.fins}>
            <boxGeometry args={[0.004, 0.006, 0.32]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Exhaust({ m }: { m: Mats }) {
  const headers = useMemo(
    () => [
      sweep(
        [
          [0.27, 0.74, 0.05],
          [0.38, 0.55, 0.06],
          [0.33, 0.3, 0.07],
          [0.05, 0.24, 0.1],
          [-0.22, 0.32, 0.16],
          [-0.3, 0.38, 0.18],
        ],
        0.024,
      ),
      sweep(
        [
          [-0.21, 0.78, -0.04],
          [-0.24, 0.6, 0.06],
          [-0.2, 0.44, 0.15],
          [-0.3, 0.39, 0.18],
        ],
        0.022,
      ),
    ],
    [],
  );
  const can = rodTransform([-0.28, 0.4, 0.19], [-0.7, 0.58, 0.21]);
  return (
    <group>
      {headers.map((g, i) => (
        <mesh key={i} geometry={g} material={m.titanium} castShadow />
      ))}
      <mesh position={can.position} quaternion={can.quaternion} material={m.chrome} castShadow>
        <cylinderGeometry args={[0.07, 0.062, can.length, 32]} />
      </mesh>
      {/* Carbon end cap and heat shield */}
      <mesh position={[-0.71, 0.585, 0.21]} quaternion={can.quaternion} material={m.carbon}>
        <cylinderGeometry args={[0.064, 0.074, 0.06, 32]} />
      </mesh>
      <mesh
        position={can.position.clone().add(new THREE.Vector3(0, 0.035, 0.035))}
        quaternion={can.quaternion}
        material={m.carbon}
      >
        <boxGeometry args={[0.07, can.length * 0.7, 0.012]} />
      </mesh>
    </group>
  );
}

function Bodywork({ m }: { m: Mats }) {
  const geo = useMemo(() => {
    // Side profiles (x forward, y up): sharp, faceted, streetfighter.
    const tank: P2[] = [
      [-0.06, 0.86],
      [0.0, 0.99],
      [0.2, 1.06],
      [0.37, 1.05],
      [0.45, 0.98],
      [0.4, 0.86],
      [0.16, 0.81],
    ];
    const shroud: P2[] = [
      [0.16, 0.97],
      [0.44, 1.01],
      [0.56, 0.9],
      [0.5, 0.8],
      [0.38, 0.7],
      [0.3, 0.76],
      [0.24, 0.86],
    ];
    const stripe: P2[] = [
      [0.28, 0.9],
      [0.5, 0.92],
      [0.52, 0.895],
      [0.3, 0.875],
    ];
    const cowl: P2[] = [
      [0.5, 1.04],
      [0.62, 1.0],
      [0.68, 0.9],
      [0.62, 0.8],
      [0.53, 0.82],
      [0.5, 0.92],
    ];
    const tail: P2[] = [
      [-0.36, 0.95],
      [-0.62, 1.02],
      [-0.8, 1.08],
      [-0.76, 1.02],
      [-0.6, 0.94],
      [-0.4, 0.89],
    ];
    const tailSide: P2[] = [
      [-0.38, 0.9],
      [-0.66, 0.99],
      [-0.72, 0.97],
      [-0.5, 0.86],
    ];
    const belly: P2[] = [
      [0.25, 0.28],
      [-0.2, 0.26],
      [-0.26, 0.33],
      [0.2, 0.36],
    ];
    const fender: P2[] = [
      [0.62, 0.62],
      [0.74, 0.64],
      [0.88, 0.58],
      [0.95, 0.5],
      [0.9, 0.5],
      [0.76, 0.58],
      [0.64, 0.58],
    ];
    return {
      tank: panel(tank, 0.34, 0, 0.03),
      shroudL: panel(shroud, 0.03, 0.19, 0.01),
      shroudR: panel(shroud, 0.03, -0.19, 0.01),
      stripeL: panel(stripe, 0.006, 0.207, 0.002),
      stripeR: panel(stripe, 0.006, -0.207, 0.002),
      cowl: panel(cowl, 0.22, 0, 0.02),
      tail: panel(tail, 0.2, 0, 0.02),
      tailSideL: panel(tailSide, 0.02, 0.1, 0.006),
      tailSideR: panel(tailSide, 0.02, -0.1, 0.006),
      belly: panel(belly, 0.3, 0, 0.015),
      fender: panel(fender, 0.15, 0, 0.012),
    };
  }, []);
  return (
    <group>
      <mesh geometry={geo.tank} material={m.paint} castShadow />
      <mesh geometry={geo.shroudL} material={m.paint} rotation={[0, -0.12, 0]} castShadow />
      <mesh geometry={geo.shroudR} material={m.paint} rotation={[0, 0.12, 0]} castShadow />
      <mesh geometry={geo.stripeL} material={m.accent} rotation={[0, -0.12, 0]} />
      <mesh geometry={geo.stripeR} material={m.accent} rotation={[0, 0.12, 0]} />
      <mesh geometry={geo.cowl} material={m.gloss} castShadow />
      <mesh geometry={geo.tail} material={m.paint} castShadow />
      <mesh geometry={geo.tailSideL} material={m.gloss} />
      <mesh geometry={geo.tailSideR} material={m.gloss} />
      <mesh geometry={geo.belly} material={m.gloss} />
      {/* Tail light strip */}
      <mesh position={[-0.79, 1.055, 0]} rotation={[0, 0, 0.35]} material={m.tail}>
        <boxGeometry args={[0.012, 0.03, 0.16]} />
      </mesh>
      {/* Twin LED "eyes" on the headlight cowl */}
      <Pair>
        {(s) => (
          <mesh key={s} position={[0.676, 0.935, s * 0.05]} rotation={[0, 0, 0.62]} material={m.headlight}>
            <boxGeometry args={[0.014, 0.085, 0.05]} />
          </mesh>
        )}
      </Pair>
      <mesh position={[0.672, 0.86, 0]} material={m.lens}>
        <boxGeometry args={[0.02, 0.05, 0.12]} />
      </mesh>
    </group>
  );
}

function FrontEnd({ m }: { m: Mats }) {
  const bars = useMemo(
    () =>
      sweep(
        [
          [0.4, 1.1, 0.36],
          [0.44, 1.09, 0.18],
          [0.45, 1.08, 0],
          [0.44, 1.09, -0.18],
          [0.4, 1.1, -0.36],
        ],
        0.012,
      ),
    [],
  );
  const top: P3 = [HEAD[0] + 0.01, HEAD[1] + 0.05, 0];
  return (
    <group>
      <Wheel at={FRONT} width={1} m={m} front />
      {/* Inverted forks: black outer tubes up top, chrome stanchions below */}
      <Pair>
        {(s) => {
          const axle: P3 = [FRONT[0], FRONT[1], s * 0.1];
          const mid: P3 = [FRONT[0] - 0.13, FRONT[1] + 0.34, s * 0.1];
          const clamp: P3 = [top[0], top[1], s * 0.1];
          return (
            <group key={s}>
              <Rod a={axle} b={mid} r={0.019} material={m.chrome} />
              <Rod a={mid} b={clamp} r={0.027} material={m.gloss} />
              <Rod
                a={[mid[0] + 0.01, mid[1] - 0.03, mid[2]]}
                b={[mid[0] - 0.005, mid[1] + 0.02, mid[2]]}
                r={0.03}
                material={m.accent}
              />
            </group>
          );
        }}
      </Pair>
      {/* Triple clamp and bars */}
      <mesh position={top} rotation={[0, 0, -0.42]} material={m.satinBlack}>
        <boxGeometry args={[0.09, 0.025, 0.26]} />
      </mesh>
      <mesh geometry={bars} material={m.satinBlack} />
      <Pair>
        {(s) => (
          <group key={s}>
            <Rod a={[0.4, 1.1, s * 0.3]} b={[0.395, 1.1, s * 0.38]} r={0.017} material={m.rubber} />
            <Rod a={[0.43, 1.1, s * 0.26]} b={[0.42, 1.2, s * 0.3]} r={0.005} material={m.satinBlack} />
            <mesh position={[0.42, 1.22, s * 0.32]} rotation={[0, s * 0.3, 0]} material={m.satinBlack}>
              <boxGeometry args={[0.02, 0.05, 0.09]} />
            </mesh>
          </group>
        )}
      </Pair>
    </group>
  );
}

function RearEnd({ m }: { m: Mats }) {
  const spring = useMemo(() => coil([-0.34, 0.5, 0], [-0.13, 0.8, 0], 0.035, 7, 0.006), []);
  return (
    <group>
      <Wheel at={REAR} width={1.3} m={m} />
      {/* Swingarm: tapered box beams + brace */}
      <Pair>
        {(s) => {
          const t = rodTransform([PIVOT[0], PIVOT[1], s * 0.13], [REAR[0], REAR[1], s * 0.13]);
          return (
            <mesh key={s} position={t.position} quaternion={t.quaternion} material={m.frame} castShadow>
              <boxGeometry args={[0.07, t.length, 0.035]} />
            </mesh>
          );
        }}
      </Pair>
      <Rod a={[-0.3, 0.44, 0.13]} b={[-0.3, 0.44, -0.13]} r={0.015} material={m.frame} />
      {/* Shock with accent spring */}
      <Rod a={[-0.34, 0.5, 0]} b={[-0.13, 0.8, 0]} r={0.016} material={m.chrome} />
      <mesh geometry={spring} material={m.accent} />
      {/* Chain and sprocket (left side) */}
      <Rod a={[-0.06, 0.45, 0.115]} b={[REAR[0], REAR[1] + 0.09, 0.115]} r={0.007} material={m.satinBlack} />
      <Rod a={[-0.06, 0.39, 0.115]} b={[REAR[0], REAR[1] - 0.09, 0.115]} r={0.007} material={m.satinBlack} />
      <mesh position={[REAR[0], REAR[1], 0.115]} rotation={[Math.PI / 2, 0, 0]} material={m.disc}>
        <cylinderGeometry args={[0.1, 0.1, 0.008, 40]} />
      </mesh>
      {/* Pegs */}
      <Pair>
        {(s) => <Rod key={s} a={[-0.2, 0.45, s * 0.14]} b={[-0.2, 0.45, s * 0.24]} r={0.012} material={m.fins} />}
      </Pair>
    </group>
  );
}

function Seat({ m }: { m: Mats }) {
  const geo = useMemo(
    () =>
      panel(
        [
          [-0.42, 0.93],
          [-0.05, 0.9],
          [0.0, 0.95],
          [-0.15, 0.97],
          [-0.42, 1.0],
        ],
        0.27,
        0,
        0.035,
      ),
    [],
  );
  return <mesh geometry={geo} material={m.seat} castShadow />;
}

/** One assembly that slides out along its explode vector. */
function Assembly({ name, children }: { name: keyof typeof EXPLODE; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const v = EXPLODE[name];
  useFrame(() => {
    const e = explodeAt(store.progress);
    ref.current?.position.set(v[0] * e, v[1] * e, v[2] * e);
  });
  return <group ref={ref}>{children}</group>;
}

/** Visible headlight beam: an open cone with a soft additive falloff, only after dark. */
const beamMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
  uniforms: { uOpacity: { value: 0 } },
  vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform float uOpacity; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main(){ float along=pow(vUv.y,1.6); float edge=pow(abs(dot(vN,vV)),1.5);
      gl_FragColor=vec4(vec3(0.85,0.9,1.0), along*edge*uOpacity); }`,
});

function Beam() {
  useFrame(() => {
    beamMaterial.uniforms.uOpacity.value = nightAt(store.progress) * 0.28;
  });
  // Cone apex at the headlight, opening forward along +x.
  return (
    <mesh position={[0.68 + 1.6, 0.6, 0]} rotation={[0, 0, Math.PI / 2 + 0.12]} material={beamMaterial}>
      <coneGeometry args={[0.85, 3.2, 48, 1, true]} />
    </mesh>
  );
}

export function Bike() {
  const m = getMaterials();

  // Apply configurator finishes and night-mode emissives each frame (cheap: a few uniforms).
  useFrame(() => {
    const m = getMaterials();
    const p = paintById(store.paint);
    const f = frameById(store.frame);
    m.paint.color.lerp(new THREE.Color(p.color), 0.12);
    m.paint.metalness += (p.metalness - m.paint.metalness) * 0.12;
    m.paint.roughness += (p.roughness - m.paint.roughness) * 0.12;
    m.paint.clearcoat += (p.clearcoat - m.paint.clearcoat) * 0.12;
    m.frame.color.lerp(new THREE.Color(f.color), 0.12);
    m.frame.metalness += (f.metalness - m.frame.metalness) * 0.12;
    m.frame.roughness += (f.roughness - m.frame.roughness) * 0.12;
    const night = nightAt(store.progress);
    m.headlight.emissiveIntensity = 0.3 + night * 9;
    m.tail.emissiveIntensity = 0.7 + night * 1.6;
  });

  return (
    <group>
      <Assembly name="frame">
        <Frame m={m} />
      </Assembly>
      <Assembly name="engine">
        <Engine m={m} />
      </Assembly>
      <Assembly name="exhaust">
        <Exhaust m={m} />
      </Assembly>
      <Assembly name="bodywork">
        <Bodywork m={m} />
      </Assembly>
      <Assembly name="seat">
        <Seat m={m} />
      </Assembly>
      <Assembly name="front">
        <FrontEnd m={m} />
      </Assembly>
      <Beam />
      <Assembly name="rear">
        <RearEnd m={m} />
      </Assembly>
    </group>
  );
}

/** World-space anchor points for HTML callouts. */
export const ANCHORS = {
  trellis: [0.12, 0.9, 0.12] as P3,
  tank: [0.25, 1.06, 0.1] as P3,
  engine: [0.02, 0.43, 0.16] as P3,
  cylinders: [0.14, 0.75, 0.1] as P3,
  exhaust: [-0.5, 0.5, 0.22] as P3,
  shock: [-0.22, 0.66, 0.05] as P3,
  headlight: [0.67, 0.92, 0.05] as P3,
};
