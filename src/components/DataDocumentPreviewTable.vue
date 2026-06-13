<template>
  <div class="preview-table-container">
    <div class="preview-table-toolbar">
      <ion-searchbar
        v-model="query"
        :debounce="150"
        :placeholder="translate('Search results')"
      />
      <div class="preview-table-actions">
        <ion-button size="small" fill="clear" :disabled="!displayRows.length" @click="copyToClipboard">
          <ion-icon slot="start" :icon="copyOutline" />
          {{ translate("Copy") }}
        </ion-button>
        <ion-button size="small" fill="clear" :disabled="!displayRows.length" @click="downloadCsv">
          <ion-icon slot="start" :icon="downloadOutline" />
          {{ translate("CSV") }}
        </ion-button>
        <ion-button v-if="canExport" size="small" fill="clear" @click="$emit('run-export')">
          <ion-icon slot="start" :icon="cloudUploadOutline" />
          {{ translate("Run export") }}
        </ion-button>
      </div>
    </div>

    <p v-if="query" class="preview-table-count">
      {{ displayRows.length }} {{ translate("of") }} {{ rows.length }} {{ translate("rows") }}
    </p>

    <div class="preview-table-scroll">
      <table class="preview-table">
        <thead>
          <tr>
            <th v-for="column in columns" :key="column" @click="toggleSort(column)">
              <span>{{ column }}</span>
              <ion-icon
                v-if="sortColumn === column"
                :icon="sortDirection === 'asc' ? caretUpOutline : caretDownOutline"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in displayRows" :key="index">
            <td v-for="column in columns" :key="column">{{ formatCell(row[column]) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="rows.length && !displayRows.length" class="preview-table-empty">
      {{ translate("No rows match your search.") }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { IonButton, IonIcon, IonSearchbar } from "@ionic/vue";
import { caretDownOutline, caretUpOutline, cloudUploadOutline, copyOutline, downloadOutline } from "ionicons/icons";
import { saveAs } from "file-saver";
import { computed, ref } from "vue";

import { translate } from "@common";
import { showToast } from "@/utils";

const props = defineProps<{
  rows: Record<string, any>[];
  canExport?: boolean;
  fileName?: string;
}>();

defineEmits<{ (event: "run-export"): void }>();

const query = ref("");
const sortColumn = ref("");
const sortDirection = ref<"asc" | "desc">("asc");

// Union of keys across all rows, in first-seen order (the API omits null-valued fields,
// so different rows can carry different key sets).
const columns = computed(() => {
  const seen: string[] = [];
  for (const row of props.rows) {
    for (const key of Object.keys(row || {})) {
      if (!seen.includes(key)) seen.push(key);
    }
  }
  return seen;
});

const formatCell = (value: any) => (value === undefined || value === null ? "" : String(value));

const filteredRows = computed(() => {
  const search = query.value.trim().toLowerCase();
  if (!search) return props.rows;
  return props.rows.filter((row) =>
    columns.value.some((column) => formatCell(row[column]).toLowerCase().includes(search))
  );
});

const displayRows = computed(() => {
  if (!sortColumn.value) return filteredRows.value;
  const column = sortColumn.value;
  const direction = sortDirection.value === "asc" ? 1 : -1;
  return [...filteredRows.value].sort((a, b) => {
    const aValue = a[column];
    const bValue = b[column];
    const aEmpty = aValue === undefined || aValue === null || aValue === "";
    const bEmpty = bValue === undefined || bValue === null || bValue === "";
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1; // keep blanks last regardless of direction
    if (bEmpty) return -1;
    const aNumber = Number(aValue);
    const bNumber = Number(bValue);
    if (!Number.isNaN(aNumber) && !Number.isNaN(bNumber)) return (aNumber - bNumber) * direction;
    return String(aValue).localeCompare(String(bValue)) * direction;
  });
});

const toggleSort = (column: string) => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  } else {
    sortColumn.value = column;
    sortDirection.value = "asc";
  }
};

// Copy/CSV operate on what's currently shown (after search + sort), so "what you see is
// what you get".
const escapeCsv = (value: any) => {
  const cell = formatCell(value);
  return /[",\n\r]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
};

const buildCsv = () => [
  columns.value.map(escapeCsv).join(","),
  ...displayRows.value.map((row) => columns.value.map((column) => escapeCsv(row[column])).join(","))
].join("\r\n");

const buildTsv = () => [
  columns.value.join("\t"),
  ...displayRows.value.map((row) => columns.value.map((column) => formatCell(row[column]).replace(/\t|\n|\r/g, " ")).join("\t"))
].join("\n");

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(buildTsv());
    showToast(`${translate("Copied")} ${displayRows.value.length} ${translate("rows")}`);
  } catch (error) {
    showToast(translate("Could not copy to clipboard."));
  }
};

const downloadCsv = () => {
  const blob = new Blob([buildCsv()], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, props.fileName ? `${props.fileName}.csv` : "preview.csv");
};
</script>

<style scoped>
.preview-table-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.preview-table-toolbar ion-searchbar {
  flex: 1 1 200px;
  padding-inline: 0;
}

.preview-table-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.preview-table-count {
  margin: 4px 0;
  color: var(--ion-color-medium);
  font-size: 0.8125rem;
}

.preview-table-scroll {
  overflow: auto;
  max-height: 420px;
  border: 1px solid var(--ion-color-step-150, #e0e0e0);
  border-radius: 6px;
}

.preview-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.8125rem;
}

.preview-table th,
.preview-table td {
  text-align: left;
  padding: 8px 12px;
  white-space: nowrap;
  border-bottom: 1px solid var(--ion-color-step-100, #ededed);
}

.preview-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--ion-background-color, #fff);
  color: var(--ion-color-medium-shade);
  cursor: pointer;
  user-select: none;
}

.preview-table th ion-icon {
  vertical-align: middle;
  margin-inline-start: 4px;
}

.preview-table tbody tr:nth-child(even) {
  background: var(--ion-color-step-50, #f7f7f7);
}

.preview-table-empty {
  padding: 12px;
  color: var(--ion-color-medium);
}
</style>
