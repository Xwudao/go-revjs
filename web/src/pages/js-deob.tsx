import type { Options } from '@revjs/js-deob'
import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate'
import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { AppCheckbox } from '@/components/ui/app-checkbox'
import { AppSelect, type AppSelectOption } from '@/components/ui/app-select'
import { CodeEditor } from '@/components/ui/code-editor'
import { ToolbarButton, ToolbarDivider } from '@/components/ui/toolbar-button'
import JsDeobWorker from './js-deob.worker?worker'
import classes from './js-deob.module.scss'

type EditableOptions = Required<Omit<Options, 'sandbox'>>

interface ConsoleEntry {
  id: number
  message: string
  timestamp: number
}

type WorkerMessage =
  | { type: 'log'; message: string; timestamp: number }
  | { type: 'result'; code: string; parseTime: number }
  | { type: 'error'; message: string; timestamp?: number }

type FormatWorkerResponse =
  | { type: 'formatted'; code: string }
  | { type: 'error'; message: string }

type MinifyWorkerResponse =
  | { type: 'minified'; code: string }
  | { type: 'error'; message: string }

const maxLogs = 200

const storageKeys = {
  code: 'revjs:js-deob:code',
  options: 'revjs:js-deob:options',
} as const

const defaultOptions: EditableOptions = {
  decoderLocationMethod: 'stringArray',
  decoderStringArrayLength: 0,
  decoderCallCount: 150,
  setupCode: '',
  decoderNames: '',
  isMarkEnable: true,
  keywords: ['debugger'],
  mangleMode: 'off',
  manglePattern: '',
  mangleFlags: '',
}

const decoderMethodOptions: AppSelectOption<EditableOptions['decoderLocationMethod']>[] =
  [
    {
      value: 'stringArray',
      label: '字符串数组定位',
      description: '自动按字符串数组特征定位，不再手动输入数组长度。',
    },
    {
      value: 'callCount',
      label: '解密函数调用次数',
      description: '适合已知调用规模的样本，按调用次数定位。',
    },
    {
      value: 'evalCode',
      label: '注入自定义代码',
      description: '需要手动补环境或补函数时使用。',
    },
  ]

const mangleModeOptions: AppSelectOption<EditableOptions['mangleMode']>[] = [
  { value: 'off', label: '关闭', description: '保留原始变量名。' },
  { value: 'hex', label: 'Hex (_0x)', description: '优先优化典型十六进制风格变量名。' },
  { value: 'short', label: '短变量名', description: '优化较短的临时变量名。' },
  { value: 'all', label: '全部变量', description: '尽量统一优化变量名。' },
  {
    value: 'custom',
    label: '自定义正则',
    description: '按自定义正则匹配需要优化的变量。',
  },
]

const STORAGE_COMPRESS_PREFIX = 'z:'

function compressToStorage(str: string): string {
  try {
    const compressed = deflateSync(strToU8(str))
    let binary = ''
    for (let i = 0; i < compressed.length; i++) {
      binary += String.fromCharCode(compressed[i])
    }
    return STORAGE_COMPRESS_PREFIX + btoa(binary)
  } catch {
    return str
  }
}

function decompressFromStorage(data: string): string {
  if (!data.startsWith(STORAGE_COMPRESS_PREFIX)) return data
  try {
    const binary = atob(data.slice(STORAGE_COMPRESS_PREFIX.length))
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    return strFromU8(inflateSync(bytes))
  } catch {
    return data
  }
}

function readStoredCode() {
  if (typeof window === 'undefined') return ''

  const raw = window.localStorage.getItem(storageKeys.code) ?? ''
  return decompressFromStorage(raw)
}

function readStoredOptions(): EditableOptions {
  if (typeof window === 'undefined') return defaultOptions

  const raw = window.localStorage.getItem(storageKeys.options)

  if (!raw) return defaultOptions

  try {
    const parsed = JSON.parse(raw) as Partial<EditableOptions> & { mangle?: boolean }
    const merged = {
      ...defaultOptions,
      ...parsed,
    }

    if (!merged.mangleMode && typeof parsed.mangle === 'boolean') {
      merged.mangleMode = parsed.mangle ? 'all' : 'off'
    }

    merged.keywords = Array.isArray(merged.keywords)
      ? merged.keywords.filter(Boolean)
      : defaultOptions.keywords

    return merged
  } catch {
    return defaultOptions
  }
}

