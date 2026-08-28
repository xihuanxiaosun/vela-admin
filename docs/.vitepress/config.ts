import { defineConfig } from 'vitepress'

const englishGuide = [
  {
    text: 'Introduction',
    items: [
      { text: 'Getting started', link: '/guide/getting-started' },
      { text: 'Reference user workflow', link: '/guide/starter-user-workflow' },
      { text: 'Architecture', link: '/guide/architecture' },
    ],
  },
  {
    text: 'Foundations',
    items: [
      { text: 'Theme and appearance', link: '/guide/theme-and-appearance' },
      { text: 'Shell and navigation', link: '/guide/shell-and-navigation' },
      { text: 'Authentication and access', link: '/guide/authentication-and-access' },
      { text: 'Feedback API', link: '/guide/feedback' },
      { text: 'Localization and RTL', link: '/guide/localization' },
      { text: 'Responsive and accessible', link: '/guide/responsive-accessibility' },
    ],
  },
  {
    text: 'Application patterns',
    items: [
      { text: 'Forms and validation', link: '/guide/forms-and-validation' },
      { text: 'Data pages', link: '/guide/data-pages' },
      { text: 'Uploads', link: '/guide/uploads' },
      { text: 'Backend adapters', link: '/guide/backend-adapters' },
    ],
  },
]

const englishReference = [
  {
    text: 'Reference',
    items: [
      { text: 'Public API', link: '/reference/public-api' },
      { text: 'Packages', link: '/reference/packages' },
      { text: 'Component capability matrix', link: '/reference/component-capability-matrix' },
      { text: 'Adaptive table research', link: '/reference/table-engine-research' },
      { text: 'Vuetify inventory', link: '/reference/vuetify-component-inventory' },
    ],
  },
]

const architecture = [
  {
    text: 'Architecture decisions',
    items: [
      { text: 'Decision index', link: '/architecture/' },
      { text: 'Package boundaries', link: '/architecture/0001-package-boundaries' },
      { text: 'Vuetify composition', link: '/architecture/0002-vuetify-composition' },
      { text: 'Responsive contract', link: '/architecture/0003-responsive-contract' },
      { text: 'Token policy', link: '/architecture/0004-design-token-policy' },
      { text: 'Async state model', link: '/architecture/0005-async-state-model' },
      { text: 'Adaptive table layout', link: '/architecture/0006-adaptive-table-layout' },
    ],
  },
]

export default defineConfig({
  title: 'Vela Admin Kit',
  description: 'Polished, typed administration foundations for Vue and Vuetify.',
  cleanUrls: true,
  lastUpdated: true,
  locales: {
    root: { label: 'English', lang: 'en-GB' },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      title: 'Vela Admin Kit',
      description: '精致、类型安全、与后端解耦的 Vuetify 管理后台工程底座。',
    },
  },
  head: [
    ['meta', { name: 'theme-color', content: '#7657E2' }],
    ['link', { rel: 'icon', href: '/logo.svg' }],
  ],
  themeConfig: {
    logo: '/logo.svg',
    search: { provider: 'local' },
    locales: {
      root: {
        siteTitle: 'Vela Admin Kit',
        nav: [
          { text: 'Guide', link: '/guide/getting-started' },
          { text: 'Patterns', link: '/guide/data-pages' },
          { text: 'API', link: '/reference/public-api' },
          { text: 'Decisions', link: '/architecture/' },
        ],
        outline: { level: [2, 3], label: 'On this page' },
        sidebar: {
          '/guide/': englishGuide,
          '/reference/': englishReference,
          '/architecture/': architecture,
          '/maintainers/': [
            {
              text: 'Maintainers',
              items: [{ text: 'Releasing', link: '/maintainers/releasing' }],
            },
          ],
        },
        footer: {
          message: 'Released under the MIT License.',
          copyright: 'Vela Admin Kit',
        },
      },
      zh: {
        siteTitle: 'Vela Admin Kit',
        nav: [
          { text: '指南', link: '/zh/guide/getting-started' },
          { text: '上传', link: '/zh/guide/uploads' },
          { text: '公开 API', link: '/zh/reference/public-api' },
          { text: '发布维护', link: '/zh/maintainers/releasing' },
        ],
        outline: { level: [2, 3], label: '本页内容' },
        sidebar: {
          '/zh/guide/': [
            {
              text: '使用指南',
              items: [
                { text: '开始使用', link: '/zh/guide/getting-started' },
                { text: 'Starter 用户管理流程', link: '/zh/guide/starter-user-workflow' },
                { text: '认证与权限', link: '/zh/guide/authentication-and-access' },
                { text: '国际化与 RTL', link: '/zh/guide/localization' },
                { text: '上传与图片处理', link: '/zh/guide/uploads' },
              ],
            },
          ],
          '/zh/reference/': [
            {
              text: '参考',
              items: [{ text: '公开 API', link: '/zh/reference/public-api' }],
            },
          ],
          '/zh/maintainers/': [
            {
              text: '维护者',
              items: [{ text: '发布维护', link: '/zh/maintainers/releasing' }],
            },
          ],
        },
        footer: {
          message: '使用 MIT 许可证发布。',
          copyright: 'Vela Admin Kit',
        },
      },
    },
  },
})
