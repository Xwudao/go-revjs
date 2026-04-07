import { useEffect, useId, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import classes from './app-select.module.scss'

export interface AppSelectOption<T extends string = string> {
  value: T
  label: string
  description?: string
}

interface AppSelectProps<T extends string> {
  value: T
  options: readonly AppSelectOption<T>[]
  onChange: (value: T) => void
  disabled?: boolean
  ariaLabel?: string
  menuMaxHeight?: string
}

export function AppSelect<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  ariaLabel,
  menuMaxHeight = '16rem',
}: AppSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const reactId = useId()
  const listboxId = `${reactId}-listbox`

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  )

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div
      className={clsx(classes.appSelect)}
      data-open={open}
      data-disabled={disabled}
      ref={rootRef}
    >
      <button
        type="button"
        className={clsx(classes.appSelectTrigger)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={clsx(classes.appSelectValue)}>
          <span className={clsx(classes.appSelectLabel)}>{selectedOption.label}</span>
          {selectedOption.description && (
            <span className={clsx(classes.appSelectDescription)}>
              {selectedOption.description}
            </span>
          )}
        </span>
        <span
          className={clsx(
            open ? 'i-mdi-chevron-up' : 'i-mdi-chevron-down',
            classes.appSelectIcon,
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className={clsx(classes.appSelectMenu)}
          id={listboxId}
          role="listbox"
        >
          <div
            className={clsx(classes.appSelectScroll)}
            style={{ maxHeight: menuMaxHeight }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={clsx(classes.appSelectOption)}
                role="option"
                aria-selected={option.value === value}
                data-selected={option.value === value}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                <span className={clsx(classes.appSelectOptionCopy)}>
                  <span className={clsx(classes.appSelectOptionLabel)}>{option.label}</span>
                  {option.description && (
                    <span className={clsx(classes.appSelectOptionDescription)}>
                      {option.description}
                    </span>
                  )}
                </span>
                {option.value === value && (
                  <span
                    className={clsx('i-mdi-check', classes.appSelectCheck)}
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
