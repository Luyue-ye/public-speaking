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

  // 开启内置目录渲染（我们稍后把它搬出来固定）
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

  // ====== 关键：把内置 TOC 搬到 body 并固定到右侧（含平滑滚动 & 强制样式） ======
  React.useEffect(() => {
    let moved = false
    let originalParent: HTMLElement | null = null
    let placeholder: Comment | null = null

    const GSU_BLUE = '#0039A6'
    const RIGHT_MARGIN = 320

    const setImp = (el: HTMLElement, prop: string, value: string) =>
      el.style.setProperty(prop, value, 'important')

    const styleToc = (toc: HTMLElement) => {
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

      toc.querySelectorAll('a').forEach((a) => {
        const aa = a as HTMLAnchorElement
        aa.style.setProperty('color', GSU_BLUE, 'important')
        aa.style.setProperty('text-decoration', 'none', 'important')
      })
    }

    const addSmoothScroll = (toc: HTMLElement) => {
      toc.querySelectorAll<HTMLAnchorElement>('a').forEach((a) => {
        a.onclick = (e) => {
          // 拦截所有跳转（包括绝对路径的 /page#id）
          e.preventDefault()
          const href = a.getAttribute('href') || ''
          let id = ''
          try {
            const url = new URL(href, window.location.href)
            id = (url.hash || '').replace(/^#/, '')
          } catch {
            id = href.replace(/^.*#/, '')
          }
          if (!id) return

          const target =
            document.getElementById(id) ||
            document.querySelector<HTMLElement>(`[data-block-id="${id}"]`) ||
            document.querySelector<HTMLElement>(`[data-id="${id}"]`)

          if (target) {
            const y = target.getBoundingClientRect().top + window.scrollY - 12
            window.scrollTo({ top: y, behavior: 'smooth' })
            history.replaceState?.(null, '', `#${id}`)
          }
        }
      })
    }

    const giveRightSpace = () => {
      const wrapper =
        (document.querySelector('.notion-page-wrapper') as HTMLElement) ||
        (document.querySelector('.notion-root') as HTMLElement) ||
        (document.querySelector('.notion-page-content') as HTMLElement) ||
        (document.querySelector('.notion-viewport') as HTMLElement) ||
        (document.body as HTMLElement)
      setImp(wrapper, 'margin-right', `${RIGHT_MARGIN}px`)
    }

    const findTOC = (): HTMLElement | null => {
      return (
        document.querySelector<HTMLElement>('nav.notion-table-of-contents') ||
        document.querySelector<HTMLElement>('.notion-table-of-contents') ||
        document.querySelector<HTMLElement>('[class*="table_of_contents"]') ||
        document.querySelector<HTMLElement>('[class*="table-of-contents"]')
      )
    }

    const moveTOC = (toc: HTMLElement) => {
      if (moved) return
      moved = true
      originalParent = toc.parentElement
      placeholder = document.createComment('toc-placeholder')
      if (originalParent) originalParent.replaceChild(placeholder, toc)
      document.body.appendChild(toc) // 关键：移到 body，脱离原布局
      styleToc(toc)
      addSmoothScroll(toc)
      giveRightSpace()
    }

    // 立即尝试
    const now = findTOC()
    if (now) moveTOC(now)

    // 监听目录生成（SSR/CSR 场景）
    const mo = new MutationObserver(() => {
      const t = findTOC()
      if (t) moveTOC(t)
    })
    mo.observe(document.documentElement, { childList: true, subtree: true })

    // 清理：还原 DOM（可选）
    return () => {
      mo.disconnect()
      // 可不还原，避免 flicker；如果还原：
      // const toc = findTOC()
      // if (toc && originalParent && placeholder) {
      //   originalParent.replaceChild(toc, placeholder)
      // }
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
            // 注意：不再传 pageAside，避免它把 TOC 放在侧栏里
            footer={footer}
          />
        </main>
      </div>

      <GitHubShareButton />
    </>
  )
}
