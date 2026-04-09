import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import { HUB_CARDS } from '@/data/hub-tools';
import classes from './index.module.scss';

const commandEntries = [
  { label: '打开 cURL 2 Req', value: '可用' },
  { label: '打开 Crypto Lab', value: '可用' },
  { label: '打开 JS Deob 工作台', value: '可用' },
  { label: '打开 AST Explorer', value: '可用' },
  { label: '打开 Code Formatter', value: '可用' },
  { label: '打开 String Tools', value: '可用' },
  { label: '打开 Text Pipeline', value: '可用' },
] as const;

const scopeEntries = [
  '已上线 cURL 转请求代码工具，支持 Python、Go、Fetch、Axios、OkHttp 和原始 HTTP。',
  '已上线对称加解密实验台，适合快速验证 AES、DES、TripleDES 等参数组合。',
  '当前已上线 JS 解混淆工具，可直接粘贴混淆代码开始分析。',
  '已上线 AST Explorer，可查看语法树、节点路径和 Babel 代码片段。',
  '已上线代码格式化工具，支持 JS、TS、HTML、CSS、JSON 等 10 种格式，基于 Prettier。',
  '已上线字符串工具箱，涵盖 Hash、编解码、文本变换、行操作等常用处理。',
  '已上线文本依次处理工具，40+ 步骤自由组合成处理管道，Worker 后台运行。',
  '所有工具均在本地浏览器中运行，代码不会上传至服务器。',
] as const;

const runtimeStats = [
  { label: '在线工具', value: '07' },
  { label: '本地运行', value: '100%' },
] as const;

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
            {/* PINNED: JS Deob 永远作为第一个主链接，不要调整顺序 */}
            <Link
              to="/js-deob"
              className={clsx(classes.frontPageAction, classes.frontPageActionPrimary)}
            >
              <span className="i-mdi-play-circle-outline" aria-hidden="true" />
              打开 JS Deob
            </Link>
            <Link to="/curl-to-code" className={clsx(classes.frontPageAction)}>
              <span className="i-mdi-console-network-outline" aria-hidden="true" />
              打开 cURL 2 Req
            </Link>
            <Link to="/crypto-lab" className={clsx(classes.frontPageAction)}>
              <span className="i-mdi-lock-open-variant-outline" aria-hidden="true" />
              打开 Crypto Lab
            </Link>
            <Link to="/tools" className={clsx(classes.frontPageAction)}>
              <span className="i-mdi-toolbox-outline" aria-hidden="true" />
              实用工具箱
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
        {HUB_CARDS.map((feature) => (
          <Link
            key={feature.title}
            to={feature.to}
            className={clsx(classes.frontPagePanelLink)}
          >
            <article
              className={clsx(classes.frontPagePanel, classes.frontPagePanelFeature)}
            >
              <div className={clsx(classes.frontPagePanelHead)}>
                <span className={clsx(classes.frontPageFeatureIcon)} aria-hidden="true">
                  <span className={feature.iconClass} />
                </span>
                <span className={clsx(classes.frontPageBadge)}>{feature.cardState}</span>
              </div>

              <div className={clsx(classes.frontPagePanelBody)}>
                <h2>{feature.title}</h2>
                <p>{feature.description}</p>
              </div>

              <span className={clsx(classes.frontPageTextLink)}>
                进入工作台
                <span className="i-mdi-arrow-right" aria-hidden="true" />
              </span>
            </article>
          </Link>
        ))}
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
  );
}

export default IndexPage;
