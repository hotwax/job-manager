<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>{{ translate("File history") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <div class="header">
          <div class="title">
            <h1>{{ translate("Processed Files") }}</h1>
            <p>{{ translate("View history of processed files") }}</p>
          </div>
          <ion-segment v-model="filterStatus" class="filter-segment">
            <ion-segment-button value="all">
              <ion-label>{{ translate("All") }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="error">
              <ion-label>{{ translate("Problems") }}</ion-label>
            </ion-segment-button>
          </ion-segment>
        </div>

        <ion-list>
          <div class="list-item table-header log">
            <ion-label>{{ translate("Log Id") }}</ion-label>
            <ion-label class="file-name">{{ translate("File name") }}</ion-label>
            <ion-label>{{ translate("Status") }}</ion-label>
            <ion-label>{{ translate("Origin") }}</ion-label>
            <ion-label>{{ translate("Uploaded") }}</ion-label>
          </div>
          <div v-for="file in filteredFiles" :key="file.id" class="list-item log" @click="router.push({ name: 'FileDetail', params: { id: file.id } })" style="cursor: pointer;">
            <ion-label>{{ file.id }}</ion-label>
            <ion-item lines="none" class="file-name">
              <ion-icon slot="start" :icon="documentOutline" />
              <ion-label>
                <code>{{ file.name }}</code>
                <p>{{ file.size }}</p>
              </ion-label>
            </ion-item>
            <ion-label>
              <ion-chip :color="file.status === 'Error' ? 'danger' : 'success'">
                {{ translate(file.status) }}
              </ion-chip>
            </ion-label>
            <ion-label>{{ file.origin }}</ion-label>
            <ion-label>{{ file.uploaded }}</ion-label>
          </div>
        </ion-list>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
  IonMenuButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonChip
} from '@ionic/vue';
import { translate } from '@common';
import { documentOutline } from 'ionicons/icons';
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const filterStatus = ref('all');

const files = ref([
  {
    id: '123456789',
    name: 'File_1.csv',
    size: '1.2mb',
    status: 'Processed',
    origin: 'System',
    uploaded: '2 hours ago'
  },
  {
    id: '123456790',
    name: 'File_2.csv',
    size: '2.5mb',
    status: 'Error',
    origin: 'FTP',
    uploaded: '5 hours ago'
  },
  {
    id: '123456791',
    name: 'File_3.json',
    size: '500kb',
    status: 'Processed',
    origin: 'API',
    uploaded: '1 day ago'
  },
   {
    id: '123456792',
    name: 'File_4.xml',
    size: '1.5mb',
    status: 'Error',
    origin: 'System',
    uploaded: '2 days ago'
  }
]);

const filteredFiles = computed(() => {
  if (filterStatus.value === 'error') {
    return files.value.filter(file => file.status === 'Error');
  }
  return files.value;
});
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacer-base);
}

.filter-segment {
  width: auto;
  min-width: 200px;
}

.list-item.log {
  --columns-desktop: 7;
  padding: var(--spacer-sm) var(--spacer-base);
}

.file-name {
  grid-column: span 2;
  justify-self: start;
}
</style>
