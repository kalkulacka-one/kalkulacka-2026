import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import styles from './card.module.css';

export type CardProps = {
  children: ReactNode;
  /** Elevation step. The deck renders one card per level behind the active one. */
  elevation?: 'default' | 'next' | 'back' | 'lifted';
  /** Apply the standard fluid card padding. */
  padded?: boolean;
  as?: ElementType;
} & HTMLAttributes<HTMLElement>;

export function Card({
  children,
  elevation = 'default',
  padded = true,
  as: Component = 'div',
  className,
  ...rest
}: CardProps) {
  const classes = [
    styles.card,
    elevation !== 'default' ? styles[elevation] : undefined,
    padded ? styles.padded : undefined,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} {...rest}>
      {children}
    </Component>
  );
}
