import { siteConfig } from './lib/site-config'

export default siteConfig({
  // —— 基本信息（必填）——
  name: 'Public Speaking Syllabus',
  domain: 'public-speaking-syllabus-site.vercel.app',
  author: 'Luyue Ye',

  // —— 你的 Notion 根页面 ID（必填）——
  rootNotionPageId: '2a3e4b53e624804ba8f8d08638ee163d',
  // 可选：限定 workspace
  rootNotionSpaceId: null,

  // —— 可选默认封面/图标 —— 
  defaultPageIcon: undefined,
  defaultPageCover: undefined,
  defaultPageCoverPosition: 0.5,

  // —— 功能开关 —— 
  isPreviewImageSupportEnabled: false,
  includeNotionIdInUrls: false,

  // —— 导航设置 —— 
  navigationStyle: 'default',
  // 关键：不能用 null；如无自定义导航，用空数组或直接删掉这一行
  navigationLinks: [],

  // —— 搜索 —— 
  isSearchEnabled: true
})
