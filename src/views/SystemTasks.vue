<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-menu-button /></ion-buttons>
        <ion-title>{{ translate('System tasks') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="loading" :aria-label="translate('Refresh tasks')" @click="loadTasks">
            <ion-icon slot="icon-only" :icon="refreshOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main class="system-tasks-layout">
        <aside>
          <ion-card class="filters">
            <ion-card-header><ion-card-title>{{ translate('Filters') }}</ion-card-title></ion-card-header>
            <ion-searchbar :value="query.search" :debounce="350" :placeholder="translate('Search tasks')" @ionInput="searchTasks($event.detail.value || '')" />
            <ion-list>
              <ion-item>
                <ion-select v-model="query.status" :label="translate('Status')" interface="popover" @ionChange="resetPage">
                  <ion-select-option value="open">{{ translate('Open') }}</ion-select-option>
                  <ion-select-option value="resolved">{{ translate('Resolved') }}</ion-select-option>
                  <ion-select-option value="all">{{ translate('All') }}</ion-select-option>
                </ion-select>
              </ion-item>
              <ion-item lines="none">
                <ion-select v-model="query.purposeId" :label="translate('Purpose')" interface="popover" @ionChange="resetPage">
                  <ion-select-option value="">{{ translate('All purposes') }}</ion-select-option>
                  <ion-select-option v-for="purpose in purposes" :key="purpose.enumId" :value="purpose.enumId">{{ purpose.description }}</ion-select-option>
                </ion-select>
              </ion-item>
            </ion-list>
          </ion-card>
        </aside>
        <section class="task-queue" :aria-label="translate('System tasks')" :aria-busy="loading">
          <div v-if="loading" class="queue-state" role="status"><ion-spinner /><p>{{ translate('Loading tasks…') }}</p></div>
          <div v-else-if="loadError" class="queue-state" role="alert">
            <p>{{ translate('Unable to load system tasks. Please try again.') }}</p>
            <ion-button fill="outline" @click="loadTasks">{{ translate('Retry') }}</ion-button>
          </div>
          <template v-else>
            <div class="queue-header"><ion-note>{{ total }} {{ translate(total === 1 ? 'task' : 'tasks') }}</ion-note></div>
            <div v-if="!tasks.length" class="queue-state">
              <ion-icon :icon="checkmarkCircleOutline" />
              <h2>{{ translate('No system tasks found') }}</h2>
              <p>{{ translate('Tasks matching your filters will appear here.') }}</p>
            </div>
            <div class="task-cards">
              <SystemTaskCard v-for="task in tasks" :key="task.workEffortId" :task="task" :busy="busyIds.has(task.workEffortId)"
                @assign="openAssignment(task)" @resolve="confirmResolve(task)" />
            </div>
          </template>
          <nav v-if="!loadError && total > query.pageSize" class="pagination" :aria-label="translate('Task pages')">
            <ion-button fill="outline" :disabled="loading || query.pageIndex === 0" @click="changePage(-1)">{{ translate('Previous') }}</ion-button>
            <ion-note>{{ translate('Page') }} {{ query.pageIndex + 1 }} / {{ Math.ceil(total / query.pageSize) }}</ion-note>
            <ion-button fill="outline" :disabled="loading || (query.pageIndex + 1) * query.pageSize >= total" @click="changePage(1)">{{ translate('Next') }}</ion-button>
          </nav>
        </section>
      </main>
    </ion-content>

    <ion-modal :is-open="!!assignmentTask" :can-dismiss="!savingAssignment" @didDismiss="closeAssignment">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ translate('Assign task') }}</ion-title>
          <ion-buttons slot="end"><ion-button :disabled="savingAssignment" @click="closeAssignment">{{ translate('Cancel') }}</ion-button></ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <p class="ion-padding-horizontal">{{ assignmentTask?.workEffortName || assignmentTask?.workEffortId }}</p>
        <ion-searchbar :disabled="savingAssignment" :value="assigneeSearch" :debounce="350" :placeholder="translate('Search people')" @ionInput="searchAssignees($event.detail.value || '')" />
        <ion-radio-group v-model="selectedPartyId">
          <ion-list>
            <ion-item><ion-radio value="" :disabled="savingAssignment">{{ translate('Unassigned') }}</ion-radio></ion-item>
            <ion-item v-for="user in assignmentOptions" :key="user.partyId">
              <ion-radio :value="user.partyId" :disabled="savingAssignment">{{ user.name }}</ion-radio>
            </ion-item>
          </ion-list>
        </ion-radio-group>
        <div v-if="usersLoading" class="queue-state" role="status"><ion-spinner /></div>
        <div v-else-if="usersError" class="ion-padding" role="alert">
          <p>{{ translate('Unable to load people. Please try again.') }}</p>
          <ion-button fill="clear" @click="loadAssignees(false)">{{ translate('Retry') }}</ion-button>
        </div>
        <p v-else-if="!assigneeResults.length" class="ion-padding">{{ translate('No people found') }}</p>
        <ion-button v-if="hasMoreUsers && !usersError" expand="block" fill="clear" :disabled="usersLoading || savingAssignment" @click="loadAssignees(true)">{{ translate('Load more') }}</ion-button>
        <p v-if="assignmentError" role="alert" class="ion-padding">{{ translate('Unable to assign task. Please try again.') }}</p>
      </ion-content>
      <ion-footer>
        <ion-toolbar><ion-button expand="block" :disabled="savingAssignment" @click="saveAssignment">
          {{ translate(savingAssignment ? 'Saving…' : 'Save assignment') }}
        </ion-button></ion-toolbar>
      </ion-footer>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { IonButton, IonButtons, IonCard, IonCardHeader, IonCardTitle, IonContent, IonFooter, IonHeader, IonIcon, IonItem, IonList, IonMenuButton, IonModal, IonNote, IonPage, IonRadio, IonRadioGroup, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonTitle, IonToolbar, alertController, onIonViewWillEnter } from '@ionic/vue';
