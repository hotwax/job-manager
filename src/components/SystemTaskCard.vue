<template>
  <ion-card :aria-busy="busy">
    <ion-card-header class="task-heading">
      <div>
        <ion-card-title>{{ task.workEffortName || task.workEffortId }}</ion-card-title>
        <ion-card-subtitle v-if="task.workEffortName">{{ task.workEffortId }}</ion-card-subtitle>
      </div>
      <ion-badge :color="statusColor">{{ statusLabel }}</ion-badge>
    </ion-card-header>

    <ion-item lines="none">
      <ion-label class="ion-text-wrap"><div class="task-description">{{ task.description || translate('No description provided') }}</div></ion-label>
    </ion-item>

    <ion-list lines="none" class="task-metadata">
      <ion-item v-if="task.purposeDescription">
        <ion-label class="ion-text-wrap"><p>{{ translate('Purpose') }}</p>{{ task.purposeDescription }}</ion-label>
      </ion-item>
      <ion-item :button="isOpen" :detail="isOpen" :disabled="busy" :data-testid="isOpen ? 'assign-task' : undefined" @click="isOpen && $emit('assign')">
        <ion-label class="ion-text-wrap"><p>{{ translate('Assignee') }}</p>{{ assigneeNames || translate('Unassigned') }}</ion-label>
      </ion-item>
      <ion-item v-if="task.createdDate || task.actualCompletionDate">
        <ion-label class="ion-text-wrap">
          <template v-if="task.createdDate"><p>{{ translate('Created') }}</p>{{ formatDate(task.createdDate) }}</template>
          <template v-if="task.actualCompletionDate"><p>{{ translate('Resolved') }}</p>{{ formatDate(task.actualCompletionDate) }}</template>
        </ion-label>
      </ion-item>
    </ion-list>

    <ion-item v-if="isOpen" lines="none" class="task-actions">
      <ion-button slot="end" fill="clear" data-testid="resolve-task" :disabled="busy" @click="$emit('resolve')">
        <ion-spinner v-if="busy" slot="start" name="crescent" />
        <ion-icon v-else slot="start" :icon="checkmarkOutline" />
        {{ translate('Resolve task') }}
      </ion-button>
    </ion-item>
  </ion-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { DateTime } from 'luxon';
import { IonBadge, IonButton, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonIcon, IonItem, IonLabel, IonList, IonSpinner } from '@ionic/vue';
import { checkmarkOutline } from 'ionicons/icons';
import { translate } from '@common';
import type { SystemTask } from '@/services/systemTasks';

const props = withDefaults(defineProps<{ task: SystemTask; busy?: boolean }>(), { busy: false });
defineEmits<{ (event: 'assign'): void; (event: 'resolve'): void }>();
const isOpen = computed(() => ['TASK_CREATED', 'TASK_IN_PROGRESS', 'TASK_ON_HOLD'].includes(props.task.statusId));
const assigneeNames = computed(() => props.task.assignees.map(person => person.name).join(', '));
const statusColors: Record<string, string> = { TASK_CREATED: 'primary', TASK_IN_PROGRESS: 'warning', TASK_ON_HOLD: 'warning', TASK_COMPLETED: 'success' };
const statusColor = computed(() => statusColors[props.task.statusId] || 'medium');
const statusLabel = computed(() => props.task.statusId === 'TASK_COMPLETED' ? translate('Resolved') : props.task.statusDescription || props.task.statusId);
function formatDate(value: number | string) {
  const date = typeof value === 'number' ? DateTime.fromMillis(value) : DateTime.fromISO(value);
  return date.isValid ? date.toLocaleString(DateTime.DATETIME_MED) : String(value);
}
</script>

<style scoped>
.task-heading { display: flex; flex-direction: row; align-items: flex-start; gap: var(--spacer-sm); }
.task-heading > div { flex: 1; min-width: 0; }
.task-heading ion-badge { flex-shrink: 0; }
ion-card-title, .task-description { overflow-wrap: anywhere; }
.task-description { white-space: pre-wrap; }
.task-metadata { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.task-actions { border-block-start: var(--border-medium); }
ion-spinner { width: 18px; height: 18px; }
</style>
