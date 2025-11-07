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
  NotionRenderer,
  useNotionContext
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

// -----------------------------------------------------------------------------
// dynamic imports for optional components
// -----------------------------------------------------------------------------

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
  const { recordMap } = useNotionContext()
  const tweet = (recordMap as types.ExtendedTweetRecordMap)?.tweets?.[id]
  return (
    <React.Suspense fallback={<TweetSkeleton />}>
      {tweet ? <EmbeddedTweet tweet={tweet} /> : <TweetNotFound />}
    </React.Suspense>
  )
}

const propertyLastEditedTimeValue = (
  { block, pageHeader }: any,
  def: () => React.ReactNode
) => {
  if (pageHeader && block?.last_edited_time) {
    return `Last updated ${formatDate(block?.last_edited_time, { month: 'long' })}`
  }
  return def()
}

const propertyDateValue = (
  { data, schema, pageHeader }: any,
  def: () => React.ReactNode
) => {
  if (pageHeader && schema?.name?.toLowerCase() === 'published') {
    const publishDate = data?.[0]?.[1]?.[0]?.[1]?.start_date
    if (publishDate) return `${formatDate(publishDate, { month: 'long' })}`
  }
  return def()
}

const propertyTextValue = (
  { schema, pageHeader }: any,
  def: () => React.ReactNode
) => (pageHeader && schema?.name?.toLowerCase() === 'author' ? <b>{def()}</b> : def())

