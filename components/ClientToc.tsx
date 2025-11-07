// /components/ClientToc.tsx
import * as React from 'react'

type TocItem = { id: string; text: string; level: 2 | 3 }

function getHeadingText(el: HTMLElement): string {
  return (el.textContent || '').trim()
}

export default function ClientToc() {
  const [items, setItems] = React.useState<TocItem[]>([])

  const scanHeadings = React.useCallback(() => {
    const found: TocItem[] = []
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(
        'h2,h3,.notion-h2,.notion-h3,.notion-header,.notion-heading'
      )
    )

    for (const node of nodes) {
      let level: 2 | 3 | null = null
      if (node.tagName === 'H2' || node.className.includes('notion-h2')) level = 2
      else if (node.tagName === 'H3' || node.className.includes('notion-h3')) level = 3
      else {
        if (node.className.includes('size-2') || node.className.includes('header2')) level = 2
        else if (node.className.includes('size-3') || node.className.includes('header3')) level = 3
      }
      if (!level) continue

      // 尽量用 dataset / id
      const dataset = (node as HTMLElement & { dataset?: DOMStringMap }).dataset || {}
      const pid = dataset.blockId || dataset.id
      const id =
        pid ||
        node.id ||
        node.parentElement?.id ||
        (node.parentElement as HTMLElement & { dataset?: DOMStringMap })?.dataset?.blockId ||
        (node.parentElement as HTMLElement & { dataset?: DOMStringMap })?.dataset?.id

      if (!id) continue

      const host =
        document.getElementById(id) ||
        document.querySelector<HTMLElement>(`[data-block-id="${id}"]`) ||
        document.querySelector<HTMLElement>(`[data-id="${id}"]`) ||
        node
      if (host && !host.id) host.id = id

      const text = getHeadingText(node)
      if (!text) continue

      found.push({ id, text, level })
    }

    setItems(found)
  }, [])

  // Hooks 统一提前执行
  React.useEffect(() => {
    scanHeadings()
    const mo = new MutationObserver(() => scanHeadings())
    mo.observe(document.documentElement, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [scanHeadings])

  React.useEffect(() => {
    const wrapper =
      (document.querySelector('.notion-page-wrapper') as HTMLElement) ||
      (document.querySelector('.notion-root') as HTMLElement) ||
      (document.querySelector('.notion-viewport') as HTMLElement) ||
      (document.querySelector('.notion-page-content') as HTMLElement) ||
      (document.body as HTMLElement)
    if (wrapper) wrapper.style.setProperty('margin-right', '320px', 'important')
    return () => {
      if (wrapper) wrapper.style.removeProperty('margin-right')
    }
  }, [])

  const linkStyle: React.CSSProperties = {
    display: 'block',
    padding: '6px 8px',
    lineHeight: 1.25,
    fontSize: 14,
    color: '#0039A6',
    textDecoration: 'none',
    cursor: 'pointer'
  }

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const a = e.currentTarget
    const id = a.dataset.tocId || ''
    if (!id) return
    const el =
      document.getElementById(id) ||
      document.querySelector<HTMLElement>(`[data-block-id="${id}"]`) ||
      document.querySelector<HTMLElement>(`[data-id="${id}"]`)
    if (!el) return
    const y = el.getBoundingClientRect().top + window.scrollY - 12
    window.scrollTo({ top: y, behavior: 'smooth' })
    history.replaceState?.(null, '', `#${id}`)
  }

  return (
    <aside
      style={{
        position: 'fixed',
        right: 24,
        top: 140,
        width: 280,
        maxHeight: '70vh',
        overflow: 'auto',
        padding: '12px 14px',
        background: '#fff',
        border: '1px solid #e6e9ef',
        borderRadius: 14,
        boxShadow: '0 8px 24px rgba(0,0,0,.08)',
        zIndex: 1000
      }}
      aria-label="Page table of contents"
    >
      <div style={{ fontWeight: 700, marginBottom: 8, color: '#111', fontSize: 14 }}>
        Contents
      </div>

      <nav role="navigation" aria-label="Section links">
        {items.length === 0 ? (
          <div style={{ fontSize: 12, color: '#999' }}>No headings</div>
        ) : (
          items.map((it) => (
            <a
              key={it.id}
              data-toc-id={it.id}
              href={`#${it.id}`}
              onClick={handleLinkClick}
              style={{ ...linkStyle, marginLeft: it.level === 2 ? 0 : 14 }}
              title={it.text}
            >
              {it.text}
            </a>
          ))
        )}
      </nav>
    </aside>
  )
}
