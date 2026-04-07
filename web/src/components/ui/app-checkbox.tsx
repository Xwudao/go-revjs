import clsx from 'clsx'
import classes from './app-checkbox.module.scss'

interface AppCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}

export function AppCheckbox({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: AppCheckboxProps) {
  return (
    <label className={clsx(classes.appCheckbox)} data-disabled={disabled}>
      <input
        className={clsx(classes.appCheckboxNative)}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />

      <span className={clsx(classes.appCheckboxBox)} aria-hidden="true">
        {checked && (
          <span className={clsx('i-mdi-check-bold', classes.appCheckboxMark)} />
        )}
      </span>

      <span className={clsx(classes.appCheckboxCopy)}>
        <span className={clsx(classes.appCheckboxLabel)}>{label}</span>
        {description && (
          <span className={clsx(classes.appCheckboxDescription)}>{description}</span>
        )}
      </span>
    </label>
  )
}
