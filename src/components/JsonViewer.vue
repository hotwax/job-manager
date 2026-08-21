<template>
  <div class="json-viewer">
    <div class="jv-toolbar">
      <ion-button size="small" fill="clear" @click="expandAll">
        <ion-icon slot="start" :icon="addCircleOutline" />
        {{ translate("Expand all") }}
      </ion-button>
      <ion-button size="small" fill="clear" @click="collapseAll">
        <ion-icon slot="start" :icon="removeCircleOutline" />
        {{ translate("Collapse all") }}
      </ion-button>
      <span v-if="search" class="jv-match-count">
        {{ searchIndex.total ? translate("matches found", { count: searchIndex.total }) : translate("No matches") }}
      </span>
    </div>

    <div ref="scroller" class="jv-body" @scroll.passive="onScroll">
      <!-- Sizer reserves the full scroll height; only the rows in view are actually mounted. -->
      <div class="jv-sizer" :style="{ height: `${rows.length * ROW_HEIGHT}px` }">
        <div class="jv-window" :style="{ transform: `translateY(${startIndex * ROW_HEIGHT}px)` }">
          <div
            v-for="row in windowRows"
            :key="row.id"
            class="jt-row"
            :class="{ 'jt-clickable': row.kind === 'node' && row.childCount > 0 }"
            @click="row.kind === 'node' && row.childCount > 0 && toggle(row.path)"
          >
            <span v-for="guide in row.depth" :key="guide" class="jt-indent"></span>

            <template v-if="row.kind === 'close'">
              <span class="jt-punct">{{ row.isArray ? "]" : "}" }}</span>
            </template>

            <template v-else>
              <span class="jt-toggle">
                <ion-icon v-if="row.childCount > 0" :icon="row.open ? chevronDownOutline : chevronForwardOutline" />
              </span>
              <template v-if="row.name !== null">
                <span class="jt-key" v-html="highlight(String(row.name))"></span><span class="jt-punct">:&nbsp;</span>
              </template>
              <template v-if="row.isContainer">
                <span class="jt-punct">{{ row.isArray ? "[" : "{" }}</span>
                <span v-if="!row.childCount" class="jt-punct">{{ row.isArray ? "]" : "}" }}</span>
                <template v-else-if="!row.open">
                  <span class="jt-summary">{{ row.childCount }} {{ row.isArray ? translate("items") : translate("keys") }}</span>
                  <span class="jt-punct">{{ row.isArray ? "]" : "}" }}</span>
                </template>
              </template>
              <span v-else class="jt-value" :class="primitiveClass(row.value)" v-html="highlight(primitiveText(row.value))"></span>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonButton, IonIcon } from "@ionic/vue";
import { addCircleOutline, chevronDownOutline, chevronForwardOutline, removeCircleOutline } from "ionicons/icons";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { translate } from "@common";
import { buildJsonSearchIndex } from "@/utils/jsonSearch";
import { flattenJson, primitiveClass, primitiveText } from "@/utils/jsonRows";

const props = defineProps<{
  data: any;
  search: string;
}>();

// Must match .jt-row height in CSS: virtualization maps scroll offset to row index.
const ROW_HEIGHT = 24;
const OVERSCAN = 8;

const scroller = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const viewportHeight = ref(0);

// Expansion is stored as a set of paths that differ from `defaultOpen` rather than a set of
// open paths. That keeps expand/collapse all O(1) instead of enumerating every container.
const defaultOpen = ref(false);
const toggled = ref(new Set<string>());
const isOpen = (path: string) => (defaultOpen.value ? !toggled.value.has(path) : toggled.value.has(path));

const searchIndex = computed(() => buildJsonSearchIndex(props.data, props.search));
const rows = computed(() =>
  flattenJson(props.data, isOpen, props.search ? searchIndex.value : null)
);

