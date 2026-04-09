import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as BabelParser from '@babel/parser';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AstNode = {
  type: string;
  start?: number;
  end?: number;
  loc?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  [key: string]: unknown;
};

export interface ParseResult {
  ast: AstNode | null;
  error: string | null;
  parseTime: number;
}

export type RightTab = 'ast' | 'snippet';

// ── Default code ──────────────────────────────────────────────────────────────

export const DEFAULT_CODE = `function greet(name) {
  const message = "Hello, " + name + "!";
  console.log(message);
  return message;
}

const result = greet("World");
`;

// ── Path navigation helpers ───────────────────────────────────────────────────

/** Get a node by dot-path string, e.g. "program.body.0.declarations.0" */
function getNodeAtPath(root: AstNode, pathStr: string): AstNode | null {
  if (!pathStr || pathStr === 'root') return root;
  const parts = pathStr.split('.');
  let cur: unknown = root;
  for (const part of parts) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return null;
    cur = (cur as Record<string, unknown>)[part];
  }
  if (cur && typeof cur === 'object' && 'type' in (cur as object)) {
    return cur as AstNode;
  }
  return null;
}

/** Collect key identifying properties for a node (for use in generated snippets) */
function getIdentifyingProps(node: AstNode): Array<[string, unknown]> {
  const skip = new Set([
    'start',
    'end',
    'loc',
    'range',
    'extra',
    'innerComments',
    'leadingComments',
    'trailingComments',
    'errors',
  ]);
  const result: Array<[string, unknown]> = [];

  function pickValue(v: unknown): string | null {
    if (typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (v && typeof v === 'object' && 'type' in (v as object)) {
      const sub = v as AstNode;
      // Identifier: use name
      if (sub.type === 'Identifier' && typeof sub.name === 'string')
        return JSON.stringify(sub.name);
      // StringLiteral / NumericLiteral
      if (
        (sub.type === 'StringLiteral' || sub.type === 'NumericLiteral') &&
        'value' in sub
      ) {
        return JSON.stringify(sub.value);
      }
    }
    return null;
  }

  for (const [k, v] of Object.entries(node)) {
    if (skip.has(k) || k === 'type') continue;
    const shown = pickValue(v);
    if (shown !== null) result.push([k, shown]);
    if (result.length >= 4) break;
  }
  return result;
}

// ── AST position lookup ───────────────────────────────────────────────────────

const FIND_SKIP_KEYS = new Set([
  'start',
  'end',
  'loc',
  'range',
  'extra',
  'errors',
  'tokens',
  'innerComments',
  'leadingComments',
  'trailingComments',
]);

/**
 * Walk the AST to find the dot-path to the deepest node whose source range
 * covers the given (line, col). line is 1-based, col is 0-based (Babel loc).
 */
function findPathAtPosition(
  node: AstNode,
  line: number,
  col: number,
  path = 'root',
): string | null {
  if (!node.loc) return null;
  const { start, end } = node.loc;
  const afterStart = line > start.line || (line === start.line && col >= start.column);
  const beforeEnd = line < end.line || (line === end.line && col <= end.column);
  if (!afterStart || !beforeEnd) return null;

  for (const [k, v] of Object.entries(node)) {
    if (FIND_SKIP_KEYS.has(k) || k === 'type') continue;
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        const child = v[i];
        if (child && typeof child === 'object' && 'type' in (child as object)) {
          const res = findPathAtPosition(
            child as AstNode,
            line,
            col,
            `${path}.${k}.${i}`,
          );
          if (res) return res;
        }
      }
    } else if (v && typeof v === 'object' && 'type' in (v as object)) {
      const res = findPathAtPosition(v as AstNode, line, col, `${path}.${k}`);
      if (res) return res;
    }
  }
  return path;
}

