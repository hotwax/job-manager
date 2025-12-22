<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="'/partner/' + partner + '/category/' + category"></ion-back-button>
        </ion-buttons>
        <ion-breadcrumbs>
          <ion-breadcrumb :href="'/partner/' + partner">{{ partner }}</ion-breadcrumb>
          <ion-breadcrumb :href="'/partner/' + partner + '/category/' + category">{{ category }}</ion-breadcrumb>
          <ion-breadcrumb>{{ jobName }}</ion-breadcrumb>
        </ion-breadcrumbs>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="container">
        <!-- Main Job Header -->
        <ion-card class="job-header-card">
          <div class="job-header-content">
            <div class="job-info">
              <h1>{{ jobName }}</h1>
              <div class="job-meta">
                <code>{{ jobCode }}</code>
              </div>
              <p>{{ translate("Main order ingestion from ERP.") }}</p>
            </div>
            <ion-button color="primary">
              <ion-icon :icon="playOutline" slot="start" />
              {{ translate("Run Now") }}
            </ion-button>
          </div>
        </ion-card>

        <div class="content-grid">
          <!-- Runtime Parameters (Left Col) -->
          <div class="left-col">
            <ion-card class="section-card">
              <ion-item lines="none" class="section-header">
                <ion-icon :icon="codeSlashOutline" slot="start" />
                <ion-label>{{ translate("Runtime Parameters") }}</ion-label>
              </ion-item>
              <div class="code-block">
                <pre>
{
  "type": "SO"
}</pre>
              </div>
            </ion-card>
          </div>

          <!-- Right Col -->
          <div class="right-col">
            <!-- Processed Files -->
            <ion-card class="section-card">
              <ion-item lines="none" class="section-header">
                <ion-label>
                  <h2>{{ translate("Processed Files") }}</h2>
                </ion-label>
                <ion-button fill="clear" slot="end" size="small">{{ translate("View All") }}</ion-button>
              </ion-item>
              
              <div class="table-header-simple">
                <ion-row>
                  <ion-col size="6">{{ translate("FILE") }}</ion-col>
                  <ion-col size="4">{{ translate("PROGRESS") }}</ion-col>
                  <ion-col size="2" class="ion-text-end">{{ translate("ACTION") }}</ion-col>
                </ion-row>
              </div>

              <ion-list>
                <ion-item lines="full">
                  <ion-grid class="ion-no-padding">
                    <ion-row class="ion-align-items-center">
                      <ion-col size="6">
                        <div class="file-name">IMP_ORD_NS_20231024_001.csv</div>
                        <div class="file-date">Oct 27, 10:42 AM</div>
                      </ion-col>
                      <ion-col size="4">
                         <div class="progress-wrapper">
                           <ion-progress-bar :value="0.9" color="success"></ion-progress-bar>
                           <div class="progress-labels">
                             <span class="success-text">142 OK</span>
                             <span class="error-text">8 ERR</span>
                           </div>
                         </div>
                      </ion-col>
                      <ion-col size="2" class="ion-text-end">
                        <ion-icon :icon="chevronForwardOutline" color="medium" />
                      </ion-col>
                    </ion-row>
                  </ion-grid>
                </ion-item>
              </ion-list>
            </ion-card>

            <!-- Execution History -->
             <ion-card class="section-card">
              <ion-item lines="none" class="section-header">
                <ion-icon :icon="timeOutline" slot="start" />
                <ion-label>{{ translate("Execution History") }}</ion-label>
              </ion-item>

               <div class="table-header-simple">
                <ion-row>
                  <ion-col size="3">{{ translate("RUN ID") }}</ion-col>
                  <ion-col size="3">{{ translate("STATUS") }}</ion-col>
                  <ion-col size="3">{{ translate("TIME") }}</ion-col>
                  <ion-col size="3" class="ion-text-end">{{ translate("PROCESSED") }}</ion-col>
                </ion-row>
              </div>

              <ion-list>
                <ion-item lines="none">
                  <ion-grid class="ion-no-padding">
                    <ion-row class="ion-align-items-center">
                      <ion-col size="3" class="run-id">#EXE_NS1</ion-col>
                      <ion-col size="3">
                        <ion-badge color="success" class="history-badge">
                           <ion-icon :icon="checkmarkCircleOutline" />
                           {{ translate("Success") }}
                        </ion-badge>
                      </ion-col>
                      <ion-col size="3" class="run-time">10:45</ion-col>
                      <ion-col size="3" class="ion-text-end run-count">120</ion-col>
                    </ion-row>
                  </ion-grid>
                </ion-item>
              </ion-list>
            </ion-card>
          </div>
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
  IonLabel,
  IonButton,
  IonIcon,
  IonItem,
  IonRow,
  IonCol,
  IonGrid,
  IonList,
  IonProgressBar,
  IonBadge
} from '@ionic/vue';
import {
  playOutline,
  codeSlashOutline,
  timeOutline,
  chevronForwardOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';
import { translate } from '@hotwax/dxp-components';

export default defineComponent({
  name: "JobDetailConfig",
  props: ['partner', 'category', 'jobId'],
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
    IonLabel,
    IonButton,
    IonIcon,
    IonItem,
    IonRow,
    IonCol,
    IonGrid,
    IonList,
    IonProgressBar,
    IonBadge
  },
  setup(props) {
    // Mock logic to get name from ID
    let jobName = 'Import Sales Orders (NS)';
    let jobCode = 'importNetSuiteSalesOrders';
    
    // Simple mapper for demo purposes
    if (props.jobId === 'order-status') {
        jobName = 'Sync Order Status to NS';
        jobCode = 'syncOrderStatusNetSuite';
    }

    return {
      translate,
      playOutline,
      codeSlashOutline,
      timeOutline,
      chevronForwardOutline,
      checkmarkCircleOutline,
      jobName,
      jobCode
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

.job-header-card {
  padding: 24px;
  margin: 0 0 24px;
  border-radius: 8px;
}

.job-header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.job-info h1 {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  color: #202124;
}

.job-meta code {
  color: #1967d2;
  font-weight: 500;
  font-size: 14px;
}

.job-info p {
  margin: 16px 0 0;
  color: #5f6368;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 24px;
}

.section-card {
  margin: 0 0 24px;
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  border-bottom: 1px solid #f1f3f4;
  --min-height: 56px;
  font-weight: 600;
  color: #3c4043;
}

.section-header ion-label h2 {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
}

.code-block {
  background: #282c34;
  color: #abb2bf;
  padding: 16px;
  margin: 0;
  min-height: 200px;
}

.code-block pre {
  margin: 0;
}

.table-header-simple {
  padding: 12px 16px;
  background: #f8f9fa;
  font-size: 11px;
  font-weight: 600;
  color: #5f6368;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #e0e0e0;
}

.file-name {
  font-weight: 600;
  font-size: 14px;
  color: #202124;
}

.file-date {
  font-size: 12px;
  color: #5f6368;
  margin-top: 2px;
}

.progress-wrapper {
  padding-right: 16px;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  font-weight: 700;
  margin-top: 4px;
}

.success-text { color: var(--ion-color-success); }
.error-text { color: var(--ion-color-danger); }

.history-badge {
    padding: 6px 8px;
    border-radius: 4px;
    font-weight: 600;
}

.run-id { color: #5f6368; font-size: 13px; }
.run-time { color: #202124; font-weight: 500; font-size: 14px; }
.run-count { font-weight: 700; font-size: 14px; }

@media (max-width: 900px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