const startIndex = computed(() => Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - OVERSCAN));
const endIndex = computed(() =>
  Math.min(rows.value.length, Math.ceil((scrollTop.value + viewportHeight.value) / ROW_HEIGHT) + OVERSCAN)
);
const windowRows = computed(() => rows.value.slice(startIndex.value, endIndex.value));

const onScroll = () => {
  const el = scroller.value;
  if (!el) return;
  scrollTop.value = el.scrollTop;
  // Free correction in case a resize was missed, e.g. the page was hidden when it mounted.
  viewportHeight.value = el.clientHeight;
};

const toggle = (path: string) => {
  const next = new Set(toggled.value);
  next.has(path) ? next.delete(path) : next.add(path);
  toggled.value = next;
};

const setAll = (open: boolean) => {
  defaultOpen.value = open;
  toggled.value = new Set<string>();
};
const expandAll = () => setAll(true);
const collapseAll = () => setAll(false);

// The root starts open so the viewer does not open on a single collapsed line.
watch(
  () => props.data,
  () => {
    defaultOpen.value = false;
    toggled.value = new Set<string>([""]);
    scrollTop.value = 0;
    if (scroller.value) scroller.value.scrollTop = 0;
  },
  { immediate: true }
);

// A new query changes which rows exist, so an old offset would land somewhere unrelated.
watch(
  () => props.search,
  () => {
    scrollTop.value = 0;
    if (scroller.value) scroller.value.scrollTop = 0;
  }
);

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
.json-viewer {
  border: 1px solid var(--ion-color-step-150, #e2e2e2);
  border-radius: 8px;
  overflow: hidden;
}

.jv-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-bottom: 1px solid var(--ion-color-step-150, #e2e2e2);
}

.jv-toolbar ion-button {
  --padding-start: 8px;
  --padding-end: 8px;
}

.jv-match-count {
  margin-inline-start: auto;
  padding-inline-end: 4px;
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}

.jv-body {
  padding: 12px 16px;
  max-height: min-content;
  height: 70vh;
  overflow: auto;
}

.jv-sizer {
  position: relative;
  min-width: max-content;
}

.jv-window {
  position: absolute;
  top: 0;
  inset-inline-start: 0;
  min-width: 100%;
  will-change: transform;
}

/* Rows are a fixed height so scroll offset maps directly to a row index. Values do not wrap;
   long ones scroll horizontally with the body instead. */
.jt-row {
  display: flex;
  align-items: center;
  height: 24px;
  white-space: nowrap;
  border-radius: 4px;
}

.jt-clickable {
  cursor: pointer;
}

.jt-clickable:hover {
  background: var(--ion-color-step-100, #f0f0f0);
}

.jt-indent {
  width: 16px;
  flex: none;
  align-self: stretch;
  border-inline-start: 1px solid var(--ion-color-step-150, #e2e2e2);
}

.jt-toggle {
  width: 16px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ion-color-medium);
}

.jt-toggle ion-icon {
  font-size: 0.85rem;
}

.jt-summary {
  color: #57606a;
  font-style: italic;
  margin: 0 6px;
}

.jt-key {
  color: var(--ion-color-dark);
  font-weight: 600;
}

.jt-punct {
  color: #57606a;
}

.jt-string {
  color: #0a7d2e;
}

.jt-number {
  color: #0b5cad;
}

.jt-boolean {
  color: #6f42c1;
  font-weight: 600;
}

.jt-null {
  color: #57606a;
  font-style: italic;
}

@media (prefers-color-scheme: dark) {
  .jt-punct,
  .jt-summary,
  .jt-null {
    color: #9aa4b2;
  }

  .jt-string {
    color: #7ee787;
  }

  .jt-number {
    color: #79c0ff;
  }

  .jt-boolean {
    color: #d2a8ff;
  }
}

:deep(mark) {
  background: var(--ion-color-warning, #ffc409);
  color: var(--ion-color-dark);
  border-radius: 2px;
  padding: 0 1px;
}
</style>
