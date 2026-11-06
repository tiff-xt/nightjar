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
    id: "liquid-silver",
    name: "Liquid Silver",
    color: "#eef1f6",
    metalness: 0.82,
    roughness: 0.2,
    clearcoat: 1,
    swatch: "linear-gradient(160deg,#ffffff,#9aa1ad 45%,#2b2e35 52%,#d7dbe3)",
  },
  {
    id: "obsidian",
    name: "Obsidian",
    color: "#0b0c0f",
    metalness: 0.6,
    roughness: 0.18,
    clearcoat: 1,
    swatch: "linear-gradient(160deg,#3a3d45,#08090b 55%,#22252b)",
  },
  {
    id: "ember",
    name: "Ember",
    color: "#c22a10",
    metalness: 0.75,
    roughness: 0.22,
    clearcoat: 1,
    swatch: "linear-gradient(160deg,#ff7a4d,#a3200b 50%,#3b0b04)",
  },
  {
    id: "ghost",
    name: "Ghost",
    color: "#d9d8d4",
    metalness: 0.05,
    roughness: 0.62,
    clearcoat: 0,
    swatch: "linear-gradient(160deg,#f2f1ee,#bdbcb8)",
  },
];

export const FRAMES: Finish[] = [
  {
    id: "satin",
    name: "Satin Silver",
    color: "#c8ccd3",
    metalness: 1,
    roughness: 0.3,
    clearcoat: 0,
    swatch: "linear-gradient(160deg,#eef0f4,#8a909b)",
  },
  {
    id: "black",
    name: "Black Chrome",
    color: "#24262b",
    metalness: 1,
    roughness: 0.18,
    clearcoat: 0,
    swatch: "linear-gradient(160deg,#5b5f68,#0e0f12)",
  },
  {
    id: "ember",
    name: "Ember",
    color: "#d2401c",
    metalness: 0.5,
    roughness: 0.3,
    clearcoat: 0.6,
    swatch: "linear-gradient(160deg,#ff8a5c,#9c2a0e)",
  },
];

export const paintById = (id: string) => PAINTS.find((p) => p.id === id) ?? PAINTS[0];
export const frameById = (id: string) => FRAMES.find((f) => f.id === id) ?? FRAMES[0];
