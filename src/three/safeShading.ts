import * as THREE from "three";

/**
 * Guard every built-in material's final colour before it reaches the
 * post-processing chain. A single NaN/Inf pixel (from an unstable BRDF term
 * at a grazing angle, for instance) is harmless on its own, but Bloom's
 * mipmap blur spreads it into large black blocks and bands that sweep across
 * the screen as the camera or turntable moves. Very hot specular "fireflies"
 * are capped for the same reason. Runs once, before any material compiles.
 */
const GUARD = /* glsl */ `
  {
    vec3 c = gl_FragColor.rgb;
    bvec3 bad = bvec3(isnan(c.r) || isinf(c.r), isnan(c.g) || isinf(c.g), isnan(c.b) || isinf(c.b));
    if (any(bad)) c = vec3(0.0);
    gl_FragColor.rgb = min(c, vec3(32.0));
    if (isnan(gl_FragColor.a)) gl_FragColor.a = 1.0;
  }
`;

let installed = false;
export function installSafeShading() {
  if (installed) return;
  installed = true;
  // dithering_fragment is the last chunk in every built-in material's fragment shader.
  THREE.ShaderChunk.dithering_fragment = GUARD + THREE.ShaderChunk.dithering_fragment;
}
