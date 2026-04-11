import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import classes from './tools-hub.module.scss';

interface GeneralTool {
  title: string;
  description: string;
  iconClass: string;
  to: string;
  tags: string[];
  state: '已上线' | '开发中';
}

const GENERAL_TOOLS: GeneralTool[] = [
  {
    title: '五笔练字',
    description:
      '五笔字型输入法打字练习。选择预设文章或粘贴自定义文本，实时统计速度与准确率，支持全屏模式和字符提示。',
    iconClass: 'i-mdi-keyboard-outline',
    to: '/tools/wubi-typing',
    tags: ['五笔', '打字', '练习'],
    state: '已上线',
  },
  {
    title: 'SBTI 人格测试',
    description:
      'MBTI 已经过时，SBTI 来了。30 道题，15 个维度，27 种人格，揭晓你到底是哪种人。',
    iconClass: 'i-mdi-brain',
    to: '/tools/sbti-test',
    tags: ['人格', '测试', '娱乐'],
    state: '已上线',
  },
];

export default function ToolsHubPage() {
  return (
    <main className={classes.page}>
      <header className={classes.header}>
        <div className={classes.headerMeta}>
          <span className={classes.kicker}>
            <span className="i-mdi-toolbox-outline" aria-hidden="true" />
            实用工具
          </span>
        </div>
        <h1 className={classes.title}>工具箱</h1>
        <p className={classes.subtitle}>
          与逆向无关的日常实用小工具，全部在本地浏览器运行。
        </p>
      </header>

      <section className={classes.grid}>
        {GENERAL_TOOLS.map((tool) => (
          <Link key={tool.title} to={tool.to} className={classes.cardLink}>
            <article
              className={clsx(classes.card, tool.state === '开发中' && classes.cardWip)}
            >
              <div className={classes.cardHead}>
                <span className={classes.cardIcon} aria-hidden="true">
                  <span className={tool.iconClass} />
                </span>
                <span
                  className={clsx(
                    classes.cardBadge,
                    tool.state === '开发中' && classes.cardBadgeWip,
                  )}
                >
                  {tool.state}
                </span>
              </div>
              <div className={classes.cardBody}>
                <h2 className={classes.cardTitle}>{tool.title}</h2>
                <p className={classes.cardDesc}>{tool.description}</p>
              </div>
              <div className={classes.cardFoot}>
                <div className={classes.cardTags}>
                  {tool.tags.map((tag) => (
                    <span key={tag} className={classes.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
                {tool.state === '已上线' && (
                  <span className={classes.enterLink}>
                    打开工具
                    <span className="i-mdi-arrow-right" aria-hidden="true" />
                  </span>
                )}
              </div>
            </article>
          </Link>
        ))}
      </section>
    </main>
  );
}
