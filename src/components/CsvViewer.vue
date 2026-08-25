<template>
  <div class="csv-viewer">
    <div class="cv-toolbar">
      <span class="cv-count">
        <template v-if="!search">{{ translate("row count", { count: rows.length }) }}</template>
        <template v-else>{{ translate("filtered row count", { shown: filteredRows.length, total: rows.length }) }}</template>
      </span>
    </div>

    <div
      ref="scroller"
      class="cv-body"
      @scroll.passive="onScroll"
      :style="{ '--cv-row-height': rowHeight, '--cv-columns': gridTemplate }"
    >
      <!-- In normal flow, so it defines the horizontal extent no matter which rows are
           windowed, and sticks to the top while the body scrolls under it. -->
      <div class="cv-head">
        <div v-for="col in columns" :key="col" class="cv-cell cv-th" :title="col">{{ col }}</div>
      </div>

      <!-- Sizer reserves the full scroll height; only the rows in view are mounted. -->
      <div class="cv-sizer" :style="{ '--cv-total-height': totalHeight }">
        <div class="cv-window" :style="{ '--cv-window-offset': windowOffset }">
          <div v-for="(row, i) in windowRows" :key="startIndex + i" class="cv-row">
            <div v-for="col in columns" :key="col" class="cv-cell" :title="cellText(row[col])">
              <span v-html="highlight(cellText(row[col]))"></span>
            </div>
          </div>
        </div>
      </div>

      <p v-if="!filteredRows.length" class="cv-empty">{{ translate("No matching rows") }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { translate } from "@common";

const props = defineProps<{
  rows: any[];
  search: string;
}>();

// The single source of truth for row height. The stylesheet reads it back through
// --cv-row-height, so the scroll maths and the rendered row cannot drift apart.
const ROW_HEIGHT = 28;
const OVERSCAN = 8;
// Column widths are estimated from the head of the file. Measuring every row would be slow,
// and measuring only the mounted rows would make columns jump around while scrolling.
const WIDTH_SAMPLE = 200;

const scroller = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const viewportHeight = ref(0);

const rowHeight = `${ROW_HEIGHT}px`;
const columns = computed(() => (props.rows.length ? Object.keys(props.rows[0]) : []));

const filteredRows = computed(() => {
  const query = props.search.trim().toLowerCase();
  if (!query) return props.rows;
  return props.rows.filter((row: any) =>
    Object.values(row).some((value: any) => String(value ?? "").toLowerCase().includes(query))
  );
});

const gridTemplate = computed(() => {
  const sample = Math.min(WIDTH_SAMPLE, props.rows.length);
  return columns.value
    .map((col) => {
      let widest = col.length;
      for (let i = 0; i < sample; i++) {
        const value = props.rows[i]?.[col];
        const length = value == null ? 0 : String(value).length;
        if (length > widest) widest = length;
      }
      // ch units let the browser resolve the width against the actual font.
      return `${Math.min(Math.max(widest + 2, 8), 48)}ch`;
    })
    .join(" ");
});

const startIndex = computed(() => Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - OVERSCAN));
const endIndex = computed(() =>
  Math.min(filteredRows.value.length, Math.ceil((scrollTop.value + viewportHeight.value) / ROW_HEIGHT) + OVERSCAN)
);
const windowRows = computed(() => filteredRows.value.slice(startIndex.value, endIndex.value));

const totalHeight = computed(() => `${filteredRows.value.length * ROW_HEIGHT}px`);
const windowOffset = computed(() => `${startIndex.value * ROW_HEIGHT}px`);

const cellText = (value: any) => (value == null ? "" : String(value));

const onScroll = () => {
  const el = scroller.value;
  if (!el) return;
  scrollTop.value = el.scrollTop;
  // Free correction in case a resize was missed, e.g. the page was hidden when it mounted.
  viewportHeight.value = el.clientHeight;
};

// A new filter changes which rows exist, so an old offset would land somewhere unrelated.
watch([() => props.rows, () => props.search], () => {
  scrollTop.value = 0;
  if (scroller.value) scroller.value.scrollTop = 0;
});

let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  if (!scroller.value) return;
  viewportHeight.value = scroller.value.clientHeight;
  resizeObserver = new ResizeObserver(() => {
    viewportHeight.value = scroller.value?.clientHeight ?? 0;
  });
  resizeObserver.observe(scroller.value);
});
onBeforeUnmount(() => resizeObserver?.disconnect());

const searchRegExp = computed(() => {
  if (!props.search) return null;
  const safe = props.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(${safe})`, "ig");
});

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

const highlight = (text: string) => {
  const escaped = escapeHtml(text);
  const regExp = searchRegExp.value;
  if (!regExp) return escaped;
  regExp.lastIndex = 0;
  return escaped.replace(regExp, "<mark>$1</mark>");
};
</script>

<style scoped>
.csv-viewer {
  border: 1px solid var(--ion-color-step-150, #e2e2e2);
  border-radius: 8px;
  overflow: hidden;
}

.cv-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 6px 10px;
  border-bottom: 1px solid var(--ion-color-step-150, #e2e2e2);
}

.cv-count {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}

.cv-body {
  max-height: 70vh;
  height: 70vh;
  overflow: auto;
}

.cv-head,
.cv-row {
  display: grid;
  grid-template-columns: var(--cv-columns);
  width: max-content;
  min-width: 100%;
  height: var(--cv-row-height, 28px);
}

.cv-head {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--ion-background-color, #fff);
  border-bottom: 1px solid var(--ion-color-step-150, #e2e2e2);
}

.cv-sizer {
  position: relative;
  height: var(--cv-total-height, 0);
}

.cv-window {
  position: absolute;
  top: 0;
  inset-inline-start: 0;
  /* Slides the mounted rows to the scroll offset they represent. */
  transform: translateY(var(--cv-window-offset, 0));
  will-change: transform;
}

.cv-row:nth-child(even) {
  background: var(--ion-color-step-50, #f7f7f7);
}

.cv-cell {
  display: flex;
  align-items: center;
  padding: 0 10px;
  border-inline-end: 1px solid var(--ion-color-step-150, #e2e2e2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cv-cell span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.cv-th {
  font-weight: 600;
}

.cv-empty {
  padding: var(--spacer-base, 16px);
  text-align: center;
}

:deep(mark) {
  background: var(--ion-color-warning, #ffc409);
  color: var(--ion-color-dark);
  border-radius: 2px;
  padding: 0 1px;
}
</style>
