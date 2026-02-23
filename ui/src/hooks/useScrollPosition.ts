/**
 * Scroll position detection utility for chat interface.
 * Tracks scroll position and determines if user has scrolled away from bottom.
 */

export type ScrollPositionState = {
  isNearBottom: boolean;
  distanceFromBottom: number;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

export type ScrollPositionOptions = {
  /** Threshold in pixels to consider "near bottom" (default: 100) */
  threshold?: number;
};

/**
 * Calculate scroll position state from a scrollable element
 */
export function getScrollPosition(
  element: HTMLElement,
  options: ScrollPositionOptions = {}
): ScrollPositionState {
  const { threshold = 100 } = options;
  const { scrollTop, scrollHeight, clientHeight } = element;
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
  const isNearBottom = distanceFromBottom < threshold;

  return {
    isNearBottom,
    distanceFromBottom,
    scrollTop,
    scrollHeight,
    clientHeight,
  };
}

/**
 * Check if scroll position is above the threshold (not at bottom)
 */
export function isScrolledUp(
  element: HTMLElement,
  threshold: number = 100
): boolean {
  const position = getScrollPosition(element, { threshold });
  return !position.isNearBottom;
}

/**
 * Smoothly scroll element to bottom
 */
export function scrollToBottom(element: HTMLElement): void {
  element.scrollTo({
    top: element.scrollHeight,
    behavior: "smooth",
  });
}

/**
 * Create a scroll handler that tracks position
 */
export function createScrollHandler(
  element: HTMLElement,
  options: ScrollPositionOptions = {}
) {
  return {
    getPosition: () => getScrollPosition(element, options),
    isScrolledUp: () => isScrolledUp(element, options.threshold),
    scrollToBottom: () => scrollToBottom(element),
  };
}
