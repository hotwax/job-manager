<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/manual-uploads"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ displayTitle }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <template v-if="config.configId">
          <div class="header">
            <ion-label class="title">
              <p class="outline">{{ getQueueType(config.priority) }}</p>
              <h1>{{ displayTitle }}</h1>
              <p>{{ config.scriptTitle || config.configId || translate("Upload a file to queue it for processing.") }}</p>
            </ion-label>
            <ion-button fill="outline" @click="downloadTemplate">
              <ion-icon slot="start" :icon="downloadOutline" />
              {{ translate("Download Template") }}
            </ion-button>
          </div>

          <section class="upload-selection">
            <h3>{{ translate("Upload File") }}</h3>
            <div class="upload-area" @dragover.prevent @drop.prevent="onDrop">
              <ion-icon class="upload-icon" :icon="selectedFile ? documentTextOutline : cloudUploadOutline" color="medium" />
              <p class="ion-display-flex ion-justify-content-center ion-align-items-center" v-if="!selectedFile">
                <a href="#" @click.prevent="triggerFileInput">{{ translate("Upload a file") }}</a>&nbsp;{{ translate("or drag and drop") }}
              </p>
              <p class="ion-display-flex ion-justify-content-center ion-align-items-center" v-else>
                {{ selectedFile.name }}
                <ion-button size="default" fill="clear" color="danger" @click="removeFile">
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

          <div class="meta-cards">
            <ion-card>
              <ion-card-header class="card-header-row">
                <ion-card-title>{{ translate("Configuration") }}</ion-card-title>
                <ion-button v-if="!isEditing" fill="clear" size="small" @click="startEditing">
                  <ion-icon slot="start" :icon="createOutline" />
                  {{ translate("Edit") }}
                </ion-button>
                <div v-else class="edit-actions">
                  <ion-button size="small" fill="clear" color="medium" @click="cancelEditing">{{ translate("Cancel") }}</ion-button>
                  <ion-button size="small" fill="outline" :disabled="isSaving" @click="saveConfig">{{ translate("Save") }}</ion-button>
                </div>
              </ion-card-header>

              <ion-list v-if="!isEditing">
                <ion-item>
                  <ion-label class="ion-text-wrap">
                    <p>{{ translate("Config ID") }}</p>
                    {{ config.configId }}
                  </ion-label>
                </ion-item>
                <ion-item>
                  <ion-label class="ion-text-wrap">
                    <p>{{ translate("Import Service") }}</p>
                    {{ config.importServiceName }}
                  </ion-label>
                </ion-item>
                <ion-item>
                  <ion-label class="ion-text-wrap">
                    <p>{{ translate("Name") }}</p>
                    {{ config.scriptTitle || "-" }}
                  </ion-label>
                </ion-item>
                <ion-item v-if="config.description">
                  <ion-label class="ion-text-wrap">
                    <p>{{ translate("Description") }}</p>
                    {{ config.description }}
                  </ion-label>
                </ion-item>
                <ion-item>
                  <ion-label class="ion-text-wrap">
                    <p>{{ translate("Priority") }}</p>
                    {{ config.priority ?? "-" }} ({{ translate(getQueueType(config.priority)) }})
                  </ion-label>
                </ion-item>
                <ion-item v-if="config.executionModeId">
                  <ion-label class="ion-text-wrap">
                    <p>{{ translate("Execution Mode") }}</p>
                    {{ getExecutionModeLabel(config.executionModeId) }}
                  </ion-label>
                </ion-item>
                <ion-item v-if="config.multiThreading">
                  <ion-label class="ion-text-wrap">
                    <p>{{ translate("Multi Threading") }}</p>
                    {{ config.multiThreading === "Y" ? translate("Yes") : translate("No") }}
                  </ion-label>
                </ion-item>
                <ion-item v-if="config.fileNamePattern">
                  <ion-label class="ion-text-wrap">
                    <p>{{ translate("File Name Pattern") }}</p>
                    {{ config.fileNamePattern }}
                  </ion-label>
                </ion-item>
                <ion-item v-if="config.importPath">
                  <ion-label class="ion-text-wrap">
                    <p>{{ translate("Import Path") }}</p>
                    {{ config.importPath }}
                  </ion-label>
                </ion-item>
              </ion-list>

              <ion-card-content v-else class="form-grid">
                <ion-input :label="translate('Description')" label-placement="stacked" fill="outline" :value="editForm.description" @ionInput="editForm.description = $event.detail.value || ''" />
                <ion-input :label="translate('Name')" label-placement="stacked" fill="outline" :value="editForm.scriptTitle" @ionInput="editForm.scriptTitle = $event.detail.value || ''" />
                <ion-input :label="translate('Priority')" label-placement="stacked" fill="outline" type="number" :value="editForm.priority" @ionInput="editForm.priority = $event.detail.value || ''" :helper-text="translate('Above 6 runs on the priority queue.')" />
                <ion-select :label="translate('Execution Mode')" label-placement="stacked" fill="outline" interface="popover" :value="editForm.executionModeId" @ionChange="editForm.executionModeId = $event.detail.value">
                  <ion-select-option v-for="mode in executionModes" :key="mode.enumId" :value="mode.enumId">{{ mode.description || mode.enumId }}</ion-select-option>
                </ion-select>
                <ion-select :label="translate('Multi Threading')" label-placement="stacked" fill="outline" interface="popover" :value="editForm.multiThreading" @ionChange="editForm.multiThreading = $event.detail.value">
                  <ion-select-option value="Y">{{ translate("Yes") }}</ion-select-option>
                  <ion-select-option value="N">{{ translate("No") }}</ion-select-option>
                </ion-select>
                <ion-input :label="translate('File Name Pattern')" label-placement="stacked" fill="outline" :value="editForm.fileNamePattern" @ionInput="editForm.fileNamePattern = $event.detail.value || ''" />
                <ion-input :label="translate('Import Path')" label-placement="stacked" fill="outline" :value="editForm.importPath" @ionInput="editForm.importPath = $event.detail.value || ''" />
              </ion-card-content>
            </ion-card>

            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ translate("Import Service Parameters") }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p class="param-note">{{ translate("Input parameters accepted by the import service. This metadata is read-only.") }}</p>
              </ion-card-content>
              <div v-if="areParamsLoading" class="param-loading">
                <ion-spinner name="crescent" />
              </div>
              <ion-list v-else-if="serviceInParameters.length">
                <ion-item v-for="parameter in serviceInParameters" :key="parameter.name">
                  <ion-label class="ion-text-wrap">
                    {{ parameter.name }}
                    <p v-if="parameter.type">{{ parameter.type }}</p>
                    <p v-if="parameter.default">{{ translate("Default:") }} {{ parameter.default }}</p>
                  </ion-label>
                  <ion-badge v-if="parameter.required === 'true'" slot="end" color="medium">{{ translate("Required") }}</ion-badge>
                </ion-item>
              </ion-list>
              <ion-card-content v-else>
                <p class="param-note">{{ translate("No input parameters found for this service.") }}</p>
              </ion-card-content>
            </ion-card>
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
import { ref, computed, reactive } from "vue";
import router from "@/router";
import { IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon, IonInput, IonList, IonRadioGroup, IonRadio, IonItem, IonLabel, IonSelect, IonSelectOption, IonSpinner, onIonViewWillEnter } from "@ionic/vue";
import { downloadOutline, cloudUploadOutline, createOutline, documentTextOutline, trashOutline, sendOutline, cartOutline, cubeOutline, shapesOutline, peopleOutline, arrowUndoOutline } from "ionicons/icons";
import { api, translate } from "@common";
import { saveDataFile, showToast } from "@/utils";
import { useMdmConfigStore } from "@/store/mdmConfig";
import { useJobStore } from "@/store/jobs";
import logger from "@/logger";
import { getQueueType } from "@/utils/config";
import { saveAs } from "file-saver";

