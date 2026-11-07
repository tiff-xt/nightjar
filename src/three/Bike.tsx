"use client";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { frameById, paintById } from "@/lib/colorways";
import { store } from "@/lib/store";
import { explodeAt, nightAt } from "@/lib/story";
import {
  fender,
  taperZ,
  arcBand,
  beam,
  coil,
  loop,
  panel,
  rodTransform,
  rotor,
  sprocket,
  sweep,
  tyre,
  ySpoke,
  type P2,
  type P3,
} from "./geometry";

/*
 * Nightjar: an original naked roadster, modelled in code.
 * Proportions follow the modern middleweight-naked recipe: a compact
 * forward-tilted parallel twin hung from a steel diamond frame, a tall
 * angular tank with blade shrouds, a short upswept tail and a stubby,
 * low-slung exhaust. No real brand's design, logos or graphics.
 *
 * Units are metres. x = forward, y = up, z = rider's left.
 * Wheelbase 1.49 m, 17" wheels, 25° rake.
 */

const FRONT: P3 = [0.78, 0.3, 0];
const REAR: P3 = [-0.71, 0.315, 0];
const PIVOT: P3 = [-0.15, 0.5, 0];
const RAKE = 0.4363; // 25°
/** Point along the fork axis, s metres up from the front axle. */
const fork = (s: number, z = 0, back = 0): P3 => [
  FRONT[0] - Math.sin(RAKE) * s - Math.cos(RAKE) * back,
  FRONT[1] + Math.cos(RAKE) * s - Math.sin(RAKE) * back,
  z,
];

/** Exploded-view offsets per assembly (metres at full explode). */
const EXPLODE: Record<string, P3> = {
  bodywork: [0.05, 0.42, 0],
  seat: [-0.12, 0.36, 0],
  front: [0.42, 0.08, 0],
  rear: [-0.42, 0, 0],
  engine: [0, -0.18, 0],
  exhaust: [0, -0.06, -0.42],
  frame: [0, 0.12, 0],
};

type Mats = ReturnType<typeof createMaterials>;

/** One set of materials for the one bike; mutated per frame by the configurator. */
let materials: Mats | null = null;
const getMaterials = () => (materials ??= createMaterials());

const RED = "#a3161b";

function createMaterials() {
  const physical = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p);
  return {
    /** Bodywork paint (configurator). Default: deep gloss black. */
    paint: physical({ color: "#0b0c0f", metalness: 0.45, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.2 }),
    /** Frame, subframe, pivot plates (configurator). Default: gunmetal. */
    frame: physical({ color: "#8e1519", metalness: 0.6, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.1 }),
    gunmetal: physical({ color: "#4a4e57", metalness: 0.92, roughness: 0.3, clearcoat: 0.3 }),
    alloy: physical({ color: "#5d616b", metalness: 0.95, roughness: 0.26 }),
    /** Small highlights: silver on black. */
    accent: physical({ color: "#b3b8c1", metalness: 1, roughness: 0.2 }),
    red: physical({ color: RED, metalness: 0.5, roughness: 0.3, clearcoat: 0.8 }),
    gloss: physical({ color: "#0d0e11", metalness: 0.3, roughness: 0.22, clearcoat: 1 }),
    satinBlack: physical({ color: "#141519", metalness: 0.45, roughness: 0.55 }),
    rubber: physical({ color: "#0b0b0c", metalness: 0, roughness: 0.9 }),
    tyreWall: physical({ color: "#111113", metalness: 0, roughness: 0.75 }),
    engine: physical({ color: "#1d1e22", metalness: 0.75, roughness: 0.48 }),
    fins: physical({ color: "#5a5f69", metalness: 1, roughness: 0.32 }),
    stanchion: physical({ color: "#b8bcc4", metalness: 1, roughness: 0.1 }),
    brushed: physical({ color: "#d3d6dc", metalness: 0.8, roughness: 0.42 }),
    steel: physical({ color: "#a9aeb7", metalness: 1, roughness: 0.22 }),
    exhaust: physical({ color: "#55524f", metalness: 1, roughness: 0.3, iridescence: 0.5, iridescenceIOR: 1.7 }),
    carbon: physical({ color: "#17181b", metalness: 0.4, roughness: 0.3, clearcoat: 1 }),
    seat: physical({
      color: "#131315",
      metalness: 0,
      roughness: 0.82,
      sheen: 1,
      sheenColor: new THREE.Color("#3a3a40"),
    }),
    headlight: new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#e8f0ff", emissiveIntensity: 0.3 }),
    lens: physical({ color: "#07080b", metalness: 0.2, roughness: 0.04, clearcoat: 1 }),
    tail: new THREE.MeshStandardMaterial({ color: "#2a0000", emissive: "#ff1a1a", emissiveIntensity: 0.7 }),
    amber: new THREE.MeshStandardMaterial({ color: "#3a2400", emissive: "#ff9a1f", emissiveIntensity: 0.25 }),
    screen: new THREE.MeshStandardMaterial({ color: "#05070c", emissive: "#3a6dff", emissiveIntensity: 0.35 }),
  };
}

/* ─── Small building blocks ──────────────────────────────────────── */

function Rod({ a, b, r, material, segs = 16 }: { a: P3; b: P3; r: number; material: THREE.Material; segs?: number }) {
  const t = useMemo(() => rodTransform(a, b), [a, b]);
  return (
    <mesh position={t.position} quaternion={t.quaternion} material={material} castShadow>
      <cylinderGeometry args={[r, r, t.length, segs]} />
    </mesh>
  );
}

/** Rounded box: most castings, clamps and housings. */
function RBox({
  size,
  radius = 0.008,
  position,
  rotation,
  material,
}: {
  size: [number, number, number];
  radius?: number;
  position: P3;
  rotation?: [number, number, number];
  material: THREE.Material;
}) {
  const geo = useMemo(() => new RoundedBoxGeometry(size[0], size[1], size[2], 3, radius), [size, radius]);
  return <mesh geometry={geo} position={position} rotation={rotation} material={material} castShadow receiveShadow />;
}

