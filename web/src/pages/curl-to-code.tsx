import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import type { Warnings } from 'curlconverter'
import clsx from 'clsx'
import { AppSelect, type AppSelectOption } from '@/components/ui/app-select'
import { CodeEditor } from '@/components/ui/code-editor'
import classes from './curl-to-code.module.scss'

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

const exampleCurl = `curl "https://api.example.com/v1/search?q=revjs&page=1" \\
  --location \\
  --request POST \\
  --header "accept: application/json" \\
  --header "content-type: application/json" \\
  --header "x-trace-id: revjs-demo-001" \\
  --cookie "session=abc123; theme=dark" \\
  --data-raw "{\"keyword\":\"curl 2 req\",\"limit\":20}" \\
  --compressed`

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

const pageNotes = [
  '支持多行 cURL 命令，以及 header、cookie、JSON body、form、认证、压缩等常见写法。',
  '会自动清理命令提示符前缀，Windows 用户直接粘贴也可以正常识别。',
  '如果输入包含不支持的写法，右侧会列出 warnings，生成的代码可能需要手动补全个别部分。',
  '不同语言和运行时对重定向、超时、cookie 的默认处理方式有所差异，使用前建议核对一下。',
  '推荐使用单行 cURL 命令或标准多行格式；其他 shell 环境的语法可能无法完全识别。',
] as const

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
    } catch {
      setCopyState('failed')
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText()

      if (!text.trim()) {
        setErrorMessage('剪贴板里没有可用的 cURL 内容。')
        return
      }

      setState((current) => ({
        ...current,
        curlCommand: text,
      }))
      setOutputCode('')
      setWarnings([])
      setErrorMessage('')
    } catch {
      setErrorMessage('读取剪贴板失败，请检查浏览器权限。')
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
    <main className={clsx(classes.curlReqPage)}>
      <input
        ref={sourceFileInputRef}
        type="file"
        accept=".txt,.sh,.curl,.bash,.zsh,.ps1,text/plain"
        className={clsx(classes.curlReqHiddenInput)}
        onChange={importSourceFile}
      />

      <section className={clsx(classes.curlReqPanel, classes.curlReqHero)}>
        <div className={clsx(classes.curlReqHeroMain)}>
          <div className={clsx(classes.curlReqHeroHead)}>
            <span className={clsx(classes.curlReqKicker)}>
              <span className="i-mdi-console-network-outline" aria-hidden="true" />
              请求代码生成
            </span>
            <span className={clsx(classes.curlReqStatus)}>本地解析 / 多语言输出</span>
          </div>

          <div className={clsx(classes.curlReqTitleRow)}>
            <h1 className={clsx(classes.curlReqTitle)}>cURL 2 Req</h1>
            <p className={clsx(classes.curlReqCopy)}>
              把 cURL 命令直接转成 Python、Go、Fetch、Axios、OkHttp 或原始 HTTP。
            </p>
          </div>

          <div className={clsx(classes.curlReqHighlights)}>
            <span>支持多行 Bash</span>
            <span>保留 headers / body / cookies</span>
            <span>warnings 单独展示</span>
            <span>浏览器本地执行</span>
          </div>
        </div>
      </section>

      <section className={clsx(classes.curlReqPanel, classes.curlReqControls)}>
        <div className={clsx(classes.curlReqToolbar)}>
          <div className={clsx(classes.curlReqField)}>
            <span className={clsx(classes.curlReqFieldLabel)}>目标代码</span>
            <AppSelect
              value={state.target}
              options={targetOptions}
              ariaLabel="选择输出语言"
              onChange={(value) => updateState({ target: value })}
            />
          </div>

          <div className={clsx(classes.curlReqToolbarActions)}>
            <button
              type="button"
              className={clsx(classes.curlReqButton, classes.curlReqButtonPrimary)}
              onClick={runConversion}
              disabled={isConverting}
            >
              <span
                className={clsx(
                  isConverting
                    ? 'i-mdi-loading animate-spin'
                    : 'i-mdi-play-circle-outline',
                )}
                aria-hidden="true"
              />
              {isConverting ? '转换中' : '立即转换'}
            </button>
            <button
              type="button"
              className={clsx(classes.curlReqButton)}
              onClick={pasteFromClipboard}
            >
              <span className="i-mdi-clipboard-text-outline" aria-hidden="true" />
              从剪贴板粘贴
            </button>
            <button
              type="button"
              className={clsx(classes.curlReqButton)}
              onClick={() => sourceFileInputRef.current?.click()}
            >
              <span className="i-mdi-file-import-outline" aria-hidden="true" />
              导入文件
            </button>
            <button
              type="button"
              className={clsx(classes.curlReqButton)}
              onClick={fillExample}
            >
              <span className="i-mdi-flask-outline" aria-hidden="true" />
              示例命令
            </button>
            <button
              type="button"
              className={clsx(classes.curlReqButton)}
              onClick={clearAll}
            >
              <span className="i-mdi-delete-outline" aria-hidden="true" />
              清空
            </button>
          </div>
        </div>

        <div className={clsx(classes.curlReqMetaStrip)}>
          <span className={clsx(classes.curlReqMeta)}>
            运行环境: {currentTarget.runtime}
          </span>
          <span className={clsx(classes.curlReqMeta)}>
            依赖: {currentTarget.dependency}
          </span>
          <span className={clsx(classes.curlReqMeta)}>
            默认文件名: {currentTarget.outputFileName}
          </span>
          <span className={clsx(classes.curlReqMeta)}>warnings: {warningCount}</span>
        </div>

        {errorMessage && (
          <p className={clsx(classes.curlReqError)}>
            <span className="i-mdi-alert-circle-outline" aria-hidden="true" />
            {errorMessage}
          </p>
        )}
      </section>

      <section className={clsx(classes.curlReqPanel, classes.curlReqWorkbench)}>
        <div className={clsx(classes.curlReqActionBar)}>
          <div className={clsx(classes.curlReqActionCopy)}>
            <span className={clsx(classes.curlReqActionTitle)}>工作区</span>
            <span className={clsx(classes.curlReqActionHint)}>
              左侧粘贴 cURL，右侧查看生成结果；切换目标语言后可再次转换。
            </span>
          </div>

          <div className={clsx(classes.curlReqActionButtons)}>
            <button
              type="button"
              className={clsx(classes.curlReqButton)}
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
              className={clsx(classes.curlReqButton)}
              onClick={downloadOutput}
              disabled={!outputCode}
            >
              <span className="i-mdi-download" aria-hidden="true" />
              下载结果
            </button>
          </div>
        </div>

        <div className={clsx(classes.curlReqEditors)}>
          <article className={clsx(classes.curlReqEditorCard)}>
            <div className={clsx(classes.curlReqEditorHead)}>
              <div>
                <h2>cURL 输入</h2>
                <p>支持单行或 Bash 风格多行命令；常见 prompt 会自动清理。</p>
              </div>
              <span className={clsx(classes.curlReqMeta)}>行数: {inputLineCount}</span>
            </div>

            <CodeEditor
              value={state.curlCommand}
              onChange={(value) => updateState({ curlCommand: value })}
              minHeight="24rem"
              language="plain"
            />
          </article>

          <article className={clsx(classes.curlReqEditorCard)}>
            <div className={clsx(classes.curlReqEditorHead)}>
              <div>
                <h2>生成结果</h2>
                <p>{currentTarget.label} 格式，可直接复制使用或在此基础上继续修改。</p>
              </div>
              <span className={clsx(classes.curlReqMeta)}>行数: {outputLineCount}</span>
            </div>

            <CodeEditor value={outputCode} readOnly minHeight="24rem" language="plain" />
          </article>
        </div>
      </section>

      <section className={clsx(classes.curlReqInfoGrid)}>
        <article className={clsx(classes.curlReqPanel, classes.curlReqInfoCard)}>
          <div className={clsx(classes.curlReqSectionHead)}>
            <h2>转换告警</h2>
            <p>这里展示转换过程中的注意事项，方便你判断生成的代码是否需要进一步调整。</p>
          </div>

          {warnings.length ? (
            <ul className={clsx(classes.curlReqWarningList)}>
              {warnings.map((warning, index) => (
                <li key={`${warning[0]}-${warning[1]}-${index}`}>
                  <strong>{formatWarningCode(warning[0])}</strong>
                  <span>{warning[1]}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={clsx(classes.curlReqEmpty)}>
              当前没有注意事项；生成结果已尽量还原原始请求，建议在实际使用前简单验证一下。
            </p>
          )}
        </article>

        <article className={clsx(classes.curlReqPanel, classes.curlReqInfoCard)}>
          <div className={clsx(classes.curlReqSectionHead)}>
            <h2>边界说明</h2>
            <p>这个工具对常见输入格式和跨平台差异做了额外适配，下面是一些使用说明。</p>
          </div>

          <ul className={clsx(classes.curlReqNoteList)}>
            {pageNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  )
}

export default CurlToCodePage
