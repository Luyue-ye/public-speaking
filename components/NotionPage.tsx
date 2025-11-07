import cs from 'classnames'
import dynamic from 'next/dynamic'
import Image from 'next/legacy/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { type PageBlock } from 'notion-types'
import { formatDate, getBlockTitle, getPageProperty } from 'notion-utils'
import * as React from 'react'
import BodyClassName from 'react-body-classname'
import {
  type NotionComponents,
  NotionRenderer
} from 'react-notion-x'
import { EmbeddedTweet, TweetNotFound, TweetSkeleton } from 'react-tweet'
import { useSearchParam } from 'react-use'

import type * as types from '@/lib/types'
import * as config from '@/lib/config'
import { mapImageUrl } from '@/lib/map-image-url'
import { getCanonicalPageUrl, mapPageUrl } from '@/lib/map-page-url'
import { searchNotion } from '@/lib/search-notion'
import { useDarkMode } from '@/lib/use-dark-mode'

import { Footer } from './Footer'
import { GitHubShareButton } from './GitHubShareButton'
import { Loading } from './Loading'
import { NotionPageHeader } from './NotionPageHeader'
import { Page404 } from './Page404'
import { PageHead } from './PageHead'
import styles from './styles.module.css'

// ---------------- optional components ----------------
const Code = dynamic(() =>
  import('react-notion-x/build/third-party/code').then(async (m) => {
    await Promise.allSettled([
      // @ts-expect-error
      import('prismjs/components/prism-markup-templating.js'),
      // @ts-expect-error
      import('prismjs/components/prism-markup.js'),
      // @ts-expect-error
      import('prismjs/components/prism-bash.js'),
      // @ts-expect-error
      import('prismjs/components/prism-c.js'),
      // @ts-expect-error
      import('prismjs/components/prism-cpp.js'),
      // @ts-expect-error
      import('prismjs/components/prism-csharp.js'),
      // @ts-expect-error
      import('prismjs/components/prism-docker.js'),
      // @ts-expect-error
      import('prismjs/components/prism-java.js'),
      // @ts-expect-error
      import('prismjs/components/prism-js-templates.js'),
      // @ts-expect-error
      import('prismjs/components/prism-coffeescript.js'),
      // @ts-expect-error
      import('prismjs/components/prism-diff.js'),
      // @ts-expect-error
      import('prismjs/components/prism-git.js'),
      // @ts-expect-error
      import('prismjs/components/prism-go.js'),
      // @ts-expect-error
      import('prismjs/components/prism-graphql.js'),
      // @ts-expect-error
      import('prismjs/components/prism-handlebars.js'),
      // @ts-expect-error
      import('prismjs/components/prism-less.js'),
      // @ts-expect-error
      import('prismjs/components/prism-makefile.js'),
      // @ts-expect-error
      import('prismjs/components/prism-markdown.js'),
      // @ts-expect-error
      import('prismjs/components/prism-objectivec.js'),
      // @ts-expect-error
      import('prismjs/components/prism-ocaml.js'),
      // @ts-expect-error
      import('prismjs/components/prism-python.js'),
      // @ts-expect-error
      import('prismjs/components/prism-reason.js'),
      // @ts-expect-error
      import('prismjs/components/prism-rust.js'),
      // @ts-expect-error
      import('prismjs/components/prism-sass.js'),
      // @ts-expect-error
      import('prismjs/components/prism-scss.js'),
      // @ts-expect-error
      import('prismjs/components/prism-solidity.js'),
      // @ts-expect-error
      import('prismjs/components/prism-sql.js'),
      // @ts-expect-error
      import('prismjs/components/prism-stylus.js'),
      // @ts-expect-error
      import('prismjs/components/prism-swift.js'),
      // @ts-expect-error
      import('prismjs/components/prism-wasm.js'),
      // @ts-expect-error
      import('prismjs/components/prism-yaml.js')
    ])
    return m.Code
  })
)

