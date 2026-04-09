import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import type { Warnings } from 'curlconverter'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { AppSelect, type AppSelectOption } from '@/components/ui/app-select'
import { CodeEditor, type CodeEditorLanguage } from '@/components/ui/code-editor'
import { ToolbarButton, ToolbarDivider } from '@/components/ui/toolbar-button'
import classes from './curl-to-code.module.scss'
import exampleCurl from '@/assets/raw/curl.txt?raw'

type CurlConverterModule = typeof import('curlconverter')
type ConversionTarget =
  | 'python-requests'
  | 'python-http-client'
  | 'go-net-http'
  | 'javascript-fetch'
  | 'node-axios'
  | 'java-okhttp'
  | 'raw-http'

type ConversionWarning = Warnings[number]

const targetLanguageMap: Record<ConversionTarget, CodeEditorLanguage> = {
  'python-requests': 'python',
  'python-http-client': 'python',
  'go-net-http': 'go',
  'javascript-fetch': 'javascript',
  'node-axios': 'javascript',
  'java-okhttp': 'java',
  'raw-http': 'plain',
}

interface StoredState {
  curlCommand: string
  target: ConversionTarget
}

interface TargetConfig {
  label: string
  description: string
  runtime: string
  dependency: string
  outputFileName: string
  convert: (converter: CurlConverterModule, curlCommand: string) => [string, Warnings]
}

const storageKey = 'revjs:curl-to-code:state'

const targetConfigs: Record<ConversionTarget, TargetConfig> = {
  'python-requests': {
    label: 'Python Requests',
    description: '最常用的 Python HTTP 库，适合各类接口请求场景。',
    runtime: 'Python 3',
    dependency: 'pip install requests',
    outputFileName: 'request.py',
    convert: (converter, curlCommand) => converter.toPythonWarn(curlCommand),
  },
  'python-http-client': {
    label: 'Python http.client',
    description: '标准库实现，无需三方依赖。',
    runtime: 'Python 3',
    dependency: '标准库，无额外依赖',
    outputFileName: 'request-http-client.py',
    convert: (converter, curlCommand) => converter.toPythonHttpWarn(curlCommand),
  },
  'go-net-http': {
    label: 'Go net/http',
    description: '标准库实现，适合服务端脚本。',
    runtime: 'Go 1.x',
    dependency: '标准库，无额外依赖',
    outputFileName: 'request.go',
    convert: (converter, curlCommand) => converter.toGoWarn(curlCommand),
  },
  'javascript-fetch': {
    label: 'Browser Fetch',
    description: '浏览器原生 fetch 调用。',
    runtime: '现代浏览器',
    dependency: '原生 API 或 polyfill',
    outputFileName: 'request-fetch.js',
    convert: (converter, curlCommand) => converter.toJavaScriptWarn(curlCommand),
  },
  'node-axios': {
    label: 'Node Axios',
    description: 'Node.js 脚本常见写法。',
    runtime: 'Node.js',
    dependency: 'npm install axios',
    outputFileName: 'request-axios.mjs',
    convert: (converter, curlCommand) => converter.toNodeAxiosWarn(curlCommand),
  },
  'java-okhttp': {
    label: 'Java OkHttp',
    description: 'Java 客户端场景常用。',
    runtime: 'Java 8+',
    dependency: 'OkHttp',
    outputFileName: 'RequestExample.java',
    convert: (converter, curlCommand) => converter.toJavaOkHttpWarn(curlCommand),
  },
  'raw-http': {
    label: 'Raw HTTP',
    description: '直接查看原始 HTTP 报文。',
    runtime: '通用',
    dependency: '无',
    outputFileName: 'request.http',
    convert: (converter, curlCommand) => converter.toHTTPWarn(curlCommand),
  },
}

const targetOptions: AppSelectOption<ConversionTarget>[] = Object.entries(
  targetConfigs,
).map(([value, config]) => ({
  value: value as ConversionTarget,
  label: config.label,
  description: config.description,
}))

