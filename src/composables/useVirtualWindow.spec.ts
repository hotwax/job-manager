import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useVirtualWindow } from './useVirtualWindow';
import { ref } from 'vue';

describe('useVirtualWindow', () => {
  const rowHeight = 20;

  beforeEach(() => {
    vi.useFakeTimers();
    global.ResizeObserver = class ResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    } as any;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('calculates startIndex and endIndex correctly for empty list', () => {
    const { startIndex, endIndex } = useVirtualWindow({
      rowHeight,
      totalItems: ref(0),
      overscan: 5
    });

    expect(startIndex.value).toBe(0);
    expect(endIndex.value).toBe(0);
  });

  it('calculates indices correctly without scrolling', () => {
    const totalItems = ref(100);
    const { startIndex, endIndex, scroller, onScroll } = useVirtualWindow({
      rowHeight,
      totalItems,
      overscan: 2
    });

    scroller.value = { scrollTop: 0, clientHeight: 100 } as any;
    onScroll();

    expect(startIndex.value).toBe(0);
    expect(endIndex.value).toBe(7);
  });

  it('updates indices on scroll', () => {
    const totalItems = ref(100);
    const { startIndex, endIndex, scroller, onScroll } = useVirtualWindow({
      rowHeight,
      totalItems,
      overscan: 2
    });

    scroller.value = { scrollTop: 200, clientHeight: 100 } as any;
    onScroll();

    expect(startIndex.value).toBe(8);
    expect(endIndex.value).toBe(17);
  });

  it('clamps endIndex to totalItems', () => {
    const totalItems = ref(10);
    const { startIndex, endIndex, scroller, onScroll } = useVirtualWindow({
      rowHeight,
      totalItems,
      overscan: 2
    });

    scroller.value = { scrollTop: 200, clientHeight: 100 } as any;
    onScroll();

    expect(endIndex.value).toBe(10);
  });

  it('supports function for totalItems', () => {
    const totalItems = () => 50;
    const { endIndex, scroller, onScroll } = useVirtualWindow({
      rowHeight,
      totalItems,
      overscan: 0
    });

    scroller.value = { scrollTop: 1000, clientHeight: 100 } as any;
    onScroll();

    expect(endIndex.value).toBe(50);
  });

  it('scrollToIndex updates scrollTop and updates scroller element', () => {
    const { scroller, scrollToIndex } = useVirtualWindow({
      rowHeight,
      totalItems: ref(100),
      overscan: 2
    });

    scroller.value = { scrollTop: 0, clientHeight: 100 } as any;

    scrollToIndex(10);

    expect(scroller.value.scrollTop).toBe(200);
  });

  // Note: we can't easily test onMounted/onBeforeUnmount hooks natively outside of a mount context
  // unless we mock them or mount a dummy component.
  // For the scope of this refactor, testing index calculation and scrolling is sufficient.
});
