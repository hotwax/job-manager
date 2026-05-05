<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/system-message-types" />
        </ion-buttons>
        <ion-title>{{ pageTitle }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <div class="header">
          <div class="title">
            <h1>{{ form.systemMessageTypeId.value || translate("New Message Type") }}</h1>
            <p>{{ form.description.value || translate("Configure a system message type and inspect related messages.") }}</p>
          </div>
          <div class="header-actions">
            <ion-button fill="outline" @click="saveType">{{ translate("Save") }}</ion-button>
            <ion-button
              v-if="!isCreateMode"
              color="danger"
              fill="outline"
              @click="deleteType"
            >
              {{ translate("Delete") }}
            </ion-button>
          </div>
        </div>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("Configuration") }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="form-grid">
              <template v-for="[key, field] in Object.entries(form)" :key="key">
                <ion-textarea
                  v-if="field.type === 'textarea'"
                  :label="translate(field.label)"
                  label-placement="stacked"
                  fill="outline"
                  auto-grow
                  :value="field.value || ''"
                  @ionInput="updateField(key, $event.detail.value || '')"
                />
                <ion-input
                  v-else
                  :label="translate(field.label)"
                  label-placement="stacked"
                  fill="outline"
                  :readonly="!isCreateMode && key === 'systemMessageTypeId'"
                  :value="field.value || ''"
                  @ionInput="updateField(key, $event.detail.value || '')"
                />
              </template>
            </div>
          </ion-card-content>
        </ion-card>

        <ion-card v-if="!isCreateMode">
          <ion-card-header>
            <ion-card-title>{{ translate("Related Messages") }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="filter-grid">
              <ion-searchbar
                :value="queryString"
                @ionInput="queryString = $event.detail.value || ''"
                :debounce="300"
                :placeholder="translate('Search related messages')"
              />
              <ion-select
                :label="translate('Status')"
                label-placement="stacked"
                interface="popover"
                :value="selectedStatusId"
                @ionChange="selectedStatusId = $event.detail.value"
              >
                <ion-select-option value="">{{ translate("All statuses") }}</ion-select-option>
                <ion-select-option
                  v-for="status in statuses"
                  :key="status.statusId"
                  :value="status.statusId"
                >
                  {{ status.description }}
                </ion-select-option>
              </ion-select>
            </div>

            <div class="pagination">
              <ion-button fill="clear" slot="icon-only" :disabled="pageIndex === 0" @click="goToPreviousPage">
                <ion-icon :icon="caretBackOutline" />
              </ion-button>
              <ion-note color="medium">{{ pageIndex + 1 }} / {{ pageCount }}</ion-note>
              <ion-button fill="clear" slot="icon-only" :disabled="pageIndex >= pageCount - 1" @click="goToNextPage">
                <ion-icon :icon="caretForwardOutline" />
              </ion-button>
            </div>

            <SystemMessageList
              :messages="relatedMessages"
              :show-type="false"
              :empty-message="translate('No related messages found.')"
            />
          </ion-card-content>
        </ion-card>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonNote,
  IonPage,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter
} from "@ionic/vue";
import { computed, reactive, ref, watch } from "vue";
import router from "../router";

import { translate } from "@common";

import SystemMessageList from "@/components/SystemMessageList.vue";
import { useSystemMessageStore } from "@/store/systemMessage";
import { showToast } from "@/utils";
import { useUtilStore } from "@/store/util";
import { caretBackOutline, caretForwardOutline } from "ionicons/icons";

const props = defineProps<{ id?: string }>();

const PAGE_SIZE = 25;
const pageIndex = ref(0);

