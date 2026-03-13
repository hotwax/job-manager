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
      <ion-select :multiple="true" :value="filters['statusId']" :label="translate('Status')" interface="popover" @ionChange="updateLogFilter('statusId', $event)">
        <ion-select-option v-for="statusItem in statusItems" :key="statusItem.statusId" :value="statusItem.statusId">{{ translate(statusItem.description) }}</ion-select-option>
      </ion-select>
    </ion-item>
    <ion-item>
      <ion-select :multiple="true" :value="filters['priority']" :label="translate('Priority')" interface="popover" @ionChange="updateLogFilter('priority', $event)">
        <ion-select-option value="PRIORITY">{{ translate("High") }}</ion-select-option>
        <ion-select-option value="NORMAL">{{ translate("Normal") }}</ion-select-option>
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
import { IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonLabel, IonList, IonListHeader, IonSelect, IonSelectOption, IonTextarea, IonTitle, IonToolbar, modalController, onIonViewWillEnter } from '@ionic/vue';
import { closeOutline, saveOutline } from 'ionicons/icons';
import { translate } from '@common';
import { useMdmConfigStore } from '@/store/mdmConfig';
import { computed, toRef, toRefs } from 'vue';
import { useUtilStore } from '@/store/util';

const mdmConfigStore = useMdmConfigStore();
const utilStore = useUtilStore();

const statusItems = computed(() => utilStore.getStatusItems("DataManagerLog"))

const props = defineProps(["appliedFilters"])

const filters: any = toRef(props, 'appliedFilters')

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
  console.log('filters.value, ', filters.value)
  filters.value[filterType] = event.detail.value
}
</script>

<style scoped>
</style>
