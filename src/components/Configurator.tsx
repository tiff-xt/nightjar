"use client";
import { FRAMES, PAINTS, type Finish } from "@/lib/colorways";
import { store } from "@/lib/store";
import { useStore } from "./useStore";

function Swatches({
  label,
  items,
  value,
  onPick,
}: {
  label: string;
  items: Finish[];
  value: string;
  onPick: (id: string) => void;
}) {
  const current = items.find((i) => i.id === value);
  return (
    <fieldset>
      <legend className="mb-3 flex w-full justify-between font-mono text-[11px] uppercase tracking-[0.25em] text-white/50">
        {label}
        <span className="text-white/90">{current?.name}</span>
      </legend>
      <div className="flex gap-3">
        {items.map((i) => (
          <button
            key={i.id}
            type="button"
            aria-label={i.name}
            aria-pressed={i.id === value}
            onClick={() => onPick(i.id)}
            className="size-11 rounded-full ring-1 ring-white/20 ring-offset-4 ring-offset-black transition-all duration-300 hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-white"
            style={{ background: i.swatch }}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function Configurator() {
  const paint = useStore(() => store.paint, "liquid-silver");
  const frame = useStore(() => store.frame, "satin");
  return (
    <div className="hud max-w-sm space-y-7 rounded-3xl p-6 sm:p-8">
      <Swatches label="Paint" items={PAINTS} value={paint} onPick={(id) => store.set("paint", id)} />
      <Swatches label="Frame" items={FRAMES} value={frame} onPick={(id) => store.set("frame", id)} />
      <p className="text-xs leading-relaxed text-white/50">
        The bike turns slowly while you build. Finishes are physically based: metalness, roughness and clearcoat change
        with each one.
      </p>
    </div>
  );
}
