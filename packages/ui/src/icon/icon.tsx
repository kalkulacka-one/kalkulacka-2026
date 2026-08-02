import { type IconDefinition, type IconName, icons } from './icons';

export type { IconName };

export type IconProps = {
  name: IconName;
  /** Height in px. Width follows the icon's aspect ratio. */
  size?: number;
  /** Fill the shape as well as stroke it — used by the active "important" star. */
  filled?: boolean;
  className?: string;
};

/**
 * Icons inherit `currentColor`, so colour is set by the surrounding component's
 * CSS rather than passed as a prop. That keeps every colour decision in a
 * stylesheet where a theme can reach it.
 */
export function Icon({ name, size = 20, filled = false, className }: IconProps) {
  // Widened to the interface so optional stroke properties are readable; the
  // `as const` registry narrows each entry to only the keys it happens to set.
  const icon: IconDefinition = icons[name];
  const [, , vbWidth = '1', vbHeight = '1'] = icon.viewBox.split(' ');
  const ratio = Number(vbWidth) / Number(vbHeight);

  const stroked = icon.mode === 'stroke';

  return (
    <svg
      className={className}
      width={Math.round(size * ratio)}
      height={size}
      viewBox={icon.viewBox}
      fill={stroked ? (filled ? 'currentColor' : 'none') : 'currentColor'}
      stroke={stroked ? 'currentColor' : undefined}
      strokeWidth={stroked ? icon.strokeWidth : undefined}
      strokeLinejoin={stroked ? icon.strokeLinejoin : undefined}
      strokeLinecap={stroked ? icon.strokeLinecap : undefined}
      aria-hidden="true"
      focusable="false"
    >
      <path d={icon.path} />
    </svg>
  );
}
