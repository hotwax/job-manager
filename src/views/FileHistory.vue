<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>{{ translate("File history") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="openFiltersModal" :color="totalAppliedFilters ? 'primary' : ''">
            {{ translate("Filters") }}
            <template v-if="totalAppliedFilters">
              ({{ totalAppliedFilters }})
            </template>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>

        <!-- <div class="header">
          <div class="title">
            <h1>Bulk Import Monitor</h1>
            <p>Real-time status of data ingestion queues.</p>
          </div>
          <ion-button fill="clear">
            <ion-icon slot="icon-only" :icon="refreshOutline" />
          </ion-button>
        </div>

        <div class="queues">
          <ion-card v-for="queue in queues" :key="queue.id">
            <ion-card-header>
              <ion-card-title>{{ queue.name }}</ion-card-title>
              <ion-badge :color="getPriorityColor(queue.priority)">{{ queue.priority }}</ion-badge>
            </ion-card-header>

            <ion-card-content>
              <p>{{ queue.description }}</p>
              <ion-item lines="none">
                <ion-label>
                  {{ queue.pendingFiles }}
                  <p>{{ translate("Pending files") }}</p>
                </ion-label>
                <ion-label slot="end" class="ion-text-end">
                  {{ queue.avgSpeed }}
                  <p>{{ translate("Avg. speed/file") }}</p>
                </ion-label>
              </ion-item>

              <ion-button expand="block" fill="outline" @click="viewPendingFiles()">
                {{ translate("View pending files") }}
              </ion-button>
              
            </ion-card-content>
          </ion-card>
        </div> -->
        <div class="title">
          <h1>{{ translate("Processed Files") }}</h1>
          <p>{{ translate("View history of processed files") }}</p>
        </div>

        <ion-list>
          <div class="list-item table-header log">
            <ion-label>{{ translate("Log Id") }}</ion-label>
            <ion-label class="file-name">{{ translate("File name") }}</ion-label>
            <ion-label>{{ translate("Status") }}</ion-label>
            <ion-label>{{ translate("Uploaded By") }}</ion-label>
            <ion-label>{{ translate("Uploaded") }}</ion-label>
          </div>
          <div v-for="log in logs" :key="log.logId" class="list-item log" @click="router.push({ name: 'FileDetail', params: { id: log.logId } })">
            <ion-label>{{ log.logId }}</ion-label>
            <ion-item lines="none" class="file-name">
              <ion-icon slot="start" :icon="documentOutline" />
              <ion-label class="ion-text-wrap">
                {{ log.fileName }}
                <p>{{ getFileSize(log.fileSize) }}</p>
              </ion-label>
            </ion-item>
            <ion-label>
              <ion-chip :color="commonUtil.getStatusColor(log.statusId)">
                {{ translate(getStatusDesc(log.statusId)) }}
              </ion-chip>
            </ion-label>
            <ion-label>{{ log.createdByUserLogin || "-" }}</ion-label>
            <ion-label>
              {{ commonUtil.getDateTimeWithOrdinalSuffix(log.createdDate) }}
            </ion-label>
            <ion-button v-if="log.statusId === 'DmlsPending'" color="danger" fill="clear" @click.stop="mdmStore.cancelDataManagerLog(log.configId, log.logId)">
              <ion-icon slot="icon-only" :icon="closeOutline" />
            </ion-button>
          </div>
          <p class="empty-state" v-if="!logs.length">{{ translate("No logs found") }}</p>

          <ion-infinite-scroll @ionInfinite="logMoreLogs($event)" threshold="300px" v-show="isScrollable" ref="infiniteScrollRef">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')"/>
          </ion-infinite-scroll>
        </ion-list>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
  IonMenuButton,
  IonIcon,
  IonChip,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  onIonViewWillEnter,
  modalController
} from '@ionic/vue';
import { translate, commonUtil } from '@common';
import { closeOutline, documentOutline, filter } from 'ionicons/icons';
import { computed } from 'vue';
import router from '@/router';
import { useMdmConfigStore } from '@/store/mdmConfig';
import { getFileSize } from '@/utils';
import { getStatusDesc } from '@/utils/config';
import LogFilters from '@/components/LogFilters.vue';
import { useUtilStore } from '@/store/util';

const mdmStore = useMdmConfigStore();
const utilStore = useUtilStore();

const logs = computed(() => mdmStore.getLogs)
const isScrollable = computed(() => mdmStore.islogsScrollable)
const appliedFilters = computed(() => mdmStore.getAppliedFilters)
const totalAppliedFilters = computed(() => Object.keys(appliedFilters.value).length)

async function fetchLogs(pageSize = 10, pageIndex = 0) {
  await mdmStore.fetchDataManagerLogs({ pageSize, pageIndex });
}

function logMoreLogs(event: any) {
  fetchLogs(
    undefined,
    Math.ceil(logs.value.length / 10)
  ).then(async () => {
    await event.target.complete();
  });
}

async function openFiltersModal() {
  const filtersModal = await modalController.create({
    component: LogFilters,
    componentProps: { appliedFilters: JSON.parse(JSON.stringify(mdmStore.filters)) }
  })

  await filtersModal.present()
}

onIonViewWillEnter(async () => {
  await fetchLogs();
  useMdmConfigStore().fetchConfigs();
  await utilStore.fetchStatusItemsByType("DataManagerLog");
})
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacer-base);
}

.filter-segment {
  width: auto;
  min-width: 200px;
}

.list-item.log {
  --columns-desktop: 7;
  padding: var(--spacer-sm) var(--spacer-base);
  cursor: pointer;
}

.file-name {
  grid-column: span 2;
  justify-self: start;
}
</style>
