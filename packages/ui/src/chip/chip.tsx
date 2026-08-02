import type { ReactNode } from 'react';
import styles from './chip.module.css';

export type ChipProps = {
  children: ReactNode;
  variant?: 'filled' | 'outline';
};

export function Chip({ children, variant = 'filled' }: ChipProps) {
  return <span className={`${styles.chip} ${styles[variant]}`}>{children}</span>;
}
