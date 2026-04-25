import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Accordion } from '@/components/ui/accordion';
import { CodeEditor } from '@/components/ui/code-editor';
import { Tip } from '@/components/ui/tip';
import { ToolbarButton, ToolbarDivider } from '@/components/ui/toolbar-button';
import {
  AST_EXPLORER_HANDBOOK,
  type AstExplorerHandbookSection,
} from './ast-explorer-handbook';
import {
  type FlatRow,
  NODE_CATEGORY_MAP,
  useAstExplorer,
} from './hooks/ast-explorer.hook';
import { useTitle } from './hooks/use-title';
import classes from './ast-explorer.module.scss';

function HandbookSectionBody({ section }: { section: AstExplorerHandbookSection }) {
  return (
    <div className={clsx(classes.handbookSectionBody)}>
      <p className={clsx(classes.handbookLead)}>{section.lead}</p>

      <ul className={clsx(classes.handbookList)}>
        {section.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>

      <div className={clsx(classes.handbookApiList)}>
        {section.apiList.map((entry) => (
          <div key={entry.name} className={clsx(classes.handbookApiRow)}>
            <code className={clsx(classes.handbookApiName)}>{entry.name}</code>
            <span className={clsx(classes.handbookApiDescription)}>
              {entry.description}
            </span>
          </div>
        ))}
      </div>

      {section.example && (
        <div className={clsx(classes.handbookExample)}>
          <div className={clsx(classes.handbookExampleTitle)}>
            {section.example.title}
          </div>
          <pre className={clsx(classes.handbookCodeBlock)}>
            <code>{section.example.code}</code>
          </pre>
        </div>
      )}

      {section.note && (
        <Tip variant="callout">
          <p>{section.note}</p>
        </Tip>
      )}
    </div>
  );
}

export default function AstExplorerPage() {
  useTitle('AST Explorer · RevJS');
  const {
    code,
    setCode,
    parseResult,
    selectedPath,
    rightTab,
    setRightTab,
    copiedSnippet,
    selectedNode,
    generatedSnippet,
    flatRows,
    handleSelectNode,
    handleToggleExpand,
    handleCopySnippet,
    handleResetCode,
    handleCopyCode,
    handleCursorChange,
  } = useAstExplorer();

  const { ast, error, parseTime } = parseResult;

  // ── Context menu ────────────────────────────────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState<{
    path: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!ctxMenu) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCtxMenu(null);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [ctxMenu]);

  // ── Scroll to selected AST node ─────────────────────────────────────────────
  const astContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedPath || rightTab !== 'ast') return;
    requestAnimationFrame(() => {
      const el = astContainerRef.current?.querySelector(
        `[data-ast-path="${CSS.escape(selectedPath)}"]`,
      ) as HTMLElement | null;
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }, [selectedPath, rightTab]);

  const handbookItems = AST_EXPLORER_HANDBOOK.map((section) => ({
    id: section.id,
    title: section.title,
    description: section.summary,
    iconClassName: section.iconClassName,
    content: <HandbookSectionBody section={section} />,
  }));

  return (
    <div className={classes.page}>
      {/* ── Toolbar ── */}
      <div className={clsx(classes.panel, classes.toolbar)}>
        <div className={classes.toolbarLeft}>
          <span className={classes.brand}>
            <span className="i-mdi-code-tags text-base" aria-hidden="true" />
            AST Explorer
          </span>
          <span
            className={clsx(
              classes.statusBadge,
              error ? classes.statusError : classes.statusOk,
            )}
          >
            {error ? '解析错误' : ast ? `${parseTime.toFixed(1)} ms` : '…'}
          </span>
        </div>
        <div className={classes.toolbarActions}>
          <ToolbarButton onClick={handleCopyCode}>
            <span className="i-mdi-content-copy text-sm" aria-hidden="true" />
            复制代码
          </ToolbarButton>
          <ToolbarDivider />
          <ToolbarButton onClick={handleResetCode}>
            <span className="i-mdi-restore text-sm" aria-hidden="true" />
            重置示例
          </ToolbarButton>
        </div>
      </div>

      {/* ── Editors grid ── */}
      <div className={classes.editorsGrid}>
        {/* Left: code editor */}
        <div className={clsx(classes.panel, classes.editorPanel)}>
          <div className={classes.panelHeader}>
            <span className="i-mdi-code-braces text-sm" aria-hidden="true" />
            JavaScript
          </div>
          <CodeEditor
            value={code}
            onChange={setCode}
            language="javascript"
            height="calc(100vh - 14rem)"
            minHeight="28rem"
            seamless
            onCursorChange={handleCursorChange}
          />
        </div>

        {/* Right: AST + snippet */}
        <div className={clsx(classes.panel, classes.rightPanel)}>
          {/* Tab bar */}
          <div className={classes.panelHeader}>
            <button
              type="button"
              className={clsx(classes.tab, rightTab === 'ast' && classes.tabActive)}
              onClick={() => setRightTab('ast')}
            >
              <span className="i-mdi-sitemap text-sm" aria-hidden="true" />
              AST 树
            </button>
            <button
              type="button"
              className={clsx(classes.tab, rightTab === 'snippet' && classes.tabActive)}
              onClick={() => setRightTab('snippet')}
            >
              <span className="i-mdi-code-block-tags text-sm" aria-hidden="true" />
              Babel 代码片段
              {selectedNode && <span className={classes.tabDot} />}
            </button>
            <button
              type="button"
              className={clsx(classes.tab, rightTab === 'handbook' && classes.tabActive)}
              onClick={() => setRightTab('handbook')}
            >
              <span className="i-mdi-information-outline text-sm" aria-hidden="true" />
              Babel 手册
            </button>
            <div className={classes.panelHeaderSpacer} />
            {rightTab === 'snippet' && selectedNode && (
              <button
                type="button"
                className={clsx(classes.copyBtn, copiedSnippet && classes.copyBtnDone)}
                onClick={handleCopySnippet}
              >
                <span
                  className={clsx(
                    copiedSnippet ? 'i-mdi-check' : 'i-mdi-content-copy',
                    'text-sm',
                  )}
                  aria-hidden="true"
                />
                {copiedSnippet ? '已复制' : '复制片段'}
              </button>
            )}
          </div>

          {/* AST tab */}
          {rightTab === 'ast' && (
            <div className={classes.astContainer} ref={astContainerRef}>
              {error && (
                <div className={classes.errorBanner}>
                  <span
                    className="i-mdi-alert-circle-outline text-sm"
                    aria-hidden="true"
                  />
                  {error}
                </div>
              )}
              {!error &&
                flatRows.map((row: FlatRow) => {
                  const isSelected = selectedPath === row.pathKey;
                  return (
                    <div
                      key={row.pathKey}
                      data-ast-path={row.pathKey}
                      className={clsx(
                        classes.flatRow,
                        row.hasChildren && classes.flatRowToggleable,
                        isSelected && classes.flatRowSelected,
                      )}
                      style={{ paddingLeft: `${row.depth * 16 + 6}px` }}
                      onClick={() => row.hasChildren && handleToggleExpand(row.pathKey)}
                      onContextMenu={(e) => {
                        if (row.kind !== 'node') return;
                        e.preventDefault();
                        setCtxMenu({ path: row.pathKey, x: e.clientX, y: e.clientY });
                      }}
                    >
                      <span className={classes.flatToggle}>
                        {row.hasChildren ? (row.isExpanded ? '−' : '+') : null}
                      </span>

                      {row.propKey !== undefined && (
                        <span className={classes.flatPropKey}>{row.propKey}:&nbsp;</span>
                      )}

                      {row.kind === 'node' && (
                        <>
                          <span
                            className={clsx(
                              classes.treeTypeBadge,
                              classes[`treeType-${row.nodeCategory}`],
                            )}
                          >
                            {row.nodeType}
                          </span>
                          {row.nodeInlineHint && (
                            <span className={classes.flatInlineHint}>
                              &nbsp;{row.nodeInlineHint}
                            </span>
                          )}
                          {!row.isExpanded && row.hasChildren && (
                            <span className={classes.flatPreview}>
                              &thinsp;{`{${row.collapsedPreview}}`}
                            </span>
                          )}
                          {row.nodeLoc && (
                            <span className={classes.treeLoc}>
                              {row.nodeLoc.line}:{row.nodeLoc.column}
                            </span>
                          )}
                        </>
                      )}

                      {(row.kind === 'array' || row.kind === 'empty-array') && (
                        <span className={classes.flatArrayBadge}>
                          {row.isExpanded ? '[' : `[${row.arrayLen}]`}
                        </span>
                      )}

                      {row.kind === 'primitive' && (
                        <span className={classes.flatPrimitive}>{row.primitiveVal}</span>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* Snippet tab */}
          {rightTab === 'snippet' && (
            <div className={classes.snippetContainer}>
              {!selectedNode ? (
                <div className={classes.snippetPlaceholder}>
                  <span
                    className="i-mdi-cursor-default-click-outline text-2xl"
                    aria-hidden="true"
                  />
                  <p>在左侧 AST 树中右键点击任意节点</p>
                  <p className={classes.snippetPlaceholderSub}>
                    选择「生成 Babel 代码片段」即可查看自动生成的 traverse 代码
                  </p>
                </div>
              ) : (
                <div className={classes.snippetContent}>
                  <div className={classes.snippetNodeInfo}>
                    <span
                      className={clsx(
                        classes.treeTypeBadge,
                        classes[
                          `treeType-${NODE_CATEGORY_MAP[selectedNode.type] ?? 'other'}`
                        ],
                      )}
                    >
                      {selectedNode.type}
                    </span>
                    {selectedNode.loc && (
                      <span className={classes.snippetLoc}>
                        Line {selectedNode.loc.start.line}, Col{' '}
                        {selectedNode.loc.start.column}
                      </span>
                    )}
                  </div>
                  <CodeEditor
                    value={generatedSnippet}
                    readOnly
                    language="javascript"
                    height="calc(100vh - 18rem)"
                    minHeight="24rem"
                    seamless
                  />
                </div>
              )}
            </div>
          )}

          {rightTab === 'handbook' && (
            <div className={clsx(classes.handbookContainer)}>
              <Tip
                variant="callout"
                className={clsx(classes.handbookIntro)}
                iconClassName={clsx(
                  'i-mdi-information-outline',
                  classes.handbookIntroIcon,
                )}
              >
                <div className={clsx(classes.handbookIntroBody)}>
                  <p className={clsx(classes.handbookIntroTitle)}>
                    Babel AST 常用操作速查
                  </p>
                  <p className={clsx(classes.handbookIntroText)}>
                    这里收的是 AST Explorer 里最常见的一组
                    API：构造节点、从代码解析、按类型判断、替换节点以及重新生成代码。
                  </p>
                </div>
              </Tip>

              <Accordion
                items={handbookItems}
                className={clsx(classes.handbookAccordion)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Context menu ── */}
      {ctxMenu && (
        <>
          {/* Backdrop — click outside to close */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 998 }}
            onClick={() => setCtxMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setCtxMenu(null);
            }}
          />
          <div
            className={classes.contextMenu}
            style={{ top: ctxMenu.y, left: ctxMenu.x }}
          >
            <button
              type="button"
              className={classes.contextMenuItem}
              onClick={() => {
                handleSelectNode(ctxMenu.path);
                setCtxMenu(null);
              }}
            >
              <span className="i-mdi-code-block-tags text-sm" aria-hidden="true" />
              生成 Babel 代码片段
            </button>
          </div>
        </>
      )}
    </div>
  );
}
