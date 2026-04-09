export interface AstExplorerHandbookApi {
  name: string;
  description: string;
}

export interface AstExplorerHandbookExample {
  title: string;
  code: string;
}

export interface AstExplorerHandbookSection {
  id: string;
  title: string;
  summary: string;
  lead: string;
  iconClassName: string;
  points: string[];
  apiList: AstExplorerHandbookApi[];
  example?: AstExplorerHandbookExample;
  note?: string;
}

export const AST_EXPLORER_HANDBOOK: AstExplorerHandbookSection[] = [
  {
    id: 'builders-literals',
    title: '用 builders 构造基础节点',
    summary: '把明确的 JS 值转成 StringLiteral、Identifier 这类节点。',
    lead: '@babel/types 的 builder API 负责显式构造 AST 节点，不会自动把任意值猜成目标语法。',
    iconClassName: 'i-mdi-code-braces',
    points: [
      '字符串、数字、布尔值和 null 都有对应 builder，最常用的是 stringLiteral、numericLiteral、booleanLiteral、nullLiteral。',
      '变量名不是普通字符串，要用 identifier("name")。',
      '当你已经知道目标节点类型时，builder 比直接拼对象更安全，也更符合 Babel 的字段约束。',
    ],
    apiList: [
      {
        name: 't.stringLiteral("hello")',
        description: '创建 StringLiteral，适合替换字符串参数、对象值、默认文案。',
      },
      {
        name: 't.numericLiteral(42)',
        description: '创建 NumericLiteral，适合计数器、常量和数字比较。',
      },
      {
        name: 't.booleanLiteral(true)',
        description: '创建 BooleanLiteral，适合开关位和条件分支。',
      },
      {
        name: 't.nullLiteral()',
        description: '创建 NullLiteral。',
      },
      {
        name: 't.identifier("userName")',
        description: '创建 Identifier，表示变量名或属性访问里的标识符。',
      },
    ],
    example: {
      title: '基础 builder 示例',
      code: `import * as t from '@babel/types';

const greeting = t.stringLiteral('hello');
const answer = t.numericLiteral(42);
const enabled = t.booleanLiteral(true);
const empty = t.nullLiteral();
const localName = t.identifier('userName');`,
    },
    note: '如果你的输入本质上是一段代码表达式，而不是一个确定类型的值，优先考虑 parseExpression，而不是手写多层 builder。',
  },
  {
    id: 'builders-composed',
    title: '组合更复杂的表达式',
    summary: '把多个小节点拼成调用、成员访问、对象和数组。',
    lead: 'builder 不是只能构造字面量。常见的 CallExpression、MemberExpression、ObjectExpression 都可以逐层组合出来。',
    iconClassName: 'i-mdi-code-block-tags',
    points: [
      '先构造最内层的参数和字面量，再向外组合 callExpression、memberExpression 这类结构。',
      '对象属性通常用 objectProperty，数组元素直接放进 arrayExpression。',
      '组合 builder 的优势是结构清晰，适合批量生成或稳定替换。',
    ],
    apiList: [
      {
        name: 't.memberExpression(obj, prop)',
        description: '创建 obj.prop 或 obj[prop]。',
      },
      {
        name: 't.callExpression(callee, args)',
        description: '创建函数调用，args 是节点数组。',
      },
      {
        name: 't.objectProperty(key, value)',
        description: '创建对象属性。key 和 value 都是节点。',
      },
      {
        name: 't.objectExpression([...])',
        description: '创建对象字面量。',
      },
      {
        name: 't.arrayExpression([...])',
        description: '创建数组字面量。',
      },
    ],
    example: {
      title: '拼一个 console.log("hello")',
      code: `import * as t from '@babel/types';

const statement = t.expressionStatement(
  t.callExpression(
    t.memberExpression(t.identifier('console'), t.identifier('log')),
    [t.stringLiteral('hello')],
  ),
);`,
    },
  },
  {
    id: 'parse-from-code',
    title: '从代码字符串解析成节点',
    summary: '当语法比较复杂时，直接解析一段代码通常更快。',
    lead: '面对可选链、模板字符串、JSX、TS 类型标注这类结构时，parseExpression 或 parse 往往比手写 builder 更省事。',
    iconClassName: 'i-mdi-sitemap',
    points: [
      'parseExpression 适合只需要一个表达式节点的场景。',
      'parse 返回完整 File 节点，语句要从 program.body 里取。',
      '和页面里的 AST Explorer 一样，解析时通常要带上 jsx、typescript 这些 plugins。',
    ],
    apiList: [
      {
        name: 'parser.parseExpression(code, options)',
        description: '把表达式字符串直接解析成 Expression 节点。',
      },
      {
        name: 'parser.parse(code, options)',
        description: '解析完整源码，返回 File 节点。',
      },
      {
        name: 'sourceType: "module" | "script" | "unambiguous"',
        description: '控制 import/export 等模块语法的解析方式。',
      },
    ],
    example: {
      title: '解析表达式和语句',
      code: `import * as parser from '@babel/parser';

const expr = parser.parseExpression('foo?.bar ?? "fallback"', {
  plugins: ['jsx', 'typescript'],
});

const file = parser.parse('const title = \`hi \${name}\`;', {
  sourceType: 'module',
  plugins: ['jsx', 'typescript'],
});

const firstStatement = file.program.body[0];`,
    },
    note: '如果只是想把一个字符串值变成 StringLiteral，不需要 parse；直接用 t.stringLiteral 更直接，也更便于控制。',
  },
  {
    id: 'checks-and-paths',
    title: '判断节点类型与读取 path',
    summary: '先判断，再改写，能显著减少误伤。',
    lead: 'Babel 的工作流通常是 traverse 时拿到 path，然后通过 path.isXxx 或 t.isXxx 做精确筛选。',
    iconClassName: 'i-mdi-information-outline',
    points: [
      'path.isCallExpression() 适合 visitor 里进一步过滤。',
      't.isIdentifier(node, { name: "console" }) 这类谓词适合做属性匹配。',
      'path.get("arguments.0")、path.get("init") 让你只操作某个子节点，而不是整棵子树。',
    ],
    apiList: [
      {
        name: 'path.isIdentifier()',
        description: '判断当前 path 对应节点类型。',
      },
      {
        name: 't.isIdentifier(node, { name: "x" })',
        description: '判断普通节点对象，并可附带字段匹配。',
      },
      {
        name: 'path.get("callee")',
        description: '读取子 path，方便继续判断或替换。',
      },
      {
        name: 'path.node / path.parentPath',
        description: '分别拿到当前节点和父级 path。',
      },
    ],
    example: {
      title: '只匹配 console.log',
      code: `traverse(ast, {
  CallExpression(path) {
    const callee = path.get('callee');

    if (
      callee.isMemberExpression() &&
      t.isIdentifier(callee.node.object, { name: 'console' }) &&
      t.isIdentifier(callee.node.property, { name: 'log' })
    ) {
      // 命中了 console.log(...)
    }
  },
});`,
    },
  },
  {
    id: 'replace-and-insert',
    title: '替换、插入、删除节点',
    summary: 'path API 是实际改 AST 时最常用的一层。',
    lead: '命中目标节点后，优先通过 path 的原子操作改写结构，不要手动改父节点数组。',
    iconClassName: 'i-mdi-content-copy',
    points: [
      'replaceWith 适合一换一。',
      'replaceWithMultiple 常用于把一条语句展开成多条语句。',
      'insertBefore、insertAfter、remove 分别对应插入和删除。',
    ],
    apiList: [
      {
        name: 'path.replaceWith(node)',
        description: '用一个新节点替换当前节点。',
      },
      {
        name: 'path.replaceWithMultiple(nodes)',
        description: '把当前语句替换成多条语句。',
      },
      {
        name: 'path.insertBefore(node)',
        description: '在当前语句或声明前插入。',
      },
      {
        name: 'path.insertAfter(node)',
        description: '在当前语句或声明后插入。',
      },
      {
        name: 'path.remove()',
        description: '删除当前节点。',
      },
    ],
    example: {
      title: '把变量初始值改成字符串字面量',
      code: `traverse(ast, {
  VariableDeclarator(path) {
    if (t.isIdentifier(path.node.id, { name: 'env' })) {
      path.get('init').replaceWith(t.stringLiteral('production'));
    }
  },
});`,
    },
    note: '当替换目标可能不存在时，先判断 path.get(...) 是否拿到了真实子节点，再执行 replaceWith。',
  },
  {
    id: 'generate-output',
    title: '重新生成代码并形成闭环',
    summary: '典型流程是 parse -> traverse -> generate。',
    lead: '最后一步通常由 @babel/generator 完成。它会把改完的 AST 序列化回代码字符串。',
    iconClassName: 'i-mdi-code-tags',
    points: [
      'generate(ast, {}, code) 可以利用原始源码做格式和 sourcemap 相关处理。',
      '如果某个分支已经处理完成，可以用 path.skip() 避免继续深入。',
      '做批量替换时，先 parse 和 traverse，最后统一 generate，保持流程清晰。',
    ],
    apiList: [
      {
        name: 'traverse(ast, visitors)',
        description: '遍历 AST 并在 visitor 中改写。',
      },
      {
        name: 'generate(ast, options, code)',
        description: '把 AST 重新生成为代码。',
      },
      {
        name: 'path.skip() / path.stop()',
        description: '跳过当前子树或终止整次遍历。',
      },
    ],
    example: {
      title: '完整闭环示例',
      code: `const ast = parser.parse(code, {
  sourceType: 'unambiguous',
  plugins: ['jsx', 'typescript'],
});

traverse(ast, {
  StringLiteral(path) {
    if (path.node.value === 'debug') {
      path.replaceWith(t.stringLiteral('release'));
      path.skip();
    }
  },
});

const { code: output } = generate(ast, {}, code);`,
    },
  },
];
