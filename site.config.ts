import { siteConfig } from './lib/site-config'

export default siteConfig({
  // —— 你的网站基本信息（三个字段是必需的）——
  name: 'Public Speaking Syllabus',
  domain: 'public-speaking-syllabus-site.vercel.app', // 先写部署出来的域名，后续可改自定义域
  author: 'Luyue Ye',

  // —— 关键：你的 Notion 根页面 ID —— 
  rootNotionPageId: '2a3e4b53e624804ba8f8d08638ee163d',
  // 可选：限定 workspace（没有就留 null）
  rootNotionSpaceId: null,

  // 下面都可选
  defaultPageIcon: undefined,
  defaultPageCover: undefined,
  defaultPageCoverPosition: 0.5,

  isPreviewImageSupportEnabled: false,
  includeNotionIdInUrls: false,

  // 导航样式：'default' 或 'custom'
  navigationStyle: 'default',
  navigationLinks: null,

  // 搜索
  isSearchEnabled: true
})
