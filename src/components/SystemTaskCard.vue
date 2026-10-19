<template>
  <ion-card class="system-task-card">
    <ion-card-header>
      <div class="task-header">
        <div>
          <ion-card-title>{{ task.workEffortName || task.workEffortId }}</ion-card-title>
          <ion-card-subtitle>{{ task.workEffortId }}</ion-card-subtitle>
        </div>
        <ion-badge :color="task.statusId === 'TASK_COMPLETED' ? 'success' : 'medium'">
          {{ task.statusDescription || task.statusId }}
        </ion-badge>
      </div>
    </ion-card-header>
    <ion-list lines="full">
      <ion-item v-if="task.purposeDescription">
        <ion-label>
          <p>{{ translate('Purpose') }}</p>
          {{ task.purposeDescription }}
        </ion-label>
      </ion-item>
      <ion-item>
        <ion-label class="ion-text-wrap">
          <p>{{ translate('Description') }}</p>
          <div class="task-description">{{ task.description || translate('No description provided') }}</div>
        </ion-label>
      </ion-item>
      <ion-item>
        <ion-label class="ion-text-wrap">
          <p>{{ translate('Assignee') }}</p>
          {{ task.assignees.map(assignee => assignee.name).join(', ') || translate('Unassigned') }}
        </ion-label>
        <ion-button v-if="isOpen" slot="end" fill="clear" data-testid="assign-task" :disabled="busy" @click="$emit('assign')">
          {{ translate(task.assignees.length ? 'Reassign' : 'Assign') }}
        </ion-button>
      </ion-item>
      <ion-item v-if="task.createdDate">
        <ion-label>{{ translate('Created') }}</ion-label>
        <ion-note slot="end">{{ formatDate(task.createdDate) }}</ion-note>
      </ion-item>
      <ion-item v-if="task.actualCompletionDate">
        <ion-label>{{ translate('Resolved') }}</ion-label>
        <ion-note slot="end">{{ formatDate(task.actualCompletionDate) }}</ion-note>
      </ion-item>
    </ion-list>
    <ion-item v-if="isOpen" lines="none" class="task-actions">
      <ion-button fill="clear" data-testid="resolve-task" :disabled="busy" @click="$emit('resolve')">
        <ion-spinner v-if="busy" name="crescent" />
        {{ translate('Resolve task') }}
      </ion-button>
    </ion-item>
  </ion-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { DateTime } from 'luxon';
import { IonBadge, IonButton, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonItem, IonLabel, IonList, IonNote, IonSpinner } from '@ionic/vue';
import { translate } from '@common';
import type { SystemTask } from '@/services/systemTasks';

const props = withDefaults(defineProps<{ task: SystemTask; busy?: boolean }>(), { busy: false });
defineEmits<{ (event: 'assign'): void; (event: 'resolve'): void }>();
const isOpen = computed(() => ['TASK_CREATED', 'TASK_IN_PROGRESS', 'TASK_ON_HOLD'].includes(props.task.statusId));
const formatDate = (value: number | string) => {
  const date = typeof value === 'number' ? DateTime.fromMillis(value) : DateTime.fromISO(value);
  return date.isValid ? date.toLocaleString(DateTime.DATETIME_MED) : String(value);
};
</script>

<style scoped>
.system-task-card { margin: 0; }
.task-header { display: flex; align-items: flex-start; gap: var(--spacer-sm, 12px); }
.task-header > div { flex: 1; min-width: 0; }
ion-card-title { overflow-wrap: anywhere; }
ion-badge { flex-shrink: 0; }
.task-description { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.5; }
.task-actions { border-block-start: var(--border-medium); }
ion-spinner { width: 18px; height: 18px; margin-inline-end: 8px; }
</style>
