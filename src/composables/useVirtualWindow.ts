import { computed, onBeforeUnmount, onMounted, ref, type Ref } from "vue";

export interface VirtualWindowOptions {
  rowHeight: number;
  overscan?: number;
  totalItems: Ref<number> | (() => number);
}

export function useVirtualWindow(options: VirtualWindowOptions) {
  const scroller = ref<HTMLElement | null>(null);
  const scrollTop = ref(0);
  const viewportHeight = ref(0);
  const overscan = options.overscan ?? 8;

  const total = computed(() => {
    if (typeof options.totalItems === "function") {
      return options.totalItems();
    }
    return options.totalItems.value;
  });

  const startIndex = computed(() => Math.max(0, Math.floor(scrollTop.value / options.rowHeight) - overscan));

  const endIndex = computed(() =>
    Math.min(
      total.value,
      Math.ceil((scrollTop.value + viewportHeight.value) / options.rowHeight) + overscan
    )
  );

  const onScroll = () => {
    const el = scroller.value;
    if (!el) return;
    scrollTop.value = el.scrollTop;
    viewportHeight.value = el.clientHeight;
  };

  const scrollToIndex = (index: number) => {
    scrollTop.value = index * options.rowHeight;
    if (scroller.value) {
      scroller.value.scrollTop = scrollTop.value;
    }
  };

  let resizeObserver: ResizeObserver | null = null;

  onMounted(() => {
    if (!scroller.value) return;
    viewportHeight.value = scroller.value.clientHeight;
    resizeObserver = new ResizeObserver(() => {
      viewportHeight.value = scroller.value?.clientHeight ?? 0;
    });
    resizeObserver.observe(scroller.value);
  });

  onBeforeUnmount(() => {
    resizeObserver?.disconnect();
  });

  return {
    scroller,
    startIndex,
    endIndex,
    onScroll,
    scrollToIndex
  };
}
