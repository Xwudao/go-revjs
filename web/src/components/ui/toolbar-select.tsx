import { useEffect, useId, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import classes from './toolbar-select.module.scss';

export interface ToolbarSelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface ToolbarSelectProps<T extends string> {
  value: T;
  options: readonly ToolbarSelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  ariaLabel?: string;
  menuWidth?: string;
}

export function ToolbarSelect<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  ariaLabel,
  menuWidth,
}: ToolbarSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<'down' | 'up'>('down');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const reactId = useId();
  const listboxId = `${reactId}-listbox`;

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value) ?? options[0],
    [options, value],
  );

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setDirection('down');
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        setDirection('down');
      }
    }

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div
      className={clsx(classes.toolbarSelect)}
      data-open={open}
      data-disabled={disabled}
      data-direction={direction}
      ref={rootRef}
    >
      <button
        type="button"
        className={clsx(classes.toolbarSelectTrigger)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => {
          if (!open && rootRef.current) {
            const rect = rootRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            setDirection(spaceBelow < 180 && rect.top > spaceBelow ? 'up' : 'down');
          }
          setOpen((prev) => !prev);
        }}
      >
        <span className={clsx(classes.toolbarSelectLabel)}>{selectedOption?.label}</span>
        <span
          className={clsx(
            open ? 'i-mdi-chevron-up' : 'i-mdi-chevron-down',
            classes.toolbarSelectIcon,
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className={clsx(classes.toolbarSelectMenu)}
          id={listboxId}
          role="listbox"
          style={menuWidth ? { width: menuWidth } : undefined}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={clsx(classes.toolbarSelectOption)}
              role="option"
              aria-selected={option.value === value}
              data-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
                setDirection('down');
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
