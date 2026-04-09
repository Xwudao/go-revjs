import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import clsx from 'clsx'
import { HUB_TOOLS, type HubTool } from '@/data/hub-tools'
import classes from './search-modal.module.scss'

function filterItems(query: string): readonly HubTool[] {
  const q = query.trim().toLowerCase()
  if (!q) return HUB_TOOLS
  return HUB_TOOLS.filter((item) => {
    const haystack = [item.title, item.description, ...item.keywords]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

interface SearchModalProps {
  open: boolean
  onClose: () => void
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  const results = filterItems(query)

  // reset state on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      // defer focus so the element is visible
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [open])

  // clamp active index when results change
  useEffect(() => {
    setActiveIndex((prev) =>
      results.length === 0 ? 0 : Math.min(prev, results.length - 1),
    )
  }, [results.length])

  const handleSelect = useCallback(
    (item: HubTool) => {
      onClose()
      void navigate({ to: item.to })
    },
    [navigate, onClose],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setActiveIndex((prev) => (prev + 1) % Math.max(results.length, 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setActiveIndex(
            (prev) =>
              (prev - 1 + Math.max(results.length, 1)) % Math.max(results.length, 1),
          )
          break
        case 'Enter':
          e.preventDefault()
          if (results[activeIndex]) {
            handleSelect(results[activeIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        default:
          break
      }
    },
    [results, activeIndex, handleSelect, onClose],
  )

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) {
        onClose()
      }
    },
    [onClose],
  )

  if (!open) return null

  return (
    <div
      ref={backdropRef}
      className={clsx(classes.backdrop)}
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        className={clsx(classes.panel)}
        role="dialog"
        aria-modal="true"
        aria-label="快速搜索"
        onKeyDown={handleKeyDown}
      >
        {/* Search input row */}
        <div className={clsx(classes.inputRow)}>
          <span className={clsx('i-mdi-magnify', classes.inputIcon)} aria-hidden="true" />
          <input
            ref={inputRef}
            className={clsx(classes.input)}
            type="text"
            placeholder="搜索工具..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <kbd className={clsx(classes.escKbd)}>Esc</kbd>
        </div>

        {/* Results */}
        <ul className={clsx(classes.results)} role="listbox" aria-label="搜索结果">
          {results.length === 0 ? (
            <li className={clsx(classes.empty)}>
              <span className="i-mdi-information-outline" aria-hidden="true" />
              无匹配结果
            </li>
          ) : (
            results.map((item, i) => (
              <li
                key={item.to}
                role="option"
                aria-selected={i === activeIndex}
                className={clsx(
                  classes.resultItem,
                  i === activeIndex && classes.resultItemActive,
                )}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => handleSelect(item)}
              >
                <span
                  className={clsx(item.iconClass, classes.resultIcon)}
                  aria-hidden="true"
                />
                <span className={clsx(classes.resultText)}>
                  <span className={clsx(classes.resultLabel)}>{item.title}</span>
                  <span className={clsx(classes.resultDesc)}>{item.description}</span>
                </span>
                <span
                  className={clsx(classes.resultArrow, 'i-mdi-arrow-right')}
                  aria-hidden="true"
                />
              </li>
            ))
          )}
        </ul>

        {/* Footer hint */}
        <div className={clsx(classes.footer)}>
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            导航
          </span>
          <span>
            <kbd>↵</kbd>
            打开
          </span>
          <span>
            <kbd>Esc</kbd>
            关闭
          </span>
        </div>
      </div>
    </div>
  )
}

/** Global Cmd+K / Ctrl+K hook — call once at the shell level */
export function useSearchModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const open_ = useCallback(() => setOpen(true), [])
  const close = useCallback(() => setOpen(false), [])

  return { isOpen: open, open: open_, close }
}
