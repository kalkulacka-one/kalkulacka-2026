import type { ButtonHTMLAttributes, ElementType, ReactNode } from 'react';
import { Icon, type IconName } from '../icon/icon';
import styles from './button.module.css';

export type ButtonProps = {
  children: ReactNode;
  variant?: 'solid' | 'ghost' | 'outline' | 'plate';
  size?: 'small' | 'medium' | 'large';
  /** Icon shown before the label. */
  iconStart?: IconName;
  /** Icon shown after the label. */
  iconEnd?: IconName;
  fullWidth?: boolean;
  /**
   * Render as something other than a `<button>` — in practice a link component,
   * for the many places in the flow where the primary action is a navigation.
   * A styled `<a>` is the honest markup there: it opens in a new tab, it can be
   * copied, and it works before hydration.
   */
  as?: ElementType;
  href?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>;

export function Button({
  children,
  variant = 'solid',
  size = 'medium',
  iconStart,
  iconEnd,
  fullWidth = false,
  as: Component = 'button',
  type,
  ...rest
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    size !== 'medium' ? styles[size] : undefined,
    fullWidth ? styles.fullWidth : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component
      className={classes}
      // `type` is meaningless on anything that isn't a real button, and React
      // would pass it straight through to the DOM as an invalid attribute.
      type={Component === 'button' ? (type ?? 'button') : undefined}
      {...rest}
    >
      {iconStart ? <Icon name={iconStart} size={14} /> : null}
      {children}
      {iconEnd ? <Icon name={iconEnd} size={14} /> : null}
    </Component>
  );
}
