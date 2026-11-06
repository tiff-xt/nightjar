import { Configurator } from "@/components/Configurator";
import { EngineControl } from "@/components/EngineControl";
import { ScrollDriver } from "@/components/ScrollDriver";
import { Stage } from "@/components/Stage";

const specs = [
  ["Engine", "890 cc 75° V-twin, liquid-cooled"],
  ["Output", "121 hp @ 9,500 rpm · 98 Nm"],
  ["Frame", "Chromoly steel trellis"],
  ["Suspension", "43 mm inverted fork · monoshock"],
  ["Brakes", "Twin 320 mm discs, radial calipers"],
  ["Weight", "184 kg dry"],
  ["Seat height", "825 mm"],
  ["Tank", "14 L"],
];

export default function Home() {
  return (
    <>
      <Stage />
      <ScrollDriver />

      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-5 py-5 sm:px-10">
        <a href="#top" className="font-display text-xl font-black uppercase tracking-[0.3em]">
          Nightjar
        </a>
        <nav
          aria-label="Primary"
          className="hidden gap-7 font-mono text-[11px] uppercase tracking-[0.25em] text-white/60 sm:flex"
        >
          <a href="#engine" className="hover:text-white">
            Engine
          </a>
          <a href="#build" className="hover:text-white">
            Build yours
          </a>
          <a href="#specs" className="hover:text-white">
            Specs
          </a>
        </nav>
      </header>

      <main id="top">
        {/* 0 Hero */}
        <section data-shot="hero" className="relative flex min-h-[100svh] flex-col justify-end px-5 pb-20 sm:px-10">
          <p className="eyebrow mb-5">Naked · Streetfighter · 2027</p>
          <h1 className="chrome-type font-display text-[clamp(4.5rem,19vw,17rem)] font-black uppercase leading-[0.8] tracking-[-0.01em]">
            Nightjar
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-white/70">
            Built for the hour after dusk. Nothing hidden, nothing wasted: just frame, engine and nerve.
          </p>
          <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.3em] text-white/40">
            Scroll to walk around it ↓
          </p>
        </section>

        {/* 1 Trellis */}
        <section data-shot="trellis" className="flex min-h-[110svh] items-center px-5 sm:px-10">
          <div className="reveal max-w-md">
            <p className="eyebrow mb-4">01 · Chassis</p>
            <h2 className="font-display text-6xl font-black uppercase leading-[0.85] sm:text-8xl">Show the bones.</h2>
            <p className="mt-5 leading-relaxed text-white/70">
              A chromoly trellis you&apos;re meant to look at. Every tube is triangulated and every weld is on show,
              wrapped by a faceted tank cut like a blade.
            </p>
          </div>
        </section>

        {/* 2 Twin */}
        <section id="engine" data-shot="twin" className="flex min-h-[110svh] items-center justify-end px-5 sm:px-10">
          <div className="reveal max-w-md text-right">
            <p className="eyebrow mb-4">02 · Engine</p>
            <h2 className="font-display text-6xl font-black uppercase leading-[0.85] sm:text-8xl">
              Two hearts. One beat.
            </h2>
            <p className="mt-5 leading-relaxed text-white/70">
              An 890 cc 75° V-twin with an uneven firing order you feel in your chest. Start the engine below and
              scroll: the faster you move, the harder it revs.
            </p>
          </div>
        </section>

        {/* 3 Exploded */}
        <section data-shot="exploded" className="flex min-h-[120svh] items-end px-5 pb-24 sm:px-10">
          <div className="reveal max-w-md">
            <p className="eyebrow mb-4">03 · Anatomy</p>
            <h2 className="font-display text-6xl font-black uppercase leading-[0.85] sm:text-8xl">Pulled apart.</h2>
            <p className="mt-5 leading-relaxed text-white/70">
              Seven assemblies, nothing extra. Bodywork, seat, front end, swingarm, engine, exhaust and frame, each
              modelled from code.
            </p>
          </div>
        </section>

        {/* 4 After dark */}
        <section data-shot="after-dark" className="flex min-h-[120svh] items-center px-5 sm:px-10">
          <div className="reveal max-w-md">
            <p className="eyebrow mb-4">04 · After dark</p>
            <h2 className="font-display text-6xl font-black uppercase leading-[0.85] sm:text-8xl">
              Lights out. Eyes on.
            </h2>
            <p className="mt-5 leading-relaxed text-white/70">
              Twin LED blades cut the dark. The garage drops away and the road is the only thing lit.
            </p>
          </div>
        </section>

        {/* 5 Build */}
        <section id="build" data-shot="build" className="flex min-h-[130svh] items-center px-5 sm:px-10">
          <div className="reveal space-y-6">
            <div>
              <p className="eyebrow mb-4">05 · Build yours</p>
              <h2 className="font-display text-6xl font-black uppercase leading-[0.85] sm:text-8xl">Make it yours.</h2>
            </div>
            <Configurator />
          </div>
        </section>

        {/* 6 Specs */}
        <section id="specs" data-shot="specs" className="flex min-h-[110svh] items-center justify-end px-5 sm:px-10">
          <div className="reveal hud w-full max-w-lg rounded-3xl p-6 sm:p-8">
            <p className="eyebrow mb-6">06 · Specification</p>
            <dl className="divide-y divide-white/10">
              {specs.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 py-3 text-sm">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">{k}</dt>
                  <dd className="text-right text-white/90">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <footer className="px-5 pb-28 pt-10 sm:px-10">
          <div className="flex flex-col justify-between gap-4 border-t border-white/10 pt-8 text-sm text-white/50 sm:flex-row">
            <p className="max-w-xl">
              Nightjar is a fictional brand and motorcycle: an original design, modelled, lit and voiced entirely in
              code by{" "}
              <a href="https://github.com/tiff-xt" className="text-white underline underline-offset-4">
                Tiff
              </a>
              . Not affiliated with any manufacturer. Specs are invented.
            </p>
            <a
              href="https://github.com/tiff-xt/nightjar"
              className="font-mono text-xs underline underline-offset-4 hover:text-white"
            >
              Source ↗
            </a>
          </div>
        </footer>
      </main>

      <EngineControl />
    </>
  );
}
