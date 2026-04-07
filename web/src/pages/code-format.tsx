import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { AppSelect, type AppSelectOption } from '@/components/ui/app-select'
import { CodeEditor, type CodeEditorLanguage } from '@/components/ui/code-editor'
import type { FormatLanguage, FormatOptions } from './code-format.worker'
import CodeFormatWorker from './code-format.worker?worker'
import classes from './code-format.module.scss'

type FormatWorkerResponse =
  | { type: 'formatted'; code: string }
  | { type: 'error'; message: string }

interface StoredState {
  inputCode: string
  language: FormatLanguage
  options: FormatOptions
}

interface LangConfig {
  label: string
  description: string
  editorLanguage: CodeEditorLanguage
  fileExtension: string
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
}

const langOptions: AppSelectOption<FormatLanguage>[] = Object.entries(langConfigs).map(
  ([value, config]) => ({
    value: value as FormatLanguage,
    label: config.label,
    description: config.description,
  }),
)

const trailingCommaOptions: AppSelectOption<FormatOptions['trailingComma']>[] = [
  { value: 'es5', label: 'ES5', description: '函数参数除外，其余尾部加逗号（推荐）。' },
  { value: 'all', label: '全部', description: '包括函数参数在内，全部添加尾逗号。' },
  { value: 'none', label: '不加', description: '不添加任何尾逗号。' },
]

const storageKey = 'revjs:code-format:state'

const defaultOptions: FormatOptions = {
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  trailingComma: 'es5',
}

const defaultState: StoredState = {
  inputCode: '',
  language: 'javascript',
  options: defaultOptions,
}

const pageNotes = [
  '格式化在浏览器本地运行，代码不会上传服务器。',
  '支持粘贴压缩代码、缩进混乱的代码，格式化后可直接复制使用。',
  '部分选项（如尾逗号）仅对 JS/TS 生效，HTML / CSS 会自动忽略无关设置。',
  '如果代码存在语法错误，格式化会失败并给出错误提示，请先修正后再试。',
  'JSON5 宽松格式允许注释和尾逗号，输出也会保持 JSON5 格式，不会转为标准 JSON。',
] as const

let workerSingleton: Worker | null = null

function getFormatWorker(): Worker {
  if (!workerSingleton) {
    workerSingleton = new CodeFormatWorker()
    workerSingleton.onerror = () => {
      workerSingleton = null
    }
  }
  return workerSingleton
}

function formatWithWorker(
  code: string,
  language: FormatLanguage,
  options: FormatOptions,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = getFormatWorker()

    worker.onmessage = (event: MessageEvent<FormatWorkerResponse>) => {
      if (event.data.type === 'formatted') {
        resolve(event.data.code)
        return
      }

      workerSingleton = null
      reject(new Error(event.data.message))
    }

    worker.onerror = () => {
      workerSingleton = null
      reject(new Error('Worker 异常，请刷新页面后重试。'))
    }

    worker.postMessage({ code, language, options })
  })
}

function readStoredState(): StoredState {
  if (typeof window === 'undefined') return defaultState

  const raw = window.localStorage.getItem(storageKey)
  if (!raw) return defaultState

  try {
    const parsed = JSON.parse(raw) as Partial<StoredState>
    const language =
      parsed.language && parsed.language in langConfigs
        ? parsed.language
        : defaultState.language

    return {
      inputCode:
        typeof parsed.inputCode === 'string' ? parsed.inputCode : defaultState.inputCode,
      language,
      options: { ...defaultOptions, ...(parsed.options ?? {}) },
    }
  } catch {
    return defaultState
  }
}

function countLines(value: string) {
  if (!value) return 0
  return value.split(/\r?\n/).length
}