/** Cylinder whose axis points along Z (covers, hubs, bolts seen from the side). */
function Disc({
  r,
  depth,
  position,
  material,
  segs = 40,
}: {
  r: number;
  depth: number;
  position: P3;
  material: THREE.Material;
  segs?: number;
}) {
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]} material={material} castShadow>
      <cylinderGeometry args={[r, r * 1.04, depth, segs]} />
    </mesh>
  );
}

function Sweep({ points, r, material }: { points: P3[]; r: number; material: THREE.Material }) {
  const geo = useMemo(() => sweep(points, r, 64, 14), [points, r]);
  return <mesh geometry={geo} material={material} castShadow />;
}

function Panel({
  profile,
  width,
  z = 0,
  bevel = 0.01,
  material,
  rotation,
  taper,
}: {
  profile: P2[];
  width: number;
  z?: number;
  bevel?: number;
  material: THREE.Material;
  rotation?: [number, number, number];
  /** [x, scale] stops narrowing the panel's width (and offset) along x. */
  taper?: [number, number][];
}) {
  const geo = useMemo(() => {
    const g = panel(profile, width, z, bevel);
    return taper ? taperZ(g, taper) : g;
  }, [profile, width, z, bevel, taper]);
  return <mesh geometry={geo} rotation={rotation} material={material} castShadow receiveShadow />;
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

/* ─── Wheels ─────────────────────────────────────────────────────── */

function Wheel({ at, front, m }: { at: P3; front?: boolean; m: Mats }) {
  const outer = front ? 0.3 : 0.315;
  const width = front ? 0.12 : 0.18;
  const rimW = width * 0.8;
  const geo = useMemo(
    () => ({
      tyre: tyre(0.218, outer, width),
      spoke: ySpoke(0.05, 0.208, 0.024),
      rotor: front ? rotor(0.148, 0.074) : rotor(0.11, 0.056, 16),
      carrier: arcBand(0.05, 0.08, 0, Math.PI * 2, 0.006, 0.001),
      sprocket: sprocket(0.105, 42),
    }),
    [front, outer, width],
  );
  return (
    <group position={at}>
      <mesh geometry={geo.tyre} material={m.rubber} castShadow receiveShadow />
      {/* Rim barrel, lips and a red pinstripe on each lip */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={m.gloss}>
        <cylinderGeometry args={[0.212, 0.212, rimW, 64, 1, true]} />
      </mesh>
      <Pair>
        {(s) => (
          <group key={s} position={[0, 0, (s * rimW) / 2]}>
            <mesh material={m.gloss}>
              <torusGeometry args={[0.217, 0.0065, 10, 72]} />
            </mesh>
            <mesh position={[0, 0, s * 0.004]} material={m.accent}>
              <torusGeometry args={[0.2085, 0.0017, 6, 72]} />
            </mesh>
          </group>
        )}
      </Pair>
      {/* Six split spokes */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} geometry={geo.spoke} rotation={[0, 0, (i / 6) * Math.PI * 2]} material={m.gloss} castShadow />
      ))}
      {/* Hub and axle nuts */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={m.satinBlack}>
        <cylinderGeometry args={[0.05, 0.05, width * 0.9, 32]} />
      </mesh>
      <Pair>
        {(s) => (
          <mesh
            key={s}
            position={[0, 0, s * (width * 0.45 + 0.012)]}
            rotation={[Math.PI / 2, 0, 0]}
            material={m.gunmetal}
          >
            <cylinderGeometry args={[0.018, 0.018, 0.022, 6]} />
          </mesh>
        )}
      </Pair>
      {front ? (
        // Twin floating rotors with carriers and radial four-piston calipers
        <Pair>
          {(s) => (
            <group key={s} position={[0, 0, s * 0.072]}>
              <mesh geometry={geo.rotor} material={m.steel} />
              <mesh geometry={geo.carrier} material={m.gunmetal} />
              {Array.from({ length: 10 }, (_, i) => {
                const a = (i / 10) * Math.PI * 2;
                return (
                  <mesh
                    key={i}
                    position={[Math.cos(a) * 0.077, Math.sin(a) * 0.077, s * 0.004]}
                    rotation={[Math.PI / 2, 0, 0]}
                    material={m.accent}
                  >
                    <cylinderGeometry args={[0.0045, 0.0045, 0.006, 10]} />
                  </mesh>
                );
              })}
              <RBox
                size={[0.105, 0.042, 0.042]}
                radius={0.012}
                position={[-0.083, 0.107, s * 0.02]}
                rotation={[0, 0, 2.2 - Math.PI / 2]}
                material={m.gunmetal}
              />
            </group>
          )}
        </Pair>
      ) : (
        <>
          <group position={[0, 0, -0.088]}>
            <mesh geometry={geo.rotor} material={m.steel} />
            <RBox
              size={[0.075, 0.034, 0.036]}
              radius={0.01}
              position={[-0.06, -0.075, -0.016]}
              rotation={[0, 0, -2.25 + Math.PI / 2]}
              material={m.gunmetal}
            />
          </group>
          <mesh geometry={geo.sprocket} position={[0, 0, 0.11]} material={m.gunmetal} />
        </>
      )}
    </group>
  );
}

/* ─── Chassis ────────────────────────────────────────────────────── */

