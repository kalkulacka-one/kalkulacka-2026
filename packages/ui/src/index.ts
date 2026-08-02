/**
 * Presentational design system.
 *
 * Rules that keep this package reusable and re-skinnable:
 *  - every string arrives as a prop; nothing here imports i18n
 *  - styling lives in co-located `.module.css` files that reference only `var(--vk-*)`
 *  - no data fetching, no routing, no domain knowledge
 */
export { AnswerPill, type AnswerPillProps, type AnswerTone } from './answer-pill/answer-pill';
export { AppHeader, type AppHeaderProps } from './app-header/app-header';
export { Avatar, type AvatarProps } from './avatar/avatar';
export { Backdrop, type BackdropProps } from './backdrop/backdrop';
export { Button, type ButtonProps } from './button/button';
export { Card, type CardProps } from './card/card';
export { Chip, type ChipProps } from './chip/chip';
export {
  ComparisonList,
  type ComparisonListProps,
  type ComparisonRow,
} from './comparison-list/comparison-list';
export { Dialog, type DialogProps } from './dialog/dialog';
export { FlowNav, type FlowNavProps } from './flow-nav/flow-nav';
export { Icon, type IconProps } from './icon/icon';
export { type IconDefinition, type IconName, icons } from './icon/icons';
export { IconButton, type IconButtonProps } from './icon-button/icon-button';
export {
  type HintKey,
  type KeyboardHint,
  KeyboardHints,
  type KeyboardHintsProps,
} from './keyboard-hints/keyboard-hints';
export {
  LoadingIndicator,
  type LoadingIndicatorProps,
} from './loading-indicator/loading-indicator';
export { Logo, type LogoProps } from './logo/logo';
export { MatchCard, type MatchCardProps } from './match-card/match-card';
export { Menu, type MenuItem, type MenuProps } from './menu/menu';
export { OptionRow, type OptionRowProps } from './option-row/option-row';
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
export {
  RecapItem,
  type RecapItemLabels,
  type RecapItemProps,
} from './recap-item/recap-item';
export { SearchField, type SearchFieldProps } from './search-field/search-field';
export { StickyBar, type StickyBarProps } from './sticky-bar/sticky-bar';
export { TutorialStep, type TutorialStepProps } from './tutorial-step/tutorial-step';
export { VisuallyHidden } from './visually-hidden/visually-hidden';
