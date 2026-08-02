import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '../icon/icon';
import styles from './button.module.css';

export type ButtonProps = {
  children: ReactNode;
  variant?: 'solid' | 'ghost' | 'outline';
  size?: 'small' | 'medium' | 'large';
  /** Icon shown before the label. */
  iconStart?: IconName;
  /** Icon shown after the label. */
  iconEnd?: IconName;
  fullWidth?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>;

export function Button({
  children,
  variant = 'solid',
  size = 'medium',
  iconStart,
  iconEnd,
  fullWidth = false,
  type = 'button',
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
    <button className={classes} type={type} {...rest}>
      {iconStart ? <Icon name={iconStart} size={14} /> : null}
      {children}
      {iconEnd ? <Icon name={iconEnd} size={14} /> : null}
    </button>
  );
}