function Frame({ m }: { m: Mats }) {
  const spars = useMemo(
    () =>
      ([1, -1] as const).flatMap((s) => [
        // Main spars: head stock back over the engine to the pivot plates
        beam(
          [
            fork(0.75, s * 0.035, 0.04),
            [0.25, 0.87, s * 0.115],
            [0.06, 0.8, s * 0.138],
            [-0.1, 0.76, s * 0.136],
            [-0.18, 0.7, s * 0.135],
          ],
          0.024,
        ),
        // Lower spars to the front engine mount
        beam([fork(0.6, s * 0.035, 0.04), [0.34, 0.71, s * 0.105], [0.27, 0.6, s * 0.115]], 0.017),
      ]),
    [],
  );
  const plate: P2[] = [
    [-0.08, 0.79],
    [-0.02, 0.73],
    [-0.06, 0.58],
    [-0.1, 0.44],
    [-0.16, 0.42],
    [-0.22, 0.47],
    [-0.24, 0.6],
    [-0.19, 0.78],
  ];
  const plateInset: P2[] = [
    [-0.11, 0.73],
    [-0.07, 0.69],
    [-0.1, 0.6],
    [-0.19, 0.62],
    [-0.18, 0.72],
  ];
  return (
    <group>
      {/* Steering head */}
      <Rod a={fork(0.57, 0, 0.04)} b={fork(0.8, 0, 0.04)} r={0.03} material={m.frame} />
      {spars.map((g, i) => (
        <mesh key={i} geometry={g} material={m.frame} castShadow />
      ))}
      <Pair>
        {(s) => (
          <group key={s}>
            <Panel profile={plate} width={0.022} z={s * 0.135} bevel={0.006} material={m.frame} />
            <Panel profile={plateInset} width={0.004} z={s * 0.148} bevel={0.001} material={m.engine} />
            {/* Subframe */}
            <Rod a={[-0.19, 0.77, s * 0.11]} b={[-0.7, 0.95, s * 0.07]} r={0.012} material={m.frame} />
            <Rod a={[-0.22, 0.58, s * 0.115]} b={[-0.52, 0.87, s * 0.075]} r={0.011} material={m.frame} />
            {/* Engine mount bolts */}
            <Disc r={0.013} depth={0.012} position={[0.27, 0.6, s * 0.123]} material={m.gunmetal} />
            <Disc r={0.013} depth={0.012} position={[-0.05, 0.7, s * 0.148]} material={m.gunmetal} />
            {/* Rider pegs, heel guards */}
            <Rod a={[-0.17, 0.43, s * 0.15]} b={[-0.17, 0.43, s * 0.24]} r={0.012} material={m.alloy} />
            <Panel
              profile={[
                [-0.1, 0.55],
                [-0.25, 0.54],
                [-0.29, 0.45],
                [-0.15, 0.4],
              ]}
              width={0.008}
              z={s * 0.165}
              bevel={0.002}
              material={m.gunmetal}
            />
            {/* Pillion pegs on hangers */}
            <Rod a={[-0.33, 0.66, s * 0.12]} b={[-0.42, 0.6, s * 0.15]} r={0.01} material={m.alloy} />
            <Rod a={[-0.42, 0.6, s * 0.15]} b={[-0.42, 0.6, s * 0.21]} r={0.01} material={m.alloy} />
          </group>
        )}
      </Pair>
      <Rod a={[-0.68, 0.94, 0.07]} b={[-0.68, 0.94, -0.07]} r={0.01} material={m.frame} />
      {/* Rear frame triangle behind the engine, visible below the seat nose */}
      <Pair>
        {(s) => (
          <group key={s}>
            <Rod a={[-0.12, 0.84, s * 0.12]} b={[-0.16, 0.55, s * 0.135]} r={0.016} material={m.frame} />
            <Rod a={[-0.12, 0.84, s * 0.12]} b={[0.05, 0.8, s * 0.13]} r={0.014} material={m.frame} />
          </group>
        )}
      </Pair>
      {/* Swingarm pivot */}
      <Rod a={[PIVOT[0], PIVOT[1], 0.17]} b={[PIVOT[0], PIVOT[1], -0.17]} r={0.016} material={m.gunmetal} />
      <Disc r={0.02} depth={0.008} position={[PIVOT[0], PIVOT[1], 0.172]} material={m.accent} />
      {/* Shift lever (left), brake pedal (right) */}
      <Sweep
        points={[
          [-0.12, 0.47, 0.19],
          [-0.03, 0.44, 0.2],
          [0.04, 0.42, 0.2],
        ]}
        r={0.006}
        material={m.alloy}
      />
      <Sweep
        points={[
          [-0.14, 0.46, -0.19],
          [-0.04, 0.42, -0.2],
          [0.03, 0.4, -0.2],
        ]}
        r={0.006}
        material={m.alloy}
      />
      {/* Side stand (left), stowed */}
      <Rod a={[-0.06, 0.36, 0.13]} b={[-0.33, 0.33, 0.16]} r={0.009} material={m.satinBlack} />
    </group>
  );
}

/* ─── Engine: forward-tilted parallel twin ───────────────────────── */

const CYL_TILT = -0.55;

