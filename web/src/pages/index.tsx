import { Link } from '@tanstack/react-router'
import clsx from 'clsx'
import classes from './index.module.scss'

interface HubFeature {
  title: string
  description: string
  state: string
  iconClass: string
  to?: '/crypto-lab' | '/curl-to-code' | '/js-deob' | '/code-format'
}

const hubFeatures: readonly HubFeature[] = [
  {
    title: 'cURL 2 Req',
    description:
      '粘贴 cURL 命令，一键转成 Python Requests、Go net/http、Fetch、Axios、OkHttp 等请求代码。',
    state: '已上线',
    iconClass: 'i-mdi-console-network-outline',
    to: '/curl-to-code',
  },
  {
    title: 'Crypto Lab',
    description:
      '统一测试 AES、DES、TripleDES、Rabbit、RC4、RC4Drop 等算法，支持常见模式、填充、编码和一键互转。',
    state: '已上线',
    iconClass: 'i-mdi-lock-outline',
    to: '/crypto-lab',
  },
  {
    title: 'JS 解混淆',
    description:
      '直接贴入混淆后的 JavaScript，调整参数后在同一工作台查看整理结果和运行过程。',
    state: '已上线',
    iconClass: 'i-mdi-code-json',
    to: '/js-deob',
  },
  {
    title: 'Code Formatter',
    description:
      '支持 JS、TS、HTML、CSS、SCSS、Less、JSON、Markdown、GraphQL 等多种格式，基于 Prettier 在浏览器本地运行。',
    state: '已上线',
    iconClass: 'i-mdi-code-braces-box',
    to: '/code-format',
  },
]

const commandEntries = [
  { label: '打开 cURL 2 Req', value: '可用' },
  { label: '打开 Crypto Lab', value: '可用' },
  { label: '打开 JS Deob 工作台', value: '可用' },
  { label: '打开 Code Formatter', value: '可用' },
] as const

const scopeEntries = [
  '已上线 cURL 转请求代码工具，支持 Python、Go、Fetch、Axios、OkHttp 和原始 HTTP。',
  '已上线对称加解密实验台，适合快速验证 AES、DES、TripleDES 等参数组合。',
  '当前已上线 JS 解混淆工具，可直接粘贴混淆代码开始分析。',
  '已上线代码格式化工具，支持 JS、TS、HTML、CSS、JSON 等 10 种格式，基于 Prettier。',
  '所有工具均在本地浏览器中运行，代码不会上传至服务器。',
] as const

const runtimeStats = [
  { label: '在线工具', value: '04' },
  { label: '即将上线', value: '01' },
  { label: '本地运行', value: '100%' },
] as const

function IndexPage() {
  return (
    <main className={clsx(classes.frontPage)}>
      <section className={clsx(classes.frontPageHero)}>
        <div className={clsx(classes.frontPageSignal)} aria-hidden="true">
          逆向工程中心
        </div>

        <div className={clsx(classes.frontPageHeroMain)}>
          <span className={clsx(classes.frontPageEyebrow)}>在线逆向分析工具</span>
          <h1 className={clsx(classes.frontPageTitle)}>
            爬虫逆向
            <br />
            工程中心
          </h1>
          <p className={clsx(classes.frontPageCopy)}>
            在线 JavaScript
            逆向分析工具集。粘贴混淆代码，一键还原可读结构。更多分析模块持续更新中。
          </p>

          <div className={clsx(classes.frontPageActions)}>
            <Link
              to="/curl-to-code"
              className={clsx(classes.frontPageAction, classes.frontPageActionPrimary)}
            >
              <span className="i-mdi-console-network-outline" aria-hidden="true" />
              打开 cURL 2 Req
            </Link>
            <Link to="/crypto-lab" className={clsx(classes.frontPageAction)}>
              <span className="i-mdi-lock-open-variant-outline" aria-hidden="true" />
              打开 Crypto Lab
            </Link>
            <Link to="/js-deob" className={clsx(classes.frontPageAction)}>
              <span className="i-mdi-play-circle-outline" aria-hidden="true" />
              打开 JS Deob
            </Link>
          </div>

          <div className={clsx(classes.frontPageTags)} aria-label="首页亮点">
            <span>本地运行，代码不上传</span>
            <span>多算法一页联调</span>
            <span>开箱即用</span>
            <span>持续更新</span>
          </div>
        </div>
      </section>

      <section className={clsx(classes.frontPageGrid)}>
        {hubFeatures.map((feature) => {
          const card = (
            <article
              key={feature.title}
              className={clsx(
                classes.frontPagePanel,
                feature.to && classes.frontPagePanelFeature,
              )}
            >
              <div className={clsx(classes.frontPagePanelHead)}>
                <span className={clsx(classes.frontPageFeatureIcon)} aria-hidden="true">
                  <span className={feature.iconClass} />
                </span>
                <span className={clsx(classes.frontPageBadge)}>{feature.state}</span>
              </div>

              <div className={clsx(classes.frontPagePanelBody)}>
                <h2>{feature.title}</h2>
                <p>{feature.description}</p>
              </div>

              <span className={clsx(classes.frontPageTextLink)}>
                {feature.to ? '进入工作台' : '预留模块'}
                <span className="i-mdi-arrow-right" aria-hidden="true" />
              </span>
            </article>
          )

          if (feature.to) {
            return (
              <Link
                key={feature.title}
                to={feature.to}
                className={clsx(classes.frontPagePanelLink)}
              >
                {card}
              </Link>
            )
          }

          return card
        })}
      </section>

      <section id="hub-stack" className={clsx(classes.frontPageConsole)}>
        <div className={clsx(classes.frontPageConsoleHeader)}>
          <span>快速访问 &gt; _</span>
          <span>工作台状态</span>
        </div>

        <div className={clsx(classes.frontPageConsoleGrid)}>
          <div className={clsx(classes.frontPageConsoleColumn)}>
            <h2>命令</h2>
            <ul className={clsx(classes.frontPageConsoleList)}>
              {commandEntries.map((entry) => (
                <li key={entry.label}>
                  <span>{entry.label}</span>
                  <strong>{entry.value}</strong>
                </li>
              ))}
            </ul>
          </div>

          <div className={clsx(classes.frontPageConsoleColumn)}>
            <h2>当前范围</h2>
            <ul className={clsx(classes.frontPageConsoleNotes)}>
              {scopeEntries.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </div>

          <div className={clsx(classes.frontPageConsoleColumn)}>
            <h2>运行概览</h2>
            <ul className={clsx(classes.frontPageConsoleStats)}>
              {runtimeStats.map((entry) => (
                <li key={entry.label}>
                  <span>{entry.label}</span>
                  <strong>{entry.value}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  )
}

export default IndexPage
