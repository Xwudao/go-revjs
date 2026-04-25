import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { AppSelect, type AppSelectOption } from '@/components/ui/app-select';
import { CodeEditor, type CodeEditorLanguage } from '@/components/ui/code-editor';
import { Tip } from '@/components/ui/tip';
import { ToolbarButton, ToolbarDivider } from '@/components/ui/toolbar-button';
import type { FormatLanguage, FormatOptions } from './code-format.worker';
import CodeFormatWorker from './code-format.worker?worker';
import { useTitle } from './hooks/use-title';
import classes from './code-format.module.scss';

type FormatWorkerResponse =
  | { type: 'formatted'; code: string }
  | { type: 'error'; message: string };

interface StoredState {
  inputCode: string;
  language: FormatLanguage;
  options: FormatOptions;
}

interface LangConfig {
  label: string;
  description: string;
  editorLanguage: CodeEditorLanguage;
  fileExtension: string;
}

const langConfigs: Record<FormatLanguage, LangConfig> = {
  javascript: {
    label: 'JavaScript',
    description: 'JS / JSX，支持现代语法，包括 ESNext 和 React JSX。',
    editorLanguage: 'javascript',
    fileExtension: '.js',
  },
  typescript: {
    label: 'TypeScript',
    description: 'TS / TSX，含类型注解和泛型语法。',
    editorLanguage: 'typescript',
    fileExtension: '.ts',
  },
  html: {
    label: 'HTML',
    description: 'HTML 文档，自动缩进标签层级与属性。',
    editorLanguage: 'html',
    fileExtension: '.html',
  },
  css: {
    label: 'CSS',
    description: '标准 CSS，整理选择器缩进与属性顺序。',
    editorLanguage: 'css',
    fileExtension: '.css',
  },
  scss: {
    label: 'SCSS',
    description: 'SCSS 预处理器语法，含嵌套规则与变量。',
    editorLanguage: 'css',
    fileExtension: '.scss',
  },
  less: {
    label: 'Less',
    description: 'Less 预处理器语法，含 Mixin 与变量。',
    editorLanguage: 'css',
    fileExtension: '.less',
  },
  json: {
    label: 'JSON',
    description: '标准 JSON，自动规范化缩进与引号。',
    editorLanguage: 'json',
    fileExtension: '.json',
  },
  json5: {
    label: 'JSON5',
    description: '支持注释、尾逗号和单引号的宽松 JSON。',
    editorLanguage: 'json',
    fileExtension: '.json5',
  },
  markdown: {
    label: 'Markdown',
    description: 'Markdown 文档，规范化列表缩进与代码块格式。',
    editorLanguage: 'plain',
    fileExtension: '.md',
  },
  graphql: {
    label: 'GraphQL',
    description: 'GraphQL Schema 与查询文档。',
    editorLanguage: 'plain',
    fileExtension: '.graphql',
  },
};

const langOptions: AppSelectOption<FormatLanguage>[] = Object.entries(langConfigs).map(
  ([value, config]) => ({
    value: value as FormatLanguage,
    label: config.label,
    description: config.description,
  }),
);

const trailingCommaOptions: AppSelectOption<FormatOptions['trailingComma']>[] = [
  { value: 'es5', label: 'ES5', description: '函数参数除外，其余尾部加逗号（推荐）。' },
  { value: 'all', label: '全部', description: '包括函数参数在内，全部添加尾逗号。' },
  { value: 'none', label: '不加', description: '不添加任何尾逗号。' },
];

const storageKey = 'revjs:code-format:state';

const defaultOptions: FormatOptions = {
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  trailingComma: 'es5',
};

const defaultState: StoredState = {
  inputCode: '',
  language: 'javascript',
  options: defaultOptions,
};

let workerSingleton: Worker | null = null;

function getFormatWorker(): Worker {
  if (!workerSingleton) {
    workerSingleton = new CodeFormatWorker();
    workerSingleton.onerror = () => {
      workerSingleton = null;
    };
  }
  return workerSingleton;
}