function Engine({ m }: { m: Mats }) {
  return (
    <group>
      {/* Crankcase and sump */}
      <RBox size={[0.4, 0.2, 0.3]} radius={0.03} position={[0, 0.45, 0]} material={m.engine} />
      <RBox size={[0.3, 0.08, 0.22]} radius={0.02} position={[-0.02, 0.335, 0]} material={m.engine} />
      {Array.from({ length: 5 }, (_, i) => (
        <RBox
          key={i}
          size={[0.28, 0.006, 0.225]}
          radius={0.002}
          position={[-0.02, 0.305 + i * 0.012, 0]}
          material={m.fins}
        />
      ))}
      {/* Barrel, head and cam cover, tilted forward */}
      <group position={[0.15, 0.6, 0]} rotation={[0, 0, CYL_TILT]}>
        <RBox size={[0.15, 0.18, 0.3]} radius={0.015} position={[0, 0, 0]} material={m.engine} />
        {Array.from({ length: 8 }, (_, i) => (
          <RBox
            key={i}
            size={[0.168, 0.006, 0.312]}
            radius={0.002}
            position={[0, -0.075 + i * 0.021, 0]}
            material={m.fins}
          />
        ))}
        <RBox size={[0.17, 0.08, 0.32]} radius={0.018} position={[0, 0.13, 0]} material={m.engine} />
        <RBox size={[0.152, 0.045, 0.3]} radius={0.016} position={[0, 0.193, 0]} material={m.gunmetal} />
        {/* Red cam-cover strip and plug caps */}
        <RBox size={[0.1, 0.006, 0.24]} radius={0.002} position={[0, 0.218, 0]} material={m.accent} />
        <Pair>
          {(s) => (
            <mesh key={s} position={[-0.03, 0.235, s * 0.07]} material={m.satinBlack}>
              <cylinderGeometry args={[0.012, 0.014, 0.04, 16]} />
            </mesh>
          )}
        </Pair>
        {/* Bolt heads along the cam cover */}
        {[-0.12, -0.04, 0.04, 0.12].map((z) => (
          <Pair key={z}>
            {(s) => (
              <mesh key={s} position={[s * 0.06, 0.216, z]} material={m.steel}>
                <cylinderGeometry args={[0.005, 0.005, 0.006, 8]} />
              </mesh>
            )}
          </Pair>
        ))}
      </group>
      {/* Clutch cover (right) with bolts and a red ring */}
      <group position={[-0.04, 0.45, -0.155]}>
        <Disc r={0.1} depth={0.03} position={[0, 0, 0]} material={m.gunmetal} />
        <mesh position={[0, 0, -0.016]} material={m.accent}>
          <torusGeometry args={[0.062, 0.004, 8, 48]} />
        </mesh>
        {Array.from({ length: 9 }, (_, i) => {
          const a = (i / 9) * Math.PI * 2;
          return (
            <Disc
              key={i}
              r={0.006}
              depth={0.006}
              position={[Math.cos(a) * 0.088, Math.sin(a) * 0.088, -0.016]}
              material={m.steel}
              segs={8}
            />
          );
        })}
      </group>
      {/* Alternator cover and front sprocket cover (left) */}
      <group position={[0.07, 0.45, 0.155]}>
        <Disc r={0.085} depth={0.028} position={[0, 0, 0]} material={m.gunmetal} />
        <mesh position={[0, 0, 0.015]} material={m.accent}>
          <torusGeometry args={[0.05, 0.0035, 8, 48]} />
        </mesh>
        {Array.from({ length: 7 }, (_, i) => {
          const a = (i / 7) * Math.PI * 2;
          return (
            <Disc
              key={i}
              r={0.005}
              depth={0.006}
              position={[Math.cos(a) * 0.074, Math.sin(a) * 0.074, 0.015]}
              material={m.steel}
              segs={8}
            />
          );
        })}
      </group>
      <RBox size={[0.1, 0.085, 0.022]} radius={0.01} position={[-0.12, 0.42, 0.15]} material={m.gunmetal} />
      {/* Oil filter */}
      <mesh position={[0.22, 0.36, -0.05]} rotation={[0, 0, Math.PI / 2]} material={m.satinBlack}>
        <cylinderGeometry args={[0.032, 0.032, 0.07, 24]} />
      </mesh>
      {/* Radiator with slats, cap and hoses */}
      <group position={[0.375, 0.63, 0]} rotation={[0, 0, -0.14]}>
        <RBox size={[0.035, 0.29, 0.38]} radius={0.008} position={[0, 0, 0]} material={m.satinBlack} />
        {Array.from({ length: 15 }, (_, i) => (
          <RBox
            key={i}
            size={[0.004, 0.004, 0.35]}
            radius={0.001}
            position={[0.019, -0.13 + i * 0.0185, 0]}
            material={m.fins}
          />
        ))}
        <Disc r={0.014} depth={0.02} position={[0, 0.15, 0.13]} material={m.gunmetal} />
      </group>
      <Sweep
        points={[
          [0.36, 0.76, 0.12],
          [0.31, 0.8, 0.1],
          [0.25, 0.79, 0.06],
        ]}
        r={0.012}
        material={m.rubber}
      />
      <Sweep
        points={[
          [0.38, 0.5, -0.12],
          [0.32, 0.42, -0.14],
          [0.22, 0.41, -0.15],
        ]}
        r={0.012}
        material={m.rubber}
      />
    </group>
  );
}

function Exhaust({ m }: { m: Mats }) {
  const geo = useMemo(
    () => ({
      headers: ([1, -1] as const).map((s) =>
        sweep(
          [
            [0.32, 0.68, s * 0.07],
            [0.4, 0.58, s * 0.075],
            [0.38, 0.42, s * 0.07],
            [0.31, 0.27, s * 0.05],
            [0.14, 0.215, s * 0.03],
            [0.0, 0.215, 0],
          ],
          0.021,
        ),
      ),
      link: sweep(
        [
          [-0.08, 0.22, 0],
          [-0.16, 0.23, -0.06],
          [-0.24, 0.27, -0.16],
          [-0.31, 0.32, -0.21],
        ],
        0.032,
      ),
    }),
    [],
  );
  return (
    <group>
      {geo.headers.map((g, i) => (
        <mesh key={i} geometry={g} material={m.exhaust} castShadow />
      ))}
      <RBox size={[0.18, 0.07, 0.15]} radius={0.025} position={[-0.04, 0.22, 0]} material={m.gunmetal} />
      <mesh geometry={geo.link} material={m.exhaust} castShadow />
      {/* Big stubby silencer beside the rear tyre: brushed silver body, black upper shield, angled cap */}
      <group position={[-0.48, 0.43, -0.22]} rotation={[0, 0, -0.42]}>
        <RBox size={[0.36, 0.125, 0.115]} radius={0.04} position={[0, 0, 0]} material={m.brushed} />
        <RBox size={[0.3, 0.06, 0.124]} radius={0.02} position={[0.015, 0.04, 0]} material={m.satinBlack} />
        <RBox
          size={[0.05, 0.135, 0.125]}
          radius={0.015}
          position={[-0.17, 0.005, 0]}
          rotation={[0, 0, -0.35]}
          material={m.satinBlack}
        />
        <mesh position={[-0.2, -0.02, 0]} rotation={[0, 0, Math.PI / 2]} material={m.engine}>
          <cylinderGeometry args={[0.022, 0.022, 0.03, 20]} />
        </mesh>
        <RBox size={[0.04, 0.12, 0.118]} radius={0.015} position={[0.17, -0.005, 0]} material={m.gunmetal} />
      </group>
      {/* Hanger to the pillion peg bracket */}
      <Rod a={[-0.58, 0.53, -0.2]} b={[-0.5, 0.64, -0.14]} r={0.008} material={m.satinBlack} />
    </group>
  );
}