const store = useSystemMessageStore();
const utilStore = useUtilStore();
const queryString = ref("");
const selectedStatusId = ref("");
const form = reactive<Record<string, any>>({
  "systemMessageTypeId": { label: "Type ID", type: "text" },
  "description": { label: "Description", type: "textarea" },
  "parentTypeId": { label: "Parent Type", type: "text" },
  "sendServiceName": { label: "Send Service", type: "textarea" },
  "consumeServiceName": { label: "Consume Service", type: "textarea" },
  "sendPath": { label: "Send Path", type: "textarea" },
  "receivePath": { label: "Receive Path", type: "textarea" },
  "receiveMovePath": { label: "Receive Move Path", type: "textarea" },
  "receiveFilePattern": { label: "Receive File Pattern", type: "text" },
  "receiveResponseEnumId": { label: "Receive Response Enum", type: "text" }
});

const isCreateMode = computed(() => !props.id);
const pageTitle = computed(() => isCreateMode.value ? translate("Create Message Type") : translate("Message Type Detail"));
const statuses = computed(() => utilStore.getStatusItemsByType("SystemMessage"));
const relatedMessages = computed(() => store.getSystemMessages);
const total = computed(() => store.getSystemMessageTotal);
const pageCount = computed(() => Math.max(Math.ceil(total.value / PAGE_SIZE), 1));

const setForm = (payload?: Record<string, any>) => {
  for (const key of Object.keys(form)) {
    form[key].value = payload?.[key] || "";
  }
};

const updateField = (key: string, value: string) => {
  form[key].value = value;
};

const loadType = async() => {
  // await Promise.all([
  //   store.fetchSystemMessageTypes(),
  // ]);
  await store.fetchSystemMessageStatusMetadata()

  if (props.id) {
    const entity = await store.fetchSystemMessageTypeById(props.id);
    await store.fetchSystemMessages({
      systemMessageTypeId: props.id,
      pageIndex: pageIndex.value,
      pageSize: PAGE_SIZE,
    })
    setForm(entity);
  } else {
    setForm();
  }
};

const saveType = async () => {
  if (!form.systemMessageTypeId?.value.trim()) {
    await showToast(translate("Type ID is required."));
    return;
  }

  // TODO: check do we need this, as the form fields will always be a string
  const payload = Object.entries(form).reduce((params: Record<string, any>, [key, field]) => {
    if(field.value !== null || field.value !== undefined) {
      params[key] = field.value
    }
    return params
  }, {} as Record<string, any>)

  const result = await store.saveSystemMessageType(payload);
  if (result.error) {
    await showToast(translate("Failed to save message type."));
    return;
  }

  await showToast(translate("Message type saved."));

  if (isCreateMode.value) {
    router.replace(`/system-message-types/${form.systemMessageTypeId.value}`);
  }
};

const deleteType = async () => {
  const result = await store.deleteSystemMessageType(props.id);
  if (result.error) {
    await showToast(translate("This message type cannot be deleted while messages still reference it."));
    return;
  }

  await showToast(translate("Message type deleted."));
  router.replace("/system-message-types");
};

const goToPreviousPage = () => {
  pageIndex.value -= 1;
};

const goToNextPage = () => {
  pageIndex.value += 1;
};

watch([queryString, selectedStatusId, pageIndex], async (newValue, oldValue) => {
  const payload = {
    systemMessageTypeId: props.id,
    pageIndex: pageIndex.value,
    pageSize: PAGE_SIZE
  } as Record<string, any>

  if(queryString.value.trim()) {
    payload["queryString"] = queryString.value.trim().toLowerCase()
  }

  if(selectedStatusId.value) {
    payload["statusId"] = selectedStatusId.value;
  }

  // Reset pageIndex when queryString or selectedStatusId is changed
  if(newValue[0] !== oldValue[0] || newValue[1] !== oldValue[1]) {
    payload["pageIndex"] = 0
  }

  await store.fetchSystemMessages(payload)
});

onIonViewWillEnter(() => {
  pageIndex.value = 0
  queryString.value = ""
  selectedStatusId.value = ""
  loadType()
});
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.form-grid,
.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.pagination {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 10px;
}
</style>
