import { useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import CryptoJS from 'crypto-js'
import toast from 'react-hot-toast'
import classes from './string-tools.module.scss'

// ── Types ───────────────────────────────────────────────────────────────────

type TabKey = 'hash' | 'encode' | 'transform' | 'lines' | 'other'

interface TabDef {
  key: TabKey
  label: string
  icon: string
}

interface OpDef {
  label: string
  icon: string
  fn: (input: string) => string
}

// ── Tab definitions ─────────────────────────────────────────────────────────

const tabs: TabDef[] = [
  { key: 'hash', label: 'Hash', icon: 'i-mdi-pound' },
  { key: 'encode', label: '编码 / 解码', icon: 'i-mdi-swap-horizontal' },
  { key: 'transform', label: '文本变换', icon: 'i-mdi-format-letter-case' },
  { key: 'lines', label: '行操作', icon: 'i-mdi-format-list-bulleted' },
  { key: 'other', label: '其他', icon: 'i-mdi-dots-horizontal-circle-outline' },
]

// ── Hash definitions ────────────────────────────────────────────────────────

interface HashDef {
  label: string
  fn: (input: string) => string
}

const hashDefs: HashDef[] = [
  { label: 'MD5', fn: (s) => CryptoJS.MD5(s).toString() },
  { label: 'SHA1', fn: (s) => CryptoJS.SHA1(s).toString() },
  { label: 'SHA224', fn: (s) => CryptoJS.SHA224(s).toString() },
  { label: 'SHA256', fn: (s) => CryptoJS.SHA256(s).toString() },
  { label: 'SHA384', fn: (s) => CryptoJS.SHA384(s).toString() },
  { label: 'SHA512', fn: (s) => CryptoJS.SHA512(s).toString() },
  { label: 'SHA3-256', fn: (s) => CryptoJS.SHA3(s, { outputLength: 256 }).toString() },
  { label: 'SHA3-512', fn: (s) => CryptoJS.SHA3(s, { outputLength: 512 }).toString() },
  { label: 'RIPEMD160', fn: (s) => CryptoJS.RIPEMD160(s).toString() },
  { label: 'HmacMD5', fn: (s) => CryptoJS.HmacMD5(s, 'secret').toString() + '  (key=secret)' },
  {
    label: 'HmacSHA256',
    fn: (s) => CryptoJS.HmacSHA256(s, 'secret').toString() + '  (key=secret)',
  },
]

// ── Op definitions ──────────────────────────────────────────────────────────

function safeOp(fn: (s: string) => string): (s: string) => string {
  return (s) => {
    try {
      return fn(s)
    } catch (e) {
      return `[错误] ${e instanceof Error ? e.message : String(e)}`
    }
  }
}

function htmlEncode(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function htmlDecode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

function hexEncode(s: string): string {
  return Array.from(new TextEncoder().encode(s))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexDecode(s: string): string {
  const hex = s.replace(/\s/g, '')
  if (hex.length % 2 !== 0) throw new Error('Hex 长度必须为偶数')
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return new TextDecoder().decode(bytes)
}

function unicodeEscape(s: string): string {
  return Array.from(s)
    .map((c) => {
      const cp = c.codePointAt(0)!
      if (cp > 0xffff) {
        return `\\u{${cp.toString(16).toUpperCase()}}`
      }
      return cp > 127 || cp < 32 ? `\\u${cp.toString(16).toUpperCase().padStart(4, '0')}` : c
    })
    .join('')
}

function unicodeUnescape(s: string): string {
  return s
    .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

function toTitleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

function toCamelCase(s: string): string {
  return s
    .replace(/[-_\s]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (c) => c.toLowerCase())
}

function toPascalCase(s: string): string {
  const camel = toCamelCase(s)
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

function toSnakeCase(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase()
}

function toKebabCase(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase()
}

function jwtDecode(s: string): string {
  const parts = s.trim().split('.')
  if (parts.length < 2) throw new Error('不是有效的 JWT（需要至少两段 Base64）')
  function b64urlDecode(seg: string): string {
    const pad = (4 - (seg.length % 4)) % 4
    const b64 = seg.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad)
    return decodeURIComponent(
      Array.from(atob(b64))
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    )
  }
  const header = JSON.parse(b64urlDecode(parts[0]))
  const payload = JSON.parse(b64urlDecode(parts[1]))
  return JSON.stringify({ header, payload }, null, 2)
}

function timestampToIso(s: string): string {
  const n = Number(s.trim())
  if (Number.isNaN(n)) throw new Error('请输入数字时间戳')
  // auto-detect seconds vs milliseconds
  const ms = n > 1e12 ? n : n * 1000
  return new Date(ms).toISOString()
}

function isoToTimestamp(s: string): string {
  const d = new Date(s.trim())
  if (Number.isNaN(d.getTime())) throw new Error('无效的时间格式')
  return String(Math.floor(d.getTime() / 1000))
}

const opsByTab: Record<Exclude<TabKey, 'hash'>, OpDef[]> = {
  encode: [
    {
      label: 'URL 编码',
      icon: 'i-mdi-arrow-up-circle-outline',
      fn: safeOp(encodeURIComponent),
    },
    {
      label: 'URL 解码',
      icon: 'i-mdi-arrow-down-circle-outline',
      fn: safeOp(decodeURIComponent),
    },
    {
      label: 'Base64 编码',
      icon: 'i-mdi-arrow-up-circle-outline',
      fn: safeOp((s) => {
        const bytes = new TextEncoder().encode(s)
        let binary = ''
        for (const b of bytes) binary += String.fromCharCode(b)
        return btoa(binary)
      }),
    },
    {
      label: 'Base64 解码',
      icon: 'i-mdi-arrow-down-circle-outline',
      fn: safeOp((s) => {
        const binary = atob(s.trim())
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        return new TextDecoder().decode(bytes)
      }),
    },
    {
      label: 'HTML 编码',
      icon: 'i-mdi-code-tags',
      fn: safeOp(htmlEncode),
    },
    {
      label: 'HTML 解码',
      icon: 'i-mdi-code-tags',
      fn: safeOp(htmlDecode),
    },
    {
      label: 'Hex 编码',
      icon: 'i-mdi-hexagon-outline',
      fn: safeOp(hexEncode),
    },
    {
      label: 'Hex 解码',
      icon: 'i-mdi-hexagon-outline',
      fn: safeOp(hexDecode),
    },
    {
      label: 'Unicode 转义',
      icon: 'i-mdi-translate',
      fn: safeOp(unicodeEscape),
    },
    {
      label: 'Unicode 还原',
      icon: 'i-mdi-translate',
      fn: safeOp(unicodeUnescape),
    },
  ],
  transform: [
    { label: 'UPPERCASE', icon: 'i-mdi-format-letter-case-upper', fn: (s) => s.toUpperCase() },
    { label: 'lowercase', icon: 'i-mdi-format-letter-case-lower', fn: (s) => s.toLowerCase() },
    { label: 'Title Case', icon: 'i-mdi-format-letter-case', fn: safeOp(toTitleCase) },
    { label: 'camelCase', icon: 'i-mdi-format-letter-case', fn: safeOp(toCamelCase) },
    { label: 'PascalCase', icon: 'i-mdi-format-letter-case', fn: safeOp(toPascalCase) },
    { label: 'snake_case', icon: 'i-mdi-format-letter-case', fn: safeOp(toSnakeCase) },
    { label: 'kebab-case', icon: 'i-mdi-format-letter-case', fn: safeOp(toKebabCase) },
    {
      label: '翻转字符串',
      icon: 'i-mdi-swap-horizontal',
      fn: (s) => Array.from(s).reverse().join(''),
    },
    {
      label: '去首尾空格',
      icon: 'i-mdi-format-clear',
      fn: (s) => s.trim(),
    },
    {
      label: '压缩空白',
      icon: 'i-mdi-collapse-all-outline',
      fn: (s) => s.replace(/\s+/g, ' ').trim(),
    },
    {
      label: '去除所有空格',
      icon: 'i-mdi-eraser-variant',
      fn: (s) => s.replace(/\s/g, ''),
    },
    {
      label: '换行转空格',
      icon: 'i-mdi-wrap',
      fn: (s) => s.replace(/[\r\n]+/g, ' ').trim(),
    },
  ],
  lines: [
    {
      label: '行排序 A→Z',
      icon: 'i-mdi-sort-alphabetical-ascending',
      fn: (s) =>
        s
          .split('\n')
          .sort((a, b) => a.localeCompare(b))
          .join('\n'),
    },
    {
      label: '行排序 Z→A',
      icon: 'i-mdi-sort-alphabetical-descending',
      fn: (s) =>
        s
          .split('\n')
          .sort((a, b) => b.localeCompare(a))
          .join('\n'),
    },
    {
      label: '去重（保序）',
      icon: 'i-mdi-filter-outline',
      fn: (s) => [...new Set(s.split('\n'))].join('\n'),
    },
    {
      label: '翻转行顺序',
      icon: 'i-mdi-swap-vertical',
      fn: (s) => s.split('\n').reverse().join('\n'),
    },
    {
      label: '每行去空格',
      icon: 'i-mdi-format-clear',
      fn: (s) =>
        s
          .split('\n')
          .map((l) => l.trim())
          .join('\n'),
    },
    {
      label: '去空行',
      icon: 'i-mdi-minus',
      fn: (s) =>
        s
          .split('\n')
          .filter((l) => l.trim())
          .join('\n'),
    },
    {
      label: '行号标注',
      icon: 'i-mdi-format-list-numbered',
      fn: (s) =>
        s
          .split('\n')
          .map((l, i) => `${String(i + 1).padStart(4, ' ')}  ${l}`)
          .join('\n'),
    },
    {
      label: '每行加引号',
      icon: 'i-mdi-format-quote-close',
      fn: (s) =>
        s
          .split('\n')
          .map((l) => `"${l.replace(/"/g, '\\"')}"`)
          .join('\n'),
    },
    {
      label: '行拼接（逗号）',
      icon: 'i-mdi-link-variant',
      fn: (s) =>
        s
          .split('\n')
          .filter((l) => l.trim())
          .join(', '),
    },
  ],
  other: [
    {
      label: 'JWT 解码',
      icon: 'i-mdi-shield-key-outline',
      fn: safeOp(jwtDecode),
    },
    {
      label: '时间戳 → ISO',
      icon: 'i-mdi-clock-outline',
      fn: safeOp(timestampToIso),
    },
    {
      label: 'ISO → 时间戳',
      icon: 'i-mdi-clock-outline',
      fn: safeOp(isoToTimestamp),
    },
    {
      label: 'JSON 转义',
      icon: 'i-mdi-code-json',
      fn: safeOp((s) => JSON.stringify(s)),
    },
    {
      label: 'JSON 反转义',
      icon: 'i-mdi-code-json',
      fn: safeOp((s) => {
        const parsed = JSON.parse(s)
        if (typeof parsed === 'string') return parsed
        return JSON.stringify(parsed, null, 2)
      }),
    },
    {
      label: 'JSON 格式化',
      icon: 'i-mdi-code-json',
      fn: safeOp((s) => JSON.stringify(JSON.parse(s), null, 2)),
    },
    {
      label: 'JSON 压缩',
      icon: 'i-mdi-code-json',
      fn: safeOp((s) => JSON.stringify(JSON.parse(s))),
    },
  ],
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function copyText(text: string, label = '已复制') {
  navigator.clipboard.writeText(text).then(
    () => toast.success(label),
    () => toast.error('复制失败'),
  )
}

function getStats(s: string) {
  const lines = s === '' ? 0 : s.split('\n').length
  const words = s.trim() === '' ? 0 : s.trim().split(/\s+/).length
  const chars = s.length
  const bytes = new TextEncoder().encode(s).length
  return { lines, words, chars, bytes }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function StringToolsPage() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('hash')
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  const outputRef = useRef<HTMLTextAreaElement>(null)

  const inputStats = useMemo(() => getStats(input), [input])
  const outputStats = useMemo(() => getStats(output), [output])

  const hashes = useMemo(() => {
    if (!input) return null
    return hashDefs.map((h) => {
      try {
        return { label: h.label, value: h.fn(input) }
      } catch {
        return { label: h.label, value: '[计算失败]' }
      }
    })
  }, [input])

  function applyOp(op: OpDef) {
    if (!input) {
      toast('请先在左侧输入内容', { icon: '💬' })
      return
    }
    const result = op.fn(input)
    setOutput(result)
  }

  function handleCopyHash(label: string, value: string) {
    navigator.clipboard.writeText(value).then(
      () => {
        setCopiedHash(label)
        setTimeout(() => setCopiedHash(null), 1800)
      },
      () => toast.error('复制失败'),
    )
  }

  function handleCopyOutput() {
    if (!output) {
      toast('输出为空', { icon: '💬' })
      return
    }
    copyText(output)
  }

  function handleUseOutputAsInput() {
    if (!output) return
    setInput(output)
    setOutput('')
  }

  function handleClear() {
    setInput('')
    setOutput('')
  }

  return (
    <div className={classes.page}>
      {/* ── Hero ── */}
      <div className={clsx(classes.panel, classes.hero)}>
        <div className={classes.heroHead}>
          <span className={classes.kicker}>
            <span className="i-mdi-text-box-multiple-outline" aria-hidden="true" />
            String Tools
          </span>
        </div>
        <div className={classes.heroMain}>
          <h1 className={classes.title}>字符串工具箱</h1>
          <p className={classes.subtitle}>
            Hash / 编码解码 / 文本变换 / 行操作 / JWT / 时间戳 — 一输入，全覆盖
          </p>
        </div>
      </div>

      {/* ── Workbench ── */}
      <div className={clsx(classes.panel, classes.workbench)}>
        {/* I/O editors */}
        <div className={classes.ioStrip}>
          {/* Input */}
          <div className={clsx(classes.editorCard, classes.editorDivider)}>
            <div className={classes.editorHead}>
              <div className={classes.editorHeadLeft}>
                <span className="i-mdi-pencil-outline" aria-hidden="true" />
                <span className={classes.editorLabel}>输入</span>
              </div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                {inputStats.chars} 字符 · {inputStats.lines} 行
              </span>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="在此粘贴或输入内容…"
              rows={12}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                resize: 'vertical',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'var(--color-text)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-sm)',
                lineHeight: 1.6,
                padding: 'var(--space-3) var(--space-4)',
              }}
            />
          </div>

          {/* Output */}
          <div className={classes.editorCard}>
            <div className={classes.editorHead}>
              <div className={classes.editorHeadLeft}>
                <span className="i-mdi-text-box-check-outline" aria-hidden="true" />
                <span className={classes.editorLabel}>输出</span>
              </div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                {outputStats.chars} 字符 · {outputStats.lines} 行
              </span>
            </div>
            <textarea
              ref={outputRef}
              value={output}
              readOnly
              placeholder="转换结果将显示在此处…"
              rows={12}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                resize: 'vertical',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'var(--color-text)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-sm)',
                lineHeight: 1.6,
                padding: 'var(--space-3) var(--space-4)',
              }}
            />
          </div>
        </div>

        {/* ── Ops panel ── */}
        <div className={classes.opsPanel}>
          {/* Category tabs */}
          <div className={classes.tabs}>
            {tabs.map((t) => (
              <button
                key={t.key}
                className={clsx(classes.tab, activeTab === t.key && classes.tabActive)}
                onClick={() => setActiveTab(t.key)}
              >
                <span className={t.icon} aria-hidden="true" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Hash tab: auto grid */}
          {activeTab === 'hash' && (
            <div className={classes.hashGrid}>
              {!input && (
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  在上方输入内容后，所有 Hash 值将自动计算。
                </p>
              )}
              {hashes &&
                hashes.map(({ label, value }) => (
                  <div key={label} className={classes.hashRow}>
                    <span className={classes.hashLabel}>{label}</span>
                    <span className={classes.hashValue}>{value}</span>
                    <button
                      className={classes.hashCopyBtn}
                      title={`复制 ${label}`}
                      onClick={() => handleCopyHash(label, value)}
                    >
                      {copiedHash === label ? (
                        <span className="i-mdi-check-bold" aria-hidden="true" />
                      ) : (
                        <span className="i-mdi-content-copy" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                ))}
            </div>
          )}

          {/* Other tabs: op buttons */}
          {activeTab !== 'hash' && (
            <div className={classes.opGrid}>
              {opsByTab[activeTab].map((op) => (
                <button key={op.label} className={classes.opBtn} onClick={() => applyOp(op)}>
                  <span className={op.icon} aria-hidden="true" />
                  {op.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Action bar ── */}
        <div className={classes.actionBar}>
          <div className={classes.actionBarLeft}>
            <span className="i-mdi-information-outline" aria-hidden="true" />
            <span>
              输入：{inputStats.chars} 字符 / {inputStats.words} 词 / {inputStats.bytes} 字节
            </span>
          </div>
          <div className={classes.actionBarRight}>
            <button className={classes.btnGhost} onClick={handleClear}>
              <span className="i-mdi-delete-outline" aria-hidden="true" />
              清空
            </button>
            <button className={classes.btnGhost} onClick={handleUseOutputAsInput}>
              <span className="i-mdi-arrow-left-bold-outline" aria-hidden="true" />
              输出→输入
            </button>
            <button
              className={classes.btnPrimary}
              onClick={handleCopyOutput}
              disabled={!output}
              style={!output ? { opacity: 0.5, cursor: 'default' } : undefined}
            >
              <span className="i-mdi-content-copy" aria-hidden="true" />
              复制输出
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