export function NotionPage({ site, recordMap, error, pageId }: types.PageProps) {
  const router = useRouter()
  const lite = useSearchParam('lite')

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
      Header: NotionPageHeader,
      propertyLastEditedTimeValue,
      propertyTextValue,
      propertyDateValue
    }),
    []
  )

  const isLiteMode = lite === 'true'
  const { isDarkMode } = useDarkMode()

  const siteMapPageUrl = React.useMemo(() => {
    const params: any = {}
    if (lite) params.lite = lite
    const searchParams = new URLSearchParams(params)
    return site ? mapPageUrl(site, recordMap!, searchParams) : undefined
  }, [site, recordMap, lite])

  const keys = Object.keys(recordMap?.block || {})
  const block = recordMap?.block?.[keys[0]!]?.value
  const isBlogPost = block?.type === 'page' && block?.parent_table === 'collection'

  // 开启内置目录（我们只借助它生成 TOC，然后自己接管行为）
  const showTableOfContents = true
  const minTableOfContentsItems = 1

  const footer = React.useMemo(() => <Footer />, [])

  if (router.isFallback) return <Loading />
  if (error || !site || !block) return <Page404 site={site} pageId={pageId} error={error} />

  const title = getBlockTitle(block, recordMap) || site.name

  if (!config.isServer) {
    const g = window as any
    g.pageId = pageId
    g.recordMap = recordMap
    g.block = block
  }

  const canonicalPageUrl = config.isDev ? undefined : getCanonicalPageUrl(site, recordMap)(pageId)

  const socialImage = mapImageUrl(
    getPageProperty<string>('Social Image', block, recordMap) ||
      (block as PageBlock).format?.page_cover ||
      config.defaultPageCover,
    block
  )
  const socialDescription =
    getPageProperty<string>('Description', block, recordMap) || config.description

  // ====== 关键 useEffect：补齐标题 id + 目录固定到右侧 + 委托点击平滑滚动 ======
  React.useEffect(() => {
    const GSU_BLUE = '#0039A6'
    const RIGHT_MARGIN = 320

    const setImp = (el: HTMLElement, prop: string, value: string) =>
      el.style.setProperty(prop, value, 'important')

    // 1) 给标题补 id（用 data-block-id / data-id）
    const ensureHeadingIds = () => {
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(
          // 常见的 heading 容器 class / 标签
          'h1,h2,h3,h4,h5,h6,' +
            '.notion-h1,.notion-h2,.notion-h3,.notion-header,' +
            '.notion-heading,[data-block-id],[data-id]'
        )
      )

      candidates.forEach((el) => {
        // 只给“像标题”的元素打 id：含有 heading 类 或 tagName 是 H*
        const isHeadingLike =
          /^H[1-6]$/.test(el.tagName) ||
          el.className.includes('notion-h1') ||
          el.className.includes('notion-h2') ||
          el.className.includes('notion-h3') ||
          el.className.includes('notion-header') ||
          el.className.includes('notion-heading')

        if (!isHeadingLike) return

        const bid =
          el.getAttribute('data-block-id') ||
          el.getAttribute('data-id') ||
          el.parentElement?.getAttribute('data-block-id') ||
          el.parentElement?.getAttribute('data-id')

        if (!bid) return
        if (!el.id) el.id = bid
      })
    }

    // 2) 定位 TOC，固定到右侧，并给正文留白
    const styleAndDockTOC = () => {
      const toc =
        document.querySelector<HTMLElement>('nav.notion-table-of-contents') ||
        document.querySelector<HTMLElement>('.notion-table-of-contents') ||
        document.querySelector<HTMLElement>('[class*="table_of_contents"]') ||
        document.querySelector<HTMLElement>('[class*="table-of-contents"]')

      if (!toc) return false

      // 固定右侧
      setImp(toc, 'position', 'fixed')
      setImp(toc, 'right', '24px')
      setImp(toc, 'top', '140px')
      setImp(toc, 'width', '280px')
      setImp(toc, 'max-height', '70vh')
      setImp(toc, 'overflow', 'auto')
      setImp(toc, 'padding', '12px 14px')
      setImp(toc, 'background', '#fff')
      setImp(toc, 'border', '1px solid #e6e9ef')
      setImp(toc, 'border-radius', '14px')
      setImp(toc, 'box-shadow', '0 8px 24px rgba(0,0,0,.08)')
      setImp(toc, 'z-index', '99999')

      // 链接配色
      toc.querySelectorAll('a').forEach((a) => {
        const aa = a as HTMLAnchorElement
        aa.style.setProperty('color', GSU_BLUE, 'important')
        aa.style.setProperty('text-decoration', 'none', 'important')
        aa.style.setProperty('cursor', 'pointer', 'important')
      })

      // 给正文让位
      const wrapper =
        (document.querySelector('.notion-page-wrapper') as HTMLElement) ||
        (document.querySelector('.notion-root') as HTMLElement) ||
        (document.querySelector('.notion-viewport') as HTMLElement) ||
        (document.querySelector('.notion-page-content') as HTMLElement) ||
        (document.body as HTMLElement)
      setImp(wrapper, 'margin-right', `${RIGHT_MARGIN}px`)

      return true
    }

    // 3) 委托点击（兼容 /path#id 或 纯 #id）
    const onTocClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.('a')
      if (!a) return
      // 只拦截 TOC 内部的链接
      const tocContains = a.closest(
        'nav.notion-table-of-contents,.notion-table-of-contents,[class*="table_of_contents"],[class*="table-of-contents"]'
      )
      if (!tocContains) return

      const href = (a as HTMLAnchorElement).getAttribute('href') || ''
      // 不是 hash 跳转就不拦截
      if (!href.includes('#')) return

      e.preventDefault()

      let id = ''
      try {
        const url = new URL(href, window.location.href)
        id = (url.hash || '').replace(/^#/, '')
      } catch {
        id = href.replace(/^.*#/, '')
      }
      if (!id) return

      // 找目标元素：id -> data-block-id -> data-id
      const target =
        document.getElementById(id) ||
        document.querySelector<HTMLElement>(`[data-block-id="${id}"]`) ||
        document.querySelector<HTMLElement>(`[data-id="${id}"]`)

      if (!target) return

      // 找滚动容器：优先 notion-viewport，否则 window
      const viewport =
        (document.querySelector('.notion-viewport') as HTMLElement) || null

      const top =
        target.getBoundingClientRect().top +
        (viewport ? viewport.scrollTop : window.scrollY) -
        12 // 微调

      if (viewport) {
        viewport.scrollTo({ top, behavior: 'smooth' })
      } else {
        window.scrollTo({ top, behavior: 'smooth' })
      }

      history.replaceState?.(null, '', `#${id}`)
    }

    // 初次执行 + 观察 DOM 变更（标题/目录可能晚于渲染出现）
    ensureHeadingIds()
    styleAndDockTOC()

    const mo = new MutationObserver(() => {
      ensureHeadingIds()
      styleAndDockTOC()
    })
    mo.observe(document.documentElement, { childList: true, subtree: true })

    document.addEventListener('click', onTocClick, true)

    return () => {
      mo.disconnect()
      document.removeEventListener('click', onTocClick, true)
    }
  }, [pageId])

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
            showTableOfContents={showTableOfContents}
            minTableOfContentsItems={minTableOfContentsItems}
            defaultPageIcon={config.defaultPageIcon}
            defaultPageCover={config.defaultPageCover}
            defaultPageCoverPosition={config.defaultPageCoverPosition}
            mapPageUrl={siteMapPageUrl}
            mapImageUrl={mapImageUrl}
            searchNotion={config.isSearchEnabled ? searchNotion : undefined}
            // 保持默认 aside，目录我们用 JS 固定
            footer={React.useMemo(() => <Footer />, [])}
          />
        </main>
      </div>

      <GitHubShareButton />
    </>
  )
}