/* ─── Bodywork ───────────────────────────────────────────────────── */

const TANK: P2[] = [
  [0.33, 0.93],
  [0.25, 1.05],
  [0.17, 1.085],
  [0.04, 1.075],
  [-0.05, 1.02],
  [-0.1, 0.95],
  [-0.09, 0.87],
  [0.1, 0.84],
  [0.27, 0.85],
  [0.35, 0.88],
];
/** Tank shroud: wraps the tank's front flank and drops down to the radiator. */
const SHROUD: P2[] = [
  [0.08, 0.99],
  [0.19, 1.035],
  [0.26, 1.0],
  [0.36, 0.91],
  [0.49, 0.81],
  [0.545, 0.76],
  [0.47, 0.75],
  [0.38, 0.7],
  [0.31, 0.69],
  [0.26, 0.77],
  [0.17, 0.86],
  [0.08, 0.9],
];
/** Silver accent line along the shroud's upper crease. */
const SHROUD_LINE: P2[] = [
  [0.17, 0.965],
  [0.42, 0.825],
  [0.43, 0.81],
  [0.18, 0.95],
];
/** Black radiator side grille in front of the engine, below the shroud. */
const RAD_SIDE: P2[] = [
  [0.33, 0.72],
  [0.44, 0.74],
  [0.45, 0.56],
  [0.39, 0.49],
  [0.33, 0.56],
];
/** Belly pan under the engine. */
const BELLY: P2[] = [
  [0.37, 0.33],
  [0.33, 0.235],
  [0.39, 0.185],
  [0.18, 0.18],
  [-0.13, 0.19],
  [-0.15, 0.24],
  [0.05, 0.255],
  [0.25, 0.3],
];
const TAIL: P2[] = [
  [-0.42, 0.93],
  [-0.58, 0.955],
  [-0.72, 0.99],
  [-0.84, 1.03],
  [-0.96, 1.075],
  [-0.97, 1.055],
  [-0.87, 0.995],
  [-0.72, 0.93],
  [-0.56, 0.875],
  [-0.44, 0.86],
];
const TAIL_STRIPE: P2[] = [
  [-0.62, 0.945],
  [-0.9, 1.035],
  [-0.91, 1.025],
  [-0.64, 0.935],
];
/** Small black side panel under the seat nose, above the pivot. */
const TAIL_TAPER: [number, number][] = [
  [-0.42, 1],
  [-0.7, 0.82],
  [-0.97, 0.3],
];
const TANK_TAPER: [number, number][] = [
  [0.36, 0.78],
  [0.2, 1],
  [0.0, 1],
  [-0.12, 0.72],
];
const SIDE_COVER: P2[] = [
  [-0.08, 0.86],
  [-0.3, 0.88],
  [-0.34, 0.82],
  [-0.12, 0.79],
];
function Bodywork({ m }: { m: Mats }) {
  return (
    <group>
      <Panel profile={TANK} width={0.3} bevel={0.02} material={m.paint} taper={TANK_TAPER} />
      <Disc r={0.034} depth={0.012} position={[0.07, 1.072, 0]} material={m.gunmetal} />
      <mesh position={[0.07, 1.075, 0]} rotation={[0, 0, 0]} material={m.accent}>
        <torusGeometry args={[0.028, 0.002, 6, 32]} />
      </mesh>
      <Pair>
        {(s) => (
          <group key={s}>
            {/* Tank shroud flared outward, with a silver crease line */}
            <group rotation={[0, -s * 0.05, 0]}>
              <Panel profile={SHROUD} width={0.024} z={s * 0.152} bevel={0.0025} material={m.paint} />
              <Panel profile={SHROUD_LINE} width={0.004} z={s * 0.166} bevel={0.001} material={m.accent} />
            </group>
            <Panel profile={RAD_SIDE} width={0.012} z={s * 0.185} bevel={0.003} material={m.satinBlack} />
            {Array.from({ length: 7 }, (_, i) => (
              <RBox
                key={i}
                size={[0.1, 0.004, 0.004]}
                radius={0.001}
                position={[0.39, 0.53 + i * 0.027, s * 0.193]}
                material={m.engine}
              />
            ))}
            <Panel profile={SIDE_COVER} width={0.012} z={s * 0.13} bevel={0.002} material={m.gloss} />
            <Panel
              profile={TAIL_STRIPE}
              width={0.003}
              z={s * 0.101}
              bevel={0.001}
              material={m.accent}
              taper={TAIL_TAPER}
            />
            {/* Indicators on the plate hanger */}
            <mesh position={[-1.03, 0.94, s * 0.06]} rotation={[Math.PI / 2, 0, 0]} material={m.amber}>
              <capsuleGeometry args={[0.009, 0.028, 4, 10]} />
            </mesh>
          </group>
        )}
      </Pair>
      <Panel profile={TAIL} width={0.2} bevel={0.006} material={m.paint} taper={TAIL_TAPER} />
      <Panel
        profile={BELLY}
        width={0.25}
        bevel={0.003}
        material={m.gloss}
        taper={[
          [0.39, 0.55],
          [0.2, 1],
          [-0.15, 0.9],
        ]}
      />
      {/* Tail light: a thin red blade at the tip */}
      <mesh position={[-0.966, 1.064, 0]} rotation={[0, 0, 0.36]} material={m.tail}>
        <boxGeometry args={[0.008, 0.022, 0.06]} />
      </mesh>
      {/* Plate mount: a curved stinger arcing back and down from under the tail */}
      <Panel
        profile={[
          [-0.74, 0.955],
          [-0.9, 0.968],
          [-1.0, 0.95],
          [-1.07, 0.905],
          [-1.105, 0.835],
          [-1.11, 0.75],
          [-1.09, 0.665],
          [-1.07, 0.655],
          [-1.075, 0.75],
          [-1.07, 0.83],
          [-1.035, 0.89],
          [-0.97, 0.925],
          [-0.86, 0.935],
          [-0.77, 0.925],
        ]}
        width={0.085}
        bevel={0.004}
        material={m.satinBlack}
        taper={[
          [-0.74, 1],
          [-1.0, 0.75],
          [-1.11, 0.6],
        ]}
      />
      <RBox
        size={[0.008, 0.13, 0.19]}
        radius={0.003}
        position={[-1.098, 0.745, 0]}
        rotation={[0, 0, 0.05]}
        material={m.gloss}
      />
      {/* Plate light */}
      <mesh position={[-1.09, 0.83, 0]} material={m.headlight}>
        <boxGeometry args={[0.006, 0.006, 0.04]} />
      </mesh>
    </group>
  );
}

