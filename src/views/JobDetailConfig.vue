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
    <main>
      <!-- Main Job Header -->
      <ion-card>
        <ion-card-content>
          <div class="job-info">
            <h1>{{ jobName }}</h1>
            <code>{{ jobCode }}</code>
            <p>{{ translate("Main order ingestion from ERP.") }}</p>
          </div>
          <ion-button color="primary">
            <ion-icon :icon="playOutline" slot="start" />
            {{ translate("Run Now") }}
          </ion-button>
        </ion-card-content>
      </ion-card>

      <div class="content-grid">
        <!-- Runtime Parameters (Left Col) -->
        <ion-card class="job-parameters">
          <ion-item lines="none">
            <ion-icon :icon="codeSlashOutline" slot="start" />
            <ion-label>{{ translate("Runtime Parameters") }}</ion-label>
          </ion-item>
          <div class="code-block">
            <pre>
{ "type": "SO" }
            </pre>
          </div>
        </ion-card>

        <!-- Right Col -->
        <section>
          <!-- Processed Files -->
          <ion-card class="processed-files">
            <ion-card-header>
              <ion-card-title>{{ translate("Processed Files") }}</ion-card-title>
              <ion-button fill="clear" size="small">{{ translate("View All")}}</ion-button>
            </ion-card-header>

            <div class="table-header list-item file">
              <ion-label>{{ translate("File") }}</ion-label>
              <ion-label class="progress">{{ translate("Progress") }}</ion-label>
              <ion-label>{{ translate("Action") }}</ion-label>
            </div>

            <ion-list>
              <div class="list-item file">
                <ion-item lines="none">
                  <ion-label>
                    IMP_ORD_NS_20231024_001.csv
                    <p>Oct 27, 10:42 AM</p>
                  </ion-label>
                </ion-item>
                <div class="progress">
                  <ion-progress-bar :value="0.9" color="success"></ion-progress-bar>
                  <div class="progress-labels">
                    <span class="success-text">142 OK</span>
                    <span class="error-text">8 ERR</span>
                  </div>
                </div>
                <div class="action">
                  <ion-icon :icon="chevronForwardOutline" color="medium" />
                </div>
              </div>
            </ion-list>
          </ion-card>

          <!-- Execution History -->
          <ion-card class="execution-history">
            <ion-card-header>
              <ion-card-title>{{ translate("Execution History") }}</ion-card-title>
            </ion-card-header>

            <div class="table-header list-item job-run">
              <ion-label>{{ translate("Run Id") }}</ion-label>
              <ion-label>{{ translate("Status") }}</ion-label>
              <ion-label>{{ translate("Time") }}</ion-label>
              <ion-label class="ion-text-end">{{ translate("Processed") }}</ion-label>
            </div>

            <ion-list>
              <div class="list-item job-run">
                <ion-item lines="none">
                  <ion-label>
                    #EXE_NS1
                  </ion-label>
                </ion-item>

                <ion-badge color="success">
                  <ion-icon :icon="checkmarkCircleOutline" />
                  {{ translate("Success") }}
                </ion-badge>

                <ion-label>
                  10:45
                </ion-label>

                <ion-label>
                  120
                </ion-label>
              </div>
            </ion-list>
          </ion-card>
        </section>
      </div>
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
    IonCardHeader,
    IonCardContent,
    IonCardTitle,
    IonLabel,
    IonButton,
    IonIcon,
    IonItem,
    IonList,
    IonProgressBar,
    IonBadge
} from '@ionic/vue';
import {
    playOutline,
    codeSlashOutline,
    chevronForwardOutline,
    checkmarkCircleOutline
} from 'ionicons/icons';
import { translate } from '@common';

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
        IonCardHeader,
        IonCardContent,
        IonCardTitle,
        IonLabel,
        IonButton,
        IonIcon,
        IonItem,
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
            chevronForwardOutline,
            checkmarkCircleOutline,
            jobName,
            jobCode
        }
    }
});
</script>

<style scoped>

ion-card-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

ion-card-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 24px;
  align-items: start;
}


.list-item.file {
  --columns-desktop: 4;
  padding-inline: var(--spacer-sm);
}

.list-item.file .progress {
  grid-column: span 2;
  width: 50%;
}

.list-item.job-run {
  --columns-desktop: 5;
  padding-inline: var(--spacer-sm);
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

.progress-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
}

.success-text {
  color: var(--ion-color-success);
}

.error-text {
  color: var(--ion-color-danger);
}


@media (max-width: 900px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
