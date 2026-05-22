import type { Transition, Variants } from 'framer-motion';

/**
 * Shared motion layer for Duelly.
 *
 * Every variant set is reduced-motion-aware: the screens/components consume
 * these via `useMotion()`, which collapses transitions to instant when the
 * user has `prefers-reduced-motion: reduce` set.
 */

/** Base spring used for tactile, settle-quick UI motion. */
export const springSoft: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 34,
  mass: 0.8,
};

/** Snappier spring for celebratory moments (trophy, checkmark). */
export const springPop: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 18,
  mass: 0.9,
};

const easeOut: Transition = { duration: 0.22, ease: [0.22, 0.61, 0.36, 1] };

/** Full-screen route transition (enter + exit). */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: easeOut },
  exit: { opacity: 0, y: -8, transition: { duration: 0.16, ease: 'easeIn' } },
};

/** Parent of a staggered list — children animate in sequentially. */
export const listContainerVariants: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

/** Single staggered list item. */
export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: easeOut },
};

/** Card / surface entrance. */
export const cardVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: easeOut },
};

/** Bottom-sheet panel slide. */
export const sheetVariants: Variants = {
  initial: { y: '100%' },
  animate: { y: 0, transition: springSoft },
  exit: { y: '100%', transition: { duration: 0.2, ease: 'easeIn' } },
};

/** Centered dialog panel scale/fade. */
export const dialogVariants: Variants = {
  initial: { opacity: 0, scale: 0.94, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: springSoft },
  exit: { opacity: 0, scale: 0.96, y: 4, transition: { duration: 0.14, ease: 'easeIn' } },
};

/** Overlay scrim fade. */
export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.14 } },
};

/** Toast slide-down + fade. */
export const toastVariants: Variants = {
  initial: { opacity: 0, y: -16, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: springSoft },
  exit: { opacity: 0, y: -12, scale: 0.96, transition: { duration: 0.16, ease: 'easeIn' } },
};

/** Standard tap-feedback props for buttons and tappable cards. */
export const tapFeedback = { scale: 0.97 } as const;
export const tapFeedbackSubtle = { scale: 0.985 } as const;

/**
 * Variants with all motion stripped — used when the user prefers reduced
 * motion. Elements still appear/disappear, just without travel or scale.
 */
export const reducedVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.12 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

/** Empty variants — collapse staggered containers to instant. */
export const reducedContainerVariants: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0 } },
};
