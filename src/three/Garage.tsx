"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, SpotLight } from "@react-three/drei";
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Noise,
  SMAA,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { store } from "@/lib/store";
import { nightAt, shotAt, window01 } from "@/lib/story";
import { Bike, HEADLIGHT } from "./Bike";
import { Callouts } from "./Callouts";
import { debugFlags } from "@/lib/debugFlags";
import { useDebugFlags } from "@/components/useDebugFlags";
import { installSafeShading } from "./safeShading";

installSafeShading();

/**
 * Transparent layers are normally sorted by distance from the camera to each
 * object's origin. The haze cone's origin is up at the lamp and the shadow
 * plane's is on the floor, so as the scroll camera moves (plus pointer
 * parallax) their order flipped back and forth, and the shadow plane
 * intermittently covered the haze: a dark band flickering across the scene.
 * A fixed order keeps it stable: ground shadow, then haze, then the beam.
 */
export const TRANSPARENT_ORDER = { ground: -1, haze: 1, beam: 2 } as const;

const reduceMotion = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Camera follows the scroll story with critically damped easing, plus a little pointer parallax. */
/** Fixed inspection angles via ?view= (for design review and screenshots). */
const INSPECT: Record<string, { position: [number, number, number]; target: [number, number, number]; fov: number }> = {
  side: { position: [0, 0.68, 4.2], target: [0, 0.66, 0], fov: 30 },
  front: { position: [3.2, 0.9, 0], target: [0, 0.75, 0], fov: 22 },
  front34: { position: [2.4, 1.15, 2.4], target: [0, 0.66, 0], fov: 30 },
  frontwheel: { position: [2.0, 0.55, 1.4], target: [0.78, 0.3, 0], fov: 26 },
  farside: { position: [1.4, 0.55, -2.0], target: [0, 0.35, 0], fov: 34 },
  wheels: { position: [-1.5, 0.5, 1.9], target: [-0.1, 0.35, 0], fov: 34 },
  rear34: { position: [-2.4, 1.2, 2.2], target: [0, 0.66, 0], fov: 30 },
  engine: { position: [0.35, 0.62, 1.35], target: [0.05, 0.55, 0], fov: 34 },
  cockpit: { position: [-0.55, 1.55, 0.9], target: [0.4, 0.98, 0], fov: 34 },
};
// Design review: ?paint=<id> previews a finish without scrolling to the configurator.
if (typeof window !== "undefined") {
  const paint = new URLSearchParams(location.search).get("paint");
  if (paint) store.paint = paint;
}
const inspectView = () =>
  typeof window === "undefined" ? undefined : INSPECT[new URLSearchParams(location.search).get("view") ?? ""];

function CameraRig() {
  const look = useRef(new THREE.Vector3(0, 0.6, 0));
  const first = useRef(true);
  useFrame(({ camera, pointer }, dt) => {
    const inspect = inspectView();
    const shot = inspect ? { ...inspect, shift: 0, id: "inspect" } : shotAt(store.progress);
    const cam = camera as THREE.PerspectiveCamera;
    const k = first.current || reduceMotion() ? 1 : 1 - Math.exp(-dt * 3.2);
    first.current = false;
    const par = reduceMotion() || !debugFlags.on("motion") ? 0 : 0.08;
    cam.position.lerp(
      new THREE.Vector3(shot.position[0] + pointer.x * par, shot.position[1] + pointer.y * par * 0.6, shot.position[2]),
      k,
    );
    look.current.lerp(new THREE.Vector3(...shot.target), k);
    cam.fov += (shot.fov - cam.fov) * k;
    // Film offset frames the bike beside the copy; centred on narrow screens where copy stacks.
    const shift = cam.aspect > 1.1 ? -shot.shift : 0;
    cam.filmOffset += (shift - cam.filmOffset) * k;
    cam.updateProjectionMatrix();
    cam.lookAt(look.current);
  });
  return null;
}

/** The bike on a slow turntable during the build section; draggable there. */
function Turntable({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const build = window01(store.progress, 5, 5.3, 0.4);
    if (build > 0.5 && !reduceMotion() && debugFlags.on("motion")) store.spin += dt * 0.12;
    const target = store.spin * build;
    g.rotation.y += (target - g.rotation.y) * Math.min(1, dt * 4);
  });
  return <group ref={ref}>{children}</group>;
}

