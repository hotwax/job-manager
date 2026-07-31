<template>
  <div class="jt-node">
    <div class="jt-row" :class="{ 'jt-clickable': isExpandable }" @click="isExpandable && toggle()">
      <span class="jt-toggle">
        <ion-icon v-if="isExpandable" :icon="isOpen ? chevronDownOutline : chevronForwardOutline" />
      </span>
      <span v-if="hasKey" class="jt-key" v-html="highlight(String(name))" /><span v-if="hasKey" class="jt-punct">:&nbsp;</span>
      <template v-if="isContainer">
        <span class="jt-punct">{{ openBracket }}</span>
        <span v-if="!entries.length" class="jt-punct">{{ closeBracket }}</span>
        <template v-else-if="!isOpen">
          <span class="jt-summary">{{ entries.length }} {{ isArray ? translate("items") : translate("keys") }}</span>
          <span class="jt-punct">{{ closeBracket }}</span>
        </template>
      </template>
      <span v-else class="jt-value" :class="primitiveClass" v-html="highlight(primitiveText)" />
    </div>

    <div v-if="isExpandable && isOpen" class="jt-children">
      <json-node
        v-for="entry in visibleEntries"
        :key="entry.k"
        :name="entry.k"
        :value="entry.v"
        :is-array-item="isArray"
        :search="search"
        :bulk="bulk"
        :depth="depth + 1"
      />
      <ion-button v-if="hasMoreEntries" size="small" fill="clear" @click.stop="loadMore">
        {{ translate("Show more") }} ({{ remainingEntries }})
      </ion-button>
      <div class="jt-punct jt-close">
        {{ closeBracket }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { translate } from "@common";
import { IonButton, IonIcon } from "@ionic/vue";
import { chevronDownOutline, chevronForwardOutline } from "ionicons/icons";
import { computed, ref, watch } from "vue";

const props = defineProps<{
  name?: string | number;
  value: any;
  isArrayItem?: boolean;
  search: string;
  bulk: { token: number; open: boolean };
  depth: number;
}>();

defineOptions({ name: "JsonNode" });

const open = ref(props.bulk.token > 0 ? props.bulk.open : props.depth < 1);
const visibleLimit = ref(50);

watch(() => props.bulk.token, () => {
  open.value = props.bulk.open;
  if(props.bulk.open) {visibleLimit.value = Math.max(visibleLimit.value, 50);}
});

const hasKey = computed(() => props.name !== undefined && props.name !== null);
const isArray = computed(() => Array.isArray(props.value));
const isContainer = computed(() => props.value !== null && typeof props.value === "object");
const isExpandable = computed(() => isContainer.value && Object.keys(props.value).length > 0);
const openBracket = computed(() => (isArray.value ? "[" : "{"));
const closeBracket = computed(() => (isArray.value ? "]" : "}"));

const entries = computed(() => {
  if(isArray.value) {return props.value.map((v: any, i: number) => ({ k: i, v }));}
  if(isContainer.value) {return Object.entries(props.value).map(([k, v]) => ({ k, v }));}

  return [];
});

const visibleEntries = computed(() => {
  return entries.value.slice(0, visibleLimit.value);
});

const hasMoreEntries = computed(() => entries.value.length > visibleLimit.value);
const remainingEntries = computed(() => entries.value.length - visibleLimit.value);

const loadMore = () => {
  visibleLimit.value += 50;
};

const primitiveText = computed(() => {
  const v = props.value;
  if(v === null) {return "null";}
  if(typeof v === "string") {return `"${v}"`;}

  return String(v);
});

const primitiveClass = computed(() => {
  const v = props.value;
  if(v === null) {return "jt-null";}
  if(typeof v === "number") {return "jt-number";}
  if(typeof v === "boolean") {return "jt-boolean";}

  return "jt-string";
});

const toggle = () => {
  open.value = !open.value;
};

const isOpen = computed(() => open.value);

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c] as string));

const highlight = (text: string) => {
  const escaped = escapeHtml(text);
  if(!props.search) {return escaped;}
  const safe = props.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return escaped.replace(new RegExp(`(${safe})`, "ig"), "<mark>$1</mark>");
};
</script>

<style scoped>
.jt-node {
  line-height: 1.6;
}

.jt-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  border-radius: 4px;
}

.jt-clickable {
  cursor: pointer;
}

.jt-clickable:hover {
  background: var(--ion-color-step-100, #f0f0f0);
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

.jt-children {
  padding-inline-start: 16px;
  border-inline-start: 1px solid var(--ion-color-step-150, #e2e2e2);
  margin-inline-start: 7px;
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