/** Generate common path operations based on node type */
function getPathOperations(nodeType: string): string {
  const common = [
    '// path.remove()                          // 删除此节点',
    '// path.replaceWith(newNode)              // 替换为新节点',
    '// path.replaceWithSourceString("...")    // 用代码字符串替换',
    '// path.skip()                           // 跳过子节点遍历',
  ];

  const extra: string[] = [];
  if (
    nodeType === 'FunctionDeclaration' ||
    nodeType === 'FunctionExpression' ||
    nodeType === 'ArrowFunctionExpression'
  ) {
    extra.push(
      '// path.get("body").pushContainer("body", t.returnStatement(...))  // 添加语句',
    );
  }
  if (nodeType === 'VariableDeclarator') {
    extra.push('// path.get("init").replaceWith(newExpr)  // 替换初始值');
  }
  if (nodeType === 'CallExpression') {
    extra.push('// path.get("arguments").map(a => a.node)  // 获取所有参数');
  }
  if (nodeType === 'MemberExpression') {
    extra.push("// t.isIdentifier(path.node.object, { name: 'obj' })  // 检查对象名");
  }
  if (nodeType === 'BinaryExpression' || nodeType === 'LogicalExpression') {
    extra.push('// path.get("left"), path.get("right")  // 访问左右子节点');
  }
  if (nodeType === 'IfStatement') {
    extra.push('// path.get("consequent"), path.get("alternate")  // 访问分支');
  }
  return [...extra, ...common].join('\n    ');
}

