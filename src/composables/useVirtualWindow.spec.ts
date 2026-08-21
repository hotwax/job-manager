import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, ref } from "vue";
import { useVirtualWindow } from "./useVirtualWindow";

describe("useVirtualWindow", () => {
  const rowHeight = 20;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calculates startIndex and endIndex correctly for empty list", () => {
    const { startIndex, endIndex } = useVirtualWindow({
      rowHeight,
      totalItems: ref(0),
      overscan: 5
    });

    expect(startIndex.value).toBe(0);
    expect(endIndex.value).toBe(0);
  });

  it("calculates indices correctly without scrolling", () => {
    const totalItems = ref(100);
    const { startIndex, endIndex, scroller, onScroll } = useVirtualWindow({
      rowHeight,
      totalItems,
      overscan: 2
    });

    const el = document.createElement("div");
    Object.defineProperty(el, "scrollTop", { value: 0, writable: true });
    Object.defineProperty(el, "clientHeight", { value: 100, writable: true });

    scroller.value = el;
    onScroll();

    expect(startIndex.value).toBe(0);
    // 100 clientHeight / 20 rowHeight = 5. Math.ceil(0+100 / 20) + 2 overscan = 7.
    expect(endIndex.value).toBe(7);
  });

  it("updates indices on scroll to a specific boundary", () => {
    const totalItems = ref(100);
    const { startIndex, endIndex, scroller, onScroll } = useVirtualWindow({
      rowHeight,
      totalItems,
      overscan: 2
    });

    const el = document.createElement("div");
    Object.defineProperty(el, "scrollTop", { value: 200, writable: true });
    Object.defineProperty(el, "clientHeight", { value: 100, writable: true });

    scroller.value = el;
    onScroll();

    // 200 / 20 = 10. startIndex = 10 - 2 (overscan) = 8
    expect(startIndex.value).toBe(8);
    // endIndex = Math.ceil((200 + 100) / 20) = 15. 15 + 2 (overscan) = 17
    expect(endIndex.value).toBe(17);
  });

  it("clamps endIndex to totalItems for a small list", () => {
    const totalItems = ref(10);
    const { startIndex, endIndex, scroller, onScroll } = useVirtualWindow({
      rowHeight,
      totalItems,
      overscan: 2
    });

    const el = document.createElement("div");
    Object.defineProperty(el, "scrollTop", { value: 200, writable: true });
    Object.defineProperty(el, "clientHeight", { value: 100, writable: true });

    scroller.value = el;
    onScroll();

    expect(startIndex.value).toBe(8);
    // Calculated end index is 17, but it should be clamped to 10.
    expect(endIndex.value).toBe(10);
  });

  it("supports function for totalItems", () => {
    const totalItems = () => 50;
    const { endIndex, scroller, onScroll } = useVirtualWindow({
      rowHeight,
      totalItems,
      overscan: 0
    });

    const el = document.createElement("div");
    Object.defineProperty(el, "scrollTop", { value: 1000, writable: true });
    Object.defineProperty(el, "clientHeight", { value: 100, writable: true });

    scroller.value = el;
    onScroll();

    // 1000 / 20 = 50. endIndex = 55, clamped to 50
    expect(endIndex.value).toBe(50);
  });

  it("scrollToIndex updates scrollTop and updates scroller element preserving existing reset behavior", () => {
    const { scroller, scrollToIndex } = useVirtualWindow({
      rowHeight,
      totalItems: ref(100),
      overscan: 2
    });

    const el = document.createElement("div");
    Object.defineProperty(el, "scrollTop", { value: 200, writable: true });
    Object.defineProperty(el, "clientHeight", { value: 100, writable: true });
    scroller.value = el;

    // Simulate being scrolled down
    scroller.value.scrollTop = 200;

    // Scroll to 0 resets behavior
    scrollToIndex(0);

    expect(scroller.value.scrollTop).toBe(0);
    // Note: startIndex won't dynamically update until onScroll is called, or if we read directly from the ref in component.
    // The test specifically proves the reset behavior of scrollToIndex.
  });

  it("manages ResizeObserver lifecycle and reacts to resize", async () => {
    const observeMock = vi.fn();
    const disconnectMock = vi.fn();
    let resizeCallback: globalThis.ResizeObserverCallback | null = null;
    let observerInstance: globalThis.ResizeObserver | null = null;

    class MockResizeObserver implements globalThis.ResizeObserver {
      constructor(callback: globalThis.ResizeObserverCallback) {
        resizeCallback = callback;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        observerInstance = this;
      }
      observe = observeMock;
      unobserve = vi.fn();
      disconnect = disconnectMock;
    }

    vi.stubGlobal("ResizeObserver", MockResizeObserver);

    let scrollerRef: ReturnType<typeof useVirtualWindow>["scroller"] | null = null;
    let endIndexRef: ReturnType<typeof useVirtualWindow>["endIndex"] | null = null;

    const DummyComponent = defineComponent({
      setup() {
        const { scroller, endIndex } = useVirtualWindow({
          rowHeight: 20,
          totalItems: ref(100),
          overscan: 0
        });

        scrollerRef = scroller;
        endIndexRef = endIndex;

        return {
          scrollerDiv: scroller
        };
      },
      template: "<div ref=\"scrollerDiv\" style=\"height: 100px;\"></div>"
    });

    const wrapper = mount(DummyComponent);

    // Mock elements usually have 0 clientHeight in jsdom unless mocked
    if(scrollerRef && scrollerRef.value) {
      Object.defineProperty(scrollerRef.value, "clientHeight", { value: 100, writable: true });
    }

    // Should be observing on mount
    expect(observeMock).toHaveBeenCalledWith(scrollerRef?.value);

    // Trigger resize callback to update viewportHeight
    if(resizeCallback && observerInstance) {
      resizeCallback([], observerInstance);
    }

    // Wait for Vue reactivity
    await wrapper.vm.$nextTick();

    // scrollTop is 0. 0 + 100 / 20 = 5 + 0 overscan = 5
    expect(endIndexRef?.value).toBe(5);

    // Manually change client height and trigger resize observer again
    if(scrollerRef && scrollerRef.value) {
      Object.defineProperty(scrollerRef.value, "clientHeight", { value: 300, writable: true });
    }
    if(resizeCallback && observerInstance) {
      resizeCallback([], observerInstance);
    }

    await wrapper.vm.$nextTick();

    // 0 + 300 / 20 = 15
    expect(endIndexRef.value).toBe(15);

    wrapper.unmount();

    // Should disconnect on unmount
    expect(disconnectMock).toHaveBeenCalled();
  });
});
