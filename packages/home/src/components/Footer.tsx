import CodeBlock from './CodeBlock';

export default function Footer() {
  return (
    <footer className="px-6 py-20 text-center">
      <div className="max-w-lg mx-auto flex flex-col items-center gap-6">
        <h2 className="font-display text-3xl text-(--color-neutral)">
          Get started
        </h2>
        <CodeBlock label="pendex" lines={['bun install', 'bun run start']} />
        <div className="flex flex-wrap justify-center gap-4 text-sm font-medium">
          <a
            href="https://github.com/Phyxashun/pendex"
            target="_blank"
            rel="noreferrer"
            className="hover:text-(--color-accent) transition-colors"
          >
            GitHub
          </a>
          <span className="opacity-30">·</span>
          <a
            href="https://github.com/Phyxashun/pendex/blob/main/LICENSE"
            target="_blank"
            rel="noreferrer"
            className="hover:text-(--color-accent) transition-colors"
          >
            License
          </a>
          <span className="opacity-30">·</span>
          <a
            href="https://bun.sh"
            target="_blank"
            rel="noreferrer"
            className="hover:text-(--color-accent) transition-colors"
          >
            Built with Bun
          </a>
        </div>
        <p className="text-xs opacity-60 font-mono">
          𝒫endex — your project's portable codex.
        </p>
      </div>
    </footer>
  )
}
