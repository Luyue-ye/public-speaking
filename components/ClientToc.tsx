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

      const id =
        node.getAttribute('id') ||
        node.getAttribute('data-block-id') ||
        node.getAttribute('data-id') ||
        node.parentElement?.getAttribute('data-block-id') ||
        node.parentElement?.getAttribute('data-id')

      if (!id) continue

      const host =
        document.getElementById(id) ||
        document.querySelector<HTMLElement>(`[data-block-id="${id}"]`) ||
        document.querySelector<HTMLElement>(`[data-id="${id}"]`) ||
        node
      if (!host.id) host.id = id

      const text = getHeadingText(node)
      if (!text) continue

      found.push({ id, text, level })
    }

    setItems(found)
  }, [])

  React.useEffect(() => {
    scanHeadings()
    const mo = new MutationObserver(() => scanHeadings())
    mo.observe(document.documentElement, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [scanHeadings])

  if (!items.length) return null

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

  const onClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a[data-toc-id]') as HTMLAnchorElement | null
    if (!a) return
    e.preventDefault()
    const id = a.getAttribute('data-toc-id') || ''
    if (!id) return
    const target =
      document.getElementById(id) ||
      document.querySelector<HTMLElement>(`[data-block-id="${id}"]`) ||
      document.querySelector<HTMLElement>(`[data-id="${id}"]`)
    if (!target) return
    const y = target.getBoundingClientRect().top + window.scrollY - 12
    window.scrollTo({ top: y, behavior: 'smooth' })
    history.replaceState?.(null, '', `#${id}`)
  }

  const linkStyle: React.CSSProperties = {
    display: 'block',
    padding: '6px 8px',
    lineHeight: 1.25,
    fontSize: 14,
    color: '#0039A6',
    textDecoration: 'none',
    cursor: 'pointer'
  }

  return (
    <aside
      onClick={onClick}
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
        zIndex: 99999
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8, color: '#111', fontSize: 14 }}>
        Contents
      </div>
      <nav>
        {items.map((it) => (
          <a
            key={it.id}
            data-toc-id={it.id}
            href={`#${it.id}`}
            style={{ ...linkStyle, marginLeft: it.level === 2 ? 0 : 14 }}
            title={it.text}
          >
            {it.text}
          </a>
        ))}
      </nav>
    </aside>
  )
}
