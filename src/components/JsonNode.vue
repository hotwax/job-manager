<template>
  <div class="jt-node">
    <div class="jt-row" :class="{ 'jt-clickable': isExpandable }" @click="isExpandable && toggle()">
      <span class="jt-toggle">
        <ion-icon v-if="isExpandable" :icon="isOpen ? chevronDownOutline : chevronForwardOutline" />
      </span>
      <span v-if="hasKey" class="jt-key" v-html="highlight(String(name))"></span><span v-if="hasKey" class="jt-punct">:&nbsp;</span>
      <template v-if="isContainer">
        <span class="jt-punct">{{ openBracket }}</span>
        <span v-if="!entries.length" class="jt-punct">{{ closeBracket }}</span>
        <template v-else-if="!isOpen">
          <span class="jt-summary">{{ entries.length }} {{ isArray ? "items" : "keys" }}</span>
          <span class="jt-punct">{{ closeBracket }}</span>
        </template>
      </template>
      <span v-else class="jt-value" :class="primitiveClass" v-html="highlight(primitiveText)"></span>
    </div>

    <div v-if="isExpandable && isOpen" class="jt-children">
      <json-node
        v-for="entry in entries"
        :key="entry.k"
        :name="entry.k"
        :value="entry.v"
        :is-array-item="isArray"
        :search="search"
        :bulk="bulk"
        :depth="depth + 1"
      />
      <div class="jt-punct jt-close">{{ closeBracket }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from "@ionic/vue";
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

const open = ref(true);

watch(() => props.bulk.token, () => {
  open.value = props.bulk.open;
});

const hasKey = computed(() => props.name !== undefined && props.name !== null);
const isArray = computed(() => Array.isArray(props.value));
const isContainer = computed(() => props.value !== null && typeof props.value === "object");
const isExpandable = computed(() => isContainer.value && Object.keys(props.value).length > 0);
const openBracket = computed(() => (isArray.value ? "[" : "{"));
const closeBracket = computed(() => (isArray.value ? "]" : "}"));

const entries = computed(() => {
  if (isArray.value) return props.value.map((v: any, i: number) => ({ k: i, v }));
  if (isContainer.value) return Object.entries(props.value).map(([k, v]) => ({ k, v }));
  return [];
});

const primitiveText = computed(() => {
  const v = props.value;
  if (v === null) return "null";
  if (typeof v === "string") return `"${v}"`;
  return String(v);
});

const primitiveClass = computed(() => {
  const v = props.value;
  if (v === null) return "jt-null";
  if (typeof v === "number") return "jt-number";
  if (typeof v === "boolean") return "jt-boolean";
  return "jt-string";
});

const toggle = () => {
  open.value = !open.value;
};

// Search: reveal any node whose key or descendant contains the term.
const matches = (text: any) => !!props.search && String(text).toLowerCase().includes(props.search.toLowerCase());

const deepMatch = (val: any): boolean => {
  if (val !== null && typeof val === "object") {
    return Object.entries(val).some(([k, v]) => matches(k) || deepMatch(v));
  }
  return matches(val === null ? "null" : val);
};

const hasMatch = computed(() => (hasKey.value && matches(props.name)) || deepMatch(props.value));
const isOpen = computed(() => (props.search && hasMatch.value ? true : open.value));

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

const highlight = (text: string) => {
  const escaped = escapeHtml(text);
  if (!props.search) return escaped;
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
  align-items: flex-start;
  flex-wrap: wrap;
  border-radius: 4px;
}

.jt-clickable {
  cursor: pointer;
}

.jt-clickable:hover {
}

.jt-toggle {
  width: 16px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.jt-children {
  padding-inline-start: 16px;
  border-inline-start: 1px solid var(--ion-color-step-150, #e2e2e2);
  margin-inline-start: 7px;
}

.jt-summary {
  margin: 0 6px;
}

:deep(mark) {
  border-radius: 2px;
  padding: 0 1px;
}
</style>