const RIDER_TAPER: [number, number][] = [
  [-0.03, 0.42],
  [-0.15, 1],
  [-0.4, 1],
  [-0.53, 0.86],
];
const PILLION_TAPER: [number, number][] = [
  [-0.5, 1],
  [-0.84, 0.7],
];

function Seat({ m }: { m: Mats }) {
  return (
    <group>
      {/* Rider: narrow at the tank, scooped low, curling up at the back */}
      <Panel
        profile={[
          [-0.03, 0.935],
          [-0.08, 0.905],
          [-0.15, 0.888],
          [-0.25, 0.882],
          [-0.34, 0.886],
          [-0.41, 0.9],
          [-0.46, 0.922],
          [-0.5, 0.95],
          [-0.525, 0.965],
          [-0.535, 0.945],
          [-0.5, 0.9],
          [-0.42, 0.865],
          [-0.25, 0.845],
          [-0.1, 0.855],
          [-0.04, 0.88],
        ]}
        width={0.28}
        bevel={0.032}
        material={m.seat}
        taper={RIDER_TAPER}
      />
      {/* Stitch line at the step */}
      <mesh position={[-0.525, 0.962, 0]} material={m.satinBlack}>
        <boxGeometry args={[0.006, 0.006, 0.22]} />
      </mesh>
      {/* Pillion pad: raised, following the tail's rake */}
      <Panel
        profile={[
          [-0.5, 0.99],
          [-0.54, 1.012],
          [-0.62, 1.03],
          [-0.72, 1.052],
          [-0.8, 1.072],
          [-0.84, 1.074],
          [-0.855, 1.05],
          [-0.84, 1.025],
          [-0.72, 0.99],
          [-0.58, 0.955],
          [-0.51, 0.945],
        ]}
        width={0.21}
        bevel={0.032}
        material={m.seat}
        taper={PILLION_TAPER}
      />
    </group>
  );
}

/* ─── Front end ──────────────────────────────────────────────────── */

/**
 * Lens seen from the front: a tapered six-sided face, a projector, and a
 * chevron of two LED blades with a short lower bar.
 */
