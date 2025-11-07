import cs from 'classnames'
import dynamic from 'next/dynamic'
import Image from 'next/legacy/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { type PageBlock } from 'notion-types'
import {
  formatDate,
  getBlockTitle,
  getPageProperty
} from 'notion-utils'
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
import { PageAside } from './PageAside'
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
  {
    ssr: false
  }
)
const Modal = dynamic(
  () =>
    import('react-notion-x/build/third-party/modal').then((m) => {
      m.Modal.setAppElement('.notion-viewport')
      return m.Modal
    }),
  {
    ssr: false
  }
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
  defaultFn: () => React.ReactNode
) => {
  if (pageHeader && block?.last_edited_time) {
    return `Last updated ${formatDate(block?.last_edited_time, {
      month: 'long'
    })}`
  }
  return defaultFn()
}

const propertyDateValue = (
  { data, schema, pageHeader }: any,
  defaultFn: () => React.ReactNode
) => {
  if (pageHeader && schema?.name?.toLowerCase() === 'published') {
    const publishDate = data?.[0]?.[1]?.[0]?.[1]?.start_date
    if (publishDate) {
      return `${formatDate(publishDate, {
        month: 'long'
      })}`
    }
  }
  return defaultFn()
}

const propertyTextValue = (
  { schema, pageHeader }: any,
  defaultFn: () => React.ReactNode
) => {
  if (pageHeader && schema?.name?.toLowerCase() === 'author') {
    return <b>{defaultFn()}</b>
  }
  return defaultFn()
}

export function NotionPage({
  site,
  recordMap,
  error,
  pageId
}: types.PageProps) {
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

  const isBlogPost =
    block?.type === 'page' && block?.parent_table === 'collection'

  // ✅ 直接开启内置目录组件
  const showTableOfContents = true
  const minTableOfContentsItems = 1

  const pageAside = React.useMemo(
    () => (
      <PageAside
        block={block!}
        recordMap={recordMap!}
        isBlogPost={isBlogPost}
      />
    ),
    [block, recordMap, isBlogPost]
  )

  const footer = React.useMemo(() => <Footer />, [])

  if (router.isFallback) return <Loading />
  if (error || !site || !block) {
    return <Page404 site={site} pageId={pageId} error={error} />
  }

  const title = getBlockTitle(block, recordMap) || site.name

  if (!config.isServer) {
    const g = window as any
    g.pageId = pageId
    g.recordMap = recordMap
    g.block = block
  }

  const canonicalPageUrl = config.isDev
    ? undefined
    : getCanonicalPageUrl(site, recordMap)(pageId)

  const socialImage = mapImageUrl(
    getPageProperty<string>('Social Image', block, recordMap) ||
      (block as PageBlock).format?.page_cover ||
      config.defaultPageCover,
    block
  )

  const socialDescription =
    getPageProperty<string>('Description', block, recordMap) ||
    config.description

  // —— 把内置目录固定到右侧（用 !important 压过一切样式）——
  React.useEffect(() => {
    // 兼容多种 class 变体
    const toc =
      document.querySelector<HTMLElement>('nav.notion-table-of-contents') ||
      document.querySelector<HTMLElement>('div[class*="table_of_contents"]') ||
      document.querySelector<HTMLElement>('div[class*="table-of-contents"]')

    if (!toc) return

    // 给正文让位（避免目录遮挡）
    const wrapper =
      document.querySelector<HTMLElement>('.notion-root') ||
      document.querySelector<HTMLElement>('.notion-page-content') ||
      document.querySelector<HTMLElement>('.notion-page-wrapper')

    const setImp = (el: HTMLElement, prop: string, value: string) =>
      el.style.setProperty(prop, value, 'important')

    // 目录样式
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

    // 链接颜色（GSU 蓝）
    toc.querySelectorAll('a').forEach((a) => {
      const aa = a as HTMLAnchorElement
      aa.style.setProperty('color', '#0039A6', 'important')
      aa.style.setProperty('text-decoration', 'none', 'important')
    })

    // 正文右侧留白
    if (wrapper) {
      setImp(wrapper, 'margin-right', '320px')
    }

    // 平滑滚动（覆盖默认 hash 跳转）
    toc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault()
        const hash = a.getAttribute('href') || ''
        const id = hash.replace(/^#/, '')
        const target =
          document.getElementById(id) ||
          document.querySelector<HTMLElement>(`[data-block-id="${id}"]`) ||
          // 再兜底找含有 data-id 的 heading 包裹
          document.querySelector<HTMLElement>(`[data-id="${id}"]`)
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
          history.replaceState?.(null, '', `#${id}`)
        }
      })
    })
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
            pageAside={pageAside}
            footer={footer}
          />
        </main>
      </div>

      <GitHubShareButton />
    </>
  )
}
