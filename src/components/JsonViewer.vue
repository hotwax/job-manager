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
    </div>
    <div class="jv-body">
      <json-node :value="data" :search="search" :bulk="bulk" :depth="0" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonButton, IonIcon } from "@ionic/vue";
import { addCircleOutline, removeCircleOutline } from "ionicons/icons";
import { ref } from "vue";
import { translate } from "@common";
import JsonNode from "@/components/JsonNode.vue";

defineProps<{
  data: any;
  search: string;
}>();

const bulk = ref({ token: 0, open: true });

const expandAll = () => {
  bulk.value = { token: bulk.value.token + 1, open: true };
};

const collapseAll = () => {
  bulk.value = { token: bulk.value.token + 1, open: false };
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
  gap: 4px;
  padding: 4px 8px;
  border-bottom: 1px solid var(--ion-color-step-150, #e2e2e2);
  background: var(--ion-color-step-50, #f9f9f9);
}

.jv-toolbar ion-button {
  --padding-start: 8px;
  --padding-end: 8px;
  font-size: 0.75rem;
}

.jv-body {
  padding: 12px 16px;
  overflow-x: auto;
  font-family: "Courier New", Courier, monospace;
  font-size: 0.85rem;
  max-height: 70vh;
  overflow-y: auto;
}
</style>