const Collection = dynamic(() =>
  import('react-notion-x/build/third-party/collection').then(
    (m) => m.Collection
  )
)
const Equation = dynamic(() =>
  import('react-notion-x/build/third-party/equation').then((m) => m.Equation)
)
const Pdf = dynamic(
  () => import('react-notion-x/build/third-party/pdf').then((m) => m.Pdf),
  { ssr: false }
)
const Modal = dynamic(
  () =>
    import('react-notion-x/build/third-party/modal').then((m) => {
      m.Modal.setAppElement('.notion-viewport')
      return m.Modal
    }),
  { ssr: false }
)

function Tweet({ id }: { id: string }) {
  // 用 react-tweet 的静态渲染
  return (
    <React.Suspense fallback={<TweetSkeleton />}>
      <EmbeddedTweet id={id} />
    </React.Suspense>
  )
}

// ---------- 小工具：从 block 里拿纯文本 ----------
function getPlainTitleFromBlock(block: any): string {
  // 优先 notion-utils 的 getBlockTitle（对 heading 同样可用）
  try {
    // 有些 heading 返回空时再兜底
    const t = getBlockTitle(block, {} as any)
    if (t) return t
  } catch {}
  const raw = block?.properties?.title
  if (Array.isArray(raw) && Array.isArray(raw[0])) {
    return String(raw[0][0] || '')
  }
  return ''
}