const defaultState: StoredState = {
  curlCommand: exampleCurl,
  target: 'python-requests',
}

let converterPromise: Promise<CurlConverterModule> | null = null

function readStoredState(): StoredState {
  if (typeof window === 'undefined') return defaultState

  const raw = window.localStorage.getItem(storageKey)
  if (!raw) return defaultState

  try {
    const parsed = JSON.parse(raw) as Partial<StoredState>
    const target =
      parsed.target && parsed.target in targetConfigs
        ? parsed.target
        : defaultState.target

    return {
      curlCommand:
        typeof parsed.curlCommand === 'string'
          ? parsed.curlCommand
          : defaultState.curlCommand,
      target,
    }
  } catch {
    return defaultState
  }
}

function loadConverterModule() {
  converterPromise ??= import('curlconverter')
  return converterPromise
}

function sanitizeCurlCommand(value: string) {
  let normalized = value
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .trim()

  normalized = normalized
    .replace(/^```(?:bash|sh|shell|zsh|powershell|ps1|cmd)?\s*/i, '')
    .replace(/\s*```$/, '')

  const lines = normalized.split('\n')
  const firstContentLineIndex = lines.findIndex((line) => line.trim())

  if (firstContentLineIndex >= 0) {
    lines[firstContentLineIndex] = lines[firstContentLineIndex]
      .replace(/^\s*(?:\$|#)\s+/, '')
      .replace(/^\s*PS [^>\r\n]*>\s+/, '')
      .replace(/^\s*[A-Za-z]:\\[^>\r\n]*>\s+/, '')
      .replace(/^\s*curl\.exe\b/, 'curl')
  }

  return lines.join('\n').trim()
}

function dedupeWarnings(warnings: Warnings) {
  const seen = new Set<string>()

  return warnings.filter((warning) => {
    const key = `${warning[0]}::${warning[1]}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function formatWarningCode(code: string) {
  return code
    .split(/[-_]/)
    .filter(Boolean)
    .map((segment) => segment.toUpperCase())
    .join(' · ')
}

function formatConversionError(error: unknown) {
  const fallback = '转换失败，请检查 cURL 命令是否完整。'

  if (!(error instanceof Error)) return fallback

  if (error.message.includes('command should begin with "curl"')) {
    return '没有识别到有效的 curl 命令，请直接粘贴完整命令，或去掉 shell 提示符后再试。'
  }

  if (error.message.includes('no arguments provided')) {
    return '当前输入为空，请先粘贴一段 cURL 命令。'
  }

  if (
    error.message.includes('tree-sitter.wasm') ||
    error.message.includes('tree-sitter-bash.wasm')
  ) {
    return '解析器资源加载失败，请刷新页面后重试；如果仍失败，请检查静态资源是否已部署。'
  }

  return error.message || fallback
}

function countLines(value: string) {
  if (!value) return 0
  return value.split(/\r?\n/).length
}

function CurlToCodePage() {
  const sourceFileInputRef = useRef<HTMLInputElement | null>(null)
  const [state, setState] = useState<StoredState>(readStoredState)
  const [outputCode, setOutputCode] = useState('')
  const [warnings, setWarnings] = useState<ConversionWarning[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [isConverting, setIsConverting] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'failed'>('idle')

  const currentTarget = targetConfigs[state.target]
  const inputLineCount = useMemo(() => countLines(state.curlCommand), [state.curlCommand])
  const outputLineCount = useMemo(() => countLines(outputCode), [outputCode])
  const warningCount = warnings.length

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    const id = toast.loading('正在预加载解析器…', { id: 'curl-wasm-preload' })
    loadConverterModule()
      .then(() => toast.success('解析器已就绪', { id }))
      .catch(() => toast.dismiss(id))
  }, [])

  useEffect(() => {
    if (copyState === 'idle') return

    const timer = window.setTimeout(() => setCopyState('idle'), 1600)
    return () => window.clearTimeout(timer)
  }, [copyState])

  function updateState(patch: Partial<StoredState>) {
    setState((current) => ({
      ...current,
      ...patch,
    }))
  }

  async function runConversion() {
    const preparedCommand = sanitizeCurlCommand(state.curlCommand)

    if (!preparedCommand) {
      setErrorMessage('请先输入 cURL 命令。')
      setOutputCode('')
      setWarnings([])
      return
    }

    if (!/\bcurl(?:\.exe)?\b/.test(preparedCommand)) {
      setErrorMessage('没有检测到 curl 命令，请直接粘贴完整命令后再转换。')
      setOutputCode('')
      setWarnings([])
      return
    }

    setIsConverting(true)
    setErrorMessage('')

    try {
      const converter = await loadConverterModule()
      const [convertedCode, nextWarnings] = currentTarget.convert(
        converter,
        preparedCommand,
      )

      if (!convertedCode.trim()) {
        throw new Error('生成结果为空，请检查输入命令是否完整。')
      }

      startTransition(() => {
        setState((current) => ({
          ...current,
          curlCommand: preparedCommand,
        }))
        setOutputCode(convertedCode.trimEnd())
        setWarnings(dedupeWarnings(nextWarnings))
        setErrorMessage('')
      })
    } catch (error) {
      setOutputCode('')
      setWarnings([])
      setErrorMessage(formatConversionError(error))
    } finally {
      setIsConverting(false)
    }
  }

  function clearAll() {
    setState(defaultState)
    setOutputCode('')
    setWarnings([])
    setErrorMessage('')
    window.localStorage.removeItem(storageKey)
  }

  function fillExample() {
    setState((current) => ({
      ...current,
      curlCommand: exampleCurl,
    }))
    setOutputCode('')
    setWarnings([])
    setErrorMessage('')
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

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText()

      if (!text.trim()) {
        toast.error('剪贴板里没有可用的 cURL 内容')
        return
      }

      setState((current) => ({
        ...current,
        curlCommand: text,
      }))
      setOutputCode('')
      setWarnings([])
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
      setState((current) => ({
        ...current,
        curlCommand: text,
      }))
      setOutputCode('')
      setWarnings([])
      setErrorMessage('')
    } catch {
      setErrorMessage('导入文件失败，请重新选择后再试。')
    } finally {
      event.target.value = ''
    }
  }

  function downloadOutput() {
    if (!outputCode) return

    const blob = new Blob([outputCode], { type: 'text/plain;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = url
    anchor.download = currentTarget.outputFileName
    anchor.click()

    window.URL.revokeObjectURL(url)
  }

  return (
    <main className={clsx(classes.curlPage)}>
      <input
        ref={sourceFileInputRef}
        type="file"
        accept=".txt,.sh,.curl,.bash,.zsh,.ps1,text/plain"
        className={clsx(classes.curlHiddenInput)}
        onChange={importSourceFile}
      />

      {/* ── Toolbar ── */}
      <div className={clsx(classes.curlPanel, classes.curlToolbar)}>
        <div className={clsx(classes.curlToolbarLeft)}>
          <span className={clsx(classes.curlBrand)}>
            <span className="i-mdi-console-network-outline" aria-hidden="true" />
            cURL 2 Req
          </span>
          <span className={clsx(classes.curlStatusBadge)}>
            <span className="i-mdi-shield-check-outline" aria-hidden="true" />
            本地解析
          </span>
        </div>

        <div className={clsx(classes.curlToolbarActions)}>
          <ToolbarButton
            variant="primary"
            onClick={runConversion}
            disabled={isConverting}
          >
            <span
              className={clsx(
                isConverting ? 'i-mdi-loading animate-spin' : 'i-mdi-play-circle-outline',
              )}
              aria-hidden="true"
            />
            {isConverting ? '转换中' : '立即转换'}
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
          <ToolbarButton onClick={fillExample}>
            <span className="i-mdi-flask-outline" aria-hidden="true" />
            示例命令
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton onClick={copyOutput} disabled={!outputCode}>
            <span className="i-mdi-content-copy" aria-hidden="true" />
            {copyState === 'done'
              ? '已复制'
              : copyState === 'failed'
                ? '失败'
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
      <div className={clsx(classes.curlEditorsGrid)}>
        <div className={clsx(classes.curlPanel, classes.curlSection)}>
          <div className={clsx(classes.curlEditorHead)}>
            <h2 className={clsx(classes.curlSectionTitle)}>cURL 输入</h2>
            <span className={clsx(classes.curlEditorMeta)}>{inputLineCount} 行</span>
          </div>
          <div className={clsx(classes.curlEditorWrap)}>
            <CodeEditor
              value={state.curlCommand}
              onChange={(value) => updateState({ curlCommand: value })}
              minHeight="20rem"
              language="plain"
            />
          </div>
        </div>

        <div className={clsx(classes.curlPanel, classes.curlSection)}>
          <div className={clsx(classes.curlEditorHead)}>
            <h2 className={clsx(classes.curlSectionTitle)}>生成结果</h2>
            <span className={clsx(classes.curlEditorMeta)}>
              {outputCode ? `${outputLineCount} 行` : '—'}
            </span>
          </div>
          {errorMessage ? (
            <div className={clsx(classes.curlError)}>
              <span className="i-mdi-alert-circle-outline" aria-hidden="true" />
              {errorMessage}
            </div>
          ) : (
            <div className={clsx(classes.curlNote)}>
              <span className="i-mdi-information-outline" aria-hidden="true" />
              {outputCode ? '转换完成，可直接复制或下载。' : '粘贴 cURL 后点"立即转换"。'}
            </div>
          )}
          <div className={clsx(classes.curlEditorWrap)}>
            <CodeEditor
              value={outputCode}
              readOnly
              minHeight="20rem"
              language={targetLanguageMap[state.target]}
            />
          </div>
        </div>
      </div>

      {/* ── Bottom row: options + warnings ── */}
      <div className={clsx(classes.curlBottomRow)}>
        <div
          className={clsx(classes.curlPanel, classes.curlSection, classes.curlOptions)}
        >
          <h2 className={clsx(classes.curlSectionTitle)}>输出配置</h2>

          <div className={clsx(classes.curlForm)}>
            <div className={clsx(classes.curlField)}>
              <span className={clsx(classes.curlFieldLabel)}>目标语言</span>
              <AppSelect
                value={state.target}
                options={targetOptions}
                ariaLabel="选择输出语言"
                onChange={(value) => updateState({ target: value })}
              />
            </div>
          </div>

          <dl className={clsx(classes.curlMeta)}>
            <div>
              <dt>运行环境</dt>
              <dd>{currentTarget.runtime}</dd>
            </div>
            <div>
              <dt>依赖</dt>
              <dd>{currentTarget.dependency}</dd>
            </div>
            <div>
              <dt>文件名</dt>
              <dd>{currentTarget.outputFileName}</dd>
            </div>
          </dl>
        </div>

        <div
          className={clsx(
            classes.curlPanel,
            classes.curlSection,
            classes.curlWarningsPanel,
          )}
        >
          <h2 className={clsx(classes.curlSectionTitle)}>
            转换告警
            {warningCount > 0 && (
              <span className={clsx(classes.curlWarningBadge)}>{warningCount}</span>
            )}
          </h2>
          {warnings.length ? (
            <ul className={clsx(classes.curlWarningList)}>
              {warnings.map((warning, index) => (
                <li key={`${warning[0]}-${warning[1]}-${index}`}>
                  <strong>{formatWarningCode(warning[0])}</strong>
                  <span>{warning[1]}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={clsx(classes.curlEmpty)}>
              {outputCode
                ? '没有告警，生成结果已尽量还原原始请求。'
                : '转换后将显示注意事项。'}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}

export default CurlToCodePage
