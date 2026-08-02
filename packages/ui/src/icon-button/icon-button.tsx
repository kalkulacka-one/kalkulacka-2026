import type { ButtonHTMLAttributes, ElementType, Ref } from 'react';
import { Icon, type IconName } from '../icon/icon';
import styles from './icon-button.module.css';

export type IconButtonProps = {
  icon: IconName;
  /**
   * The accessible name. Required rather than optional — an icon-only control
   * with no label is invisible to a screen reader, and there is no sensible
   * fallback to derive from a path.
   */
  label: string;
  variant?: 'ghost' | 'surface';
  size?: 'medium' | 'large';
  as?: ElementType;
  href?: string;
  ref?: Ref<HTMLButtonElement>;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>;

/**
 * A square, icon-only control.
 *
 * `surface` is the variant that has to work anywhere: the shell's menu trigger
 * sits over the animated backdrop on every screen, so it carries its own
 * translucent plate rather than trusting whatever colour happens to be behind
 * it that frame.
 */
export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'medium',
  as: Component = 'button',
  type,
  ref,
  ...rest
}: IconButtonProps) {
  const classes = [styles.button, styles[variant], size !== 'medium' ? styles[size] : undefined]
    .filter(Boolean)
    .join(' ');

  return (
    <Component
      ref={ref}
      className={classes}
      type={Component === 'button' ? (type ?? 'button') : undefined}
      aria-label={label}
      {...rest}
    >
      <Icon name={icon} size={size === 'large' ? 22 : 20} />
    </Component>
  );
}
