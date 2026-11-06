"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  PerformanceMonitor,
  SpotLight,
} from "@react-three/drei";
import { Bloom, ChromaticAberration, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { store } from "@/lib/store";
import { nightAt, shotAt, window01 } from "@/lib/story";
import { Bike } from "./Bike";
import { Callouts } from "./Callouts";

const reduceMotion = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Camera follows the scroll story with critically damped easing, plus a little pointer parallax. */
function CameraRig() {
  const look = useRef(new THREE.Vector3(0, 0.6, 0));
  const first = useRef(true);
  useFrame(({ camera, pointer }, dt) => {
    const shot = shotAt(store.progress);
    const cam = camera as THREE.PerspectiveCamera;
    const k = first.current || reduceMotion() ? 1 : 1 - Math.exp(-dt * 3.2);
    first.current = false;
    const par = reduceMotion() ? 0 : 0.08;
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
    if (build > 0.5 && !reduceMotion()) store.spin += dt * 0.12;
    const target = store.spin * build;
    g.rotation.y += (target - g.rotation.y) * Math.min(1, dt * 4);
  });
  return <group ref={ref}>{children}</group>;
}

/** Key light: a hard overhead spot that flickers on like a garage tube, then dims for night mode. */
function KeyLight() {
  const spot = useRef<THREE.SpotLight>(null);
  const rimL = useRef<THREE.SpotLight>(null);
  const rimR = useRef<THREE.SpotLight>(null);
  const head = useRef<THREE.SpotLight>(null);
  const born = useRef<number | null>(null);
  const { scene } = useThree();

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
        position={[0.2, 4.6, 0.6]}
        angle={0.42}
        penumbra={0.55}
        distance={9}
        attenuation={5}
        anglePower={7}
        opacity={0.16}
        color="#f4f1ea"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />
      {/* Cool rim from behind-left, warm ember kicker from behind-right. */}
      <spotLight ref={rimL} position={[-3.2, 1.6, -2.4]} angle={0.5} penumbra={1} color="#9db4ff" distance={10} />
      <spotLight ref={rimR} position={[3.4, 0.9, -2.2]} angle={0.45} penumbra={1} color="#ff5a2a" distance={10} />
      {/* Headlight beam for the night section. */}
      <spotLight
        ref={head}
        position={[0.7, 0.9, 0]}
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

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <MeshReflectorMaterial
        resolution={512}
        blur={[400, 120]}
        mixBlur={1}
        mixStrength={1.4}
        mirror={0.5}
        roughness={0.9}
        depthScale={1}
        minDepthThreshold={0.6}
        maxDepthThreshold={1.3}
        color="#070708"
        metalness={0.4}
      />
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

export default function Garage() {
  const [dpr, setDpr] = useState(1.5);
  return (
    <Canvas
      // PCF: three r18x removed PCFSoftShadowMap (R3F's default for `shadows`) and warns on fallback.
      shadows="percentage"
      dpr={dpr}
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
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(Math.min(2, window.devicePixelRatio))} />
      <fog attach="fog" args={["#040405", 5, 14]} />
      <CameraRig />
      <KeyLight />
      <Reflections />
      <Turntable>
        <Bike />
        <Callouts />
      </Turntable>
      <ContactShadows
        position={[0, 0.002, 0]}
        opacity={0.85}
        scale={4}
        blur={2.4}
        far={1.2}
        resolution={512}
        color="#000"
      />
      <Floor />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.6} luminanceThreshold={0.92} luminanceSmoothing={0.15} />
        <ChromaticAberration
          offset={[0.0006, 0.0004]}
          radialModulation
          modulationOffset={0.35}
          blendFunction={BlendFunction.NORMAL}
        />
        <Noise opacity={0.045} blendFunction={BlendFunction.SOFT_LIGHT} />
        <Vignette offset={0.25} darkness={0.85} />
        {/* The composer renders in HDR; tone-map last so hot speculars roll off instead of clipping. */}
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
}