function CodeFormatPage() {
  const sourceFileInputRef = useRef<HTMLInputElement | null>(null)
  const [state, setState] = useState<StoredState>(readStoredState)
  const [outputCode, setOutputCode] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isFormatting, setIsFormatting] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'failed'>('idle')
  const [showOptions, setShowOptions] = useState(false)

  const currentLang = langConfigs[state.language]
  const inputLineCount = useMemo(() => countLines(state.inputCode), [state.inputCode])
  const outputLineCount = useMemo(() => countLines(outputCode), [outputCode])

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    if (copyState === 'idle') return
    const timer = window.setTimeout(() => setCopyState('idle'), 1600)
    return () => window.clearTimeout(timer)
  }, [copyState])

  function updateState(patch: Partial<StoredState>) {
    setState((current) => ({ ...current, ...patch }))
  }

  function updateOptions(patch: Partial<FormatOptions>) {
    setState((current) => ({ ...current, options: { ...current.options, ...patch } }))
  }

  async function runFormat() {
    if (!state.inputCode.trim()) {
      setErrorMessage('请先输入需要格式化的代码。')
      setOutputCode('')
      return
    }

    setIsFormatting(true)
    setErrorMessage('')

    try {
      const formatted = await formatWithWorker(
        state.inputCode,
        state.language,
        state.options,
      )

      startTransition(() => {
        setOutputCode(formatted.trimEnd())
        setErrorMessage('')
      })
    } catch (error) {
      setOutputCode('')
      setErrorMessage(
        error instanceof Error ? error.message : '格式化失败，请检查代码语法。',
      )
    } finally {
      setIsFormatting(false)
    }
  }

  function clearAll() {
    setState({ ...defaultState })
    setOutputCode('')
    setErrorMessage('')
    window.localStorage.removeItem(storageKey)
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) {
        toast.error('剪贴板里没有可用内容')
        return
      }
      updateState({ inputCode: text })
      setOutputCode('')
      setErrorMessage('')
      toast.success('已从剪贴板粘贴')
    } catch {
      toast.error('读取剪贴板失败，请检查浏览器权限')
    }
  }

  async function importSourceFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      updateState({ inputCode: text })
      setOutputCode('')
      setErrorMessage('')
    } catch {
      setErrorMessage('导入文件失败，请重新选择后再试。')
    } finally {
      event.target.value = ''
    }
  }

  async function copyOutput() {
    if (!outputCode) return

    try {
      await navigator.clipboard.writeText(outputCode)
      setCopyState('done')
      toast.success('已复制到剪贴板')
    } catch {
      setCopyState('failed')
      toast.error('复制失败，请检查浏览器权限')
    }
  }

  function downloadOutput() {
    if (!outputCode) return

    const blob = new Blob([outputCode], { type: 'text/plain;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `formatted${currentLang.fileExtension}`
    anchor.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <main className={clsx(classes.fmtPage)}>
      <input
        ref={sourceFileInputRef}
        type="file"
        className={clsx(classes.fmtHiddenInput)}
        onChange={importSourceFile}
      />

      <section className={clsx(classes.fmtPanel, classes.fmtHero)}>
        <div className={clsx(classes.fmtHeroMain)}>
          <div className={clsx(classes.fmtHeroHead)}>
            <span className={clsx(classes.fmtKicker)}>
              <span className="i-mdi-code-braces-box" aria-hidden="true" />
              代码格式化
            </span>
            <span className={clsx(classes.fmtStatus)}>本地运行 / Prettier</span>
          </div>

          <div className={clsx(classes.fmtTitleRow)}>
            <h1 className={clsx(classes.fmtTitle)}>Code Formatter</h1>
            <p className={clsx(classes.fmtCopy)}>
              支持 JS、TS、HTML、CSS、SCSS、Less、JSON、Markdown、GraphQL 等格式，基于
              Prettier 在浏览器本地执行。
            </p>
          </div>

          <div className={clsx(classes.fmtHighlights)}>
            <span>10 种语言</span>
            <span>可配置风格</span>
            <span>本地执行</span>
            <span>无需安装</span>
          </div>
        </div>
      </section>

      <section className={clsx(classes.fmtPanel, classes.fmtControls)}>
        <div className={clsx(classes.fmtToolbar)}>
          <div className={clsx(classes.fmtField)}>
            <span className={clsx(classes.fmtFieldLabel)}>语言 / 格式</span>
            <AppSelect
              value={state.language}
              options={langOptions}
              ariaLabel="选择代码语言"
              onChange={(value) => {
                updateState({ language: value })
                setOutputCode('')
                setErrorMessage('')
              }}
            />
          </div>

          <div className={clsx(classes.fmtToolbarActions)}>
            <button
              type="button"
              className={clsx(classes.fmtButton, classes.fmtButtonPrimary)}
              onClick={runFormat}
              disabled={isFormatting}
            >
              <span
                className={clsx(
                  isFormatting ? 'i-mdi-loading animate-spin' : 'i-mdi-auto-fix',
                )}
                aria-hidden="true"
              />
              {isFormatting ? '格式化中' : '立即格式化'}
            </button>
            <button
              type="button"
              className={clsx(classes.fmtButton)}
              onClick={pasteFromClipboard}
            >
              <span className="i-mdi-clipboard-text-outline" aria-hidden="true" />
              从剪贴板粘贴
            </button>
            <button
              type="button"
              className={clsx(classes.fmtButton)}
              onClick={() => sourceFileInputRef.current?.click()}
            >
              <span className="i-mdi-file-import-outline" aria-hidden="true" />
              导入文件
            </button>
            <button
              type="button"
              className={clsx(classes.fmtButton, showOptions && classes.fmtButtonActive)}
              onClick={() => setShowOptions((v) => !v)}
            >
              <span className="i-mdi-tune-variant" aria-hidden="true" />
              格式选项
            </button>
            <button type="button" className={clsx(classes.fmtButton)} onClick={clearAll}>
              <span className="i-mdi-delete-outline" aria-hidden="true" />
              清空
            </button>
          </div>
        </div>

        {showOptions && (
          <div className={clsx(classes.fmtOptions)}>
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

            <div className={clsx(classes.fmtOptionField)}>
              <span className={clsx(classes.fmtFieldLabel)}>尾逗号</span>
              <AppSelect
                value={state.options.trailingComma}
                options={trailingCommaOptions}
                ariaLabel="尾逗号策略"
                onChange={(value) => updateOptions({ trailingComma: value })}
              />
            </div>
          </div>
        )}

        <div className={clsx(classes.fmtMetaStrip)}>
          <span className={clsx(classes.fmtMeta)}>语言: {currentLang.label}</span>
          <span className={clsx(classes.fmtMeta)}>行宽: {state.options.printWidth}</span>
          <span className={clsx(classes.fmtMeta)}>
            缩进: {state.options.useTabs ? 'Tab' : `${state.options.tabWidth} 空格`}
          </span>
          <span className={clsx(classes.fmtMeta)}>
            引号: {state.options.singleQuote ? '单引号' : '双引号'}
          </span>
        </div>

        {errorMessage && (
          <p className={clsx(classes.fmtError)}>
            <span className="i-mdi-alert-circle-outline" aria-hidden="true" />
            {errorMessage}
          </p>
        )}
      </section>

      <section className={clsx(classes.fmtPanel, classes.fmtWorkbench)}>
        <div className={clsx(classes.fmtActionBar)}>
          <div className={clsx(classes.fmtActionCopy)}>
            <span className={clsx(classes.fmtActionTitle)}>工作区</span>
            <span className={clsx(classes.fmtActionHint)}>
              左侧粘贴原始代码，格式化后在右侧查看结果。
            </span>
          </div>

          <div className={clsx(classes.fmtActionButtons)}>
            <button
              type="button"
              className={clsx(classes.fmtButton)}
              onClick={copyOutput}
              disabled={!outputCode}
            >
              <span className="i-mdi-content-copy" aria-hidden="true" />
              {copyState === 'done'
                ? '已复制'
                : copyState === 'failed'
                  ? '复制失败'
                  : '复制结果'}
            </button>
            <button
              type="button"
              className={clsx(classes.fmtButton)}
              onClick={downloadOutput}
              disabled={!outputCode}
            >
              <span className="i-mdi-download" aria-hidden="true" />
              下载结果
            </button>
          </div>
        </div>

        <div className={clsx(classes.fmtEditors)}>
          <article className={clsx(classes.fmtEditorCard)}>
            <div className={clsx(classes.fmtEditorHead)}>
              <div>
                <h2>原始代码</h2>
                <p>粘贴需要格式化的代码，支持压缩或缩进混乱的输入。</p>
              </div>
              <span className={clsx(classes.fmtMeta)}>行数: {inputLineCount}</span>
            </div>

            <CodeEditor
              value={state.inputCode}
              onChange={(value) => updateState({ inputCode: value })}
              language={currentLang.editorLanguage}
              minHeight="26rem"
            />
          </article>

          <article className={clsx(classes.fmtEditorCard)}>
            <div className={clsx(classes.fmtEditorHead)}>
              <div>
                <h2>格式化结果</h2>
                <p>
                  {outputCode
                    ? `${currentLang.label} · 可直接复制或下载。`
                    : '运行格式化后在此查看结果。'}
                </p>
              </div>
              <span className={clsx(classes.fmtMeta)}>行数: {outputLineCount}</span>
            </div>

            <CodeEditor
              value={outputCode}
              readOnly
              language={currentLang.editorLanguage}
              minHeight="26rem"
            />
          </article>
        </div>
      </section>

      <section className={clsx(classes.fmtInfoGrid)}>
        <article className={clsx(classes.fmtPanel, classes.fmtInfoCard)}>
          <div className={clsx(classes.fmtSectionHead)}>
            <h2>支持格式</h2>
            <p>以下格式均由 Prettier 在浏览器本地处理，无需网络请求。</p>
          </div>

          <ul className={clsx(classes.fmtLangList)}>
            {langOptions.map((opt) => (
              <li key={opt.value}>
                <strong>{opt.label}</strong>
                <span>{opt.description}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className={clsx(classes.fmtPanel, classes.fmtInfoCard)}>
          <div className={clsx(classes.fmtSectionHead)}>
            <h2>使用说明</h2>
            <p>格式化工具适合快速整理代码风格，以下是一些边界说明。</p>
          </div>

          <ul className={clsx(classes.fmtNoteList)}>
            {pageNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  )
}

export default CodeFormatPage
