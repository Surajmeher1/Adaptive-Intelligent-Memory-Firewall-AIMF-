import { useMemo, useEffect, useRef } from 'react'
import { Marked } from 'marked'

interface MarkdownContentProps {
  content: string
  isStreaming?: boolean
}

// Escape HTML characters for code blocks
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Create configured Marked instance
const markedInstance = new Marked({
  gfm: true,
  breaks: true,
})

// Configure custom renderer for code blocks and links
markedInstance.use({
  renderer: {
    code({ text, lang }) {
      const language = (lang || 'code').trim().toLowerCase()
      const escaped = escapeHtml(text)
      return `
<div class="aimf-code-block my-3 rounded-xl overflow-hidden border border-slate-800 bg-[#0b0f19] shadow-md">
  <div class="flex items-center justify-between px-3.5 py-1.5 bg-[#121726] border-b border-slate-800/80 text-xs text-slate-400">
    <span class="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400">${language}</span>
    <button
      type="button"
      class="aimf-copy-code-btn flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] text-slate-300 hover:text-white hover:bg-slate-700/50 transition cursor-pointer"
      title="Copy code"
    >
      <svg class="aimf-copy-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
      </svg>
      <span class="aimf-copy-label">Copy code</span>
    </button>
  </div>
  <pre class="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono text-slate-200"><code>${escaped}</code></pre>
</div>
`
    },
    link({ href, title, text }) {
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
      return `<a href="${href}" target="_blank" rel="noopener noreferrer"${titleAttr} class="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors font-medium">${text}</a>`
    },
    codespan({ text }) {
      return `<code class="px-1.5 py-0.5 rounded text-xs font-mono bg-slate-800/90 text-indigo-300 border border-slate-700/60">${text}</code>`
    },
    heading({ text, depth }) {
      const sizeClasses: Record<number, string> = {
        1: 'text-xl font-bold text-white mt-5 mb-2.5 pb-1 border-b border-slate-800',
        2: 'text-lg font-semibold text-white mt-4 mb-2',
        3: 'text-base font-semibold text-slate-100 mt-3 mb-1.5',
        4: 'text-sm font-semibold text-slate-200 mt-2.5 mb-1',
        5: 'text-xs font-semibold text-slate-300 mt-2 mb-1',
        6: 'text-xs font-medium text-slate-400 mt-1.5 mb-0.5',
      }
      const cls = sizeClasses[depth] || sizeClasses[3]
      return `<h${depth} class="${cls}">${text}</h${depth}>`
    },
    list({ items, ordered, start }) {
      const tag = ordered ? 'ol' : 'ul'
      const listClass = ordered
        ? 'list-decimal list-outside pl-5 my-2.5 space-y-1.5 text-sm text-slate-200'
        : 'list-disc list-outside pl-5 my-2.5 space-y-1.5 text-sm text-slate-200'
      const startAttr = ordered && start && start !== 1 ? ` start="${start}"` : ''
      
      let body = ''
      for (const item of items) {
        body += `<li class="leading-relaxed pl-0.5">${item.text}</li>`
      }
      return `<${tag} class="${listClass}"${startAttr}>${body}</${tag}>`
    },
    blockquote({ text }) {
      return `<blockquote class="border-l-3 border-indigo-500/70 bg-indigo-950/20 px-3.5 py-2 my-3 rounded-r-lg text-slate-300 italic text-sm">${text}</blockquote>`
    },
    paragraph({ text }) {
      return `<p class="text-sm leading-relaxed text-slate-200 my-2">${text}</p>`
    },
    hr() {
      return `<hr class="border-slate-800 my-4" />`
    },
    table({ header, rows }) {
      let headHtml = ''
      if (header && header.length > 0) {
        headHtml = `<thead class="bg-slate-900 border-b border-slate-800"><tr>${header
          .map((cell) => `<th class="px-3 py-2 text-left text-xs font-semibold text-slate-300">${cell.text}</th>`)
          .join('')}</tr></thead>`
      }
      let bodyHtml = ''
      if (rows && rows.length > 0) {
        bodyHtml = `<tbody class="divide-y divide-slate-800/60">${rows
          .map(
            (row) =>
              `<tr>${row
                .map((cell) => `<td class="px-3 py-2 text-xs text-slate-300">${cell.text}</td>`)
                .join('')}</tr>`
          )
          .join('')}</tbody>`
      }
      return `
<div class="overflow-x-auto my-3 rounded-lg border border-slate-800">
  <table class="min-w-full divide-y divide-slate-800 text-left">${headHtml}${bodyHtml}</table>
</div>
`
    },
  },
})

export function MarkdownContent({ content, isStreaming }: MarkdownContentProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Parse markdown to HTML
  const parsedHtml = useMemo(() => {
    try {
      if (!content) return ''
      return markedInstance.parse(content) as string
    } catch (e) {
      console.error('Failed to parse markdown:', e)
      return `<p class="text-sm text-slate-200 whitespace-pre-wrap">${escapeHtml(content)}</p>`
    }
  }, [content])

  // Attach event delegation for "Copy code" buttons
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleContainerClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const copyBtn = target?.closest('.aimf-copy-code-btn') as HTMLButtonElement | null
      if (!copyBtn) return

      const codeBlock = copyBtn.closest('.aimf-code-block')
      const codeElement = codeBlock?.querySelector('pre > code')
      if (!codeElement) return

      const codeText = codeElement.textContent || ''

      try {
        await navigator.clipboard.writeText(codeText)
        const labelSpan = copyBtn.querySelector('.aimf-copy-label')
        const originalText = labelSpan?.textContent || 'Copy code'

        if (labelSpan) {
          labelSpan.textContent = 'Copied!'
        }
        copyBtn.classList.add('text-emerald-400')

        setTimeout(() => {
          if (labelSpan) {
            labelSpan.textContent = originalText
          }
          copyBtn.classList.remove('text-emerald-400')
        }, 2000)
      } catch (err) {
        console.error('Failed to copy code to clipboard:', err)
      }
    }

    container.addEventListener('click', handleContainerClick)
    return () => {
      container.removeEventListener('click', handleContainerClick)
    }
  }, [parsedHtml])

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="aimf-markdown max-w-none text-slate-200"
        dangerouslySetInnerHTML={{ __html: parsedHtml }}
      />
      {isStreaming && (
        <span
          className="inline-block w-2 h-4 ml-1 bg-indigo-400 align-middle rounded-xs"
          style={{ animation: 'aimf-cursor-pulse 0.8s ease-in-out infinite' }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
