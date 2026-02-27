<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/manual-uploads"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ translate(title) }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <div class="header">
          <div class="title">
            <div>
              <h1>{{ translate("Import " + title) }}</h1>
              <p>{{ translate("Upload a " + fileType + " file to queue it for processing.") }}</p>
            </div>
          </div>
          <ion-button fill="outline" @click="downloadTemplate">
            <ion-icon slot="start" :icon="downloadOutline" />
            {{ translate("Download Template") }}
          </ion-button>
        </div>

        <section class="queue-selection">
          <h3>{{ translate("Assign to Queue") }}</h3>
          <ion-radio-group v-model="selectedQueue">
              <ion-item v-for="queue in queues" :key="queue.id" lines="none" class="queue-item">
                <ion-label>
                  {{ translate(queue.name) }}
                  <p>{{ queue.pending }} {{ translate("files pending") }}</p>
                </ion-label>
                <ion-radio :value="queue.id" slot="end" mode="md"></ion-radio>
              </ion-item>
          </ion-radio-group>
        </section>

        <section class="upload-selection">
          <h3>{{ translate("Upload File") }}</h3>
          <div class="upload-area" @dragover.prevent @drop.prevent="onDrop">
            <ion-icon :icon="cloudUploadOutline" color="medium" />
            <p>
              <a href="#" @click.prevent="triggerFileInput">{{ translate("Upload a file") }}</a> 
              {{ translate(" or drag and drop") }}
            </p>
            <ion-note>{{ fileType }} {{ translate("up to 10MB") }}</ion-note>
            <input type="file" ref="fileInput" @change="onFileSelected" hidden :accept="acceptTypes" />
          </div>
          <ion-item v-if="selectedFile" lines="none" class="selected-file">
            <ion-icon slot="start" :icon="documentTextOutline" />
            <ion-label>{{ selectedFile.name }}</ion-label>
            <ion-button slot="end" fill="clear" color="danger" @click="removeFile">
              <ion-icon slot="icon-only" :icon="trashOutline" />
            </ion-button>
          </ion-item>
        </section>

        <div class="footer-actions">
          <ion-button fill="clear" color="medium" @click="$router.back()">{{ translate("Cancel") }}</ion-button>
          <ion-button :disabled="!selectedFile" @click="startImport">
            <ion-icon slot="start" :icon="sendOutline" />
            {{ translate("Start Import") }}
          </ion-button>
        </div>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import router from '@/router';
import { 
  IonPage, 
  IonHeader, 
  IonToolbar, 
  IonButtons, 
  IonBackButton, 
  IonTitle, 
  IonContent,
  IonButton,
  IonIcon,
  IonRadioGroup,
  IonRadio,
  IonItem,
  IonLabel
} from '@ionic/vue';
import { 
  downloadOutline, 
  cloudUploadOutline, 
  documentTextOutline, 
  trashOutline, 
  sendOutline,
  cartOutline,
  cubeOutline,
  shapesOutline,
  peopleOutline,
  arrowUndoOutline
} from 'ionicons/icons';
import { translate } from '@common';
import { showToast } from '@/utils';

const route = router.currentRoute.value;
const typeId = route.params.type as string; // 'sales-orders', etc.
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const selectedQueue = ref('standard');

const queues = [
  { id: 'high', name: 'High Priority', pending: '4' },
  { id: 'standard', name: 'Standard', pending: '12' },
  { id: 'background', name: 'Background', pending: '128' }
];

const typeConfig = computed(() => {
  switch (typeId) {
    case 'sales-orders':
      return { title: 'Sales Orders', icon: cartOutline, fileType: 'CSV', accept: '.csv' };
    case 'inventory-counts':
      return { title: 'Inventory Counts', icon: cubeOutline, fileType: 'CSV', accept: '.csv' };
    case 'product-catalog':
      return { title: 'Product Catalog', icon: shapesOutline, fileType: 'JSON', accept: '.json' };
    case 'customer-data':
      return { title: 'Customer Data', icon: peopleOutline, fileType: 'CSV', accept: '.csv' };
    case 'returns':
      return { title: 'Returns (RMA)', icon: arrowUndoOutline, fileType: 'CSV', accept: '.csv' };
    default:
      return { title: 'Unknown', icon: documentTextOutline, fileType: 'File', accept: '*/*' };
  }
});

const title = typeConfig.value.title;
const fileType = typeConfig.value.fileType;
const acceptTypes = typeConfig.value.accept;

const triggerFileInput = () => {
  fileInput.value?.click();
};

const onFileSelected = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0];
  }
};

const onDrop = (event: DragEvent) => {
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    selectedFile.value = event.dataTransfer.files[0];
  }
};

const removeFile = () => {
  selectedFile.value = null;
  if (fileInput.value) fileInput.value.value = '';
};

const downloadTemplate = () => {
  showToast(translate('Template downloaded successfully'));
};

const startImport = () => {
  showToast(translate('Import started successfully'));
  // Logic to actually upload the file would go here
};
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  gap: var(--spacer-sm);
  justify-content: space-between;
}

.queue-selection ion-radio-group {
 display: flex; 
 gap: var(--spacer-base);
 flex-wrap: wrap;
}

.queue-item {
  border: 1px solid var(--ion-color-light);
  border-radius: 8px;
  flex: 1;
}

.upload-area {
  border: 2px dashed var(--ion-color-medium);
  border-radius: 12px;
  padding: var(--spacer-xl);
  text-align: center;
  background-color: var(--ion-color-light);
}

.upload-area ion-icon {
  font-size: 48px;
}

.upload-area a {
  color: var(--ion-color-primary);
  font-weight: 600;
  text-decoration: none;
}

.selected-file {
  border: 1px solid var(--ion-color-light);
  border-radius: 8px;
  margin-top: var(--spacer-base);
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacer-sm);
  margin-top: var(--spacer-xl);
  padding-top: var(--spacer-sm);
  border-top: 1px solid var(--ion-color-light);
}
</style>