/** Key light: a hard overhead spot that flickers on like a garage tube, then dims for night mode. */
function KeyLight() {
  const hazeOn = useDebugFlags()("haze");
  const spot = useRef<THREE.SpotLight>(null);
  const rimL = useRef<THREE.SpotLight>(null);
  const rimR = useRef<THREE.SpotLight>(null);
  const head = useRef<THREE.SpotLight>(null);
  const born = useRef<number | null>(null);
  const { scene } = useThree();

  // drei's volumetric cone is a child mesh we can't pass props to: pin its order here.
  useEffect(() => {
    spot.current?.parent?.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.ShaderMaterial | undefined;
      // drei's SpotLightMaterial: identified by its uniforms.
      if ((o as THREE.Mesh).isMesh && mat?.uniforms?.anglePower && mat.uniforms.spotPosition) {
        o.renderOrder = TRANSPARENT_ORDER.haze;
      }
    });
  }, []);

  useEffect(() => {
    if (head.current) {
      head.current.target.position.set(4, 0, 0);
      scene.add(head.current.target);
    }
  }, [scene]);

  useFrame(({ clock }) => {
    born.current ??= clock.elapsedTime;
    const t = clock.elapsedTime - born.current;
    // Flicker pattern for the first ~1.6 s, then steady.
    const flicker = reduceMotion()
      ? 1
      : t < 0.3
        ? 0
        : t < 1.6
          ? (Math.sin(t * 40) > 0.2 || t > 1.25 ? 1 : 0.08) * Math.min(1, t)
          : 1;
    const night = nightAt(store.progress);
    if (spot.current) spot.current.intensity = 80 * flicker * (1 - night * 0.82);
    if (rimL.current) rimL.current.intensity = 26 * flicker * (1 - night * 0.6);
    if (rimR.current) rimR.current.intensity = 9 * flicker * (1 - night * 0.6);
    if (head.current) head.current.intensity = 60 * night;
  });

  return (
    <>
      <SpotLight
        ref={spot}
        volumetric={hazeOn}
        position={[0.2, 4.6, 0.6]}
        angle={0.42}
        penumbra={0.55}
        distance={9}
        attenuation={5}
        anglePower={7}
        opacity={0.16}
        color="#f4f1ea"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-normalBias={0.02}
        shadow-bias={-0.0004}
      />
      {/* Cool rim from behind-left, warm ember kicker from behind-right. */}
      <spotLight ref={rimL} position={[-3.2, 1.6, -2.4]} angle={0.5} penumbra={1} color="#9db4ff" distance={10} />
      <spotLight ref={rimR} position={[3.4, 0.9, -2.2]} angle={0.45} penumbra={1} color="#ff5a2a" distance={10} />
      {/* Headlight beam for the night section. */}
      <spotLight
        ref={head}
        position={HEADLIGHT}
        angle={0.38}
        penumbra={0.7}
        color="#e9f0ff"
        distance={12}
        decay={1.2}
      />
      <ambientLight intensity={0.03} />
    </>
  );
}

/** Debug: turn the shadow map on/off live. */
function ShadowSwitch({ on }: { on: boolean }) {
  const get = useThree((st) => st.get);
  useEffect(() => {
    const { gl, scene } = get();
    gl.shadowMap.enabled = on;
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => (x.needsUpdate = true));
    });
  }, [on, get]);
  return null;
}

