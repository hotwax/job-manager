<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/system-messages" />
        </ion-buttons>
        <ion-title>{{ translate("Message Detail") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <section v-if="systemMessageStore.isLoading || !message" class="details">
        <ion-card class="summary">
          <ion-card-header>
            <ion-skeleton-text animated style="width: 30%; height: 16px;" />
            <ion-skeleton-text animated style="width: 60%; height: 24px; margin-top: 12px;" />
            <ion-skeleton-text animated style="width: 90%; height: 16px; margin-top: 12px;" />
            <ion-skeleton-text animated style="width: 80%; height: 16px; margin-top: 4px;" />
          </ion-card-header>
          <div class="map ion-padding">
            <ion-skeleton-text animated style="width: 100px; height: 32px; display: inline-block; border-radius: 16px;" />
            <ion-skeleton-text animated style="width: 40px; height: 2px; display: inline-block; margin: 0 16px; vertical-align: middle;" />
            <ion-skeleton-text animated style="width: 100px; height: 32px; display: inline-block; border-radius: 16px;" />
          </div>
          <ion-list>
            <ion-item v-for="i in 5" :key="i" lines="none">
              <ion-thumbnail slot="start" style="width: 24px; height: 24px;">
                <ion-skeleton-text animated style="border-radius: 50%;" />
              </ion-thumbnail>
              <ion-label>
                <ion-skeleton-text animated style="width: 40%;" />
                <ion-skeleton-text animated style="width: 70%;" />
              </ion-label>
            </ion-item>
          </ion-list>
        </ion-card>

        <div class="technical-skeletons">
          <ion-card v-for="i in 3" :key="i">
            <ion-card-header>
              <ion-skeleton-text animated style="width: 50%; height: 20px;" />
            </ion-card-header>
            <ion-list lines="none">
              <ion-item v-for="j in 4" :key="j">
                <ion-label>
                  <ion-skeleton-text animated style="width: 30%;" />
                  <ion-skeleton-text animated style="width: 60%;" />
                </ion-label>
              </ion-item>
            </ion-list>
          </ion-card>
        </div>
      </section>

      <section v-else class="details">
        <div class="detail-column">
          <!-- The Journey (Detailed Story & Timeline) -->
          <ion-card class="summary">
            <ion-card-header>
              <ion-card-subtitle>
                {{ message.isOutgoing === 'Y' ? translate("Outgoing Message") : translate("Incoming Message") }}
              </ion-card-subtitle>
              <ion-card-title>
                {{ message.isOutgoing === 'Y' ? translate("Delivering Data to") : translate("Receiving Data from") }}
                {{ remoteSystem ? (remoteSystem.description || remoteSystem.systemMessageRemoteId) : translate("Internal System") }}
              </ion-card-title>
              <p v-if="narrativeSummary">{{ narrativeSummary }}</p>
            </ion-card-header>

            <div class="map">
              <ion-chip outline>
                <ion-icon :icon="businessOutline"/>
                <ion-label> {{ translate("Internal") }} </ion-label>
              </ion-chip>

              <ion-icon :icon="message.isOutgoing === 'Y' ? arrowForwardOutline : arrowBackOutline" />

              <ion-chip :color="commonUtil.getStatusColor(message.statusId)">
                <ion-icon :icon="getStatusIcon(message.statusId)" />
                <ion-label> #{{ message.systemMessageId }} </ion-label>
              </ion-chip>
              
              <ion-icon :icon="message.isOutgoing === 'Y' ? arrowForwardOutline : arrowBackOutline" />
              
              <ion-chip outline>
                <ion-icon :icon="globeOutline" />
                <ion-label> {{ remoteSystem ? (remoteSystem.description || remoteSystem.systemMessageRemoteId) : translate("External") }} </ion-label>
              </ion-chip>
            </div>

            <ion-item v-if="messageType?.receiveResponseEnumId" lines="none" class="related-enum">
              <ion-icon slot="start" :icon="linkOutline" color="primary" />
              <ion-label>
                <p class="overline">{{ translate("Next Linked Action") }}</p>
                {{ messageType.receiveResponseEnumId }}
                <p v-if="messageType.receiveResponseEnumId === 'MsgRrMove'">{{ translate("This message is configured to be moved after successful processing.") }}</p>
              </ion-label>
            </ion-item>

            <!-- Bulk Operation Context & Sequence -->
            <div v-if="isSequenceOperation" class="bulk-context ion-padding">
              <ion-card v-if="messageType?.parentTypeId === 'ShopifyBulkQuery'" color="light" class="ion-no-margin ion-margin-bottom">
                <ion-card-header>
                  <ion-card-title size="small">
                    <ion-icon :icon="informationCircleOutline" color="primary" style="vertical-align: middle; margin-right: 4px;" />
                    {{ translate("Bulk Query Lifecycle") }}
                  </ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  {{ translate("This is an asynchronous operation. Shopify is currently generating the requested data. Once complete, Shopify will send a webhook, triggering the next step to download and process the result file.") }}
                </ion-card-content>
              </ion-card>

              <div class="sequence-container">
                <p class="overline">{{ translate("Operation Sequence") }}</p>
                <div class="sequence-flow">
                  <template v-for="(step, index) in currentEnumSequence" :key="step.enumId">
                    <ion-chip 
                      :color="getStepStatus(step).color" 
                      :outline="step.enumId !== message.systemMessageTypeId"
                      @click="goToStep(step)"
                      :disabled="!getStepStatus(step).linkedId && step.enumId !== message.systemMessageTypeId"
                      class="step-chip"
                    >
                      <ion-icon :icon="getStepStatus(step).icon"></ion-icon>
                      <ion-label>{{ step.description || step.enumId }}</ion-label>
                    </ion-chip>
                    <ion-icon 
                      v-if="index !== currentEnumSequence.length - 1" 
                      :icon="chevronForwardOutline" 
                      class="separator-icon"
                    ></ion-icon>
                  </template>
                </div>
              </div>
            </div>

            <ion-list>
              <ion-item lines="none">
                <ion-icon slot="start" :icon="checkmarkCircleOutline" color="success" />
                <ion-label>
                  <p>{{ getDateAndTime(message.initDate) }}</p>
                  {{ translate("Journey Started") }}
                  <p>{{ translate("Message was initialized in the system.") }}</p>
                </ion-label>
              </ion-item>

              <ion-item v-for="(error, index) in errors" :key="index" lines="none">
                <ion-icon slot="start" :icon="warningOutline" color="danger" />
                <ion-label>
                  <p>{{ getDateAndTime(error.errorDate) }}</p>
                  {{ translate("Stumbled") }}
                  <p>
                    {{ translate("Failed to transition to") }} <strong>{{ getStatusDescription(error.attemptedStatusId) }}</strong>
                  </p>
                  <p v-if="error.errorText" @click="commonUtil.copyToClipboard(error.errorText)">
                    <ion-text color="danger">
                      {{ (error.errorText as string).split('\n')[0] }}
                    </ion-text>
                  </p>
                </ion-label>
              </ion-item>

              <ion-item lines="none">
                <ion-icon slot="start" :icon="getStatusIcon(message.statusId)" color="primary" />
                <ion-label>
                  <p>{{ getDateAndTime(message.lastAttemptDate || message.processedDate) }}</p>
                  {{ translate("Current Station") }}: {{ getStatusDescription(message.statusId) }}
                </ion-label>
              </ion-item>

              <ion-item-divider color="light" v-if="futureStatuses().length">
                <ion-label>{{ translate("Upcoming") }}</ion-label>
              </ion-item-divider>
              <ion-item v-for="statusId in futureStatuses()" :key="statusId" lines="none">
                <ion-icon slot="start" :icon="getStatusIcon(statusId)" color="medium" />
                <ion-label>
                  {{ getStatusDescription(statusId) }}
                </ion-label>
              </ion-item>
            </ion-list>

            <ion-card-content v-if="allowedTransitions.length" class="journey-actions">
              <p class="actions-label">{{ translate("Take Control") }}</p>
              <div class="action-grid">
                <ion-button
                  v-for="transition in allowedTransitions"
                  :key="transition.toStatusId"
                  :fill="transition.toStatusId === 'SmsgError' ? 'outline' : 'solid'"
                  size="small"
                  :color="commonUtil.getStatusColor(transition.toStatusId as string)"
                  @click="transition.toStatusId && handleAction(transition.toStatusId)"
                >
                  {{ transition.transitionName || transition.toStatusDescription }}
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>
        </div>

        <div class="detail-column">
          <!-- Related Messages (Linking Parents and Children) -->
          <ion-card v-if="relatedMessages.length" class="related-messages">
            <ion-card-header>
              <ion-card-title>{{ translate("Linked Messages") }}</ion-card-title>
            </ion-card-header>
            <ion-list lines="full">
              <ion-item v-for="message in relatedMessages" :key="message.systemMessageId" button @click="router.push(`/system-messages/${message.systemMessageId}`)">
                <ion-icon slot="start" :icon="message.relationship === 'parent' ? chevronUpOutline : chevronDownOutline" color="medium" />
                <ion-label>
                  <p class="overline">{{ message.relationship === 'parent' ? translate("Parent Message") : translate("Child Message") }}</p>
                  <strong>{{ message.systemMessageTypeId }}</strong> (#{{ message.systemMessageId }})
                  <p>{{ getDateAndTime(message.initDate) }}</p>
                </ion-label>
                <ion-badge slot="end" :color="commonUtil.getStatusColor(message.statusId)">
                  {{ getStatusDescription(message.statusId) }}
                </ion-badge>
              </ion-item>
            </ion-list>
          </ion-card>

          <!-- Technical Analysis -->
          <ion-card class="message">
            <ion-card-header>
              <ion-card-title>{{ translate("System Message") }}</ion-card-title>
            </ion-card-header>
            <ion-list lines="none">
              <template v-for="field in (technicalFields as any)" :key="field.label">
                <ion-item :button="!!field.link" lines="none" @click="field.link && router.push(field.link)">
                  <ion-label>
                    <p class="overline">{{ translate(field.label) }}</p>
                    {{ field.value }}
                    <p v-if="field.info">{{ translate(field.info) }}</p>
                  </ion-label>
                  <ion-icon v-if="field.link" slot="end" :icon="openOutline" />
                </ion-item>
              </template>

              <ion-item-divider color="light">
                <ion-label>{{ translate("Message Content") }}</ion-label>
                <div slot="end" class="content-actions">
                  <ion-button
                    v-if="downloadableFilePath && !isEditing"
                    fill="clear"
                    size="small"
                    @click="downloadLinkedFile"
                  >
                    {{ translate("Download File") }}
                    <ion-icon slot="start" :icon="downloadOutline" />
                  </ion-button>
                  <ion-button
                    v-if="isEditable && !isEditing"
                    fill="clear"
                    size="small"
                    @click="isEditing = true"
                  >
                    {{ translate("Edit Content") }}
                    <ion-icon slot="start" :icon="addCircleOutline" />
                  </ion-button>
                </div>
              </ion-item-divider>

              <div class="content-container">
                <ion-item v-if="downloadableFilePath && !isEditing" lines="none" class="detected-file-path">
                  <ion-icon slot="start" :icon="documentAttachOutline" color="primary" />
                  <ion-label>
                    <p class="overline">{{ translate("Detected File Path") }}</p>
                    <p class="path-text">{{ downloadableFilePath }}</p>
                  </ion-label>
                </ion-item>
                <ion-textarea
                  v-if="isEditing"
                  v-model="editedText"
                  auto-grow
                  :rows="12"
                  class="content-editor"
                />
                <pre v-else class="content-view">{{ formattedContent }}</pre>

                <div v-if="isEditing" class="editor-actions ion-padding">
                  <ion-button fill="outline" @click="cancelEdit">{{ translate("Cancel") }}</ion-button>
                  <ion-button @click="saveContent">{{ translate("Save Content") }}</ion-button>
                </div>
              </div>
              <template v-if="errors && errors.length > 0">
                <ion-item-divider color="light">
                  <ion-label>{{ translate("Errors") }}</ion-label>
                </ion-item-divider>

                <ion-item v-for="(error, index) in errors" :key="index" lines="full">
                  <ion-label>
                    {{ error.errorText }}
                    <p>{{ error.attemptedStatusId }}</p>
                  </ion-label>
                  <ion-note slot="end">{{ getDateAndTime(error.errorDate) }}</ion-note>
                </ion-item>
              </template>
            </ion-list>
          </ion-card>

          <!-- Message Type Details -->
          <ion-card class="message-type">
            <ion-card-header>
              <ion-card-title>{{ translate("System Message Type") }}</ion-card-title>
            </ion-card-header>
            <ion-list lines="none">
              <template v-for="field in typeFields" :key="field">
                <ion-item v-if="messageType && messageType[field]">
                  <ion-label>
                    <p class="overline">{{ field }}</p>
                    <p v-if="field === 'receiveResponseEnumId'">
                      {{ messageType.receiveResponseEnumId }}
                      <ion-badge v-if="messageType.receiveResponseEnumId === 'MsgRrMove'" color="warning" style="margin-left: 8px;">
                        {{ translate("MOVING") }}
                      </ion-badge>
                    </p>
                    <p v-else>{{ messageType[field] }}</p>
                  </ion-label>
                </ion-item>
              </template>
            </ion-list>
          </ion-card>

          <!-- Remote System Details -->
          <ion-card class="message-remote">
            <ion-card-header>
              <ion-card-title>{{ translate("System Message Remote") }}</ion-card-title>
            </ion-card-header>
            <ion-list lines="none">
              <template v-for="field in remoteFields" :key="field">
                <ion-item v-if="remoteSystem && remoteSystem[field]">
                  <ion-label>
                    <p class="overline">{{ field }}</p>
                    <p>{{ remoteSystem[field] }}</p>
                  </ion-label>
                </ion-item>
              </template>
            </ion-list>
          </ion-card>
        </div>
      </section>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonPage,
  IonSkeletonText,
  IonText,
  IonTextarea,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter
} from "@ionic/vue";
import {
  addCircleOutline,
  alertCircleOutline,
  arrowBackOutline,
  arrowForwardOutline,
  businessOutline,
  chevronDownOutline,
  chevronForwardOutline,
  chevronUpOutline,
  checkmarkCircleOutline,
  documentAttachOutline,
  downloadOutline,
  globeOutline,
  hourglassOutline,
  informationCircleOutline,
  linkOutline,
  openOutline,
  playOutline,
  syncOutline,
  timeOutline,
  warningOutline
} from "ionicons/icons";
import { computed, ref, watch } from "vue";
import router from "../router";
import { saveAs } from "file-saver";

import { commonUtil, translate } from "@common";
import { getDateAndTime, showToast } from "@/utils";
import { useSystemMessageStore } from "@/store/systemMessage";
import { useUtilStore } from "@/store/util";

const props = defineProps<{ id: string }>();

const systemMessageStore = useSystemMessageStore();
const utilStore = useUtilStore();
const isEditing = ref(false);
const editedText = ref("");

const message = computed(() => systemMessageStore.getCurrentSystemMessage);
const messageType = computed(() => systemMessageStore.getCurrentSystemMessageType);
const remoteSystem = computed(() => systemMessageStore.getCurrentSystemMessageRemote);
const errors = computed(() => systemMessageStore.getSystemMessageErrors);
const relatedMessages = computed(() => systemMessageStore.getRelatedMessages);
const technicalFields = computed(() => systemMessageStore.getTechnicalFields(message.value));

const currentEnumSequence = computed(() => systemMessageStore.getCurrentEnumSequence);
const linkedMessages = computed(() => systemMessageStore.getLinkedMessages);

const allowedTransitions = computed(() => utilStore.getAllowedTransitions(message.value));
const isEditable = computed(() => message.value?.statusId !== "SmsgConsumed");
const formattedContent = computed(() => formatContent(message.value?.messageText));
const downloadableFilePath = computed(() => extractDownloadableFilePath(message.value?.messageText));
const downloadableFileName = computed(() => getFileNameFromPath(downloadableFilePath.value));

const isSequenceOperation = computed(() => 
  messageType.value?.parentTypeId === 'ShopifyBulkImport' || 
  messageType.value?.parentTypeId === 'ShopifyBulkQuery' ||
  currentEnumSequence.value.length > 1
);

const typeFields = ["systemMessageTypeId", "description", "parentTypeId", "sendServiceName", "consumeServiceName", "sendPath", "receivePath", "receiveMovePath", "receiveFilePattern", "receiveResponseEnumId"];
const remoteFields = ["systemMessageRemoteId", "description", "sendUrl", "receiveUrl", "remoteAppCode", "username", "authHeaderName", "remoteId", "internalId", "accessScopeEnumId", "sendServiceName"];

const OUTGOING_HAPPY_PATH = ["SmsgCreated", "SmsgProduced", "SmsgSending", "SmsgSent", "SmsgConfirmed"];
const INCOMING_HAPPY_PATH = ["SmsgCreated", "SmsgReceived", "SmsgConsuming", "SmsgConsumed", "SmsgConfirmed"];

const futureStatuses = (): string[] => {
  if (!message?.value.statusId) return [];

  const happyPath = message.value.isOutgoing === "Y" ? OUTGOING_HAPPY_PATH : INCOMING_HAPPY_PATH;
  const currentIndex = happyPath.indexOf(message.value.statusId);

  // If status is not in happy path (e.g. SmsgError), find where it was last
  if (currentIndex === -1) {
    // Basic heuristic: if it's SmsgError, it's probably stuck after Created
    return message.value.isOutgoing === "Y" 
      ? OUTGOING_HAPPY_PATH.filter(s => s !== "SmsgCreated")
      : INCOMING_HAPPY_PATH.filter(s => s !== "SmsgCreated");
  }

  return happyPath.slice(currentIndex + 1);
};

const narrativeSummary = computed(() => {
  if(!messageType.value) return "";

  const remoteName = remoteSystem.value ? (remoteSystem.value.description || remoteSystem.value.systemMessageRemoteId) : translate("Internal System");
  const typeName = messageType.value.description || messageType.value.systemMessageTypeId;
  const serviceName = message.value.isOutgoing === 'Y' ? messageType.value.sendServiceName : messageType.value.consumeServiceName;
  const enumeration = systemMessageStore.getEnumInfo(message.value.systemMessageTypeId);

  if(message.value.isOutgoing === 'Y') {
    let summary = `${translate("This outgoing message is being sent to")} ${remoteName}. ${translate("It is generated according to the")} ${typeName} ${translate("configuration using the")} ${serviceName} ${translate("service")}.`;
    if(isSequenceOperation.value && enumeration) {
      summary += ` ${translate("This operation is categorized as")} ${enumeration.typeDescription}.`;
    }
    return summary;
  } else {
    let summary = `${translate("This incoming message was received from")} ${remoteName}. ${translate("It is processed according to the")} ${typeName} ${translate("configuration using the")} ${serviceName} ${translate("service")}.`;
    if(isSequenceOperation.value && enumeration) {
      summary += ` ${translate("This operation is categorized as")} ${enumeration.typeDescription}.`;
    }
    return summary;
  }
});

const getStepStatus = (step: any) => {
  if (!message.value) return { color: 'medium', icon: timeOutline, linkedId: null };
  
  // 1. Current step matching type
  if (step.enumId === message.value.systemMessageTypeId) {
    return { color: 'primary', icon: playOutline, linkedId: message.value.systemMessageId };
  }

  // 2. Look in linkedMessages (successors/predecessors)
  const linked = linkedMessages.value.find((m: any) => m.systemMessageTypeId === step.enumId);
  if (linked) {
    if (linked.statusId === 'SmsgConsumed' || linked.statusId === 'SmsgConfirmed') {
      return { color: 'success', icon: checkmarkCircleOutline, linkedId: linked.systemMessageId };
    }
    if (linked.statusId === 'SmsgError') {
      return { color: 'danger', icon: alertCircleOutline, linkedId: linked.systemMessageId };
    }
    return { color: 'warning', icon: hourglassOutline, linkedId: linked.systemMessageId };
  }

  return { color: 'medium', icon: timeOutline, linkedId: null };
};

const goToStep = (step: any) => {
  const status = getStepStatus(step);
  router.push(`/system-messages/${status.linkedId}`);
};

const loadMessage = async () => {
  await Promise.all([
    systemMessageStore.fetchSystemMessageById(props.id),
    systemMessageStore.fetchSystemMessageErrors(props.id),
    systemMessageStore.fetchSystemMessageStatusMetadata(),
  ]);
 
  if(message.value) {
    await systemMessageStore.fetchRelatedMessages()
    const tasks = [systemMessageStore.fetchSystemMessageTypeById(message.value.systemMessageTypeId)];
    if(message.value.systemMessageRemoteId) {
      tasks.push(systemMessageStore.fetchSystemMessageRemoteById(message.value.systemMessageRemoteId));
    }
    await Promise.all(tasks);

    // Fetch Sequence Data
    await systemMessageStore.fetchEnumSequence(message.value.systemMessageTypeId);
    await systemMessageStore.fetchAllRelatedMessages(message.value.systemMessageId, message.value.remoteMessageId);

    editedText.value = message.value.messageText || "";
  }
};

const formatContent = (content?: string) => {
  if (!content) return "";
  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return content;
  }
};

const cancelEdit = () => {
  editedText.value = message.value?.messageText || "";
  isEditing.value = false;
};

const saveContent = async () => {
  if (!message.value) return;

  const result = await systemMessageStore.updateSystemMessage({
    systemMessageId: message.value.systemMessageId,
    messageText: editedText.value
  });

  if (result.error) {
    await showToast(translate("Failed to update message content."));
    return;
  }

  isEditing.value = false;
  await showToast(translate("Message content updated successfully."));
};

const looksLikeDownloadablePath = (value?: string | null) => {
  if (!value) return false;

  const trimmedValue = value.trim();
  if (!trimmedValue) return false;

  return (
    trimmedValue.startsWith("/") ||
    trimmedValue.startsWith("runtime://") ||
    trimmedValue.startsWith("dbresource://") ||
    trimmedValue.startsWith("component://") ||
    trimmedValue.startsWith("file://") ||
    /^[A-Za-z]:[\\/]/.test(trimmedValue)
  );
};

const extractDownloadableFilePath = (messageText?: string) => {
  if (!messageText) return "";

  const trimmedMessageText = messageText.trim();
  if (looksLikeDownloadablePath(trimmedMessageText)) {
    return trimmedMessageText;
  }

  try {
    const parsedMessageText = JSON.parse(trimmedMessageText);
    const filePath = typeof parsedMessageText?.filePath === "string" ? parsedMessageText.filePath.trim() : "";
    return looksLikeDownloadablePath(filePath) ? filePath : "";
  } catch {
    return "";
  }
};

const getFileNameFromPath = (filePath?: string) => {
  if (!filePath) return "system-message-file.txt";

  const normalizedPath = filePath.split("?")[0].replace(/\/$/, "");
  const pathParts = normalizedPath.split(/[\\/]/).filter(Boolean);
  return pathParts[pathParts.length - 1] || "system-message-file.txt";
};

const downloadLinkedFile = async () => {
  if (!message.value?.systemMessageId || !downloadableFilePath.value) return;

  const response = await systemMessageStore.downloadSystemMessageFile(message.value.systemMessageId);
  if (response.error || !response.data) {
    await showToast(translate("Failed to download linked file."));
    return;
  }

  let responseBlob = response.data instanceof Blob
    ? response.data
    : new Blob([response.data], { type: "text/plain;charset=utf-8" });

  const responseContentType = responseBlob.type || response.headers?.["content-type"] || "";
  if (responseContentType.includes("application/json")) {
    try {
      const responseText = await responseBlob.text();
      const parsedResponse = JSON.parse(responseText);
      if (typeof parsedResponse?.csvData === "string") {
        responseBlob = new Blob([parsedResponse.csvData], { type: "text/plain;charset=utf-8" });
      }
    } catch {
      // Keep the original blob when the response body is not a JSON wrapper.
    }
  }

  saveAs(responseBlob, downloadableFileName.value);
};

const actionObj = {
  "SmsgCancelled": "",
  "SmsgConfirmed": "",
  "SmsgConsumed": "",
  "SmsgConsuming": "",
  "SmsgError": "",
  "SmsgProduced": "",
  "SmsgReceived": "",
  "SmsgRejected": "",
  "SmsgSending": "",
  "SmsgSent": "send"
} as Record<string, string>

const handleAction = async (statusId: string) => {
  if(!statusId && !actionObj[statusId]) return;

  const result = await systemMessageStore.updateSystemMessage({
    systemMessageId: message.value.systemMessageId,
    statusId
  });

  // if (result.error) {
  //   await showToast(translate("Failed to update status."));
  //   return;
  // }

  // await loadMessage();
  // await showToast(`${translate("Message moved to")} ${getStatusDescription(statusId)}.`);
};

const getStatusDescription = (statusId: string) => utilStore.getStatusItemDesc(statusId);
const getStatusIcon = (statusId?: string) => {
  switch (statusId) {
    case "SmsgCreated": return addCircleOutline;
    case "SmsgError": return warningOutline;
    case "SmsgConsumed":
    case "SmsgSent":
    case "SmsgProduced":
      return checkmarkCircleOutline;
    case "SmsgSending":
    case "SmsgReceived":
      return syncOutline;
    default:
      return syncOutline;
  }
};

onIonViewWillEnter(loadMessage);
watch(() => props.id, () => loadMessage());
</script>

<style scoped>
/* allow both columns to scroll independently */
section {
  height: 100%;
  overflow-y: hidden;
}
.detail-column {
  height: 100%;
  overflow-y: scroll;
  scrollbar-width: none;
  scrollbar-color: transparent;
  padding-block-start: var(--spacer-base);
}

.details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: start;
  gap: 16px;
}

