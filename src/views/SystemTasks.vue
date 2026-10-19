<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate('System tasks') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="loading" :aria-label="translate('Refresh tasks')" :title="translate('Refresh tasks')" @click="loadTasks">
            <ion-icon slot="icon-only" :icon="refreshOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main>
        <ion-card>
          <ion-card-content>
            <ion-searchbar :value="query.search" :debounce="300" :placeholder="translate('Search tasks')" @ionInput="query.search = $event.detail.value || ''; resetPage()" />
            <div class="filter-grid">
              <div class="filter-item">
                <ion-select v-model="query.searchField" :label="translate('Search by')" label-placement="stacked" interface="popover" @ionChange="resetPage">
                  <ion-select-option value="workEffortName">{{ translate('Task name') }}</ion-select-option>
                  <ion-select-option value="workEffortId">{{ translate('Task ID') }}</ion-select-option>
                  <ion-select-option value="description">{{ translate('Description') }}</ion-select-option>
                </ion-select>
              </div>
              <div class="filter-item">
                <ion-select v-model="query.status" :label="translate('Status')" label-placement="stacked" interface="popover" @ionChange="resetPage">
                  <ion-select-option value="open">{{ translate('Open') }}</ion-select-option>
                  <ion-select-option value="resolved">{{ translate('Resolved') }}</ion-select-option>
                  <ion-select-option value="all">{{ translate('All') }}</ion-select-option>
                </ion-select>
                <ion-button v-if="query.status !== 'all'" class="clear-filter-btn" fill="clear" :aria-label="translate('Clear')" :title="translate('Clear')" @click="query.status = 'all'; resetPage()">
                  <ion-icon slot="icon-only" :icon="closeCircleOutline" />
                </ion-button>
              </div>
              <div class="filter-item">
                <ion-select v-model="query.purposeId" :label="translate('Purpose')" label-placement="stacked" interface="popover" @ionChange="resetPage">
                  <ion-select-option value="">{{ translate('All purposes') }}</ion-select-option>
                  <ion-select-option v-for="purpose in purposes" :key="purpose.enumId" :value="purpose.enumId">{{ purpose.description }}</ion-select-option>
                </ion-select>
                <ion-button v-if="query.purposeId" class="clear-filter-btn" fill="clear" :aria-label="translate('Clear')" :title="translate('Clear')" @click="query.purposeId = ''; resetPage()">
                  <ion-icon slot="icon-only" :icon="closeCircleOutline" />
                </ion-button>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <section :aria-label="translate('System tasks')" :aria-busy="loading">
          <div v-if="loading" class="empty-state" role="status"><ion-spinner name="crescent" /><p>{{ translate('Loading tasks…') }}</p></div>
          <div v-else-if="loadError" class="empty-state" role="alert">
            <p>{{ translate('Unable to load system tasks. Please try again.') }}</p>
            <ion-button fill="outline" @click="loadTasks">{{ translate('Retry') }}</ion-button>
          </div>
          <template v-else>
            <div class="results-header">
              <ion-note>{{ total }} {{ translate(total === 1 ? 'task' : 'tasks') }}</ion-note>
              <nav v-if="pageCount > 1" class="pagination" :aria-label="translate('Task pages')">
                <ion-button fill="outline" :disabled="query.pageIndex === 0" @click="changePage(-1)">{{ translate('Previous') }}</ion-button>
                <ion-note>{{ translate('Page') }} {{ query.pageIndex + 1 }} / {{ pageCount }}</ion-note>
                <ion-button fill="outline" :disabled="query.pageIndex + 1 >= pageCount" @click="changePage(1)">{{ translate('Next') }}</ion-button>
              </nav>
            </div>
            <ion-list v-if="tasks.length">
              <SystemTaskCard v-for="task in tasks" :key="task.workEffortId" :task="task" :busy="busyIds.has(task.workEffortId)" @assign="assignmentTask = task" @resolve="confirmResolve(task)" />
            </ion-list>
            <div v-else class="empty-state">
              <p>{{ translate('No system tasks found') }}</p>
              <ion-note>{{ translate('Try clearing filters or search to see more results.') }}</ion-note>
            </div>
          </template>
        </section>
      </main>
    </ion-content>
    <SystemTaskAssignmentModal :task="assignmentTask" @close="assignmentTask = undefined" @saved="assignmentSaved" />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { IonButton, IonButtons, IonCard, IonCardContent, IonContent, IonHeader, IonIcon, IonList, IonMenuButton, IonNote, IonPage, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonTitle, IonToolbar, alertController, onIonViewWillEnter } from '@ionic/vue';
import { closeCircleOutline, refreshOutline } from 'ionicons/icons';
import { translate } from '@common';
import { showToast } from '@/utils';
import SystemTaskCard from '@/components/SystemTaskCard.vue';
import SystemTaskAssignmentModal from '@/components/SystemTaskAssignmentModal.vue';
import { fetchSystemTasks, resolveSystemTask } from '@/services/systemTasks';
import type { SystemTask, SystemTaskQuery } from '@/services/systemTasks';

const query = reactive<SystemTaskQuery>({ status: 'open', search: '', searchField: 'workEffortName', purposeId: '', pageIndex: 0, pageSize: 20 });
const tasks = ref<SystemTask[]>([]);
const total = ref(0);
const purposes = ref<{ enumId: string; description: string }[]>([]);
const loading = ref(false);
const loadError = ref(false);
const assignmentTask = ref<SystemTask>();
const busyIds = reactive(new Set<string>());
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / query.pageSize)));
let requestId = 0;

async function loadTasks() {
  const request = ++requestId;
  loading.value = true;
  loadError.value = false;
  try {
    const result = await fetchSystemTasks({ ...query });
    if (request !== requestId) return;
    total.value = result.total;
    purposes.value = result.purposes;
    // Resolving the final task on a page can reduce the number of pages.
    if (query.pageIndex >= pageCount.value) {
      query.pageIndex = pageCount.value - 1;
      await loadTasks();
      return;
    }
    tasks.value = result.tasks;
  } catch {
    if (request === requestId) loadError.value = true;
  } finally {
    if (request === requestId) loading.value = false;
  }
}
function resetPage() { query.pageIndex = 0; void loadTasks(); }
function changePage(delta: number) { query.pageIndex += delta; void loadTasks(); }
onIonViewWillEnter(loadTasks);
async function assignmentSaved() {
  assignmentTask.value = undefined;
  await showToast(translate('Task assignment updated'));
  await loadTasks();
}
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
</script>

<style scoped>
.results-header, .pagination { display: flex; align-items: center; gap: var(--spacer-sm); flex-wrap: wrap; }
.results-header { justify-content: space-between; padding: var(--spacer-sm); }
.pagination { margin-inline-start: auto; }
</style>
