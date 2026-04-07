import type { Options } from '@revjs/js-deob'
import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { AppCheckbox } from '@/components/ui/app-checkbox'
import { AppSelect, type AppSelectOption } from '@/components/ui/app-select'
import { CodeEditor } from '@/components/ui/code-editor'
import JsDeobWorker from './js-deob.worker?worker'
import JsFormatWorker from './js-format.worker?worker'
import JsMinifyWorker from './js-minify.worker?worker'
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

function readStoredCode() {
  if (typeof window === 'undefined') return ''

  return window.localStorage.getItem(storageKeys.code) ?? ''
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

const exampleCode = [
  'var _0x5a2b = ["log", "Hello RevJS"];',
  'function _0x1c2d(index) {',
  '  return _0x5a2b[index];',
  '}',
  'function run() {',
  '  console[_0x1c2d(0)](_0x1c2d(1));',
  '}',
  'run();',
].join('\n')

// Persistent singleton workers — pre-spawned on page load so modules are already
// loaded by the time the user first triggers a format / minify operation.
let formatWorkerSingleton: Worker | null = null
let minifyWorkerSingleton: Worker | null = null

function getFormatWorker(): Worker {
  if (!formatWorkerSingleton) {
    formatWorkerSingleton = new JsFormatWorker()
    formatWorkerSingleton.onerror = () => {
      formatWorkerSingleton = null
    }
  }
  return formatWorkerSingleton
}

function getMinifyWorker(): Worker {
  if (!minifyWorkerSingleton) {
    minifyWorkerSingleton = new JsMinifyWorker()
    minifyWorkerSingleton.onerror = () => {
      minifyWorkerSingleton = null
    }
  }
  return minifyWorkerSingleton
}

function formatSourceWithWorker(code: string) {
  return new Promise<string>((resolve, reject) => {
    const worker = getFormatWorker()

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

function minifyOutputWithWorker(code: string) {
  return new Promise<string>((resolve, reject) => {
    const worker = getMinifyWorker()

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
    // Pre-spawn format / minify workers so their modules are already loaded
    // when the user first triggers those operations.
    getFormatWorker()
    getMinifyWorker()
    toast.success('工具已就绪', { id: 'deob-workers-ready', duration: 2500 })

    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.code, sourceCode)
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

    setIsFormatting(true)
    setErrorMessage('')

    try {
      const formatted = await formatSourceWithWorker(sourceCode)

      startTransition(() => {
        setSourceCode(formatted)
      })

      pushLog(`已格式化输入代码 | ${sourceCode.length} -> ${formatted.length} 字符`)
    } catch (error) {
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

    setIsMinifying(true)
    setErrorMessage('')

    try {
      const minified = await minifyOutputWithWorker(outputCode)

      startTransition(() => {
        setOutputCode(minified)
      })

      pushLog(`已压缩处理结果 | ${outputCode.length} -> ${minified.length} 字符`)
    } catch (error) {
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

  function fillExample() {
    setSourceCode(exampleCode)
    setErrorMessage('')
    pushLog('已填充示例代码。')
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
      <div className={clsx(classes.jsDeobShell)}>
        <input
          ref={sourceFileInputRef}
          type="file"
          accept=".js,.mjs,.cjs,.txt,text/javascript,application/javascript"
          className={clsx(classes.jsDeobHiddenInput)}
          onChange={importSourceFile}
        />

        <section className={clsx(classes.jsDeobPanel, classes.jsDeobHero)}>
          <div className={clsx(classes.jsDeobHeroMain)}>
            <span className={clsx(classes.jsDeobKicker)}>
              <span className="i-mdi-code-json text-[15px]" aria-hidden="true" />
              在线解混淆
            </span>

            <div className={clsx(classes.jsDeobTitleRow)}>
              <h1 className={clsx(classes.jsDeobTitle)}>JS Deob</h1>
              <span className={clsx(classes.jsDeobStatusBadge)} data-running={isRunning}>
                <span
                  className={
                    isRunning
                      ? 'i-mdi-loading animate-spin'
                      : 'i-mdi-check-circle-outline'
                  }
                  aria-hidden="true"
                />
                {isRunning ? '处理中' : '已就绪'}
              </span>
            </div>

            <p className={clsx(classes.jsDeobCopy)}>
              直接粘贴待处理的
              JavaScript，调整识别方式后运行，即可查看整理后的结果和日志。
            </p>

            <div className={clsx(classes.jsDeobHighlights)}>
              <span>适合常见混淆样本</span>
              <span>支持自定义注入代码</span>
              <span>输出与日志分区查看</span>
            </div>
          </div>
        </section>

        <section className={clsx(classes.jsDeobGrid)}>
          <aside className={clsx(classes.jsDeobSidebar)}>
            <div className={clsx(classes.jsDeobPanel, classes.jsDeobSection)}>
              <div className={clsx(classes.jsDeobSectionHead)}>
                <h2 className={clsx(classes.jsDeobSectionTitle)}>处理选项</h2>
                <p className={clsx(classes.jsDeobSectionCopy)}>
                  调整识别方式和输出参数，以适配不同混淆样本。
                </p>
              </div>

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
                    <div className={clsx(classes.jsDeobField)}>
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
                  <span className={clsx(classes.jsDeobFieldLabel)}>关键字标记</span>
                  <AppCheckbox
                    checked={options.isMarkEnable}
                    label="标记常见关键字"
                    description="帮助快速查看 debugger、签名或环境检测相关片段。"
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
              </div>
            </div>

            <div
              className={clsx(
                classes.jsDeobPanel,
                classes.jsDeobSection,
                classes.jsDeobTips,
              )}
            >
              <div className={clsx(classes.jsDeobSectionHead)}>
                <h2 className={clsx(classes.jsDeobSectionTitle)}>使用建议</h2>
                <p className={clsx(classes.jsDeobSectionCopy)}>
                  不确定怎么选时，可以从这里开始。
                </p>
              </div>
              <ul className={clsx(classes.jsDeobSideNotes)}>
                <li>先试字符串数组定位模式，常见样本通常可以直接命中。</li>
                <li>已知解密调用规模时，再切到调用次数模式。</li>
                <li>处理结果回填后再继续运行，便于逐步清理多层混淆。</li>
              </ul>
            </div>
          </aside>

          <section className={clsx(classes.jsDeobWorkbench)}>
            <div className={clsx(classes.jsDeobEditorsGrid)}>
              <div className={clsx(classes.jsDeobPanel, classes.jsDeobSection)}>
                <div className={clsx(classes.jsDeobEditorHead)}>
                  <div>
                    <h2 className={clsx(classes.jsDeobSectionTitle)}>原始代码</h2>
                    <p>把需要处理的 JavaScript 直接贴进来。</p>
                    <span className={clsx(classes.jsDeobEditorMeta)}>
                      {sourceCode.length} 字符 · {sourceLineCount} 行
                    </span>
                  </div>

                  <div className={clsx(classes.jsDeobEditorActions)}>
                    <button
                      type="button"
                      className={clsx(classes.jsDeobButton, classes.jsDeobButtonPrimary)}
                      onClick={runDeobfuscation}
                      disabled={isRunning || isFormatting || isMinifying}
                    >
                      <span
                        className={
                          isRunning
                            ? 'i-mdi-loading animate-spin'
                            : 'i-mdi-play-circle-outline'
                        }
                        aria-hidden="true"
                      />
                      {isRunning ? '处理中...' : '开始处理'}
                    </button>
                    <button
                      type="button"
                      className={clsx(classes.jsDeobButton)}
                      onClick={cancelDeobfuscation}
                      disabled={!isRunning}
                    >
                      <span className="i-mdi-stop-circle-outline" aria-hidden="true" />
                      停止
                    </button>
                    <button
                      type="button"
                      className={clsx(classes.jsDeobButton)}
                      onClick={resetAll}
                    >
                      <span className="i-mdi-refresh" aria-hidden="true" />
                      清空重来
                    </button>
                    <button
                      type="button"
                      className={clsx(classes.jsDeobInlineAction)}
                      onClick={formatSourceCode}
                      disabled={isRunning || isFormatting || !sourceCode.trim()}
                    >
                      <span
                        className={
                          isFormatting
                            ? 'i-mdi-loading animate-spin'
                            : 'i-mdi-format-align-left'
                        }
                        aria-hidden="true"
                      />
                      {isFormatting ? '格式化中...' : '格式化输入'}
                    </button>
                    <button
                      type="button"
                      className={clsx(classes.jsDeobInlineAction)}
                      onClick={() => sourceFileInputRef.current?.click()}
                    >
                      <span className="i-mdi-file-upload-outline" aria-hidden="true" />
                      导入文件
                    </button>
                    <button
                      type="button"
                      className={clsx(classes.jsDeobInlineAction)}
                      onClick={pasteFromClipboard}
                    >
                      <span
                        className="i-mdi-clipboard-arrow-down-outline"
                        aria-hidden="true"
                      />
                      粘贴剪贴板
                    </button>
                    <button
                      type="button"
                      className={clsx(classes.jsDeobInlineAction)}
                      onClick={fillExample}
                    >
                      <span className="i-mdi-flask-outline" aria-hidden="true" />
                      填充示例
                    </button>
                  </div>
                </div>

                <CodeEditor value={sourceCode} onChange={setSourceCode} />
              </div>

              <div className={clsx(classes.jsDeobPanel, classes.jsDeobSection)}>
                <div className={clsx(classes.jsDeobEditorHead)}>
                  <div>
                    <h2 className={clsx(classes.jsDeobSectionTitle)}>处理结果</h2>
                    <p>执行完成后会在这里显示整理后的输出。</p>
                    <span className={clsx(classes.jsDeobEditorMeta)}>
                      {outputCode.length} 字符 · {outputLineCount} 行
                    </span>
                  </div>

                  <div className={clsx(classes.jsDeobEditorActions)}>
                    <button
                      type="button"
                      className={clsx(classes.jsDeobInlineAction)}
                      onClick={copyOutput}
                      disabled={!outputCode}
                    >
                      <span className="i-mdi-content-copy" aria-hidden="true" />
                      {copyState === 'done'
                        ? '已复制结果'
                        : copyState === 'failed'
                          ? '复制失败'
                          : '复制输出'}
                    </button>
                    <button
                      type="button"
                      className={clsx(classes.jsDeobInlineAction)}
                      onClick={downloadOutput}
                      disabled={!outputCode}
                    >
                      <span className="i-mdi-download" aria-hidden="true" />
                      下载结果
                    </button>
                    <button
                      type="button"
                      className={clsx(classes.jsDeobInlineAction)}
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
                    </button>
                    <button
                      type="button"
                      className={clsx(classes.jsDeobInlineAction)}
                      onClick={applyOutputToInput}
                      disabled={!outputCode}
                    >
                      <span className="i-mdi-swap-horizontal" aria-hidden="true" />
                      回填输入
                    </button>
                  </div>
                </div>

                {errorMessage ? (
                  <div className={clsx(classes.jsDeobError)}>{errorMessage}</div>
                ) : (
                  <div className={clsx(classes.jsDeobNote)}>
                    {parseTime === null
                      ? '还没有结果，点击“开始处理”后会在这里更新。'
                      : `最近一次处理耗时 ${parseTime} ms。`}
                  </div>
                )}

                <CodeEditor readOnly value={outputCode} />
              </div>
            </div>

            <div className={clsx(classes.jsDeobPanel, classes.jsDeobSection)}>
              <div className={clsx(classes.jsDeobEditorHead)}>
                <div>
                  <h2 className={clsx(classes.jsDeobSectionTitle)}>运行日志</h2>
                  <p>处理过程中的提示和错误会按时间顺序显示在这里。</p>
                </div>
                <button
                  type="button"
                  className={clsx(classes.jsDeobInlineAction)}
                  onClick={clearLogs}
                  disabled={!logs.length}
                >
                  <span className="i-mdi-delete-outline" aria-hidden="true" />
                  清空日志
                </button>
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
                    开始处理后，这里会实时出现日志。
                  </div>
                )}
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}

export default JsDeobPage
