<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/system-message-remotes" />
        </ion-buttons>
        <ion-title>{{ pageTitle }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <div class="header">
          <div class="title">
            <h1>{{ form.systemMessageRemoteId.value || translate("New Remote System") }}</h1>
            <p>{{ form.description.value || translate("Configure remote system connectivity and inspect related messages.") }}</p>
          </div>
          <div class="header-actions">
            <ion-button fill="outline" @click="saveRemote">{{ translate("Save") }}</ion-button>
            <ion-button
              v-if="!isCreateMode"
              color="danger"
              fill="outline"
              :disabled="!canDelete"
              @click="deleteRemote"
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
              <template v-for="[key, field] of Object.entries(form)" :key="key">
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
                  :type="field.type === 'password' ? 'password' : 'text'"
                  :label="translate(field.label)"
                  label-placement="stacked"
                  fill="outline"
                  :readonly="!isCreateMode && key === 'systemMessageRemoteId'"
                  :value="field.value || ''"
                  @ionInput="updateField(key, $event.detail.value || '')"
                />
              </template>
            </div>
          </ion-card-content>
        </ion-card>

        <template v-if="!isCreateMode">
          <section class="related-section">
            <ion-card>
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

                <div class="counts">
                  <ion-chip color="primary">{{ translate("Sent") }}: {{ counts.sent }}</ion-chip>
                  <ion-chip color="danger">{{ translate("Error") }}: {{ counts.error }}</ion-chip>
                  <ion-chip color="success">{{ translate("Consumed") }}: {{ counts.consumed }}</ion-chip>
                </div>

                <SystemMessageList
                  :messages="filteredMessages"
                  :show-remote="false"
                  :empty-message="translate('No related messages found.')"
                />
              </ion-card-content>
            </ion-card>
          </section>
        </template>
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
  IonChip,
  IonContent,
  IonHeader,
  IonInput,
  IonPage,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter
} from "@ionic/vue";
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { translate } from "@common";

import SystemMessageList from "@/components/SystemMessageList.vue";
import { useSystemMessageStore } from "@/store/systemMessage";
import { showToast } from "@/utils";

// Type based declaration
const props = defineProps<{ id?: string }>();

const router = useRouter();
const store = useSystemMessageStore();
const queryString = ref("");
const selectedStatusId = ref("");
const form = reactive<Record<string, any>>({
  "systemMessageRemoteId": { label: "Remote ID", type: "text" },
  "description": { label: "Description", type: "textarea" },
  "sendUrl": { label: "Send URL", type: "textarea" },
  "receiveUrl": { label: "Receive URL", type: "textarea" },
  "username": { label: "Username", type: "text" },
  "password": { label: "Password", type: "password" },
  "authHeaderName": { label: "Auth Header", type: "text" },
  "privateKey": { label: "Private Key", type: "password" },
  "sharedSecret": { label: "Shared Secret", type: "password" },
  "sendSharedSecret": { label: "Send Shared Secret", type: "password" },
  "oldSharedSecret": { label: "Old Shared Secret", type: "password" },
  "remoteId": { label: "Remote ID Value", type: "text" },
  "remoteIdType": { label: "Remote ID Type", type: "text" },
  "internalId": { label: "Internal ID", type: "text" },
  "internalIdType": { label: "Internal ID Type", type: "text" },
  "remoteAppCode": { label: "Remote App Code", type: "text" },
  "accessScopeEnumId": { label: "Access Scope", type: "text" },
  "sendServiceName": { label: "Send Service", type: "textarea" }
});

const isCreateMode = computed(() => !props.id);
const pageTitle = computed(() => isCreateMode.value ? translate("Create Remote System") : translate("Remote System Detail"));
const statuses = computed(() => store.getAvailableSystemMessageStatuses);
const relatedMessages = computed(() => props.id ? store.getMessagesForRemote(props.id) : []);
const counts = computed(() => props.id ? store.getRemoteCounts(props.id) : { sent: 0, error: 0, consumed: 0 });
const canDelete = computed(() => !props.id || store.canDeleteMessageRemote(props.id));
const filteredMessages = computed(() => {
  let messages = [...relatedMessages.value];

  if (selectedStatusId.value) {
    messages = messages.filter((message: any) => message.statusId === selectedStatusId.value);
  }

  if (queryString.value.trim()) {
    const query = queryString.value.trim().toLowerCase();
    messages = messages.filter((message: any) =>
      message.systemMessageId?.toLowerCase().includes(query) ||
      message.systemMessageTypeId?.toLowerCase().includes(query)
    );
  }

  return messages;
});

const setForm = (payload?: Record<string, any>) => {
  for (const key of Object.keys(form)) {
    form[key].value = payload?.[key] || "";
  }
};

const updateField = (key: string, value: string) => {
  form[key].value = value;
};

const loadRemote = async () => {
  await Promise.all([
    store.fetchSystemMessageRemotes(),
    store.fetchSystemMessageStatusMetadata()
  ]);

  if (props.id) {
    const entity = await store.fetchSystemMessageRemoteById(props.id);
    setForm(entity);
  } else {
    setForm();
  }
};

const saveRemote = async () => {
  if (!form.systemMessageRemoteId?.value.trim()) {
    await showToast(translate("Remote ID is required."));
    return;
  }

  // TODO: check do we need this, as the form fields will always be a string
  const payload = Object.entries(form).reduce((params: Record<string, any>, [key, field]) => {
    if(field.value !== null || field.value !== undefined) {
      params[key] = field.value
    }
    return params
  }, {} as Record<string, any>)

  const result = await store.saveSystemMessageRemote(payload);
  if (result.error) {
    await showToast(translate("Failed to save remote system."));
    return;
  }

  await showToast(translate("Remote system saved."));

  if (isCreateMode.value) {
    router.replace(`/system-message-remotes/${form.systemMessageRemoteId.value}`);
  }
};

const deleteRemote = async () => {
  const result = await store.deleteSystemMessageRemote(props.id as string);
  if (result.error) {
    await showToast(translate("This remote system cannot be deleted while messages still reference it."));
    return;
  }

  await showToast(translate("Remote system deleted."));
  router.replace("/system-message-remotes");
};

onIonViewWillEnter(loadRemote);
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

.counts {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 16px 0;
}
</style>
