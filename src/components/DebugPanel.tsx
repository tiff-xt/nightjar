"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { debugFlags, FLAGS, type Flag } from "@/lib/debugFlags";
import { useDebugFlags } from "./useDebugFlags";

/** Floating render-debug panel (only with ?debug). */
const noop = () => () => {};

export function DebugPanel() {
  const on = useDebugFlags();
  // False on the server and during hydration, so markup always matches.
  const enabled = useSyncExternalStore(
    noop,
    () => debugFlags.enabled,
    () => false,
  );
  const [info, setInfo] = useState({ gpu: "…", fps: 0, size: "", dpr: 0 });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      frames++;
      if (t - last > 1000) {
        const c = document.querySelector("canvas");
        let gpu = "unknown";
        const gl = c?.getContext("webgl2") as WebGL2RenderingContext | null;
        const ext = gl?.getExtension("WEBGL_debug_renderer_info");
        if (gl && ext) gpu = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
        else if (gl) gpu = String(gl.getParameter(gl.RENDERER));
        setInfo({
          gpu,
          fps: Math.round((frames * 1000) / (t - last)),
          size: c ? `${c.width}×${c.height}` : "",
          dpr: devicePixelRatio,
        });
        frames = 0;
        last = t;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  if (!enabled) return null;

  const report = () => {
    const offList = (Object.keys(FLAGS) as Flag[]).filter((f) => !on(f));
    const text = `GPU: ${info.gpu}\nBrowser: ${navigator.userAgent}\nfps: ${info.fps}, canvas ${info.size}, dpr ${info.dpr}\nOff: ${offList.join(", ") || "none"}\nURL: ${location.href}`;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <aside
      aria-label="Render debug"
      className="fixed left-4 top-20 z-[60] w-72 rounded-2xl border border-white/15 bg-black/90 p-4 font-mono text-[11px] text-white/80"
    >
      <p className="mb-2 uppercase tracking-widest text-[var(--ember)]">Render debug</p>
      <p className="break-words text-white/60">{info.gpu}</p>
      <p className="mb-3 text-white/60">
        {info.fps} fps · {info.size} · dpr {info.dpr}
      </p>
      <ul className="space-y-1.5">
        {(Object.keys(FLAGS) as Flag[]).map((f) => (
          <li key={f}>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={on(f)} onChange={() => debugFlags.toggle(f)} />
              {FLAGS[f]}
            </label>
          </li>
        ))}
      </ul>
      <button type="button" onClick={report} className="mt-3 w-full rounded-full bg-white py-1.5 text-black">
        {copied ? "Copied" : "Copy report"}
      </button>
    </aside>
  );
}
