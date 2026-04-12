import type { TabKey, StringToolsOpLabel } from '@/pages/hooks/string-tools.hook';

export type ToolRoute =
  | '/'
  | '/crypto-lab'
  | '/curl-to-code'
  | '/js-deob'
  | '/ast-explorer'
  | '/code-format'
  | '/string-tools'
  | '/text-pipeline'
  | '/tools'
  | '/tools/wubi-typing';

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
    title: '工具箱',
    description: '实用小工具合集，与逆向无关，全部本地运行。',
    iconClass: 'i-mdi-toolbox-outline',
    to: '/tools',
    keywords: ['tools', '工具箱', '工具', '实用'],
    cardState: '已上线',
  },
  {
    title: '五笔练字',
    description: '五笔字型输入法打字练习，支持全屏、提示、速度与准确率统计。',
    iconClass: 'i-mdi-keyboard-outline',
    to: '/tools/wubi-typing',
    keywords: ['wubi', '五笔', '打字', '练习', '输入法'],
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
    iconClass: 'i-mdi-sitemap',
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

// ── Command palette types ────────────────────────────────────────────────────

/**
 * A single item in the command palette. Extends HubTool with an optional
 * `search` payload (for deep-linking into sub-tools) and a `groupLabel` for
 * visual grouping in the results list.
 */
export interface CommandItem {
  title: string;
  description: string;
  iconClass: string;
  keywords: readonly string[];
  to: ToolRoute;
  search?: { tab?: TabKey; op?: string };
  groupLabel?: string;
}

// ── String Tools op commands ─────────────────────────────────────────────────

/**
 * Every op in string-tools must have an entry here.
 * TypeScript will error at build time when a new op label is added to
 * `opsByTab` in string-tools.hook.ts but no corresponding entry is added here.
 */
const STRING_TOOLS_OP_COMMANDS = {
  // encode tab
  'URL 编码': {
    title: 'URL 编码',
    description: 'encodeURIComponent — 百分号编码',
    iconClass: 'i-mdi-arrow-up-circle-outline',
    to: '/string-tools',
    search: { tab: 'encode' as TabKey, op: 'URL 编码' },
    keywords: ['url', 'encode', '编码', 'percent'],
    groupLabel: 'String Tools',
  },
  'URL 解码': {
    title: 'URL 解码',
    description: 'decodeURIComponent — 百分号解码',
    iconClass: 'i-mdi-arrow-down-circle-outline',
    to: '/string-tools',
    search: { tab: 'encode' as TabKey, op: 'URL 解码' },
    keywords: ['url', 'decode', '解码', 'percent'],
    groupLabel: 'String Tools',
  },
  'Base64 编码': {
    title: 'Base64 编码',
    description: 'Base64 encode',
    iconClass: 'i-mdi-arrow-up-circle-outline',
    to: '/string-tools',
    search: { tab: 'encode' as TabKey, op: 'Base64 编码' },
    keywords: ['base64', 'encode', '编码'],
    groupLabel: 'String Tools',
  },
  'Base64 解码': {
    title: 'Base64 解码',
    description: 'Base64 decode',
    iconClass: 'i-mdi-arrow-down-circle-outline',
    to: '/string-tools',
    search: { tab: 'encode' as TabKey, op: 'Base64 解码' },
    keywords: ['base64', 'decode', '解码'],
    groupLabel: 'String Tools',
  },
  'HTML 编码': {
    title: 'HTML 编码',
    description: 'HTML 实体编码 &lt;&gt;&amp;',
    iconClass: 'i-mdi-code-tags',
    to: '/string-tools',
    search: { tab: 'encode' as TabKey, op: 'HTML 编码' },
    keywords: ['html', 'entity', 'encode', '编码'],
    groupLabel: 'String Tools',
  },
  'HTML 解码': {
    title: 'HTML 解码',
    description: 'HTML 实体解码',
    iconClass: 'i-mdi-code-tags',
    to: '/string-tools',
    search: { tab: 'encode' as TabKey, op: 'HTML 解码' },
    keywords: ['html', 'entity', 'decode', '解码'],
    groupLabel: 'String Tools',
  },
  'Hex 编码': {
    title: 'Hex 编码',
    description: '字节流转十六进制',
    iconClass: 'i-mdi-hexagon-outline',
    to: '/string-tools',
    search: { tab: 'encode' as TabKey, op: 'Hex 编码' },
    keywords: ['hex', 'encode', '十六进制', '编码'],
    groupLabel: 'String Tools',
  },
  'Hex 解码': {
    title: 'Hex 解码',
    description: '十六进制还原文本',
    iconClass: 'i-mdi-hexagon-outline',
    to: '/string-tools',
    search: { tab: 'encode' as TabKey, op: 'Hex 解码' },
    keywords: ['hex', 'decode', '十六进制', '解码'],
    groupLabel: 'String Tools',
  },
  'Unicode 转义': {
    title: 'Unicode 转义',
    description: '字符转 \\uXXXX 转义序列',
    iconClass: 'i-mdi-translate',
    to: '/string-tools',
    search: { tab: 'encode' as TabKey, op: 'Unicode 转义' },
    keywords: ['unicode', 'escape', '转义'],
    groupLabel: 'String Tools',
  },
  'Unicode 还原': {
    title: 'Unicode 还原',
    description: '\\uXXXX 还原为字符',
    iconClass: 'i-mdi-translate',
    to: '/string-tools',
    search: { tab: 'encode' as TabKey, op: 'Unicode 还原' },
    keywords: ['unicode', 'unescape', '还原'],
    groupLabel: 'String Tools',
  },
  // transform tab
  UPPERCASE: {
    title: 'UPPERCASE',
    description: '文本转全大写',
    iconClass: 'i-mdi-format-letter-case-upper',
    to: '/string-tools',
    search: { tab: 'transform' as TabKey, op: 'UPPERCASE' },
    keywords: ['uppercase', '大写', 'case'],
    groupLabel: 'String Tools',
  },
  lowercase: {
    title: 'lowercase',
    description: '文本转全小写',
    iconClass: 'i-mdi-format-letter-case-lower',
    to: '/string-tools',
    search: { tab: 'transform' as TabKey, op: 'lowercase' },
    keywords: ['lowercase', '小写', 'case'],
    groupLabel: 'String Tools',
  },
  'Title Case': {
    title: 'Title Case',
    description: '每词首字母大写',
    iconClass: 'i-mdi-format-letter-case',
    to: '/string-tools',
    search: { tab: 'transform' as TabKey, op: 'Title Case' },
    keywords: ['title case', '首字母', 'case'],
    groupLabel: 'String Tools',
  },
  camelCase: {
    title: 'camelCase',
    description: '驼峰命名（小驼峰）',
    iconClass: 'i-mdi-format-letter-case',
    to: '/string-tools',
    search: { tab: 'transform' as TabKey, op: 'camelCase' },
    keywords: ['camel', 'camelcase', '驼峰'],
    groupLabel: 'String Tools',
  },
  PascalCase: {
    title: 'PascalCase',
    description: '大驼峰 / Pascal 命名',
    iconClass: 'i-mdi-format-letter-case',
    to: '/string-tools',
    search: { tab: 'transform' as TabKey, op: 'PascalCase' },
    keywords: ['pascal', 'pascalcase', '大驼峰'],
    groupLabel: 'String Tools',
  },
  snake_case: {
    title: 'snake_case',
    description: '下划线命名',
    iconClass: 'i-mdi-format-letter-case',
    to: '/string-tools',
    search: { tab: 'transform' as TabKey, op: 'snake_case' },
    keywords: ['snake', 'snake_case', '下划线'],
    groupLabel: 'String Tools',
  },
  'kebab-case': {
    title: 'kebab-case',
    description: '连字符命名',
    iconClass: 'i-mdi-format-letter-case',
    to: '/string-tools',
    search: { tab: 'transform' as TabKey, op: 'kebab-case' },
    keywords: ['kebab', 'kebab-case', '连字符'],
    groupLabel: 'String Tools',
  },
  翻转字符串: {
    title: '翻转字符串',
    description: '字符串逐字符翻转',
    iconClass: 'i-mdi-swap-horizontal',
    to: '/string-tools',
    search: { tab: 'transform' as TabKey, op: '翻转字符串' },
    keywords: ['reverse', '翻转', 'string'],
    groupLabel: 'String Tools',
  },
  去首尾空格: {
    title: '去首尾空格',
    description: 'trim() — 去除首尾空白',
    iconClass: 'i-mdi-format-clear',
    to: '/string-tools',
    search: { tab: 'transform' as TabKey, op: '去首尾空格' },
    keywords: ['trim', '空格', '首尾'],
    groupLabel: 'String Tools',
  },
  压缩空白: {
    title: '压缩空白',
    description: '连续空白压缩为单个空格',
    iconClass: 'i-mdi-collapse-all-outline',
    to: '/string-tools',
    search: { tab: 'transform' as TabKey, op: '压缩空白' },
    keywords: ['whitespace', '空白', 'collapse'],
    groupLabel: 'String Tools',
  },
  去除所有空格: {
    title: '去除所有空格',
    description: '移除所有空白字符',
    iconClass: 'i-mdi-eraser-variant',
    to: '/string-tools',
    search: { tab: 'transform' as TabKey, op: '去除所有空格' },
    keywords: ['remove space', '空格', '去除'],
    groupLabel: 'String Tools',
  },
  换行转空格: {
    title: '换行转空格',
    description: '所有换行替换为空格',
    iconClass: 'i-mdi-wrap',
    to: '/string-tools',
    search: { tab: 'transform' as TabKey, op: '换行转空格' },
    keywords: ['newline', '换行', '空格'],
    groupLabel: 'String Tools',
  },
  // lines tab
  '行排序 A→Z': {
    title: '行排序 A→Z',
    description: '按字母升序排列各行',
    iconClass: 'i-mdi-sort-alphabetical-ascending',
    to: '/string-tools',
    search: { tab: 'lines' as TabKey, op: '行排序 A→Z' },
    keywords: ['sort', '排序', '行', 'ascending'],
    groupLabel: 'String Tools',
  },
  '行排序 Z→A': {
    title: '行排序 Z→A',
    description: '按字母降序排列各行',
    iconClass: 'i-mdi-sort-alphabetical-descending',
    to: '/string-tools',
    search: { tab: 'lines' as TabKey, op: '行排序 Z→A' },
    keywords: ['sort', '排序', '行', 'descending'],
    groupLabel: 'String Tools',
  },
  '去重（保序）': {
    title: '去重（保序）',
    description: '删除重复行，保持原始顺序',
    iconClass: 'i-mdi-filter-outline',
    to: '/string-tools',
    search: { tab: 'lines' as TabKey, op: '去重（保序）' },
    keywords: ['dedup', '去重', '行', 'unique'],
    groupLabel: 'String Tools',
  },
  翻转行顺序: {
    title: '翻转行顺序',
    description: '将所有行的顺序翻转',
    iconClass: 'i-mdi-swap-vertical',
    to: '/string-tools',
    search: { tab: 'lines' as TabKey, op: '翻转行顺序' },
    keywords: ['reverse', '翻转', '行'],
    groupLabel: 'String Tools',
  },
  每行去空格: {
    title: '每行去空格',
    description: 'trim 每一行首尾空白',
    iconClass: 'i-mdi-format-clear',
    to: '/string-tools',
    search: { tab: 'lines' as TabKey, op: '每行去空格' },
    keywords: ['trim', '行', '空格'],
    groupLabel: 'String Tools',
  },
  去空行: {
    title: '去空行',
    description: '删除全部空行',
    iconClass: 'i-mdi-minus',
    to: '/string-tools',
    search: { tab: 'lines' as TabKey, op: '去空行' },
    keywords: ['empty line', '空行', '去除'],
    groupLabel: 'String Tools',
  },
  行号标注: {
    title: '行号标注',
    description: '为每行添加行号前缀',
    iconClass: 'i-mdi-format-list-numbered',
    to: '/string-tools',
    search: { tab: 'lines' as TabKey, op: '行号标注' },
    keywords: ['line number', '行号', '编号'],
    groupLabel: 'String Tools',
  },
  每行加引号: {
    title: '每行加引号',
    description: '每行包裹在双引号中',
    iconClass: 'i-mdi-format-quote-close',
    to: '/string-tools',
    search: { tab: 'lines' as TabKey, op: '每行加引号' },
    keywords: ['quote', '引号', '行'],
    groupLabel: 'String Tools',
  },
  '行拼接（逗号）': {
    title: '行拼接（逗号）',
    description: '所有行用逗号连接为一行',
    iconClass: 'i-mdi-link-variant',
    to: '/string-tools',
    search: { tab: 'lines' as TabKey, op: '行拼接（逗号）' },
    keywords: ['join', '拼接', '逗号', '行'],
    groupLabel: 'String Tools',
  },
  // other tab
  'JWT 解码': {
    title: 'JWT 解码',
    description: 'JWT header/payload 解析',
    iconClass: 'i-mdi-shield-key-outline',
    to: '/string-tools',
    search: { tab: 'other' as TabKey, op: 'JWT 解码' },
    keywords: ['jwt', 'token', '解码'],
    groupLabel: 'String Tools',
  },
  '时间戳 → ISO': {
    title: '时间戳 → ISO',
    description: 'Unix 时间戳转 ISO 8601',
    iconClass: 'i-mdi-clock-outline',
    to: '/string-tools',
    search: { tab: 'other' as TabKey, op: '时间戳 → ISO' },
    keywords: ['timestamp', 'iso', '时间戳'],
    groupLabel: 'String Tools',
  },
  'ISO → 时间戳': {
    title: 'ISO → 时间戳',
    description: 'ISO 8601 转 Unix 时间戳',
    iconClass: 'i-mdi-clock-outline',
    to: '/string-tools',
    search: { tab: 'other' as TabKey, op: 'ISO → 时间戳' },
    keywords: ['iso', 'timestamp', '时间戳'],
    groupLabel: 'String Tools',
  },
  'JSON 转义': {
    title: 'JSON 转义',
    description: 'JSON.stringify 字符串转义',
    iconClass: 'i-mdi-code-json',
    to: '/string-tools',
    search: { tab: 'other' as TabKey, op: 'JSON 转义' },
    keywords: ['json', 'escape', '转义'],
    groupLabel: 'String Tools',
  },
  'JSON 反转义': {
    title: 'JSON 反转义',
    description: 'JSON.parse 字符串还原',
    iconClass: 'i-mdi-code-json',
    to: '/string-tools',
    search: { tab: 'other' as TabKey, op: 'JSON 反转义' },
    keywords: ['json', 'unescape', '反转义'],
    groupLabel: 'String Tools',
  },
  'JSON 格式化': {
    title: 'JSON 格式化',
    description: 'JSON 美化打印（indent 2）',
    iconClass: 'i-mdi-code-json',
    to: '/string-tools',
    search: { tab: 'other' as TabKey, op: 'JSON 格式化' },
    keywords: ['json', 'format', 'pretty', '格式化'],
    groupLabel: 'String Tools',
  },
  'JSON 压缩': {
    title: 'JSON 压缩',
    description: 'JSON 压缩为单行',
    iconClass: 'i-mdi-code-json',
    to: '/string-tools',
    search: { tab: 'other' as TabKey, op: 'JSON 压缩' },
    keywords: ['json', 'minify', '压缩'],
    groupLabel: 'String Tools',
  },
} satisfies Record<StringToolsOpLabel, CommandItem>;

/**
 * All command items: top-level tools + every string-tools operation.
 * Use this in the search modal instead of HUB_TOOLS.
 */
export const ALL_COMMAND_ITEMS: readonly CommandItem[] = [
  ...(HUB_TOOLS as readonly HubTool[]).map(
    ({ title, description, iconClass, to, keywords }): CommandItem => ({
      title,
      description,
      iconClass,
      to,
      keywords,
    }),
  ),
  ...Object.values(STRING_TOOLS_OP_COMMANDS),
];
