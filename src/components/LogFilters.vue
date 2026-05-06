<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="end">
        <ion-button @click="closeModal()">
          <ion-icon :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Filters") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-item>
      <ion-select multiple :selectedText="selectedFilters['statusId'] || 'All'" :value="filters['statusId']" :label="translate('Status')" interface="popover" @ionChange="updateLogFilter('statusId', $event)">
        <ion-select-option v-for="statusItem in statusItems" :key="statusItem.statusId" :value="statusItem.statusId">{{ translate(statusItem.description) }}</ion-select-option>
      </ion-select>
    </ion-item>
    <ion-item>
      <ion-select multiple :selectedText="selectedFilters['priority'] || 'All'" :value="filters['priority']" :label="translate('Priority')" interface="popover" @ionChange="updateLogFilter('priority', $event)">
        <ion-select-option value="HIGH">{{ translate("High") }}</ion-select-option>
        <ion-select-option value="NORMAL">{{ translate("Normal") }}</ion-select-option>
      </ion-select>
    </ion-item>
    <ion-item>
      <ion-select multiple :selectedText="selectedFilters['configId'] || 'All'" :value="filters['configId']" :label="translate('Config')" interface="popover" @ionChange="updateLogFilter('configId', $event)">
        <ion-select-option v-for="configId in getConfigIds()" :key="configId" :value="configId">{{ translate(configId) }}</ion-select-option>
      </ion-select>
    </ion-item>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button @click="saveFilters">
      <ion-icon :icon="saveOutline"></ion-icon>
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonSelect, IonSelectOption, IonTitle, IonToolbar, modalController } from '@ionic/vue';
import { closeOutline, saveOutline } from 'ionicons/icons';
import { translate } from '@common';
import { useMdmConfigStore } from '@/store/mdmConfig';
import { computed, onMounted, reactive, toRef } from 'vue';
import { useUtilStore } from '@/store/util';

const mdmConfigStore = useMdmConfigStore();
const utilStore = useUtilStore();

const selectedFilters = reactive({} as Record<string, any>)

const statusItems = computed(() => utilStore.getStatusItemsByType("DataManagerLog"))
const configs = computed(() => useMdmConfigStore().getConfigs)

onMounted(() => {
  updateSelectedFiltersText();
})

const updateSelectedFiltersText = () => {
   for(const key in filters.value) {
    selectedFilters[key] = filters.value[key] ? filters.value[key].length > 3 ? `${filters.value[key].length} selected` : filters.value[key]?.join(", ") : "All"
  }
}

const props = defineProps(["appliedFilters"])

const filters: any = toRef(props, "appliedFilters")

function getConfigIds() {
  return configs.value.map((config: any) => config.configId)
}

function closeModal() {
  modalController.dismiss()
}

async function saveFilters() {
  Object.entries(filters.value).map(([type, value]) => {
    mdmConfigStore.updateAppliedFilters(type, value)
  })
  await mdmConfigStore.fetchDataManagerLogs()
  closeModal();
}

function updateLogFilter(filterType: string, event: any) {
  filters.value[filterType] = event.detail.value
  updateSelectedFiltersText()
}
</script>

<style scoped>
</style>
