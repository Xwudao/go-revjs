import clsx from 'clsx'
import { tabs, opsByTab, useStringTools } from './hooks/string-tools.hook'
import classes from './string-tools.module.scss'

// ── Component ────────────────────────────────────────────────────────────────

export default function StringToolsPage() {
  const {
    input,
    setInput,
    output,
    activeTab,
    setActiveTab,
    copiedHash,
    outputRef,
    inputStats,
    outputStats,
    hashes,
    applyOp,
    handleCopyHash,
    handleCopyOutput,
    handleUseOutputAsInput,
    handleClear,
  } = useStringTools()

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
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-muted)',
                }}
              >
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
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-muted)',
                }}
              >
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
                <p
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-muted)',
                  }}
                >
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
                <button
                  key={op.label}
                  className={classes.opBtn}
                  onClick={() => applyOp(op)}
                >
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
              输入：{inputStats.chars} 字符 / {inputStats.words} 词 / {inputStats.bytes}{' '}
              字节
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
