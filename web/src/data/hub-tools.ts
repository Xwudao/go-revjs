export type ToolRoute =
  | '/'
  | '/crypto-lab'
  | '/curl-to-code'
  | '/js-deob'
  | '/ast-explorer'
  | '/code-format'
  | '/string-tools'
  | '/text-pipeline';

export interface HubTool {
  title: string;
  description: string;
  iconClass: string;
  to: ToolRoute;
  keywords: readonly string[];
  /** Badge label displayed on the homepage card grid. Absent for entries that are search-only (e.g. homepage). */
  cardState?: string;
}

export const HUB_TOOLS = [
  {
    title: '首页',
    description: '工具导航总览',
    iconClass: 'i-mdi-home-outline',
    to: '/',
    keywords: ['home', '首页', 'index', '导航'],
  },
  {
    title: 'cURL 2 Req',
    description:
      '粘贴 cURL 命令，一键转成 Python Requests、Go net/http、Fetch、Axios、OkHttp 等请求代码。',
    iconClass: 'i-mdi-console-network-outline',
    to: '/curl-to-code',
    keywords: ['curl', 'request', 'python', 'go', 'fetch', 'axios', 'http'],
    cardState: '已上线',
  },
  {
    title: 'Crypto Lab',
    description:
      '统一测试 AES、DES、TripleDES、Rabbit、RC4、RC4Drop 等算法，支持常见模式、填充、编码和一键互转。',
    iconClass: 'i-mdi-lock-outline',
    to: '/crypto-lab',
    keywords: ['crypto', 'aes', 'des', '加密', '解密', 'cipher', 'encrypt'],
    cardState: '已上线',
  },
  {
    title: 'JS 解混淆',
    description:
      '直接贴入混淆后的 JavaScript，调整参数后在同一工作台查看整理结果和运行过程。',
    iconClass: 'i-mdi-code-json',
    to: '/js-deob',
    keywords: ['js', 'deob', '解混淆', 'javascript', 'obfuscate', 'deobfuscate'],
    cardState: '已上线',
  },
  {
    title: 'AST Explorer',
    description:
      '可视化查看 JavaScript AST，联动节点路径、Babel 片段和常用操作手册，适合分析语法结构与转换入口。',
    iconClass: 'i-mdi-source-branch',
    to: '/ast-explorer',
    keywords: ['ast', 'babel', 'parser', 'traverse', '语法树', '节点', 'explorer'],
    cardState: '已上线',
  },
  {
    title: 'Code Formatter',
    description:
      '支持 JS、TS、HTML、CSS、SCSS、Less、JSON、Markdown、GraphQL 等多种格式，基于 Prettier 在浏览器本地运行。',
    iconClass: 'i-mdi-code-braces-box',
    to: '/code-format',
    keywords: ['format', 'prettier', 'formatter', '格式化', 'json', 'html', 'css'],
    cardState: '已上线',
  },
  {
    title: 'String Tools',
    description:
      '一输入全覆盖：Hash（MD5/SHA系列/RIPEMD160）、URL/Base64/HTML/Hex/Unicode 编解码、大小写和命名风格转换、行操作、JWT 解码、时间戳和 JSON 处理。',
    iconClass: 'i-mdi-text-box-multiple-outline',
    to: '/string-tools',
    keywords: [
      'string',
      'hash',
      'md5',
      'sha',
      'base64',
      'url',
      'encode',
      '编码',
      '解码',
      'jwt',
    ],
    cardState: '已上线',
  },
  {
    title: 'Text Pipeline',
    description:
      '自由组合处理函数，构建文本管道依次执行。支持行操作、编解码、大小写转换、文本提取等 40+ 步骤，Worker 后台处理不阻塞界面。',
    iconClass: 'i-mdi-pipe',
    to: '/text-pipeline',
    keywords: ['pipeline', 'text', '管道', 'transform', '处理'],
    cardState: '已上线',
  },
] as const satisfies readonly HubTool[];

/** Tools that appear as cards on the homepage grid (those with a cardState badge). */
export const HUB_CARDS = (HUB_TOOLS as readonly HubTool[]).filter(
  (t): t is HubTool & { cardState: string } => t.cardState !== undefined,
);
