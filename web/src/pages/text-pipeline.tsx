import { useCallback, useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { SortableList } from '@/components/ui/sortable-list'
import type { PipelineFnId, PipelineResponse } from './text-pipeline.worker'
import TextPipelineWorker from './text-pipeline.worker?worker'
import classes from './text-pipeline.module.scss'

// ── Function metadata ────────────────────────────────────────────────────────

interface FnDef {
  id: PipelineFnId
  name: string
  icon: string
  category: CategoryKey
}

type CategoryKey =
  | 'lines'
  | 'case'
  | 'extract'
  | 'encode'
  | 'clean'
  | 'hash'

interface CategoryDef {
  key: CategoryKey
  label: string
}

const categories: CategoryDef[] = [
  { key: 'lines', label: '行操作' },
  { key: 'case', label: '大小写 / 命名' },
  { key: 'extract', label: '提取' },
  { key: 'encode', label: '编码 / 解码' },
  { key: 'clean', label: '清理 / 替换' },
  { key: 'hash', label: 'Hash（终态）' },
]

const fnDefs: FnDef[] = [
  // Lines
  { id: 'removeDuplicateLines', name: '去重（保序）', icon: 'i-mdi-filter-outline', category: 'lines' },
  { id: 'removeEmptyLines', name: '去空行', icon: 'i-mdi-minus', category: 'lines' },
  { id: 'trimLines', name: '每行去空格', icon: 'i-mdi-format-clear', category: 'lines' },
  { id: 'addEmptyLinesBetween', name: '行间加空行', icon: 'i-material-symbols-space-bar', category: 'lines' },
  { id: 'sortLinesAZ', name: '排序 A→Z', icon: 'i-mdi-sort-alphabetical-ascending', category: 'lines' },
  { id: 'sortLinesZA', name: '排序 Z→A', icon: 'i-mdi-sort-alphabetical-descending', category: 'lines' },
  { id: 'reverseLines', name: '翻转行顺序', icon: 'i-mdi-swap-vertical', category: 'lines' },
  { id: 'shuffleLines', name: '随机打乱行', icon: 'i-mdi-shuffle', category: 'lines' },
  { id: 'addLineNumbers', name: '行号标注', icon: 'i-mdi-format-list-numbered', category: 'lines' },
  { id: 'removeLineNumbers', name: '去行号', icon: 'i-mdi-format-list-bulleted', category: 'lines' },
  { id: 'quoteLines', name: '每行加引号', icon: 'i-mdi-format-quote-close', category: 'lines' },
  { id: 'joinLinesComma', name: '行拼接（逗号）', icon: 'i-mdi-link-variant', category: 'lines' },
  { id: 'splitByComma', name: '逗号拆行', icon: 'i-mdi-table-split-cell', category: 'lines' },
  // Case
  { id: 'uppercase', name: 'UPPERCASE', icon: 'i-mdi-format-letter-case-upper', category: 'case' },
  { id: 'lowercase', name: 'lowercase', icon: 'i-mdi-format-letter-case-lower', category: 'case' },
  { id: 'titleCase', name: 'Title Case', icon: 'i-mdi-format-letter-case', category: 'case' },
  { id: 'camelCase', name: 'camelCase', icon: 'i-mdi-format-letter-case', category: 'case' },
  { id: 'pascalCase', name: 'PascalCase', icon: 'i-mdi-format-letter-case', category: 'case' },
  { id: 'kebabCase', name: 'kebab-case', icon: 'i-mdi-minus', category: 'case' },
  { id: 'snakeCase', name: 'snake_case', icon: 'i-material-symbols-format-underlined', category: 'case' },
  { id: 'invertCase', name: '大小写互换', icon: 'i-mdi-swap-horizontal', category: 'case' },
  // Extract
  { id: 'extractEmails', name: '提取 Email', icon: 'i-mdi-email-outline', category: 'extract' },
  { id: 'extractUrls', name: '提取 URL', icon: 'i-mdi-link', category: 'extract' },
  { id: 'extractNumbers', name: '提取数字', icon: 'i-mdi-numeric', category: 'extract' },
  { id: 'extractChinese', name: '提取中文', icon: 'i-mdi-ideogram-cjk', category: 'extract' },
  { id: 'extractIPs', name: '提取 IP', icon: 'i-mdi-ip-network-outline', category: 'extract' },
  // Encode / Decode
  { id: 'base64Encode', name: 'Base64 编码', icon: 'i-mdi-arrow-up-circle-outline', category: 'encode' },
  { id: 'base64Decode', name: 'Base64 解码', icon: 'i-mdi-arrow-down-circle-outline', category: 'encode' },
  { id: 'urlEncode', name: 'URL 编码', icon: 'i-mdi-arrow-up-circle-outline', category: 'encode' },
  { id: 'urlDecode', name: 'URL 解码', icon: 'i-mdi-arrow-down-circle-outline', category: 'encode' },
  { id: 'htmlEncode', name: 'HTML 实体编码', icon: 'i-mdi-code-tags', category: 'encode' },
  { id: 'htmlDecode', name: 'HTML 实体解码', icon: 'i-mdi-code-tags', category: 'encode' },
  { id: 'hexEncode', name: 'Hex 编码', icon: 'i-mdi-hexagon-outline', category: 'encode' },
  { id: 'hexDecode', name: 'Hex 解码', icon: 'i-mdi-hexagon-outline', category: 'encode' },
  { id: 'unicodeEscape', name: 'Unicode 转义', icon: 'i-mdi-translate', category: 'encode' },
  { id: 'unicodeUnescape', name: 'Unicode 还原', icon: 'i-mdi-translate', category: 'encode' },
  // Clean
  { id: 'trimText', name: '去首尾空格', icon: 'i-mdi-format-clear', category: 'clean' },
  { id: 'removeAllSpaces', name: '去所有空格', icon: 'i-mdi-eraser-variant', category: 'clean' },
  { id: 'collapseSpaces', name: '压缩空白', icon: 'i-mdi-collapse-all-outline', category: 'clean' },
  { id: 'joinLines', name: '换行转空格', icon: 'i-mdi-wrap', category: 'clean' },
  { id: 'removeHtmlTags', name: '去 HTML 标签', icon: 'i-mdi-xml', category: 'clean' },
  { id: 'reverseString', name: '翻转字符串', icon: 'i-mdi-swap-horizontal', category: 'clean' },
  { id: 'removeNonAscii', name: '去非 ASCII', icon: 'i-mdi-alphabetical-off', category: 'clean' },
  { id: 'removePunctuation', name: '去标点符号', icon: 'i-mdi-format-clear', category: 'clean' },
  // Hash
  { id: 'md5', name: 'MD5', icon: 'i-mdi-pound', category: 'hash' },
  { id: 'sha1', name: 'SHA1', icon: 'i-mdi-pound', category: 'hash' },
  { id: 'sha256', name: 'SHA256', icon: 'i-mdi-pound', category: 'hash' },
  { id: 'sha512', name: 'SHA512', icon: 'i-mdi-pound', category: 'hash' },
]

const fnDefMap = new Map<PipelineFnId, FnDef>(fnDefs.map((f) => [f.id, f]))

// ── Pipeline step (with stable uid for React key) ────────────────────────────

interface PipelineStep {
  uid: string
  fnId: PipelineFnId
}

let uidCounter = 0
function nextUid() {
  return `step-${++uidCounter}`
}

// ── Worker singleton ─────────────────────────────────────────────────────────

let workerSingleton: Worker | null = null

function getPipelineWorker(): Worker {
  if (!workerSingleton) {
    workerSingleton = new TextPipelineWorker()
    workerSingleton.onerror = () => {
      workerSingleton = null
    }
  }
  return workerSingleton
}

function runPipelineInWorker(
  text: string,
  pipeline: PipelineFnId[],
): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = getPipelineWorker()

    worker.onmessage = (event: MessageEvent<PipelineResponse>) => {
      if (event.data.type === 'done') {
        resolve(event.data.result)
        return
      }
      workerSingleton = null
      reject(new Error(`[${event.data.failedStep}] ${event.data.message}`))
    }

    worker.onerror = () => {
      workerSingleton = null
      reject(new Error('Worker 崩溃，请刷新后重试'))
    }

    worker.postMessage({ text, pipeline })
  })
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TextPipelinePage() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [pipeline, setPipeline] = useState<PipelineStep[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const runCountRef = useRef(0)

  // Clear error when pipeline or input changes
  useEffect(() => {
    setErrorMsg('')
  }, [pipeline, input])

  function addStep(fnId: PipelineFnId) {
    setPipeline((prev) => [...prev, { uid: nextUid(), fnId }])
  }

  function removeStep(uid: string) {
    setPipeline((prev) => prev.filter((s) => s.uid !== uid))
  }

  const handleRun = useCallback(async () => {
    if (pipeline.length === 0) {
      toast('请先从左侧选择至少一个处理步骤', { icon: '💬' })
      return
    }
    if (!input) {
      toast('请先输入内容', { icon: '💬' })
      return
    }

    const runId = ++runCountRef.current
    setIsRunning(true)
    setErrorMsg('')

    try {
      const result = await runPipelineInWorker(
        input,
        pipeline.map((s) => s.fnId),
      )
      if (runId !== runCountRef.current) return
      setOutput(result)
    } catch (e) {
      if (runId !== runCountRef.current) return
      const msg = e instanceof Error ? e.message : String(e)
      setErrorMsg(msg)
      setOutput('')
    } finally {
      if (runId === runCountRef.current) setIsRunning(false)
    }
  }, [input, pipeline])

  function handleCopyOutput() {
    if (!output) {
      toast('输出为空', { icon: '💬' })
      return
    }
    navigator.clipboard.writeText(output).then(
      () => toast.success('已复制'),
      () => toast.error('复制失败'),
    )
  }

  function handleUseOutputAsInput() {
    if (!output) return
    setInput(output)
    setOutput('')
    setPipeline([])
  }

  function handleClearPipeline() {
    setPipeline([])
    setErrorMsg('')
  }

  const byCategory = categories.map((cat) => ({
    ...cat,
    fns: fnDefs.filter((f) => f.category === cat.key),
  }))

  return (
    <div className={classes.page}>
      {/* ── Hero ── */}
      <div className={clsx(classes.panel, classes.hero)}>
        <div className={classes.heroHead}>
          <span className={classes.kicker}>
            <span className="i-mdi-pipe" aria-hidden="true" />
            Pipeline
          </span>
        </div>
        <h1 className={classes.title}>文本依次处理</h1>
        <p className={classes.subtitle}>
          从左侧函数库选择步骤组成处理管道，按顺序对输入文本依次执行。Worker 后台运行，不阻塞界面。
        </p>
      </div>

      {/* ── Workbench ── */}
      <div className={clsx(classes.panel, classes.workbench)}>
        {/* ── Library ── */}
        <div className={classes.libraryPanel}>
          <div className={classes.libraryHeader}>函数库</div>
          <div className={classes.libraryScroll}>
            {byCategory.map((cat) => (
              <div key={cat.key}>
                <div className={classes.libCategory}>{cat.label}</div>
                {cat.fns.map((fn) => (
                  <button
                    key={fn.id}
                    className={classes.libItem}
                    onClick={() => addStep(fn.id)}
                    title={`添加：${fn.name}`}
                  >
                    <span className={classes.libItemLeft}>
                      <span className={fn.icon} aria-hidden="true" />
                      <span className={classes.libItemName}>{fn.name}</span>
                    </span>
                    <span className={clsx('i-mdi-plus-circle-outline', classes.libAdd)} aria-hidden="true" />
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── Pipeline ── */}
        <div className={classes.pipelinePanel}>
          <div className={classes.pipelineHeader}>
            <span>处理管道</span>
            {pipeline.length > 0 && (
              <span style={{ color: 'var(--color-accent)', fontWeight: 'var(--font-weight-semibold)' }}>
                {pipeline.length} 步
              </span>
            )}
          </div>

          <div className={classes.pipelineScroll}>
            {pipeline.length === 0 ? (
              <div className={classes.pipelineEmpty}>
                <span className="i-mdi-gesture-tap-hold" aria-hidden="true" />
                {' 从左侧函数库点击添加步骤，拖拽可排序。'}
              </div>
            ) : (
              <SortableList
                items={pipeline}
                onReorder={setPipeline}
                renderItem={(step, idx) => {
                  const def = fnDefMap.get(step.fnId)
                  return (
                    <div className={classes.pipelineStep}>
                      <span className={classes.stepNum}>{idx + 1}</span>
                      {def && (
                        <span
                          className={def.icon}
                          aria-hidden="true"
                          style={{ flexShrink: 0, fontSize: '0.85rem' }}
                        />
                      )}
                      <span className={classes.stepName}>{def?.name ?? step.fnId}</span>
                      <span className={classes.stepActions}>
                        <button
                          className={clsx(classes.stepBtn, classes.stepBtnDanger)}
                          onClick={() => removeStep(step.uid)}
                          title="删除"
                        >
                          <span className="i-mdi-close" aria-hidden="true" />
                        </button>
                      </span>
                    </div>
                  )
                }}
              />
            )}
          </div>

          <div className={classes.pipelineFooter}>
            <button
              className={classes.btnPrimary}
              onClick={handleRun}
              disabled={isRunning || pipeline.length === 0 || !input}
            >
              {isRunning ? (
                <>
                  <span className="i-mdi-loading animate-spin" aria-hidden="true" />
                  处理中…
                </>
              ) : (
                <>
                  <span className="i-mdi-play" aria-hidden="true" />
                  执行
                </>
              )}
            </button>
            <button
              className={classes.btnGhost}
              onClick={handleClearPipeline}
              disabled={pipeline.length === 0}
            >
              <span className="i-mdi-delete-sweep-outline" aria-hidden="true" />
              清空
            </button>
          </div>
        </div>

        {/* ── I/O ── */}
        <div className={classes.ioPanel}>
          {/* Input */}
          <div className={classes.ioSection}>
            <div className={classes.ioHead}>
              <div className={classes.ioHeadLeft}>
                <span className="i-mdi-pencil-outline" aria-hidden="true" />
                <span className={classes.ioLabel}>输入</span>
              </div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                {input.length} 字符
              </span>
            </div>
            <textarea
              className={classes.ioTextarea}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="在此粘贴或输入待处理文本…"
            />
          </div>

          {/* Output */}
          <div className={classes.ioSection}>
            <div className={classes.ioHead}>
              <div className={classes.ioHeadLeft}>
                <span className="i-mdi-text-box-check-outline" aria-hidden="true" />
                <span className={classes.ioLabel}>输出</span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  {output.length} 字符
                </span>
                <button className={classes.btnGhost} onClick={handleUseOutputAsInput} disabled={!output}>
                  <span className="i-mdi-arrow-left-bold-outline" aria-hidden="true" />
                  输出→输入
                </button>
                <button className={classes.btnGhost} onClick={handleCopyOutput} disabled={!output}>
                  <span className="i-mdi-content-copy" aria-hidden="true" />
                  复制
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className={classes.errorBanner}>
                <span className="i-mdi-alert-circle-outline" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <textarea
              className={classes.ioTextarea}
              value={isRunning ? '处理中…' : output}
              readOnly
              placeholder="处理结果将显示在此处…"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
