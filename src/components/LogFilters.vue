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
    {{ appliedFilters['statusId'] }}
    <ion-item>
      <ion-select :multiple="true" :value="appliedFilters['statusId']" :label="translate('Status')" interface="popover" @ionChange="updateLogFilter('statusId', $event)">
        <ion-select-option v-for="statusItem in statusItems" :key="statusItem.statusId" :value="statusItem.statusId">{{ translate(statusItem.description) }}</ion-select-option>
      </ion-select>
    </ion-item>
    <!-- <ion-item>
      <ion-select :label="translate('Created Date')" interface="popover" @ionChange="updateLogFilter('statusId', $event)">
        <ion-select-option value="asc">{{ translate("Asc") }}</ion-select-option>
        <ion-select-option value="desc">{{ translate("Desc") }}</ion-select-option>
      </ion-select>
    </ion-item> -->
    <ion-item>
      <ion-select :multiple="true" :value="appliedFilters['priority']" :label="translate('Priority')" interface="popover" @ionChange="updateLogFilter('priority', $event)">
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
import { IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonLabel, IonList, IonListHeader, IonSelect, IonSelectOption, IonTextarea, IonTitle, IonToolbar, modalController } from '@ionic/vue';
import { closeOutline, saveOutline } from 'ionicons/icons';
import { translate } from '@common';
import { useMdmConfigStore } from '@/store/mdmConfig';
import { computed } from 'vue';
import { useUtilStore } from '@/store/util';

const mdmConfigStore = useMdmConfigStore();
const utilStore = useUtilStore();

const appliedFilters = computed(() => mdmConfigStore.getAppliedFilters)
const statusItems = computed(() => utilStore.getStatusItems("DataManagerLog"))

function closeModal() {
  modalController.dismiss()
}

async function saveFilters() {
  await mdmConfigStore.fetchDataManagerLogs()
  closeModal();
}

function updateLogFilter(filterType: string, event: any) {
  mdmConfigStore.updateAppliedFilters(filterType, event.detail.value)
}
</script>

<style scoped>
</style>