import { checkmarkCircleOutline, refreshOutline } from 'ionicons/icons';
import { translate } from '@common';
import { showToast } from '@/utils';
import SystemTaskCard from '@/components/SystemTaskCard.vue';
import { assignSystemTask, fetchSystemTasks, fetchTaskAssignees, resolveSystemTask } from '@/services/systemTasks';
import type { SystemTask, SystemTaskQuery, TaskAssignee } from '@/services/systemTasks';

const query = reactive<SystemTaskQuery>({ status: 'open', search: '', purposeId: '', pageIndex: 0, pageSize: 20 });
const tasks = ref<SystemTask[]>([]);
const total = ref(0);
const purposes = ref<{ enumId: string; description: string }[]>([]);
const loading = ref(false);
const loadError = ref(false);
const busyIds = reactive(new Set<string>());
let listRequest = 0;

async function loadTasks() {
  const request = ++listRequest;
  loading.value = true;
  loadError.value = false;
  try {
    const result = await fetchSystemTasks({ ...query });
    if (request !== listRequest) return;
    total.value = result.total;
    purposes.value = result.purposes;
    // Resolving the final card on a page can move the queue back one page.
    if (query.pageIndex > 0 && query.pageIndex * query.pageSize >= result.total) {
      query.pageIndex = Math.max(0, Math.ceil(result.total / query.pageSize) - 1);
      await loadTasks();
      return;
    }
    tasks.value = result.tasks;
  } catch {
    if (request === listRequest) loadError.value = true;
  } finally {
    if (request === listRequest) loading.value = false;
  }
}
function resetPage() { query.pageIndex = 0; void loadTasks(); }
function searchTasks(value: string) { query.search = value; resetPage(); }
function changePage(delta: number) { query.pageIndex += delta; void loadTasks(); }
onIonViewWillEnter(loadTasks);