function formatKeywords(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatLogTime(timestamp: number) {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  const milliseconds = date.getMilliseconds().toString().padStart(3, '0')

  return `${hours}:${minutes}:${seconds}.${milliseconds}`
}

// Singleton workers — created on first use (lazy).
let formatWorkerSingleton: Worker | null = null
let minifyWorkerSingleton: Worker | null = null

async function getFormatWorker(): Promise<Worker> {
  if (!formatWorkerSingleton) {
    const { default: JsFormatWorker } = await import('./js-format.worker?worker')
    formatWorkerSingleton = new JsFormatWorker()
    formatWorkerSingleton.onerror = () => {
      formatWorkerSingleton = null
    }
  }
  return formatWorkerSingleton
}

async function getMinifyWorker(): Promise<Worker> {
  if (!minifyWorkerSingleton) {
    const { default: JsMinifyWorker } = await import('./js-minify.worker?worker')
    minifyWorkerSingleton = new JsMinifyWorker()
    minifyWorkerSingleton.onerror = () => {
      minifyWorkerSingleton = null
    }
  }
  return minifyWorkerSingleton
}

async function formatSourceWithWorker(code: string) {
  const worker = await getFormatWorker()

  return new Promise<string>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<FormatWorkerResponse>) => {
      if (event.data.type === 'formatted') {
        resolve(event.data.code)
        return
      }

      formatWorkerSingleton = null
      reject(new Error(event.data.message))
    }

    worker.onerror = () => {
      formatWorkerSingleton = null
      reject(new Error('格式化失败，请检查输入代码是否完整。'))
    }

    worker.postMessage({ code })
  })
}

async function minifyOutputWithWorker(code: string) {
  const worker = await getMinifyWorker()

  return new Promise<string>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<MinifyWorkerResponse>) => {
      if (event.data.type === 'minified') {
        resolve(event.data.code)
        return
      }

      minifyWorkerSingleton = null
      reject(new Error(event.data.message))
    }

    worker.onerror = () => {
      minifyWorkerSingleton = null
      reject(new Error('压缩失败，请稍后重试。'))
    }

    worker.postMessage({ code })
  })
}

