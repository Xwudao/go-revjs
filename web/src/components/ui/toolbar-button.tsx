import clsx from 'clsx'
import classes from './toolbar-button.module.scss'

interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary'
}

export function ToolbarButton({
  variant = 'default',
  className,
  children,
  type = 'button',
  ...rest
}: ToolbarButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        classes.toolbarButton,
        variant === 'primary' && classes.toolbarButtonPrimary,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export function ToolbarDivider() {
  return <div className={clsx(classes.toolbarDivider)} aria-hidden="true" />
}