function formatWithWorker(
  code: string,
  language: FormatLanguage,
  options: FormatOptions,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = getFormatWorker();

    worker.onmessage = (event: MessageEvent<FormatWorkerResponse>) => {
      if (event.data.type === 'formatted') {
        resolve(event.data.code);
        return;
      }

      workerSingleton = null;
      reject(new Error(event.data.message));
    };

    worker.onerror = () => {
      workerSingleton = null;
      reject(new Error('Worker 异常，请刷新页面后重试。'));
    };

    worker.postMessage({ code, language, options });
  });
}

function readStoredState(): StoredState {
  if (typeof window === 'undefined') return defaultState;

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return defaultState;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    const language =
      parsed.language && parsed.language in langConfigs
        ? parsed.language
        : defaultState.language;

    return {
      inputCode:
        typeof parsed.inputCode === 'string' ? parsed.inputCode : defaultState.inputCode,
      language,
      options: { ...defaultOptions, ...(parsed.options ?? {}) },
    };
  } catch {
    return defaultState;
  }
}

function countLines(value: string) {
  if (!value) return 0;
  return value.split(/\r?\n/).length;
}

function CodeFormatPage() {
  useTitle('代码格式化 · RevJS');
  const sourceFileInputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<StoredState>(readStoredState);
  const [outputCode, setOutputCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isFormatting, setIsFormatting] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'failed'>('idle');

  const currentLang = langConfigs[state.language];
  const inputLineCount = useMemo(() => countLines(state.inputCode), [state.inputCode]);
  const outputLineCount = useMemo(() => countLines(outputCode), [outputCode]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (copyState === 'idle') return;
    const timer = window.setTimeout(() => setCopyState('idle'), 1600);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  function updateState(patch: Partial<StoredState>) {
    setState((current) => ({ ...current, ...patch }));
  }

  function updateOptions(patch: Partial<FormatOptions>) {
    setState((current) => ({ ...current, options: { ...current.options, ...patch } }));
  }

  async function runFormat() {
    if (!state.inputCode.trim()) {
      setErrorMessage('请先输入需要格式化的代码。');
      setOutputCode('');
      return;
    }

    setIsFormatting(true);
    setErrorMessage('');

    try {
      const formatted = await formatWithWorker(
        state.inputCode,
        state.language,
        state.options,
      );

      startTransition(() => {
        setOutputCode(formatted.trimEnd());
        setErrorMessage('');
      });
    } catch (error) {
      setOutputCode('');
      setErrorMessage(
        error instanceof Error ? error.message : '格式化失败，请检查代码语法。',
      );
    } finally {
      setIsFormatting(false);
    }
  }

  function clearAll() {
    setState({ ...defaultState });
    setOutputCode('');
    setErrorMessage('');
    window.localStorage.removeItem(storageKey);
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast.error('剪贴板里没有可用内容');
        return;
      }
      updateState({ inputCode: text });
      setOutputCode('');
      setErrorMessage('');
      toast.success('已从剪贴板粘贴');
    } catch {
      toast.error('读取剪贴板失败，请检查浏览器权限');
    }
  }

  async function importSourceFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      updateState({ inputCode: text });
      setOutputCode('');
      setErrorMessage('');
    } catch {
      setErrorMessage('导入文件失败，请重新选择后再试。');
    } finally {
      event.target.value = '';
    }
  }

  async function copyOutput() {
    if (!outputCode) return;

    try {
      await navigator.clipboard.writeText(outputCode);
      setCopyState('done');
      toast.success('已复制到剪贴板');
    } catch {
      setCopyState('failed');
      toast.error('复制失败，请检查浏览器权限');
    }
  }

  function downloadOutput() {
    if (!outputCode) return;

    const blob = new Blob([outputCode], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `formatted${currentLang.fileExtension}`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <main className={clsx(classes.fmtPage)}>
      <input
        ref={sourceFileInputRef}
        type="file"
        className={clsx(classes.fmtHiddenInput)}
        onChange={importSourceFile}
      />

      {/* ── Toolbar ── */}
      <div className={clsx(classes.fmtPanel, classes.fmtToolbar)}>
        <div className={clsx(classes.fmtToolbarLeft)}>
          <span className={clsx(classes.fmtBrand)}>
            <span className="i-mdi-code-braces-box" aria-hidden="true" />
            Code Formatter
          </span>
          <span className={clsx(classes.fmtStatusBadge)}>
            <span className="i-mdi-shield-check-outline" aria-hidden="true" />
            本地运行 / Prettier
          </span>
        </div>

        <div className={clsx(classes.fmtToolbarActions)}>
          <ToolbarButton variant="primary" onClick={runFormat} disabled={isFormatting}>
            <span
              className={clsx(
                isFormatting ? 'i-mdi-loading animate-spin' : 'i-mdi-auto-fix',
              )}
              aria-hidden="true"
            />
            {isFormatting ? '格式化中' : '立即格式化'}
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton onClick={pasteFromClipboard}>
            <span className="i-mdi-clipboard-text-outline" aria-hidden="true" />
            从剪贴板粘贴
          </ToolbarButton>
          <ToolbarButton onClick={() => sourceFileInputRef.current?.click()}>
            <span className="i-mdi-file-import-outline" aria-hidden="true" />
            导入文件
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton onClick={copyOutput} disabled={!outputCode}>
            <span className="i-mdi-content-copy" aria-hidden="true" />
            {copyState === 'done'
              ? '已复制'
              : copyState === 'failed'
                ? '复制失败'
                : '复制结果'}
          </ToolbarButton>
          <ToolbarButton onClick={downloadOutput} disabled={!outputCode}>
            <span className="i-mdi-download" aria-hidden="true" />
            下载结果
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton onClick={clearAll}>
            <span className="i-mdi-refresh" aria-hidden="true" />
            重置
          </ToolbarButton>
        </div>
      </div>

      {/* ── Editors ── */}
      <div className={clsx(classes.fmtEditorsGrid)}>
        <div className={clsx(classes.fmtPanel, classes.fmtSection)}>
          <div className={clsx(classes.fmtEditorHead)}>
            <h2 className={clsx(classes.fmtSectionTitle)}>原始代码</h2>
            <span className={clsx(classes.fmtEditorMeta)}>
              {currentLang.label} · {inputLineCount} 行
            </span>
          </div>
          <div className={clsx(classes.fmtEditorWrap)}>
            <CodeEditor
              value={state.inputCode}
              onChange={(value) => updateState({ inputCode: value })}
              language={currentLang.editorLanguage}
              minHeight="26rem"
            />
          </div>
        </div>

        <div className={clsx(classes.fmtPanel, classes.fmtSection)}>
          <div className={clsx(classes.fmtEditorHead)}>
            <h2 className={clsx(classes.fmtSectionTitle)}>格式化结果</h2>
            <span className={clsx(classes.fmtEditorMeta)}>
              {outputCode ? `${outputLineCount} 行` : '—'}
            </span>
          </div>
          {errorMessage ? (
            <div className={clsx(classes.fmtError)}>
              <span className="i-mdi-alert-circle-outline" aria-hidden="true" />
              {errorMessage}
            </div>
          ) : (
            <Tip variant="inline">
              {outputCode
                ? '格式化完成，可直接复制或下载。'
                : '配置好选项后点"立即格式化"。'}
            </Tip>
          )}
          <div className={clsx(classes.fmtEditorWrap)}>
            <CodeEditor
              value={outputCode}
              readOnly
              language={currentLang.editorLanguage}
              minHeight="26rem"
            />
          </div>
        </div>
      </div>

      {/* ── Bottom row: options + summary ── */}
      <div className={clsx(classes.fmtBottomRow)}>
        <div className={clsx(classes.fmtPanel, classes.fmtSection, classes.fmtOptions)}>
          <h2 className={clsx(classes.fmtSectionTitle)}>格式配置</h2>

          <div className={clsx(classes.fmtForm)}>
            <div className={clsx(classes.fmtField)}>
              <span className={clsx(classes.fmtFieldLabel)}>语言 / 格式</span>
              <AppSelect
                value={state.language}
                options={langOptions}
                ariaLabel="选择代码语言"
                onChange={(value) => {
                  updateState({ language: value });
                  setOutputCode('');
                  setErrorMessage('');
                }}
              />
            </div>

            <div className={clsx(classes.fmtField)}>
              <span className={clsx(classes.fmtFieldLabel)}>尾逗号</span>
              <AppSelect
                value={state.options.trailingComma}
                options={trailingCommaOptions}
                ariaLabel="尾逗号策略"
                onChange={(value) => updateOptions({ trailingComma: value })}
              />
            </div>

            <div className={clsx(classes.fmtOptionRow)}>
              <label className={clsx(classes.fmtOptionLabel)}>
                <span>行宽</span>
                <span className={clsx(classes.fmtOptionValue)}>
                  {state.options.printWidth}
                </span>
              </label>
              <input
                type="range"
                min={40}
                max={200}
                step={4}
                value={state.options.printWidth}
                className={clsx(classes.fmtSlider)}
                onChange={(e) => updateOptions({ printWidth: Number(e.target.value) })}
              />
            </div>

            <div className={clsx(classes.fmtOptionRow)}>
              <label className={clsx(classes.fmtOptionLabel)}>
                <span>缩进宽度</span>
                <span className={clsx(classes.fmtOptionValue)}>
                  {state.options.tabWidth}
                </span>
              </label>
              <input
                type="range"
                min={1}
                max={8}
                value={state.options.tabWidth}
                className={clsx(classes.fmtSlider)}
                onChange={(e) => updateOptions({ tabWidth: Number(e.target.value) })}
              />
            </div>

            <label className={clsx(classes.fmtOptionCheck)}>
              <input
                type="checkbox"
                checked={state.options.useTabs}
                onChange={(e) => updateOptions({ useTabs: e.target.checked })}
              />
              <span>使用 Tab 缩进</span>
            </label>

            <label className={clsx(classes.fmtOptionCheck)}>
              <input
                type="checkbox"
                checked={state.options.semi}
                onChange={(e) => updateOptions({ semi: e.target.checked })}
              />
              <span>语句末尾加分号</span>
            </label>

            <label className={clsx(classes.fmtOptionCheck)}>
              <input
                type="checkbox"
                checked={state.options.singleQuote}
                onChange={(e) => updateOptions({ singleQuote: e.target.checked })}
              />
              <span>单引号字符串</span>
            </label>
          </div>
        </div>

        <div
          className={clsx(classes.fmtPanel, classes.fmtSection, classes.fmtSummaryPanel)}
        >
          <h2 className={clsx(classes.fmtSectionTitle)}>配置摘要</h2>
          <dl className={clsx(classes.fmtSummary)}>
            <div>
              <dt>语言</dt>
              <dd>{currentLang.label}</dd>
            </div>
            <div>
              <dt>行宽</dt>
              <dd>{state.options.printWidth}</dd>
            </div>
            <div>
              <dt>缩进</dt>
              <dd>{state.options.useTabs ? 'Tab' : `${state.options.tabWidth} 空格`}</dd>
            </div>
            <div>
              <dt>分号</dt>
              <dd>{state.options.semi ? '是' : '否'}</dd>
            </div>
            <div>
              <dt>引号</dt>
              <dd>{state.options.singleQuote ? '单引号' : '双引号'}</dd>
            </div>
            <div>
              <dt>尾逗号</dt>
              <dd>{state.options.trailingComma}</dd>
            </div>
            {outputCode ? (
              <>
                <div>
                  <dt>输入行数</dt>
                  <dd>{inputLineCount}</dd>
                </div>
                <div>
                  <dt>输出行数</dt>
                  <dd>{outputLineCount}</dd>
                </div>
              </>
            ) : null}
          </dl>
          {!outputCode && (
            <p className={clsx(classes.fmtEmpty)}>
              格式化后这里会同步显示输入 / 输出行数。
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

export default CodeFormatPage;