const route = router.currentRoute.value;
const typeId = route.params.type as string; // 'sales-orders', etc.
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const acceptTypes = ".csv, .json";

const mdmStore = useMdmConfigStore();
const jobStore = useJobStore();

const config = computed(() => mdmStore.getConfigById(typeId));
const executionModes = computed(() => mdmStore.getExecutionModes);
const displayTitle = computed(() => config.value.description || config.value.scriptTitle || config.value.configId || typeId);

const isEditing = ref(false);
const isSaving = ref(false);
// Fields of DataManagerConfig that are safe to update from this screen; the
// import service and config id stay read-only.
const editableFields = ["description", "scriptTitle", "priority", "executionModeId", "multiThreading", "fileNamePattern", "importPath"];
const editForm = reactive<Record<string, any>>({});

const serviceParameters = ref<Array<any>>([]);
const areParamsLoading = ref(false);
// Parameters prefixed with an underscore (e.g. _importId, _recordNumber) are
// injected by the data manager framework and are not operator inputs.
const serviceInParameters = computed(() => serviceParameters.value.filter((parameter: any) => !parameter?.name?.startsWith("_")));

const getExecutionModeLabel = (enumId: string) => {
  const mode = executionModes.value.find((mode: any) => mode.enumId === enumId);
  return mode?.description || enumId;
};

const startEditing = () => {
  editableFields.forEach((field) => {
    editForm[field] = config.value[field] ?? "";
  });
  isEditing.value = true;
};

const cancelEditing = () => {
  isEditing.value = false;
};

const saveConfig = async () => {
  const updates = editableFields.reduce((changedFields: Record<string, any>, field) => {
    let value = editForm[field];
    if (field === "priority") {
      value = value === "" || value === null ? null : Number(value);
    } else if (value === "") {
      value = null;
    }
    if (value !== (config.value[field] ?? null)) {
      changedFields[field] = value;
    }
    return changedFields;
  }, {});

  if (!Object.keys(updates).length) {
    isEditing.value = false;
    return;
  }

  isSaving.value = true;
  const isUpdated = await mdmStore.updateConfig(typeId, updates);
  isSaving.value = false;
  if (isUpdated) {
    showToast(translate("Configuration updated"));
    isEditing.value = false;
  } else {
    showToast(translate("Failed to update configuration"));
  }
};

const fetchServiceParameters = async () => {
  if (!config.value.importServiceName) return;
  areParamsLoading.value = true;
  serviceParameters.value = await jobStore.fetchServiceParams(config.value.importServiceName);
  areParamsLoading.value = false;
};

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
    saveDataFile(resp.data, `${config.value.description || config.value.configId}.csv`)
    // saveAs(new Blob([resp.data]), `${config.value.description || config.value.configId}.csv`)
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
  await Promise.all([
    fetchServiceParameters(),
    mdmStore.fetchExecutionModes()
  ]);
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

.upload-icon {
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

/* Configuration + Import Service Parameters side by side on desktop */
.meta-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacer-base);
  align-items: start;
  margin-top: var(--spacer-lg);
}

.meta-cards ion-card {
  margin: 0;
}

@media (min-width: 992px) {
  .meta-cards {
    grid-template-columns: 1fr 1fr;
  }
}

.card-header-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacer-sm);
}

.edit-actions {
  display: flex;
  gap: 4px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacer-base);
}

@media (min-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.param-note {
  margin: 0;
  color: var(--ion-color-medium);
}

.param-loading {
  display: flex;
  justify-content: center;
  padding: var(--spacer-base);
}
</style>
