<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="'/partner/' + partner"></ion-back-button>
        </ion-buttons>
        <ion-breadcrumbs>
          <ion-breadcrumb :href="'/partner/' + partner">{{ partner }}</ion-breadcrumb>
          <ion-breadcrumb>{{ category }} {{ translate("Monitor") }}</ion-breadcrumb>
        </ion-breadcrumbs>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <!-- Header Section -->
        <div>
          <h1>{{ category }} {{ translate("Jobs") }}</h1>
          <p>{{ translate("Detailed status of all") }} {{ jobs.length }} {{ translate("jobs in this group.") }}</p>
        </div>

        <!-- Jobs List Card -->
        <ion-card class="jobs-card">
          <!-- Table Header (hidden on mobile, visible on desktop) -->

          <ion-list>
            <div class="table-header list-item job ion-hide-sm-down">
              <ion-label>{{ translate("Job name") }}</ion-label>
              <ion-label>{{ translate("Status") }}</ion-label>
              <ion-label>{{ translate("Last run") }}</ion-label>
              <ion-label class="ion-text-end">{{ translate("Action") }}</ion-label>
            </div>
            <div class="list-item job" v-for="(job, index) in jobs" :key="index" @click="viewJobDetails(job.id)">
              <ion-item lines="none">
                <ion-label class="job-name">
                  {{ job.name }}
                  <p><code>{{ job.code }}</code></p>
                </ion-label>
              </ion-item>

              <ion-badge :color="job.statusColor">
                <ion-icon :icon="job.statusIcon" v-if="job.statusIcon" />
                {{ job.status }}
              </ion-badge>

              <ion-label>
                <span class="ion-hide-md-up">{{ translate("Last Run") }}: </span>
                {{ job.lastRun }}
              </ion-label>

              <ion-button fill="clear" size="small">
                {{ translate("Details") }}
                <ion-icon :icon="chevronForwardOutline" slot="end" />
              </ion-button>
            </div>
          </ion-list>

        </ion-card>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonBreadcrumbs,
    IonBreadcrumb,
    IonContent,
    IonCard,
    IonList,
    IonItem,
    IonIcon,
    IonBadge,
    IonButton,
    IonLabel
} from '@ionic/vue';
import {
    layersOutline,
    chevronForwardOutline,
    checkmarkCircleOutline,
    alertCircleOutline,
    timeOutline,
    closeCircleOutline
} from 'ionicons/icons';
import { translate } from '@common';
import { useRouter } from 'vue-router';

export default defineComponent({
    name: 'CategoryJobs',
    props: ['partner', 'category'],
    components: {
        IonPage,
        IonHeader,
        IonToolbar,
        IonButtons,
        IonBackButton,
        IonBreadcrumbs,
        IonBreadcrumb,
        IonContent,
        IonCard,
        IonList,
        IonItem,
        IonIcon,
        IonBadge,
        IonButton,
        IonLabel
    },
    setup(props) {
        const router = useRouter();

        const jobs = [
            {
                id: 'sales-orders',
                name: 'Import Sales Orders (NS)',
                code: 'importNetSuiteSalesOrders',
                status: 'Success',
                statusColor: 'success',
                statusIcon: checkmarkCircleOutline,
                lastRun: '10:45'
            },
            {
                id: 'order-status',
                name: 'Sync Order Status to NS',
                code: 'syncOrderStatusNetSuite',
                status: 'Warning',
                statusColor: 'warning',
                statusIcon: timeOutline,
                lastRun: '10:40'
            },
            {
                id: 'transfer-orders',
                name: 'Import Transfer Orders',
                code: 'importNetSuiteTransferOrders',
                status: 'Success',
                statusColor: 'success',
                statusIcon: checkmarkCircleOutline,
                lastRun: '10:00'
            },
            {
                id: 'fulfillments',
                name: 'Export Fulfillments to NS',
                code: 'exportFulfillmentsNetSuite',
                status: 'Failed',
                statusColor: 'danger',
                statusIcon: closeCircleOutline,
                lastRun: '10:30'
            },
            {
                id: 'customer-deposits',
                name: 'Sync Customer Deposits',
                code: 'syncNetSuiteDeposits',
                status: 'Success',
                statusColor: 'success',
                statusIcon: checkmarkCircleOutline,
                lastRun: '08:00'
            }
        ];

        const viewJobDetails = (jobId: string) => {
            router.push({
                name: 'JobDetailConfig',
                params: {
                    partner: props.partner,
                    category: props.category,
                    jobId: jobId
                }
            });
        };

        return {
            translate,
            layersOutline,
            chevronForwardOutline,
            jobs,
            viewJobDetails
        }
    }
});
</script>

<style scoped>

.jobs-card {
  margin: 0;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.job-name code {
  background: var(--ion-color-light);
  padding: 2px 4px;
  border-radius: 4px;
}

@media (max-width: 992px) {
  .table-header {
    display: none;
  }
}

.list-item .job {
  --columns-desktop: 4;
  border-bottom: 1px solid var(--ion-color-medium);
  cursor: pointer;
}

.list-item:hover {
  background-color: var(--ion-color-light);
}

.list-item>ion-item {
  width: 100%;
}

@media (min-width: 992px) {
  .list-item {
    display: grid;
    grid-template-columns: 5fr 2fr 3fr 2fr;
    align-items: center;
  }
}
</style>
