<template>
  <ion-modal :is-open="!!task" :can-dismiss="!saving" @didDismiss="$emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button :disabled="saving" :aria-label="translate('Close')" :title="translate('Close')" @click="$emit('close')">
            <ion-icon slot="icon-only" :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ translate('Assign task') }}</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar :value="search" :disabled="saving" :debounce="300" :placeholder="translate('Search first name')" @ionInput="searchPeople($event.detail.value || '')" />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-radio-group v-model="selectedPartyId">
          <ion-item>
            <ion-radio value="" label-placement="end" justify="start" :disabled="saving"><ion-label>{{ translate('Unassigned') }}</ion-label></ion-radio>
          </ion-item>
          <ion-item v-for="person in options" :key="person.partyId">
            <ion-radio :value="person.partyId" label-placement="end" justify="start" :disabled="saving">
              <ion-label class="ion-text-wrap">{{ person.name }}<p>{{ person.partyId }}</p></ion-label>
            </ion-radio>
          </ion-item>
        </ion-radio-group>
      </ion-list>
      <div v-if="loading" class="empty-state" role="status"><ion-spinner name="crescent" /></div>
      <div v-else-if="loadError" class="empty-state" role="alert">
        <p>{{ translate('Unable to load people. Please try again.') }}</p>
        <ion-button fill="clear" @click="loadPeople(false)">{{ translate('Retry') }}</ion-button>
      </div>
      <p v-else-if="!people.length" class="empty-state">{{ translate('No people found') }}</p>
      <ion-button v-if="hasMore && !loadError" expand="block" fill="clear" :disabled="loading || saving" @click="loadPeople(true)">{{ translate('Load more') }}</ion-button>
      <p v-if="saveError" class="ion-padding" role="alert">{{ translate('Unable to assign task. Please try again.') }}</p>
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button data-testid="save-assignment" :disabled="saving" :aria-label="translate(saving ? 'Saving…' : 'Save assignment')" :title="translate('Save assignment')" @click="save">
          <ion-spinner v-if="saving" name="crescent" />
          <ion-icon v-else :icon="saveOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonModal, IonRadio, IonRadioGroup, IonSearchbar, IonSpinner, IonTitle, IonToolbar } from '@ionic/vue';
import { closeOutline, saveOutline } from 'ionicons/icons';
import { translate } from '@common';
import { fetchTaskAssignees } from '@/services/systemTasks';
import { useSystemTaskAssignment } from '@/composables/useSystemTaskAssignment';
import type { SystemTask, TaskAssignee } from '@/services/systemTasks';

const { assignSystemTask } = useSystemTaskAssignment();
const props = defineProps<{ task?: SystemTask }>();
const emit = defineEmits<{ (event: 'close'): void; (event: 'saved'): void }>();
const search = ref('');
const selectedPartyId = ref('');
const selectedPerson = ref<TaskAssignee>();
const people = ref<TaskAssignee[]>([]);
const loading = ref(false);
const loadError = ref(false);
const saving = ref(false);
const saveError = ref(false);
const hasMore = ref(false);
let pageIndex = 0;
let requestId = 0;

// Preserve the current and newly selected people across server-side searches.
const options = computed(() => [...new Map([
  ...(props.task?.assignees || []), ...(selectedPerson.value ? [selectedPerson.value] : []), ...people.value,
].map(person => [person.partyId, person])).values()]);
watch(selectedPartyId, id => { selectedPerson.value = options.value.find(person => person.partyId === id); }, { flush: 'sync' });
watch(() => props.task, task => {
  ++requestId;
  if (!task) return;
  search.value = '';
  selectedPerson.value = task.assignees[0];
  selectedPartyId.value = task.assignees[0]?.partyId || '';
  people.value = [];
  saveError.value = false;
  void loadPeople(false);
}, { immediate: true });

function searchPeople(value: string) {
  if (saving.value) return;
  search.value = value;
  void loadPeople(false);
}
async function loadPeople(more: boolean) {
  if (saving.value) return;
  const request = ++requestId;
  const page = more ? pageIndex + 1 : 0;
  loading.value = true;
  loadError.value = false;
  if (!more) { people.value = []; hasMore.value = false; }
  try {
    const result = await fetchTaskAssignees(search.value, page);
    if (request !== requestId) return;
    people.value = more ? [...people.value, ...result.users] : result.users;
    hasMore.value = result.hasMore;
    pageIndex = page;
  } catch {
    if (request === requestId) loadError.value = true;
  } finally {
    if (request === requestId) loading.value = false;
  }
}
async function save() {
  if (!props.task || saving.value) return;
  saving.value = true;
  saveError.value = false;
  try {
    await assignSystemTask(props.task.workEffortId, selectedPartyId.value);
    // Ionic checks canDismiss for programmatic closes as well as gestures.
    saving.value = false;
    emit('saved');
  } catch {
    saveError.value = true;
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
ion-content { --padding-bottom: var(--spacer-2xl); }
</style>