async function confirmResolve(task: SystemTask) {
  if (busyIds.has(task.workEffortId)) return;
  const alert = await alertController.create({
    header: translate('Resolve task'),
    message: translate('Mark this task as resolved?'),
    buttons: [{ text: translate('Cancel'), role: 'cancel' }, { text: translate('Resolve task'), role: 'confirm' }],
  });
  await alert.present();
  const { role } = await alert.onDidDismiss();
  if (role !== 'confirm' || busyIds.has(task.workEffortId)) return;
  busyIds.add(task.workEffortId);
  try {
    await resolveSystemTask(task.workEffortId);
    await showToast(translate('Task resolved'));
    await loadTasks();
  } catch {
    await showToast(translate('Unable to resolve task. Please try again.'));
  } finally {
    busyIds.delete(task.workEffortId);
  }
}

const assignmentTask = ref<SystemTask>();
const selectedPartyId = ref('');
const selectedAssignee = ref<TaskAssignee>();
const assigneeSearch = ref('');
const assigneeResults = ref<TaskAssignee[]>([]);
const usersLoading = ref(false);
const usersError = ref(false);
const hasMoreUsers = ref(false);
const savingAssignment = ref(false);
const assignmentError = ref(false);
let usersPage = 0;
let usersRequest = 0;
const assignmentOptions = computed(() => [...new Map([
  ...(assignmentTask.value?.assignees || []),
  ...(selectedAssignee.value ? [selectedAssignee.value] : []), ...assigneeResults.value,
].map(user => [user.partyId, user])).values()]);
watch(selectedPartyId, partyId => {
  selectedAssignee.value = assignmentOptions.value.find(user => user.partyId === partyId);
}, { flush: 'sync' });

function openAssignment(task: SystemTask) {
  assignmentTask.value = task;
  selectedAssignee.value = task.assignees[0];
  selectedPartyId.value = task.assignees[0]?.partyId || '';
  assigneeSearch.value = '';
  assigneeResults.value = [];
  assignmentError.value = false;
  void loadAssignees(false);
}
function closeAssignment() {
  if (savingAssignment.value) return;
  assignmentTask.value = undefined;
  ++usersRequest;
}
function searchAssignees(value: string) { assigneeSearch.value = value; void loadAssignees(false); }
async function loadAssignees(more: boolean) {
  const request = ++usersRequest;
  const page = more ? usersPage + 1 : 0;
  usersLoading.value = true;
  usersError.value = false;
  if (!more) assigneeResults.value = [];
  try {
    const result = await fetchTaskAssignees(assigneeSearch.value, page);
    if (request !== usersRequest) return;
    assigneeResults.value = more ? [...assigneeResults.value, ...result.users] : result.users;
    usersPage = page;
    hasMoreUsers.value = result.hasMore;
  } catch {
    if (request === usersRequest) usersError.value = true;
  } finally {
    if (request === usersRequest) usersLoading.value = false;
  }
}
async function saveAssignment() {
  if (!assignmentTask.value || savingAssignment.value) return;
  const taskId = assignmentTask.value.workEffortId;
  savingAssignment.value = true;
  assignmentError.value = false;
  busyIds.add(taskId);
  try {
    await assignSystemTask(taskId, selectedPartyId.value);
    // Ionic checks canDismiss when isOpen changes, including programmatic closes.
    savingAssignment.value = false;
    assignmentTask.value = undefined;
    ++usersRequest;
    await showToast(translate('Task assignment updated'));
    await loadTasks();
  } catch {
    assignmentError.value = true;
  } finally {
    savingAssignment.value = false;
    busyIds.delete(taskId);
  }
}
</script>

<style scoped>
.system-tasks-layout { display: grid; grid-template-columns: 280px minmax(0, 760px); gap: 24px; max-width: 1100px; padding: 24px; margin: 0 auto; }
.filters { margin: 0; }
.task-queue { min-width: 0; }
.queue-header { margin-block-end: 16px; }
.task-cards { display: grid; gap: 24px; }
.queue-state { text-align: center; padding: 40px 16px; color: var(--ion-color-medium); }
.queue-state > ion-icon { font-size: 40px; }
.queue-state h2 { color: var(--ion-text-color); font-size: 20px; }
.pagination { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-block-start: 24px; }
@media (max-width: 767px) {
  .system-tasks-layout { grid-template-columns: minmax(0, 1fr); padding: 16px; gap: 16px; }
}
</style>
