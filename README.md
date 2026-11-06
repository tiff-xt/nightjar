# Nightjar

**A fictional naked streetfighter, modelled, lit and voiced entirely in code.**
Live: https://nightjar-by-tiff.vercel.app

> Nightjar is an invented brand and an original design, not affiliated with any
> manufacturer. All specs are fictional. A concept piece by [Tiff](https://github.com/tiff-xt).

## What's interesting

### The bike is code

There's no downloaded model. `src/three/Bike.tsx` builds the bike from primitives.

- **Geometry helper kit** (`src/three/geometry.ts`):
  - rods between two points
  - swept tubes for the exhaust headers
  - coil springs
  - extruded side-profile panels with bevels, which give the faceted tank and tail
- **Frame:** a triangulated chromoly-style trellis, mirrored left and right.
- **Engine:** a 75° V-twin with cooling fins.
- **Wheels:** split spokes and radial calipers.
- **Suspension:** inverted forks and a monoshock with a coil spring.
- **Exploded view:** seven assemblies, each with its own vector, so the bike can come apart in the anatomy section.

### Night-garage lighting

- **Key light:** a single volumetric spotlight that flickers on like a shop tube light.
- **Rim lights:** a cool one and an ember one, for silhouette.
- **Floor:** blurred-reflective concrete with contact shadows.
- **Reflections:** the liquid-silver look comes from a custom environment map
  built from softbox and strip `Lightformer`s. The chrome reflects light
  shapes rather than a photo.
- **Post-processing:** HDR bloom, subtle chromatic aberration, film grain,
  vignette and ACES tone mapping.

### Scroll-directed camera

- `src/lib/story.ts` holds one camera keyframe per section.
- Progress is measured from section centres. The camera holds on each shot,
  then eases to the next one.
- A film offset frames the bike beside the copy, and it re-centres on narrow screens.
- The same progress value drives the exploded view, the night mode (headlight
  beam, garage dims) and the 3D-anchored callouts.
- These are pure functions with tests.

### Synthesised V-twin

`src/lib/engineSound.ts` makes the engine sound with no audio samples:

- a sawtooth at the firing frequency
- an uneven firing-order amplitude pattern
- a sub-octave
- a soft-clip waveshaper
- an intake low-pass that opens as the revs rise
- mechanical noise

Scroll speed and the "hold to rev" button drive the revs, which rise quickly
and fall back slowly, with a live tachometer.

### Configurator

Paint and frame finishes are physically based: color, metalness, roughness
and clearcoat. Picking one lerps the materials smoothly, and the bike turns
on a slow turntable while you build.

### Performance and accessibility

- three.js loads client-side only, separately from the rest of the page.
- `PerformanceMonitor` drops the resolution when frames slow down.
- All copy is real HTML, and the canvas is `aria-hidden`.
- Reduced motion snaps the camera instead of easing, and skips the flicker and the turntable.

## Stack

Next.js 16 · React 19 · TypeScript · three.js · React Three Fiber · drei · postprocessing · Web Audio · Tailwind CSS 4 · Vitest

## Develop

```bash
npm install
npm run dev
npm run check
```
