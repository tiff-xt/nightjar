/** Paint and frame finishes for the configurator. Physically based material params. */
export type Finish = {
  id: string;
  name: string;
  color: string;
  metalness: number;
  roughness: number;
  clearcoat: number;
  /** Swatch preview (CSS background). */
  swatch: string;
};

export const PAINTS: Finish[] = [
  {
    id: "obsidian",
    name: "Obsidian",
    color: "#0b0c0f",
    metalness: 0.45,
    roughness: 0.3,
    clearcoat: 1,
    swatch: "linear-gradient(160deg,#3a3d45,#08090b 55%,#9aa0aa 56%,#22252b 62%)",
  },
  {
    id: "gunmetal",
    name: "Gunmetal",
    color: "#3a3d44",
    metalness: 0.85,
    roughness: 0.28,
    clearcoat: 1,
    swatch: "linear-gradient(160deg,#7c818c,#2c2f35 55%,#4a4e57)",
  },
  {
    id: "ember",
    name: "Ember",
    color: "#b5161c",
    metalness: 0.7,
    roughness: 0.22,
    clearcoat: 1,
    swatch: "linear-gradient(160deg,#ff6a5c,#a3141a 50%,#3b0606)",
  },
  {
    id: "liquid-silver",
    name: "Liquid Silver",
    color: "#e6e9ef",
    metalness: 0.82,
    roughness: 0.2,
    clearcoat: 1,
    swatch: "linear-gradient(160deg,#ffffff,#9aa1ad 45%,#2b2e35 52%,#d7dbe3)",
  },
];

export const FRAMES: Finish[] = [
  {
    id: "red",
    name: "Candy Red",
    color: "#8e1519",
    metalness: 0.6,
    roughness: 0.32,
    clearcoat: 0.8,
    swatch: "linear-gradient(160deg,#e0414a,#6e0d10)",
  },
  {
    id: "gunmetal",
    name: "Gunmetal",
    color: "#3d4048",
    metalness: 0.9,
    roughness: 0.34,
    clearcoat: 0,
    swatch: "linear-gradient(160deg,#80858f,#2e3137)",
  },
  {
    id: "black",
    name: "Black Chrome",
    color: "#1f2126",
    metalness: 1,
    roughness: 0.18,
    clearcoat: 0,
    swatch: "linear-gradient(160deg,#5b5f68,#0e0f12)",
  },
];

export const paintById = (id: string) => PAINTS.find((p) => p.id === id) ?? PAINTS[0];
export const frameById = (id: string) => FRAMES.find((f) => f.id === id) ?? FRAMES[0];