/** Soft radial falloff, generated once. */
let blobTexture: THREE.Texture | null = null;
function getBlobTexture() {
  if (blobTexture) return blobTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(0.45, "rgba(0,0,0,0.65)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  blobTexture = new THREE.CanvasTexture(c);
  return blobTexture;
}

/**
 * Grounding shadow: soft blobs under the bike and each tyre's contact patch,
 * parented to the turntable so they rotate with it. Replaces ContactShadows,
 * whose per-frame orthographic re-render produced a large, aliased pattern
 * that crawled with every camera and turntable move (dark bands sweeping).
 */
function GroundShadow() {
  const blobs: { x: number; sx: number; sz: number; o: number }[] = [
    { x: 0, sx: 2.1, sz: 0.7, o: 0.7 },
    { x: 0.78, sx: 0.55, sz: 0.22, o: 0.45 },
    { x: -0.71, sx: 0.65, sz: 0.3, o: 0.45 },
  ];
  return (
    <>
      {blobs.map((b, i) => (
        <mesh
          key={i}
          position={[b.x, -0.006 + i * 0.0005, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={TRANSPARENT_ORDER.ground}
        >
          <planeGeometry args={[b.sx, b.sz]} />
          <meshBasicMaterial map={getBlobTexture()} transparent opacity={b.o} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

/*
 * The floor deliberately does not receive the key light's shadow map. Projected
 * from 4.6 m up across a wide cone, that shadow was blocky and stair-stepped,
 * and it crawled with every camera move and turntable step: dark bands
 * sweeping across the lower screen. GroundShadow grounds the bike instead,
 * softly and stably. The bike still shadows itself.
 */
function Floor() {
  return (
    // A few mm below y=0: the tyres' lowest points sit exactly at 0, and a floor
    // there slices through the tread, showing as a dark oval on each tyre.
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.008, 0]}>
      <planeGeometry args={[30, 30]} />
      {/* Matte sealed concrete: a broad, soft sheen from the environment map,
          no hotspots that would flash as the camera moves. (A MeshReflectorMaterial re-rendered the scene into
          its own target every frame; under post-processing on some GPUs that
          left frames partially drawn.) */}
      <meshPhysicalMaterial color="#08080a" roughness={0.85} metalness={0} clearcoat={0.25} clearcoatRoughness={0.6} />
    </mesh>
  );
}

/**
 * What the chrome reflects: long softbox strips and an ember card, rendered once
 * into an environment map. This is where the liquid-metal look comes from.
 */
function Reflections() {
  return (
    <Environment resolution={256} frames={1} background={false} environmentIntensity={1.25}>
      {/* Big overhead softbox and long side strips: the streaks you see in the chrome. */}
      <Lightformer form="rect" intensity={4} position={[0, 4, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[7, 1.4, 1]} />
      <Lightformer
        form="rect"
        intensity={2.6}
        position={[-4, 1.6, 1.5]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[0.35, 5, 1]}
      />
      <Lightformer
        form="rect"
        intensity={2.6}
        position={[4, 1.6, -1.5]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[0.35, 5, 1]}
      />
      <Lightformer
        form="rect"
        intensity={1.8}
        position={[1.5, 1.2, 4]}
        rotation={[0, Math.PI, 0]}
        scale={[5, 0.25, 1]}
      />
      <Lightformer
        form="rect"
        intensity={1.2}
        position={[-1.5, 0.4, 4]}
        rotation={[0, Math.PI, 0]}
        scale={[4, 0.12, 1]}
      />
      <Lightformer form="rect" intensity={0.45} color="#ff5a2a" position={[2, 0.4, -4]} scale={[3, 0.3, 1]} />
      <Lightformer form="ring" intensity={1.4} color="#9db4ff" position={[-2, 2.5, -4]} scale={1.5} />
    </Environment>
  );
}

/*
 * WebGL context loss (GPU memory pressure, driver reset) is handled by
 * three.js itself: WebGLRenderer prevents the default on "webglcontextlost"
 * and re-initialises programs, textures and targets on "webglcontextrestored",
 * so the scene comes back without remounting anything.
 */
export default function Garage() {
  const on = useDebugFlags();
  return (
    <Canvas
      // PCF: three r18x removed PCFSoftShadowMap (R3F's default for `shadows`) and warns on fallback.
      shadows="percentage"
      // Fixed resolution: never resized after mount (resizes rebuild every
      // render target and were one source of black frames).
      dpr={[1, 1.5]}
      // The canvas is fixed: re-measuring on every scroll event is wasted work
      // and a source of needless state updates mid-scroll.
      resize={{ scroll: false, debounce: { scroll: 0, resize: 150 } }}
      camera={{ position: [3.1, 1.05, 2.9], fov: 32, near: 0.05, far: 60 }}
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      onCreated={({ gl }) => gl.setClearColor("#040405")}
      aria-hidden
    >
      <fog attach="fog" args={["#040405", 5, 14]} />
      <ShadowSwitch on={on("shadows")} />
      <CameraRig />
      <KeyLight />
      <Reflections />
      <Turntable>
        <Bike />
        {on("ground") && <GroundShadow />}
        <Callouts />
      </Turntable>
      {on("floor") && <Floor />}
      {/* No MSAA render targets: multisampled float buffers flash black or
          draw partially on some GPU/driver combinations. SMAA instead. */}
      {on("post") && (
        <EffectComposer multisampling={0}>
          {/* Children must be elements, so disabled effects become empty fragments. */}
          {on("bloom") ? (
            <Bloom
              mipmapBlur
              levels={6}
              radius={0.7}
              intensity={0.9}
              // Only genuinely emissive things (headlight, tail light) bloom.
              // At 0.92 ordinary specular glints on chrome, spokes and bolts
              // crossed the threshold and popped in and out as the camera
              // moved: the flashes and flicker seen on real GPUs.
              luminanceThreshold={1.6}
              luminanceSmoothing={0.3}
            />
          ) : (
            <></>
          )}
          {on("chroma") ? (
            <ChromaticAberration
              offset={[0.0006, 0.0004]}
              radialModulation
              modulationOffset={0.35}
              blendFunction={BlendFunction.NORMAL}
            />
          ) : (
            <></>
          )}
          {on("grain") ? <Noise opacity={0.045} blendFunction={BlendFunction.SOFT_LIGHT} /> : <></>}
          {on("vignette") ? <Vignette offset={0.25} darkness={0.85} /> : <></>}
          {on("smaa") ? <SMAA /> : <></>}
          {/* The composer renders in HDR; tone-map last so hot speculars roll off instead of clipping. */}
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
