import type { ElementType, ReactNode } from 'react';
import styles from './visually-hidden.module.css';

export type VisuallyHiddenProps = {
  children: ReactNode;
  /** Use `output`/`div` when the content also needs to be a live region. */
  as?: ElementType;
  'aria-live'?: 'polite' | 'assertive';
};

export function VisuallyHidden({ children, as: Component = 'span', ...rest }: VisuallyHiddenProps) {
  return (
    <Component className={styles.visuallyHidden} {...rest}>
      {children}
    </Component>
  );
}