function JsDeobPage() {
  const workerRef = useRef<Worker | null>(null)
  const spawnWorkerRef = useRef<() => void>(() => {})
  const consoleBodyRef = useRef<HTMLDivElement | null>(null)
  const sourceFileInputRef = useRef<HTMLInputElement | null>(null)
  const [sourceCode, setSourceCode] = useState(readStoredCode)
  const [outputCode, setOutputCode] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [parseTime, setParseTime] = useState<number | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isFormatting, setIsFormatting] = useState(false)
  const [isMinifying, setIsMinifying] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'failed'>('idle')
  const [logs, setLogs] = useState<ConsoleEntry[]>([])
  const [options, setOptions] = useState<EditableOptions>(readStoredOptions)
  const optionsRef = useRef(options)

  const keywordsValue = useMemo(() => options.keywords.join(', '), [options.keywords])

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  function pushLog(message: string, timestamp = Date.now()) {
    setLogs((current) => [
      ...current.slice(-(maxLogs - 1)),
      {
        id: timestamp + Math.random(),
        message,
        timestamp,
      },
    ])
  }

  function handleWorkerError(message: string, timestamp = Date.now()) {
    pushLog(message, timestamp)
    setErrorMessage(message)
    setIsRunning(false)
  }

  spawnWorkerRef.current = () => {
    workerRef.current?.terminate()

    const worker = new JsDeobWorker()
    workerRef.current = worker

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data

      if (message.type === 'log') {
        pushLog(message.message, message.timestamp)
        return
      }

      if (message.type === 'result') {
        pushLog(
          `处理完成，用时 ${message.parseTime} ms | 方式: ${optionsRef.current.decoderLocationMethod}`,
        )
        startTransition(() => {
          setOutputCode(message.code)
          setParseTime(message.parseTime)
          setErrorMessage('')
          setIsRunning(false)
        })
        return
      }

      handleWorkerError(message.message, message.timestamp)
    }

    worker.onerror = () => {
      handleWorkerError('执行失败，请稍后重试或检查输入代码。')
    }
  }

  useEffect(() => {
    spawnWorkerRef.current()

    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.code, compressToStorage(sourceCode))
  }, [sourceCode])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.options, JSON.stringify(options))
  }, [options])

  useEffect(() => {
    if (copyState === 'idle') return

    const timer = window.setTimeout(() => setCopyState('idle'), 1800)
    return () => window.clearTimeout(timer)
  }, [copyState])

  useEffect(() => {
    const container = consoleBodyRef.current

    if (!container) return

    container.scrollTo({ top: container.scrollHeight })
  }, [logs])

  function updateOptions(patch: Partial<EditableOptions>) {
    setOptions((current) => ({
      ...current,
      ...patch,
    }))
  }

  function runDeobfuscation() {
    const trimmedCode = sourceCode.trim()

    if (!trimmedCode) {
      setErrorMessage('请先输入要处理的 JS 代码。')
      setOutputCode('')
      setParseTime(null)
      return
    }

    setIsRunning(true)
    setErrorMessage('')
    setParseTime(null)
    setLogs([])

    pushLog(`开始处理 | 方式: ${options.decoderLocationMethod}`)

    if (!workerRef.current) {
      spawnWorkerRef.current()
    }

    workerRef.current?.postMessage({
      code: trimmedCode,
      options: JSON.parse(JSON.stringify(options)) as EditableOptions,
    })
  }

  async function formatSourceCode() {
    const trimmedCode = sourceCode.trim()

    if (!trimmedCode) {
      setErrorMessage('请先输入要格式化的 JS 代码。')
      return
    }

    const isFirstLoad = formatWorkerSingleton === null
    if (isFirstLoad) {
      toast('正在加载格式化模块，初次稍候片刻…', { id: 'format-init', duration: 8000 })
    }

    setIsFormatting(true)
    setErrorMessage('')

    try {
      const formatted = await formatSourceWithWorker(sourceCode)

      if (isFirstLoad) toast.dismiss('format-init')

      startTransition(() => {
        setSourceCode(formatted)
      })

      pushLog(`已格式化输入代码 | ${sourceCode.length} -> ${formatted.length} 字符`)
    } catch (error) {
      if (isFirstLoad) toast.dismiss('format-init')
      const message =
        error instanceof Error ? error.message : '格式化失败，请检查输入代码。'
      setErrorMessage(message)
      pushLog(`格式化失败 | ${message}`)
    } finally {
      setIsFormatting(false)
    }
  }

  async function minifyOutputCode() {
    const trimmedCode = outputCode.trim()

    if (!trimmedCode) {
      setErrorMessage('当前没有可压缩的处理结果。')
      return
    }

    const isFirstLoad = minifyWorkerSingleton === null
    if (isFirstLoad) {
      toast('正在加载压缩模块，初次稍候片刻…', { id: 'minify-init', duration: 8000 })
    }

    setIsMinifying(true)
    setErrorMessage('')

    try {
      const minified = await minifyOutputWithWorker(outputCode)

      if (isFirstLoad) toast.dismiss('minify-init')

      startTransition(() => {
        setOutputCode(minified)
      })

      pushLog(`已压缩处理结果 | ${outputCode.length} -> ${minified.length} 字符`)
    } catch (error) {
      if (isFirstLoad) toast.dismiss('minify-init')
      const message =
        error instanceof Error ? error.message : '压缩失败，请检查处理结果。'
      setErrorMessage(message)
      pushLog(`压缩失败 | ${message}`)
    } finally {
      setIsMinifying(false)
    }
  }

  function cancelDeobfuscation() {
    if (!isRunning) return

    spawnWorkerRef.current()
    setIsRunning(false)
    setErrorMessage('已停止当前任务。')
    pushLog('已停止当前任务。')
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

  function resetAll() {
    setSourceCode('')
    setOutputCode('')
    setErrorMessage('')
    setParseTime(null)
    setLogs([])
    setOptions(defaultOptions)
    window.localStorage.removeItem(storageKeys.code)
    window.localStorage.removeItem(storageKeys.options)
  }

  function clearLogs() {
    setLogs([])
  }

  async function importSourceFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) return

    try {
      const text = await file.text()
      setSourceCode(text)
      setErrorMessage('')
      pushLog(`已导入文件: ${file.name} (${text.length} 字符)`)
    } catch {
      setErrorMessage('导入文件失败，请重新选择后再试。')
    } finally {
      event.target.value = ''
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText()

      if (!text.trim()) {
        toast.error('剪贴板里没有可用内容')
        return
      }

      setSourceCode(text)
      setErrorMessage('')
      pushLog(`已从剪贴板载入 ${text.length} 字符`)
      toast.success(`已从剪贴板载入 ${text.length} 字符`)
    } catch {
      toast.error('读取剪贴板失败，请检查浏览器权限')
    }
  }

  function applyOutputToInput() {
    if (!outputCode) return

    setSourceCode(outputCode)
    setErrorMessage('')
    pushLog('已将处理结果回填到输入区。')
  }

  function downloadOutput() {
    if (!outputCode) return

    const blob = new Blob([outputCode], { type: 'text/javascript;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = url
    anchor.download = 'revjs-output.js'
    anchor.click()

    window.URL.revokeObjectURL(url)
    pushLog('已下载处理结果。')
  }

  const sourceLineCount = useMemo(
    () => (sourceCode ? sourceCode.split(/\r?\n/).length : 0),
    [sourceCode],
  )
  const outputLineCount = useMemo(
    () => (outputCode ? outputCode.split(/\r?\n/).length : 0),
    [outputCode],
  )

  return (
    <main className={clsx(classes.jsDeobPage)}>
      <input
        ref={sourceFileInputRef}
        type="file"
        accept=".js,.mjs,.cjs,.txt,text/javascript,application/javascript"
        className={clsx(classes.jsDeobHiddenInput)}
        onChange={importSourceFile}
      />

      {/* ── Top toolbar ── */}
      <div className={clsx(classes.jsDeobPanel, classes.jsDeobToolbar)}>
        <div className={clsx(classes.jsDeobToolbarLeft)}>
          <span className={clsx(classes.jsDeobBrand)}>
            <span className="i-mdi-code-json" aria-hidden="true" />
            JS Deob
          </span>
          <span className={clsx(classes.jsDeobStatusBadge)} data-running={isRunning}>
            <span
              className={
                isRunning ? 'i-mdi-loading animate-spin' : 'i-mdi-check-circle-outline'
              }
              aria-hidden="true"
            />
            {isRunning ? '处理中' : '已就绪'}
          </span>
        </div>

        <div className={clsx(classes.jsDeobToolbarActions)}>
          {/* Primary: run / stop */}
          <ToolbarButton
            variant="primary"
            onClick={runDeobfuscation}
            disabled={isRunning || isFormatting || isMinifying}
          >
            <span
              className={
                isRunning ? 'i-mdi-loading animate-spin' : 'i-mdi-play-circle-outline'
              }
              aria-hidden="true"
            />
            {isRunning ? '处理中...' : '开始处理'}
          </ToolbarButton>
          <ToolbarButton onClick={cancelDeobfuscation} disabled={!isRunning}>
            <span className="i-mdi-stop-circle-outline" aria-hidden="true" />
            停止
          </ToolbarButton>

          <ToolbarDivider />

          {/* Source actions */}
          <ToolbarButton
            onClick={formatSourceCode}
            disabled={isRunning || isFormatting || !sourceCode.trim()}
          >
            <span
              className={
                isFormatting ? 'i-mdi-loading animate-spin' : 'i-mdi-format-align-left'
              }
              aria-hidden="true"
            />
            {isFormatting ? '格式化中...' : '格式化'}
          </ToolbarButton>
          <ToolbarButton onClick={() => sourceFileInputRef.current?.click()}>
            <span className="i-mdi-file-upload-outline" aria-hidden="true" />
            导入
          </ToolbarButton>
          <ToolbarButton onClick={pasteFromClipboard}>
            <span className="i-mdi-clipboard-arrow-down-outline" aria-hidden="true" />
            粘贴
          </ToolbarButton>

          <ToolbarDivider />

          {/* Output actions */}
          <ToolbarButton
            onClick={minifyOutputCode}
            disabled={!outputCode || isMinifying || isRunning}
          >
            <span
              className={
                isMinifying
                  ? 'i-mdi-loading animate-spin'
                  : 'i-mdi-arrow-collapse-horizontal'
              }
              aria-hidden="true"
            />
            {isMinifying ? '压缩中...' : '压缩输出'}
          </ToolbarButton>
          <ToolbarButton onClick={applyOutputToInput} disabled={!outputCode}>
            <span className="i-mdi-swap-horizontal" aria-hidden="true" />
            回填输入
          </ToolbarButton>
          <ToolbarButton onClick={copyOutput} disabled={!outputCode}>
            <span className="i-mdi-content-copy" aria-hidden="true" />
            {copyState === 'done' ? '已复制' : copyState === 'failed' ? '失败' : '复制输出'}
          </ToolbarButton>
          <ToolbarButton onClick={downloadOutput} disabled={!outputCode}>
            <span className="i-mdi-download" aria-hidden="true" />
            下载
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton onClick={resetAll}>
            <span className="i-mdi-refresh" aria-hidden="true" />
            重置
          </ToolbarButton>
        </div>
      </div>

      {/* ── Editors ── */}
      <div className={clsx(classes.jsDeobEditorsGrid)}>
        <div className={clsx(classes.jsDeobPanel, classes.jsDeobSection)}>
          <div className={clsx(classes.jsDeobEditorHead)}>
            <h2 className={clsx(classes.jsDeobSectionTitle)}>原始代码</h2>
            <span className={clsx(classes.jsDeobEditorMeta)}>
              {sourceCode.length} 字符 · {sourceLineCount} 行
            </span>
          </div>
          <CodeEditor value={sourceCode} onChange={setSourceCode} />
        </div>

        <div className={clsx(classes.jsDeobPanel, classes.jsDeobSection)}>
          <div className={clsx(classes.jsDeobEditorHead)}>
            <h2 className={clsx(classes.jsDeobSectionTitle)}>处理结果</h2>
            <span className={clsx(classes.jsDeobEditorMeta)}>
              {outputCode.length} 字符 · {outputLineCount} 行
            </span>
          </div>
          {errorMessage ? (
            <div className={clsx(classes.jsDeobError)}>{errorMessage}</div>
          ) : (
            <div className={clsx(classes.jsDeobNote)}>
              {parseTime === null
                ? '运行后结果会在这里出现'
                : `处理耗时 ${parseTime} ms`}
            </div>
          )}
          <CodeEditor readOnly value={outputCode} />
        </div>
      </div>

      {/* ── Options + Log ── */}
      <div className={clsx(classes.jsDeobBottomRow)}>
        {/* Options panel */}
        <div
          className={clsx(
            classes.jsDeobPanel,
            classes.jsDeobSection,
            classes.jsDeobOptions,
          )}
        >
          <h2 className={clsx(classes.jsDeobSectionTitle)}>处理选项</h2>

          <div className={clsx(classes.jsDeobForm)}>
            <div className={clsx(classes.jsDeobField)}>
              <span className={clsx(classes.jsDeobFieldLabel)}>识别方式</span>
              <AppSelect
                value={options.decoderLocationMethod}
                options={decoderMethodOptions}
                ariaLabel="选择识别方式"
                onChange={(value) => updateOptions({ decoderLocationMethod: value })}
              />
            </div>

            {options.decoderLocationMethod === 'callCount' && (
              <div className={clsx(classes.jsDeobField)}>
                <label
                  className={clsx(classes.jsDeobFieldLabel)}
                  htmlFor="decoder-call-count"
                >
                  调用次数
                </label>
                <input
                  id="decoder-call-count"
                  className={clsx(classes.jsDeobInput)}
                  type="number"
                  min="1"
                  step="1"
                  value={options.decoderCallCount}
                  onChange={(event) =>
                    updateOptions({
                      decoderCallCount:
                        Number(event.target.value) || defaultOptions.decoderCallCount,
                    })
                  }
                />
              </div>
            )}

            {options.decoderLocationMethod === 'evalCode' && (
              <>
                <div className={clsx(classes.jsDeobField)}>
                  <label
                    className={clsx(classes.jsDeobFieldLabel)}
                    htmlFor="decoder-names"
                  >
                    解密函数名
                  </label>
                  <input
                    id="decoder-names"
                    className={clsx(classes.jsDeobInput)}
                    type="text"
                    value={
                      typeof options.decoderNames === 'string'
                        ? options.decoderNames
                        : options.decoderNames.join(', ')
                    }
                    placeholder="例如: _0xabc123"
                    onChange={(event) =>
                      updateOptions({ decoderNames: event.target.value })
                    }
                  />
                </div>
                <div className={clsx(classes.jsDeobField, classes.jsDeobFieldWide)}>
                  <span className={clsx(classes.jsDeobFieldLabel)}>注入代码</span>
                  <CodeEditor
                    compact
                    minHeight="11rem"
                    value={options.setupCode}
                    onChange={(value) => updateOptions({ setupCode: value })}
                  />
                </div>
              </>
            )}

            <div className={clsx(classes.jsDeobField)}>
              <span className={clsx(classes.jsDeobFieldLabel)}>变量名优化</span>
              <AppSelect
                value={options.mangleMode}
                options={mangleModeOptions}
                ariaLabel="选择变量名优化方式"
                onChange={(value) => updateOptions({ mangleMode: value })}
              />
            </div>

            {options.mangleMode === 'custom' && (
              <>
                <div className={clsx(classes.jsDeobField)}>
                  <label
                    className={clsx(classes.jsDeobFieldLabel)}
                    htmlFor="mangle-pattern"
                  >
                    匹配正则
                  </label>
                  <input
                    id="mangle-pattern"
                    className={clsx(classes.jsDeobInput)}
                    type="text"
                    value={options.manglePattern}
                    placeholder="例如: _0x[a-f\\d]+"
                    onChange={(event) =>
                      updateOptions({ manglePattern: event.target.value })
                    }
                  />
                </div>
                <div className={clsx(classes.jsDeobField)}>
                  <label
                    className={clsx(classes.jsDeobFieldLabel)}
                    htmlFor="mangle-flags"
                  >
                    Flags
                  </label>
                  <input
                    id="mangle-flags"
                    className={clsx(classes.jsDeobInput)}
                    type="text"
                    value={options.mangleFlags}
                    placeholder="例如: gim"
                    onChange={(event) =>
                      updateOptions({ mangleFlags: event.target.value })
                    }
                  />
                </div>
              </>
            )}

            <div className={clsx(classes.jsDeobField)}>
              <span className={clsx(classes.jsDeobFieldLabel)}>关键字标记</span>
              <AppCheckbox
                checked={options.isMarkEnable}
                label="标记常见关键字"
                description="标记 debugger、签名、环境检测相关片段"
                onChange={(checked) => updateOptions({ isMarkEnable: checked })}
              />
            </div>

            {options.isMarkEnable && (
              <div className={clsx(classes.jsDeobField)}>
                <label className={clsx(classes.jsDeobFieldLabel)} htmlFor="keywords">
                  关键字列表
                </label>
                <input
                  id="keywords"
                  className={clsx(classes.jsDeobInput)}
                  type="text"
                  value={keywordsValue}
                  placeholder="debugger, sign, token"
                  onChange={(event) =>
                    updateOptions({ keywords: formatKeywords(event.target.value) })
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Log panel */}
        <div
          className={clsx(
            classes.jsDeobPanel,
            classes.jsDeobSection,
            classes.jsDeobLogPanel,
          )}
        >
          <div className={clsx(classes.jsDeobEditorHead)}>
            <h2 className={clsx(classes.jsDeobSectionTitle)}>运行日志</h2>
            <ToolbarButton onClick={clearLogs} disabled={!logs.length}>
              <span className="i-mdi-delete-outline" aria-hidden="true" />
              清空
            </ToolbarButton>
          </div>

          <div className={clsx(classes.jsDeobConsole)} ref={consoleBodyRef}>
            {logs.length ? (
              logs.map((entry) => (
                <article key={entry.id} className={clsx(classes.jsDeobConsoleEntry)}>
                  <time className={clsx(classes.jsDeobConsoleTime)}>
                    {formatLogTime(entry.timestamp)}
                  </time>
                  <pre className={clsx(classes.jsDeobConsoleMessage)}>
                    {entry.message}
                  </pre>
                </article>
              ))
            ) : (
              <div className={clsx(classes.jsDeobConsoleEmpty)}>
                运行后日志会在这里出现。
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export default JsDeobPage