// ---------- 渲染单页 ----------
export function NotionPage({ site, recordMap, error, pageId }: types.PageProps) {
  const router = useRouter()
  const lite = useSearchParam('lite')
  const { isDarkMode } = useDarkMode()
  const isLiteMode = lite === 'true'

  const components = React.useMemo<Partial<NotionComponents>>(
    () => ({
      nextLegacyImage: Image,
      nextLink: Link,
      Code,
      Collection,
      Equation,
      Pdf,
      Modal,
      Tweet,
      Header: NotionPageHeader
    }),
    []
  )

  // 取页面根 block
  const keys = Object.keys(recordMap?.block || {})
  const block = recordMap?.block?.[keys[0]!]?.value

  if (router.isFallback) return <Loading />
  if (error || !site || !block) return <Page404 site={site} pageId={pageId} error={error} />

  const title = getBlockTitle(block, recordMap) || site.name

  const canonicalPageUrl = config.isDev ? undefined : getCanonicalPageUrl(site, recordMap)(pageId)

  const socialImage = mapImageUrl(
    getPageProperty<string>('Social Image', block, recordMap) ||
      (block as PageBlock).format?.page_cover ||
      config.defaultPageCover,
    block
  )
  const socialDescription =
    getPageProperty<string>('Description', block, recordMap) || config.description

  // ========= 构建“我们自己的 TOC” (只取 H2/H3) =========
  type MyTocItem = { id: string; text: string; level: 2 | 3 }
  const tocItems = React.useMemo<MyTocItem[]>(() => {
    const items: MyTocItem[] = []
    const blocks = recordMap?.block || {}
    for (const id in blocks) {
      const b = (blocks as any)[id]?.value
      if (!b) continue
      // 兼容新旧命名：heading_2 / sub_header；heading_3 / sub_sub_header
      const t = b.type
      const isH2 = t === 'heading_2' || t === 'sub_header'
      const isH3 = t === 'heading_3' || t === 'sub_sub_header'
      if (!isH2 && !isH3) continue

      const text = getPlainTitleFromBlock(b)
      if (!text) continue
      items.push({ id: b.id, text, level: isH2 ? 2 : 3 })
    }
    // 按照出现顺序排序（recordMap 已经大致有序，但稳妥些）
    return items
  }, [recordMap])

  // ========= 给正文对应 heading 补上 id，保证锚点存在 =========
  React.useEffect(() => {
    const ensureIds = () => {
      tocItems.forEach((it) => {
        // 常见 heading DOM：.notion-h2/.notion-h3 或其父节点带 data-block-id
        const el =
          document.querySelector<HTMLElement>(`[data-block-id="${it.id}"]`) ||
          document.querySelector<HTMLElement>(`[data-id="${it.id}"]`)
        if (!el) return
        // 如果具体的 H2/H3 在子节点上，则把 id 给最近的 heading-like 元素
        const target =
          el.querySelector('h2,h3,.notion-h2,.notion-h3') ||
          el
        if (!(target as HTMLElement).id) {
          ;(target as HTMLElement).id = it.id
        }
      })
    }
    ensureIds()
    const mo = new MutationObserver(ensureIds)
    mo.observe(document.documentElement, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [tocItems])

  // ========= 渲染右侧固定导航 + 点击平滑滚动 =========
  const TocFloating = React.useMemo(() => {
    if (!tocItems.length) return null

    const gsuBlue = '#0039A6'
    const itemStyle: React.CSSProperties = {
      display: 'block',
      padding: '6px 8px',
      lineHeight: 1.25,
      fontSize: 14,
      color: gsuBlue,
      textDecoration: 'none',
      cursor: 'pointer'
    }

    const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
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

    return (
      <div
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
          {tocItems.map((it, idx) => (
            <a
              key={idx}
              data-toc-id={it.id}
              href={`#${it.id}`}
              style={{
                ...itemStyle,
                marginLeft: it.level === 2 ? 0 : 14
              }}
            >
              {it.text}
            </a>
          ))}
        </nav>
      </div>
    )
  }, [tocItems])

  // ========= 给正文右侧留白，避免被导航遮挡 =========
  React.useEffect(() => {
    if (!tocItems.length) return
    const wrapper =
      (document.querySelector('.notion-page-wrapper') as HTMLElement) ||
      (document.querySelector('.notion-root') as HTMLElement) ||
      (document.querySelector('.notion-viewport') as HTMLElement) ||
      (document.querySelector('.notion-page-content') as HTMLElement) ||
      (document.body as HTMLElement)
    wrapper && wrapper.style.setProperty('margin-right', '320px', 'important')
    return () => {
      wrapper && wrapper.style.removeProperty('margin-right')
    }
  }, [tocItems])

  // ========= 隐藏 Notion 原生 TOC（如果你页面底部还放了一个块） =========
  React.useEffect(() => {
    const hideNative = () => {
      document
        .querySelectorAll<HTMLElement>(
          '.notion-table-of-contents,[class*="table_of_contents"],[class*="table-of-contents"]'
        )
        .forEach((el) => el.style.setProperty('display', 'none', 'important'))
    }
    hideNative()
    const mo = new MutationObserver(hideNative)
    mo.observe(document.documentElement, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [])

  const siteMapPageUrl = React.useMemo(() => {
    const params: any = {}
    if (lite) params.lite = lite
    const searchParams = new URLSearchParams(params)
    return site ? mapPageUrl(site, recordMap!, searchParams) : undefined
  }, [site, recordMap, lite])

  const footer = React.useMemo(() => <Footer />, [])

  const isBlogPost = false // 和我们无关了；自定义导航独立显示

  return (
    <>
      <PageHead
        pageId={pageId}
        site={site}
        title={title}
        description={socialDescription}
        image={socialImage}
        url={canonicalPageUrl}
        isBlogPost={isBlogPost}
      />

      {isLiteMode && <BodyClassName className='notion-lite' />}
      {isDarkMode && <BodyClassName className='dark-mode' />}

      {/* 我们自己的固定目录 */}
      {TocFloating}

      <div className="notion-page-wrapper">
        <main className="notion-content">
          <NotionRenderer
            bodyClassName={cs(
              styles.notion,
              pageId === site.rootNotionPageId && 'index-page'
            )}
            darkMode={isDarkMode}
            components={components}
            recordMap={recordMap}
            rootPageId={site.rootNotionPageId}
            rootDomain={site.domain}
            fullPage={!isLiteMode}
            previewImages={!!recordMap.preview_images}
            showCollectionViewDropdown={false}
            // 不使用内置 TOC
            showTableOfContents={false}
            defaultPageIcon={config.defaultPageIcon}
            defaultPageCover={config.defaultPageCover}
            defaultPageCoverPosition={config.defaultPageCoverPosition}
            mapPageUrl={siteMapPageUrl}
            mapImageUrl={mapImageUrl}
            searchNotion={config.isSearchEnabled ? searchNotion : undefined}
            footer={footer}
          />
        </main>
      </div>

      <GitHubShareButton />
    </>
  )
}