function HeadlightLens({ m }: { m: Mats }) {
  const lens = useMemo(
    () =>
      panel(
        [
          [-0.072, 0.935],
          [0.072, 0.935],
          [0.08, 0.895],
          [0.035, 0.825],
          [-0.035, 0.825],
          [-0.08, 0.895],
        ],
        0.02,
        0,
        0.004,
      ),
    [],
  );
  const X = 0.596;
  return (
    <group>
      <mesh geometry={lens} position={[X - 0.006, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={m.lens} />
      {/* Projector */}
      <mesh position={[X + 0.006, 0.878, 0]} rotation={[0, 0, -Math.PI / 2]} material={m.steel}>
        <cylinderGeometry args={[0.024, 0.026, 0.008, 32]} />
      </mesh>
      <mesh position={[X + 0.011, 0.878, 0]} rotation={[0, Math.PI / 2, 0]} material={m.headlight}>
        <circleGeometry args={[0.016, 32]} />
      </mesh>
      {/* LED chevron */}
      <Pair>
        {(s) => (
          <group key={s}>
            <Rod
              a={[X + 0.008, 0.926, s * 0.066]}
              b={[X + 0.008, 0.9, s * 0.02]}
              r={0.0035}
              material={m.headlight}
              segs={8}
            />
            <Rod
              a={[X + 0.008, 0.89, s * 0.07]}
              b={[X + 0.008, 0.845, s * 0.035]}
              r={0.003}
              material={m.headlight}
              segs={8}
            />
          </group>
        )}
      </Pair>
      <Rod a={[X + 0.008, 0.838, 0.024]} b={[X + 0.008, 0.838, -0.024]} r={0.003} material={m.headlight} segs={8} />
    </group>
  );
}

function FrontEnd({ m }: { m: Mats }) {
  const top = fork(0.765);
  const x0 = top[0] - 0.05;
  const geo = useMemo(
    () => ({
      bars: sweep(
        [
          [x0 - 0.07, 1.085, 0.32],
          [x0 - 0.03, 1.08, 0.2],
          [x0, 1.075, 0.08],
          [x0, 1.075, -0.08],
          [x0 - 0.03, 1.08, -0.2],
          [x0 - 0.07, 1.085, -0.32],
        ],
        0.014,
      ),
      fender: fender(0.31, 0.32, 0.28, 1.62, 0.105, 0.035),
      fenderStripe: arcBand(0.33, 0.333, 0.6, 1.35, 0.006, 0.001),
    }),
    [x0],
  );
  return (
    <group>
      <Wheel at={FRONT} front m={m} />
      {/* Inverted forks: slim stanchions below, fat gunmetal tubes above */}
      <Pair>
        {(s) => (
          <group key={s}>
            <Rod a={fork(0.03, s * 0.095)} b={fork(0.42, s * 0.095)} r={0.0205} material={m.stanchion} />
            <Rod a={fork(0.38, s * 0.095)} b={fork(0.8, s * 0.095)} r={0.027} material={m.frame} />
            <RBox
              size={[0.06, 0.1, 0.045]}
              radius={0.01}
              position={fork(0.01, s * 0.095)}
              rotation={[0, 0, RAKE]}
              material={m.satinBlack}
            />
            <mesh position={fork(0.81, s * 0.095)} rotation={[0, 0, RAKE]} material={m.accent}>
              <cylinderGeometry args={[0.019, 0.022, 0.018, 20]} />
            </mesh>
            {/* Fender stays */}
            <RBox
              size={[0.07, 0.012, 0.01]}
              radius={0.003}
              position={fork(0.1, s * 0.072, -0.01)}
              rotation={[0, 0, RAKE]}
              material={m.gloss}
            />
          </group>
        )}
      </Pair>
      {/* Triple clamps */}
      <RBox
        size={[0.075, 0.035, 0.25]}
        radius={0.01}
        position={fork(0.585, 0, 0.012)}
        rotation={[0, 0, RAKE]}
        material={m.gunmetal}
      />
      <RBox
        size={[0.085, 0.026, 0.26]}
        radius={0.01}
        position={fork(0.765, 0, 0.015)}
        rotation={[0, 0, RAKE]}
        material={m.gunmetal}
      />
      <Disc r={0.016} depth={0.012} position={[top[0] - 0.02, top[1] + 0.012, 0]} material={m.accent} />
      {/* Risers, tapered bar, grips, bar ends */}
      <Pair>
        {(s) => (
          <group key={s}>
            <Rod a={[x0 + 0.01, top[1] + 0.01, s * 0.06]} b={[x0, 1.075, s * 0.06]} r={0.014} material={m.gunmetal} />
            <Rod a={[x0 - 0.055, 1.084, s * 0.26]} b={[x0 - 0.075, 1.086, s * 0.35]} r={0.018} material={m.rubber} />
            <Disc r={0.016} depth={0.02} position={[x0 - 0.077, 1.086, s * 0.36]} material={m.gunmetal} />
            {/* Lever perch and lever */}
            <RBox
              size={[0.03, 0.025, 0.03]}
              radius={0.006}
              position={[x0 - 0.045, 1.085, s * 0.225]}
              material={m.satinBlack}
            />
            <Sweep
              points={[
                [x0 - 0.03, 1.08, s * 0.235],
                [x0 + 0.03, 1.07, s * 0.28],
                [x0 + 0.025, 1.065, s * 0.33],
              ]}
              r={0.006}
              material={m.alloy}
            />
            {/* Mirror: stalk rises, then kinks outward to a wide, low head */}
            <Sweep
              points={[
                [x0 - 0.035, 1.09, s * 0.17],
                [x0 - 0.04, 1.15, s * 0.175],
                [x0 - 0.045, 1.18, s * 0.2],
                [x0 - 0.05, 1.2, s * 0.26],
              ]}
              r={0.005}
              material={m.satinBlack}
            />
            <RBox
              size={[0.016, 0.05, 0.105]}
              radius={0.01}
              position={[x0 - 0.052, 1.208, s * 0.3]}
              rotation={[s * 0.25, 0, 0]}
              material={m.gloss}
            />
          </group>
        )}
      </Pair>
      <mesh geometry={geo.bars} material={m.satinBlack} castShadow />
      {/* Brake fluid reservoir (right) */}
      <RBox
        size={[0.03, 0.035, 0.04]}
        radius={0.008}
        position={[x0 - 0.045, 1.115, -0.22]}
        rotation={[0, 0, 0.3]}
        material={m.satinBlack}
      />
      <Disc r={0.012} depth={0.006} position={[x0 - 0.05, 1.137, -0.22]} material={m.accent} />
      {/* TFT dash */}
      <group position={[x0 - 0.035, 1.12, 0]} rotation={[0, 0, -0.62]}>
        <RBox size={[0.016, 0.075, 0.125]} radius={0.006} position={[0, 0, 0]} material={m.gloss} />
        <mesh position={[-0.0085, 0, 0]} rotation={[0, -Math.PI / 2, 0]} material={m.screen}>
          <planeGeometry args={[0.105, 0.055]} />
        </mesh>
        <mesh position={[-0.0088, -0.018, 0.02]} rotation={[0, -Math.PI / 2, 0]} material={m.tail}>
          <planeGeometry args={[0.04, 0.004]} />
        </mesh>
      </group>
      {/* Headlight assembly rides forward with the longer front end */}
      <group position={[0.06, 0, 0]}>
        {/* Angular headlight: a sharp cowl with a brow over a faceted lens */}
        <Panel
          profile={[
            [0.455, 0.965],
            [0.535, 0.96],
            [0.56, 0.935],
            [0.598, 0.86],
            [0.635, 0.795],
            [0.6, 0.785],
            [0.5, 0.79],
            [0.44, 0.85],
          ]}
          width={0.19}
          bevel={0.005}
          material={m.paint}
        />
        {/* Brow: a gunmetal blade over the lens */}
        <Panel
          profile={[
            [0.49, 0.97],
            [0.556, 0.948],
            [0.572, 0.932],
            [0.51, 0.952],
          ]}
          width={0.2}
          bevel={0.004}
          material={m.gunmetal}
        />
        {/* Lens raked to match the face: bottom forward */}
        <group position={[0.602, 0.865, 0]} rotation={[0, 0, 0.47]}>
          <group position={[-0.596, -0.88, 0]}>
            <HeadlightLens m={m} />
          </group>
        </group>
        <Pair>
          {(s) => (
            <group key={s}>
              {/* Turn signals on the fork, just below the cowl */}
              <mesh position={[0.52, 0.86, s * 0.125]} rotation={[0, 0, Math.PI / 2]} material={m.amber}>
                <capsuleGeometry args={[0.008, 0.024, 4, 10]} />
              </mesh>
            </group>
          )}
        </Pair>
      </group>
      {/* Short front fender with a silver pinstripe */}
      <group position={FRONT}>
        <mesh geometry={geo.fender} material={m.gloss} castShadow />
        <mesh geometry={geo.fenderStripe} material={m.accent} />
      </group>
    </group>
  );
}

/* ─── Rear end ───────────────────────────────────────────────────── */

function RearEnd({ m }: { m: Mats }) {
  const geo = useMemo(
    () => ({
      chain: loop(
        [
          [-0.11, 0.478, 0.11],
          [-0.4, 0.45, 0.11],
          [-0.71, 0.42, 0.11],
          [-0.79, 0.39, 0.11],
          [-0.815, 0.315, 0.11],
          [-0.79, 0.24, 0.11],
          [-0.71, 0.21, 0.11],
          [-0.4, 0.3, 0.11],
          [-0.11, 0.385, 0.11],
          [-0.07, 0.405, 0.11],
          [-0.066, 0.435, 0.11],
          [-0.08, 0.465, 0.11],
        ],
        0.0055,
      ),
      frontSprocket: sprocket(0.045, 15, 0.006, 0),
      shockSpring: coil([-0.31, 0.42, 0], [-0.19, 0.69, 0], 0.033, 8, 0.006),
      hugger: fender(0.33, 0.342, 2.75, 0.95, 0.16),
    }),
    [],
  );
  const arm: P2[] = [
    [-0.12, 0.54],
    [-0.4, 0.45],
    [-0.73, 0.345],
    [-0.75, 0.3],
    [-0.72, 0.275],
    [-0.4, 0.4],
    [-0.12, 0.46],
  ];
  return (
    <group>
      <Wheel at={REAR} m={m} />
      {/* Box-section alloy swingarm with a brace and red chain adjusters */}
      <Pair>
        {(s) => (
          <group key={s}>
            <Panel profile={arm} width={0.045} z={s * 0.13} bevel={0.008} material={m.gunmetal} />
            <RBox
              size={[0.04, 0.03, 0.05]}
              radius={0.006}
              position={[REAR[0] - 0.035, REAR[1] + 0.01, s * 0.13]}
              material={m.accent}
            />
          </group>
        )}
      </Pair>
      <Rod a={[-0.3, 0.46, 0.13]} b={[-0.3, 0.46, -0.13]} r={0.016} material={m.gunmetal} />
      <mesh geometry={geo.chain} material={m.steel} />
      <mesh geometry={geo.frontSprocket} position={[-0.1, 0.43, 0.11]} material={m.gunmetal} />
      {/* Linkage monoshock: chrome body, red spring */}
      <Rod a={[-0.31, 0.42, 0]} b={[-0.19, 0.69, 0]} r={0.015} material={m.stanchion} />
      <mesh geometry={geo.shockSpring} material={m.red} />
      <Disc r={0.024} depth={0.04} position={[-0.19, 0.7, 0]} material={m.gunmetal} />
      {/* Rear hugger */}
      <group position={REAR}>
        <mesh geometry={geo.hugger} material={m.satinBlack} castShadow />
      </group>
    </group>
  );
}

/* ─── Assembly, beam, and the bike ───────────────────────────────── */

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
    <mesh position={[0.66 + 1.6, 0.6, 0]} rotation={[0, 0, Math.PI / 2 + 0.12]} material={beamMaterial}>
      <coneGeometry args={[0.85, 3.2, 48, 1, true]} />
    </mesh>
  );
}

