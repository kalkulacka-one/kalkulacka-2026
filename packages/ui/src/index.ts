/**
 * Presentational design system.
 *
 * Rules that keep this package reusable and re-skinnable:
 *  - every string arrives as a prop; nothing here imports i18n
 *  - styling lives in co-located `.module.css` files that reference only `var(--vk-*)`
 *  - no data fetching, no routing, no domain knowledge
 */
export { Button, type ButtonProps } from './button/button';
export { Card, type CardProps } from './card/card';
export { Chip, type ChipProps } from './chip/chip';
export { FlowNav, type FlowNavProps } from './flow-nav/flow-nav';
export { Icon, type IconProps } from './icon/icon';
export { type IconDefinition, type IconName, icons } from './icon/icons';
export { Logo, type LogoProps } from './logo/logo';
export {
  ProgressSegments,
  type ProgressSegmentsProps,
  type Segment,
  type SegmentState,
} from './progress-segments/progress-segments';
export {
  type CardSelection,
  QuestionCard,
  type QuestionCardContent,
  type QuestionCardProps,
} from './question-card/question-card';
export {
  QuestionDeck,
  type QuestionDeckHandle,
  type QuestionDeckLabels,
  type QuestionDeckProps,
} from './question-deck/question-deck';
export { PHYSICS, type SwipeZone } from './question-deck/swipe-physics';
export { VisuallyHidden } from './visually-hidden/visually-hidden';
