import codexImg from '/codex.png';

const layers = [
  {
    name: 'Command',
    color: 'var(--color-testing)',
    owns: 'ICommand identity (key/label/hint), wiring a View to its deps',
    files: 'Compile.ts, Split.ts, Exit.ts',
  },
  {
    name: 'View',
    color: 'var(--color-web)',
    owns: 'Terminal rendering — intro/progress/summary. The only layer that calls @clack/prompts.',
    files: 'CompileView.ts, SplitView.ts',
  },
  {
    name: 'Core',
    color: 'var(--color-source)',
    owns: 'Pure business logic — glob resolution, manifest building, archive read/write. No rendering.',
    files: 'ArchiveFormat.ts, FileScanner.ts, CompileService.ts, SplitService.ts',
  },
]

export default function Architecture() {
  return (
    <section id="architecture" className="px-6 py-20">
      <div className="max-w-4xl mx-auto text-center">
        <div className="flex justify-center mb-4">
          <img src={codexImg} alt="" width={72} height={72} />
        </div>
        <h2 className="font-display text-3xl sm:text-4xl text-(--color-neutral) mb-3">
          Layers, not files
        </h2>
        <p className="max-w-xl mx-auto mb-12">
          Every non-trivial command splits into three layers, each with
          exactly one job — the mental model is deliberately React-shaped.
        </p>

        <div className="grid md:grid-cols-3 gap-6 text-left">
          {layers.map((layer) => (
            <div key={layer.name} className="pendex-card p-6 flex flex-col gap-3">
              <span
                className="self-start px-3 py-1 rounded-full text-xs font-bold text-[#1a1a1a] border-2 border-outline"
                style={{ background: layer.color }}
              >
                {layer.name}
              </span>
              <p className="text-sm leading-relaxed">{layer.owns}</p>
              <code className="text-xs opacity-70 mt-auto">{layer.files}</code>
            </div>
          ))}
        </div>

        <p className="max-w-xl mx-auto mt-10 text-sm opacity-80">
          <code>ArchiveFormat.ts</code> exists because Compile and Split used
          to each have half-knowledge of the same text format — one file now
          owns it in both directions.
        </p>
      </div>
    </section>
  )
}