.summary {
  grid-row: span 3;
}

.technical-skeletons {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message, .message-type, .message-remote {
  grid-column: 2;
}

.map {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 16px;
}

.content-container {
  padding: 0 16px 16px 16px;
}

.content-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.detected-file-path {
  --padding-start: 0;
  --inner-padding-end: 0;
  margin-bottom: 8px;
}

.path-text {
  word-break: break-all;
  white-space: normal;
}

.content-view {
  background: var(--ion-color-light);
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  font-family: monospace;
  font-size: 14px;
  margin: 8px 0;
}

.content-editor {
  --background: var(--ion-color-light);
  --padding-start: 12px;
  --padding-end: 12px;
  border-radius: 8px;
  font-family: monospace;
  font-size: 14px;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.bulk-context {
  border-top: 1px solid var(--ion-color-light);
  background: var(--ion-color-light-tint);
}

.sequence-container {
  margin-top: 16px;
}

.sequence-flow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.step-chip {
  cursor: pointer;
}

.separator-icon {
  font-size: 14px;
  color: var(--ion-color-medium);
}

.related-enum {
  border-bottom: 1px solid var(--ion-color-light);
}

@media (max-width: 991px) {
  .details {
    grid-template-columns: 1fr;
  }
  .summary {
    grid-row: auto;
  }
  .message, .message-type, .message-remote {
    grid-column: 1;
  }
}
</style>
