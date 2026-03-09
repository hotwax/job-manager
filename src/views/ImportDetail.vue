<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/manual-uploads"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ config.scriptTitle || config.configId || typeId }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <template v-if="config.configId">
          <div class="header">
            <ion-label class="title">
              <p class="outline">{{ getQueueType(config.priority) }}</p>
              <h1>{{ config.scriptTitle || config.configId }}</h1>
              <p>{{ translate("Upload a file to queue it for processing.") }}</p>
            </ion-label>
            <ion-button fill="outline" @click="downloadTemplate">
              <ion-icon slot="start" :icon="downloadOutline" />
              {{ translate("Download Template") }}
            </ion-button>
          </div>

          <section class="upload-selection">
            <h3>{{ translate("Upload File") }}</h3>
            <div class="upload-area" @dragover.prevent @drop.prevent="onDrop">
              <ion-icon :icon="selectedFile ? documentTextOutline : cloudUploadOutline" color="medium" />
              <p v-if="!selectedFile">
                <a href="#" @click.prevent="triggerFileInput">{{ translate("Upload a file") }}</a> 
                {{ translate(" or drag and drop") }}
              </p>
              <p v-else>
                {{ selectedFile.name }}
                <ion-button size="small" fill="clear" color="danger" @click="removeFile">
                  <ion-icon slot="icon-only" :icon="trashOutline" />
                </ion-button>
              </p>
              <!-- <ion-note>{{ translate("File up to 10MB") }}</ion-note> -->
              <input type="file" ref="fileInput" @change="onFileSelected" hidden :accept="acceptTypes" />
            </div>
          </section>

          <div class="footer-actions">
            <ion-button :disabled="!selectedFile" @click="startImport">
              <ion-icon slot="start" :icon="sendOutline" />
              {{ translate("Start Import") }}
            </ion-button>
          </div>
        </template>
        <template v-else>
          <p class="empty-state">{{ translate("Failed to fetch config details, try again or check data") }}</p>
        </template>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import router from '@/router';
import { IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonButton, IonIcon, IonRadioGroup, IonRadio, IonItem, IonLabel, onIonViewWillEnter} from '@ionic/vue';
import { downloadOutline, cloudUploadOutline, documentTextOutline, trashOutline, sendOutline, cartOutline, cubeOutline, shapesOutline, peopleOutline, arrowUndoOutline } from 'ionicons/icons';
import { api, translate } from '@common';
import { showToast } from '@/utils';
import { useMdmConfigStore } from '@/store/mdmConfig';
import logger from '@/logger';
import { getQueueType } from '@/utils/config';
import { saveAs } from 'file-saver';

const route = router.currentRoute.value;
const typeId = route.params.type as string; // 'sales-orders', etc.
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const acceptTypes = ".csv, .json";

const mdmStore = useMdmConfigStore();

const config = computed(() => mdmStore.getConfigById(typeId))

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

const downloadTemplate = async () => {
  try {
    let resp = await api({
      url: `admin/dataManager/${config.value.configId}/downloadTemplate`,
      method: "GET",
      headers: {
        'Accept': 'text/csv',
      },
      responseType: "blob"
    })
    saveAs(new Blob([resp.data]), `${config.value.description || config.value.configId}.csv`)
    showToast(translate('Template downloaded successfully'));
  } catch(err) {
    logger.error("Failed to download template", err)
    showToast(translate("Failed to download template"));
  }
};

const startImport = async () => {
  const formData = new FormData();
  if(selectedFile.value) {
    formData.append("contentFile", selectedFile.value);
    formData.append("configId", typeId)
  }
  try {
    await api({
      url: "admin/uploadDataManagerFile",
      method: "POST",
      data: formData,
      headers: {
        "Content-Type": "mutipart/form-data"
      }
    })
    showToast(translate("File uploaded successfully"));
    // On success, we want to clear the selectedFile data from the page
    removeFile();
  } catch(err) {
    showToast(translate("File upload failed"));
    logger.error("File upload failed", err)
  }
};

onIonViewWillEnter(async () => {
  await mdmStore.fetchConfigById(typeId);
})
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
  padding-top: var(--spacer-sm);
}
</style>