const tmpColor = new THREE.Color();

export function Bike() {
  const m = getMaterials();
  // Modelled with the exhaust on the right (−z); mirrored so that side faces the camera.

  // Apply configurator finishes and night-mode emissives each frame (a few uniforms).
  useFrame(() => {
    const m = getMaterials();
    const p = paintById(store.paint);
    const f = frameById(store.frame);
    m.paint.color.lerp(tmpColor.set(p.color), 0.12);
    m.paint.metalness += (p.metalness - m.paint.metalness) * 0.12;
    m.paint.roughness += (p.roughness - m.paint.roughness) * 0.12;
    m.paint.clearcoat += (p.clearcoat - m.paint.clearcoat) * 0.12;
    m.frame.color.lerp(tmpColor.set(f.color), 0.12);
    m.frame.metalness += (f.metalness - m.frame.metalness) * 0.12;
    m.frame.roughness += (f.roughness - m.frame.roughness) * 0.12;
    const night = nightAt(store.progress);
    m.headlight.emissiveIntensity = 0.4 + night * 9;
    m.tail.emissiveIntensity = 0.7 + night * 1.6;
    m.screen.emissiveIntensity = 0.35 + night * 0.6;
  });

  return (
    <group scale={[1, 1, -1]}>
      <Assembly name="frame">
        <Frame m={m} />
      </Assembly>
      <Assembly name="engine">
        <group position={[-0.012, -0.075, 0]} scale={1.15}>
          <Engine m={m} />
        </group>
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

/** World-space anchor points for HTML callouts (left side, facing the camera). */
export const ANCHORS = {
  trellis: [0.1, 0.81, 0.14] as P3,
  tank: [0.2, 1.07, 0.12] as P3,
  engine: [0.07, 0.45, 0.17] as P3,
  cylinders: [0.22, 0.76, 0.12] as P3,
  exhaust: [0.37, 0.45, 0.08] as P3,
  shock: [-0.23, 0.58, 0.04] as P3,
  headlight: [0.57, 0.92, 0.05] as P3,
};
