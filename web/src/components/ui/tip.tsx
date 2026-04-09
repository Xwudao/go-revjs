import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import classes from './tip.module.scss';

interface TipProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'inline' | 'callout';
  tone?: 'default' | 'info';
  align?: 'start' | 'center';
  iconClassName?: string;
  icon?: ReactNode;
}

export function Tip({
  variant = 'inline',
  tone = 'default',
  align = variant === 'inline' ? 'center' : 'start',
  iconClassName = 'i-mdi-information-outline',
  icon,
  className,
  children,
  ...rest
}: TipProps) {
  return (
    <div
      className={clsx(
        classes.tip,
        variant === 'inline' ? classes.tipInline : classes.tipCallout,
        className,
      )}
      data-tone={tone}
      data-align={align}
      {...rest}
    >
      {icon === undefined ? (
        <span className={clsx(iconClassName, classes.tipIcon)} aria-hidden="true" />
      ) : (
        icon
      )}
      <div className={clsx(classes.tipContent)}>{children}</div>
    </div>
  );
}
