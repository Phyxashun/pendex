import { useState } from 'react';

interface CodeBlockProps {
  lines: string[]
  label?: string
}

export default function CodeBlock({ lines, label = 'terminal' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      const write = (navigator as any).clipboard?.writeText
      if (typeof write === 'function') {
        await write(lines.join('\n'))
      } else {
        throw new Error('clipboard unavailable')
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  return (
    <div className="pendex-card overflow-hidden text-left w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between px-4 py-2 border-b-2 border-outline bg-terminal-cat">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-style" />
          <span className="w-2.5 h-2.5 rounded-full bg-source" />
          <span className="w-2.5 h-2.5 rounded-full bg-(--color-web)" />
          <span className="ml-2 text-xs font-mono text-[#e9e0d2]">{label}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs font-mono text-[#e9e0d2]/70 hover:text-[#e9e0d2] transition-colors cursor-pointer"
        >
          {copied ? 'copied!' : 'copy'}
        </button>
      </div>
      <div className="px-4 py-3 font-mono text-sm bg-[#1a1a1a] text-[#e9e0d2]">
        {lines.map((line) => (
          <div key={line}>
            <span className="text-(--color-primary) select-none">$ </span>
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}
