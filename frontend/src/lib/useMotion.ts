import { useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import {
  cardVariants,
  dialogVariants,
  listContainerVariants,
  listItemVariants,
  overlayVariants,
  pageVariants,
  reducedContainerVariants,
  reducedVariants,
  sheetVariants,
  tapFeedback,
  tapFeedbackSubtle,
  toastVariants,
} from './motion';

interface MotionKit {
  /** True when the user asked the OS to reduce motion. */
  reduced: boolean;
  page: Variants;
  listContainer: Variants;
  listItem: Variants;
  card: Variants;
  sheet: Variants;
  dialog: Variants;
  overlay: Variants;
  toast: Variants;
  /** whileTap value — `undefined` when motion is reduced. */
  tap: typeof tapFeedback | undefined;
  /** Subtle whileTap value — `undefined` when motion is reduced. */
  tapSubtle: typeof tapFeedbackSubtle | undefined;
}

/**
 * Central motion accessor. Returns the full motion kit, automatically
 * collapsed to instant/opacity-only transitions when the user prefers
 * reduced motion. Components should consume this rather than importing
 * raw variants so reduced-motion support stays consistent app-wide.
 */
export function useMotion(): MotionKit {
  const reduced = useReducedMotion() ?? false;
  if (reduced) {
    return {
      reduced,
      page: reducedVariants,
      listContainer: reducedContainerVariants,
      listItem: reducedVariants,
      card: reducedVariants,
      sheet: reducedVariants,
      dialog: reducedVariants,
      overlay: overlayVariants,
      toast: reducedVariants,
      tap: undefined,
      tapSubtle: undefined,
    };
  }
  return {
    reduced,
    page: pageVariants,
    listContainer: listContainerVariants,
    listItem: listItemVariants,
    card: cardVariants,
    sheet: sheetVariants,
    dialog: dialogVariants,
    overlay: overlayVariants,
    toast: toastVariants,
    tap: tapFeedback,
    tapSubtle: tapFeedbackSubtle,
  };
}
