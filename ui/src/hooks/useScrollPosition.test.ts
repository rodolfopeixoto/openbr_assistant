import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  getScrollPosition,
  isScrolledUp,
  scrollToBottom,
} from "./useScrollPosition";

// Mock HTMLElement for testing
function createMockElement(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number
): HTMLElement {
  const element = document.createElement("div");
  Object.defineProperty(element, "scrollTop", {
    value: scrollTop,
    writable: true,
  });
  Object.defineProperty(element, "scrollHeight", {
    value: scrollHeight,
    writable: true,
  });
  Object.defineProperty(element, "clientHeight", {
    value: clientHeight,
    writable: true,
  });
  return element;
}

describe("useScrollPosition", () => {
  describe("getScrollPosition", () => {
    it("returns correct scroll position state", () => {
      const element = createMockElement(100, 500, 300);
      const position = getScrollPosition(element);

      expect(position.scrollTop).toBe(100);
      expect(position.scrollHeight).toBe(500);
      expect(position.clientHeight).toBe(300);
      expect(position.distanceFromBottom).toBe(100); // 500 - 100 - 300
      expect(position.isNearBottom).toBe(true); // 100 < 100 (threshold)
    });

    it("calculates distance from bottom correctly", () => {
      const element = createMockElement(0, 500, 300);
      const position = getScrollPosition(element);

      expect(position.distanceFromBottom).toBe(200);
      expect(position.isNearBottom).toBe(false);
    });

    it("uses custom threshold", () => {
      const element = createMockElement(100, 500, 300);
      
      // With threshold of 50, distance (100) > 50, so not near bottom
      const position1 = getScrollPosition(element, { threshold: 50 });
      expect(position1.isNearBottom).toBe(false);

      // With threshold of 150, distance (100) < 150, so near bottom
      const position2 = getScrollPosition(element, { threshold: 150 });
      expect(position2.isNearBottom).toBe(true);
    });

    it("handles exact bottom position", () => {
      const element = createMockElement(200, 500, 300);
      const position = getScrollPosition(element);

      expect(position.distanceFromBottom).toBe(0);
      expect(position.isNearBottom).toBe(true);
    });
  });

  describe("isScrolledUp", () => {
    it("returns true when scrolled up", () => {
      const element = createMockElement(0, 500, 300);
      expect(isScrolledUp(element, 100)).toBe(true);
    });

    it("returns false when at bottom", () => {
      const element = createMockElement(200, 500, 300);
      expect(isScrolledUp(element, 100)).toBe(false);
    });

    it("returns false when near bottom (within threshold)", () => {
      const element = createMockElement(150, 500, 300); // distance = 50
      expect(isScrolledUp(element, 100)).toBe(false);
    });

    it("returns true when past threshold", () => {
      const element = createMockElement(50, 500, 300); // distance = 150
      expect(isScrolledUp(element, 100)).toBe(true);
    });

    it("uses default threshold of 100", () => {
      const element = createMockElement(50, 500, 300); // distance = 150
      expect(isScrolledUp(element)).toBe(true);
    });
  });

  describe("scrollToBottom", () => {
    it("scrolls element to bottom smoothly", () => {
      const element = createMockElement(0, 500, 300);
      const scrollToSpy = vi.spyOn(element, "scrollTo");

      scrollToBottom(element);

      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 500,
        behavior: "smooth",
      });
    });

    it("handles different scroll heights", () => {
      const element = createMockElement(100, 1000, 200);
      const scrollToSpy = vi.spyOn(element, "scrollTo");

      scrollToBottom(element);

      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 1000,
        behavior: "smooth",
      });
    });
  });
});