/** Build the full Babel transform snippet for the selected node */
export function generateBabelSnippet(node: AstNode): string {
  const identProps = getIdentifyingProps(node);
  const idLines = identProps.map(([k, v]) => `    //   node.${k} === ${v}`).join('\n');
  const operations = getPathOperations(node.type);

  const locComment = node.loc
    ? ` (Line ${node.loc.start.line}, Col ${node.loc.start.column})`
    : '';

  return `const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');
const fs = require('fs');

const code = fs.readFileSync('./input.js', 'utf-8');
const ast = parser.parse(code, {
  sourceType: 'unambiguous',
  plugins: ['jsx', 'typescript'],
  errorRecovery: true,
});

traverse(ast, {
  // 目标节点: ${node.type}${locComment}
  ${node.type}(path) {
    const { node } = path;

    // 用以下属性定位目标节点:
${idLines || '    // (无简单识别属性)'}

    ${operations}
  },
});

const { code: output } = generate(ast, {}, code);
fs.writeFileSync('./output.js', output);
`;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'revjs:ast-explorer:code';

// ── Flat tree rows ────────────────────────────────────────────────────────────

export const NODE_CATEGORY_MAP: Record<string, string> = {
  File: 'meta',
  Program: 'meta',
  Directive: 'meta',
  DirectiveLiteral: 'meta',
  FunctionDeclaration: 'func',
  FunctionExpression: 'func',
  ArrowFunctionExpression: 'func',
  ClassDeclaration: 'func',
  ClassExpression: 'func',
  VariableDeclaration: 'decl',
  VariableDeclarator: 'decl',
  ImportDeclaration: 'decl',
  ExportNamedDeclaration: 'decl',
  ExportDefaultDeclaration: 'decl',
  ExpressionStatement: 'stmt',
  BlockStatement: 'stmt',
  ReturnStatement: 'stmt',
  IfStatement: 'stmt',
  ForStatement: 'stmt',
  WhileStatement: 'stmt',
  SwitchStatement: 'stmt',
  TryStatement: 'stmt',
  ThrowStatement: 'stmt',
  CallExpression: 'expr',
  MemberExpression: 'expr',
  BinaryExpression: 'expr',
  LogicalExpression: 'expr',
  AssignmentExpression: 'expr',
  ConditionalExpression: 'expr',
  NewExpression: 'expr',
  SequenceExpression: 'expr',
  Identifier: 'literal',
  StringLiteral: 'literal',
  NumericLiteral: 'literal',
  BooleanLiteral: 'literal',
  NullLiteral: 'literal',
  TemplateLiteral: 'literal',
  ObjectExpression: 'obj',
  ObjectProperty: 'obj',
  ArrayExpression: 'obj',
};

export type FlatRowKind = 'node' | 'array' | 'primitive' | 'empty-array';

export interface FlatRow {
  pathKey: string;
  depth: number;
  propKey?: string;
  kind: FlatRowKind;
  hasChildren: boolean;
  isExpanded: boolean;
  // node
  nodeType?: string;
  nodeCategory?: string;
  nodeInlineHint?: string;
  collapsedPreview?: string;
  nodeLoc?: { line: number; column: number };
  // array
  arrayLen?: number;
  // primitive
  primitiveVal?: string;
}

const FLAT_SKIP = new Set([
  'start',
  'end',
  'loc',
  'range',
  'extra',
  'errors',
  'tokens',
  'innerComments',
  'leadingComments',
  'trailingComments',
]);

function flatInline(val: unknown): string | null {
  if (typeof val === 'string')
    return val.length > 30
      ? JSON.stringify(val.slice(0, 28)) + '…"'
      : JSON.stringify(val);
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (val === null) return 'null';
  return null;
}

function walkFlat(
  val: unknown,
  pathKey: string,
  propKey: string | undefined,
  depth: number,
  expandedPaths: Set<string>,
  rows: FlatRow[],
): void {
  if (Array.isArray(val)) {
    const arr = val as unknown[];
    if (arr.length === 0) {
      rows.push({
        pathKey,
        depth,
        propKey,
        kind: 'empty-array',
        hasChildren: false,
        isExpanded: false,
        arrayLen: 0,
      });
      return;
    }
    const isExpanded = expandedPaths.has(pathKey);
    rows.push({
      pathKey,
      depth,
      propKey,
      kind: 'array',
      hasChildren: true,
      isExpanded,
      arrayLen: arr.length,
    });
    if (isExpanded) {
      arr.forEach((item, i) =>
        walkFlat(item, `${pathKey}.${i}`, String(i), depth + 1, expandedPaths, rows),
      );
    }
    return;
  }

  if (val && typeof val === 'object' && 'type' in (val as object)) {
    const node = val as AstNode;
    const nodeCategory = NODE_CATEGORY_MAP[node.type] ?? 'other';
    const childEntries = Object.entries(node).filter(
      ([k, v]) => !FLAT_SKIP.has(k) && k !== 'type' && v !== undefined,
    );
    const hasChildren = childEntries.some(([, v]) => {
      if (Array.isArray(v)) return (v as unknown[]).length > 0;
      return v != null && typeof v === 'object' && 'type' in (v as object);
    });

    let nodeInlineHint: string | undefined;
    if (node.type === 'Identifier' && typeof node.name === 'string') {
      nodeInlineHint = node.name;
    } else if (
      (node.type === 'StringLiteral' || node.type === 'NumericLiteral') &&
      'value' in node
    ) {
      nodeInlineHint = flatInline(node.value) ?? undefined;
    }

    const collapsedPreview = childEntries.map(([k]) => k).join(', ');
    const isExpanded = expandedPaths.has(pathKey);

    rows.push({
      pathKey,
      depth,
      propKey,
      kind: 'node',
      hasChildren,
      isExpanded,
      nodeType: node.type,
      nodeCategory,
      nodeInlineHint,
      collapsedPreview,
      nodeLoc: node.loc?.start,
    });

    if (isExpanded) {
      for (const [k, v] of childEntries) {
        walkFlat(v, `${pathKey}.${k}`, k, depth + 1, expandedPaths, rows);
      }
    }
    return;
  }

  const pval = flatInline(val);
  if (pval !== null) {
    rows.push({
      pathKey,
      depth,
      propKey,
      kind: 'primitive',
      hasChildren: false,
      isExpanded: false,
      primitiveVal: pval,
    });
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAstExplorer() {
  const [code, setCode] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_CODE;
    } catch {
      return DEFAULT_CODE;
    }
  });

  const [parseResult, setParseResult] = useState<ParseResult>({
    ast: null,
    error: null,
    parseTime: 0,
  });

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    new Set(['root', 'root.program', 'root.program.body']),
  );
  const [rightTab, setRightTab] = useState<RightTab>('ast');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const parseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Persist code ───────────────────────────────────────────────────────────

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // quota exceeded
    }
  }, [code]);

  // ── Parse on change ────────────────────────────────────────────────────────

  useEffect(() => {
    if (parseTimerRef.current) clearTimeout(parseTimerRef.current);
    parseTimerRef.current = setTimeout(() => {
      const start = performance.now();
      try {
        const ast = BabelParser.parse(code, {
          sourceType: 'unambiguous',
          plugins: ['jsx', 'typescript'],
          errorRecovery: true,
        }) as unknown as AstNode;
        setParseResult({ ast, error: null, parseTime: performance.now() - start });
        // Auto-expand top-level body on fresh parse
        setExpandedPaths(new Set(['root', 'root.program', 'root.program.body']));
      } catch (e) {
        setParseResult({ ast: null, error: String(e), parseTime: 0 });
      }
    }, 280);
    return () => {
      if (parseTimerRef.current) clearTimeout(parseTimerRef.current);
    };
  }, [code]);

  // ── Selected node ──────────────────────────────────────────────────────────

  const selectedNode = useMemo((): AstNode | null => {
    if (!selectedPath || !parseResult.ast) return null;
    const start = selectedPath.startsWith('root.') ? selectedPath.slice(5) : selectedPath;
    if (selectedPath === 'root') return parseResult.ast;
    return getNodeAtPath(parseResult.ast, start);
  }, [selectedPath, parseResult.ast]);

  // ── Generated snippet ──────────────────────────────────────────────────────

  const generatedSnippet = useMemo((): string => {
    if (!selectedNode) return '';
    return generateBabelSnippet(selectedNode);
  }, [selectedNode]);

  // ── Flat rows (for AST tree rendering) ────────────────────────────────────

  const flatRows = useMemo((): FlatRow[] => {
    if (!parseResult.ast) return [];
    const rows: FlatRow[] = [];
    walkFlat(parseResult.ast, 'root', undefined, 0, expandedPaths, rows);
    return rows;
  }, [parseResult.ast, expandedPaths]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectNode = useCallback((path: string) => {
    setSelectedPath(path);
    setRightTab('snippet');
  }, []);

  const handleToggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleCopySnippet = useCallback(async () => {
    if (!generatedSnippet) return;
    try {
      await navigator.clipboard.writeText(generatedSnippet);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 1800);
    } catch {
      // fallback
    }
  }, [generatedSnippet]);

  const handleResetCode = useCallback(() => {
    setCode(DEFAULT_CODE);
    setSelectedPath(null);
  }, []);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // ignore
    }
  }, [code]);

  /** Expand all ancestor paths and highlight the node (no tab switch). */
  const handleLocatePath = useCallback((path: string) => {
    setSelectedPath(path);
    const parts = path.split('.');
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      for (let i = 1; i <= parts.length; i++) {
        next.add(parts.slice(0, i).join('.'));
      }
      return next;
    });
  }, []);

  /** Called when the code editor cursor moves; finds and highlights the AST node. */
  const handleCursorChange = useCallback(
    (pos: { line: number; col: number }) => {
      if (!parseResult.ast) return;
      const found = findPathAtPosition(parseResult.ast, pos.line, pos.col);
      if (found) handleLocatePath(found);
    },
    [parseResult.ast, handleLocatePath],
  );

  return {
    // state
    code,
    setCode,
    parseResult,
    selectedPath,
    expandedPaths,
    rightTab,
    setRightTab,
    copiedSnippet,
    // derived
    selectedNode,
    generatedSnippet,
    flatRows,
    // handlers
    handleSelectNode,
    handleToggleExpand,
    handleCopySnippet,
    handleResetCode,
    handleCopyCode,
    handleLocatePath,
    handleCursorChange,
  };
}
