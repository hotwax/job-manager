<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/pipeline"></ion-back-button>
        </ion-buttons>
        <ion-breadcrumbs>
          <ion-breadcrumb href="/pipeline">{{ translate("Dashboard") }}</ion-breadcrumb>
          <ion-breadcrumb>{{ name }}</ion-breadcrumb>
        </ion-breadcrumbs>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="container">
        <!-- Main Partner Header Card -->
        <ion-card class="main-header-card">
          <ion-item lines="none">
            <ion-thumbnail slot="start" class="partner-logo">
              {{ partnerCode }}
            </ion-thumbnail>
            <ion-label>
              <h1>{{ name }} Domain</h1>
              <div class="status-id-row">
                <ion-badge color="warning">
                  <ion-icon :icon="alertCircleOutline" />
                  {{ translate("Warning") }}
                </ion-badge>
                <ion-note>System ID: NETSUITE_PROD_01</ion-note>
              </div>
            </ion-label>
            <ion-button slot="end" fill="outline">
              <ion-icon :icon="bookOutline" slot="start" />
              {{ translate("Job Catalog") }}
            </ion-button>
          </ion-item>
        </ion-card>

        <!-- Metrics Grid -->
        <div class="metrics-grid">
          <ion-card v-for="(metric, index) in metrics" :key="index">
            <ion-item lines="full">
              <ion-icon :icon="metric.icon" slot="start" />
              <ion-label>{{ translate(metric.title) }}</ion-label>
              <ion-badge :color="metric.statusColor" slot="end">
                {{ translate(metric.status) }}
              </ion-badge>
            </ion-item>

            <ion-card-content>
              <div class="data-flow">
                <ion-note>{{ translate("Data Flow") }}</ion-note>
                <ion-chip :outline="true">
                  {{ metric.flow }}
                </ion-chip>
              </div>

              <div class="queue-health">
                <div class="health-header">
                  <ion-note>{{ translate("QUEUE HEALTH") }}</ion-note>
                  <strong :class="metric.pendingColor">{{ metric.pending }} {{ translate("Pending") }}</strong>
                </div>
                <ion-progress-bar :value="metric.progress" :color="metric.pendingColor"></ion-progress-bar>
              </div>

              <ion-item lines="none" class="card-footer">
                <ion-note slot="start">{{ metric.jobsCount }} {{ translate("Jobs Configured") }}</ion-note>
                <ion-button slot="end" fill="clear" size="small" @click="viewCategoryJobs(metric.title)">
                  {{ translate("Drill Down") }}
                  <ion-icon :icon="arrowForwardOutline" slot="end" />
                </ion-button>
              </ion-item>
            </ion-card-content>
          </ion-card>
        </div>
      </div>
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
  IonCardContent,
  IonItem,
  IonThumbnail,
  IonLabel,
  IonBadge,
  IonButton,
  IonIcon,
  IonNote,
  IonChip,
  IonProgressBar
} from '@ionic/vue';
import { useRouter } from 'vue-router';
import {
  alertCircleOutline,
  bookOutline,
  cartOutline,
  cubeOutline,
  shirtOutline,
  swapHorizontalOutline,
  arrowForwardOutline,
  pulseOutline
} from 'ionicons/icons';
import { translate } from '@hotwax/dxp-components';

export default defineComponent({
  name: 'PartnerDetails',
  props: ['name'],
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
    IonCardContent,
    IonItem,
    IonThumbnail,
    IonLabel,
    IonBadge,
    IonButton,
    IonIcon,
    IonNote,
    IonChip,
    IonProgressBar
  },
  setup(props) {
    const partnerCode = props.name ? props.name.substring(0, 2).toUpperCase() : '??';

    const metrics = [
      {
        title: 'Orders',
        icon: cartOutline,
        status: 'Warning',
        statusColor: 'warning',
        flow: 'Partner -> HotWax',
        pending: '12',
        pendingColor: 'danger',
        progress: 0.7,
        jobsCount: 8
      },
      {
        title: 'Inventory',
        icon: cubeOutline,
        status: 'Healthy',
        statusColor: 'success',
        flow: 'HotWax -> Partner',
        pending: '0',
        pendingColor: 'success',
        progress: 0,
        jobsCount: 4
      },
      {
        title: 'Product',
        icon: shirtOutline,
        status: 'Healthy',
        statusColor: 'success',
        flow: 'Partner -> HotWax',
        pending: '0',
        pendingColor: 'success',
        progress: 0,
        jobsCount: 2
      },
      {
        title: 'Returns',
        icon: swapHorizontalOutline,
        status: 'Healthy',
        statusColor: 'success',
        flow: 'Partner -> HotWax',
        pending: '0',
        pendingColor: 'success',
        progress: 0,
        jobsCount: 3
      }
    ];

    const router = useRouter();

    const viewCategoryJobs = (categoryTitle: string) => {
      // Clean up the category title to make it URL friendly if needed, 
      // but for now passing as is or simple lowercase
      router.push({ 
        name: 'CategoryJobs', 
        params: { 
          partner: props.name,
          category: categoryTitle
        } 
      });
    };

    return {
      translate,
      alertCircleOutline,
      bookOutline,
      arrowForwardOutline,
      partnerCode,
      metrics,
      viewCategoryJobs
    }
  }
});
</script>

<style scoped>
.container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.main-header-card {
  margin-bottom: 32px;
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 16px;
  --padding-bottom: 16px;
}

.partner-logo {
  width: 64px;
  height: 64px;
  background: #1a1b1e;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: white;
  font-size: 24px;
}

.status-id-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
}

.data-flow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.queue-health {
  margin-bottom: 24px;
}

.health-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

ion-progress-bar {
  height: 6px;
  border-radius: 3px;
}

.card-footer {
  --padding-start: 0;
  --padding-end: 0;
  border-top: 1px solid var(--ion-color-light);
  margin-top: 8px;
}

h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
}

.danger { color: var(--ion-color-danger); }
.success { color: var(--ion-color-success); }

@media (max-width: 768px) {
  .container {
    padding: 16px;
  }
  
  .main-header-card ion-item {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .main-header-card ion-button {
    margin-top: 16px;
    align-self: flex-start;
  }
}
</style>
