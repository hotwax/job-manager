<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/catalog"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ jobName }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div v-if="job">
        <!-- Status Header -->
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>{{ translate('Status') }}</ion-card-subtitle>
            <ion-card-title>
              <div>ID: {{ job.instanceOfProductId }}</div>
              <ion-badge :color="job.paused === 'N' ? 'success' : 'warning'">
                {{ job.paused === 'N' ? translate('Enabled') : translate('Paused') }}
              </ion-badge>
            </ion-card-title>
          </ion-card-header>
        </ion-card>

        <!-- General Info -->
        <ion-list-header>
          <ion-label>{{ translate('General Information') }}</ion-label>
        </ion-list-header>
        <ion-list :inset="true">
          <ion-item>
            <ion-label>
              <h2>{{ translate('Service Name') }}</h2>
              <p><code>{{ job.serviceName }}</code></p>
            </ion-label>
          </ion-item>
          <ion-item v-if="job.description">
            <ion-label>
              <h2>{{ translate('Description') }}</h2>
              <p>{{ job.description }}</p>
            </ion-label>
          </ion-item>
           <ion-item v-if="job.instanceOfProductId">
            <ion-label>
              <h2>{{ translate('Instance Of Product ID') }}</h2>
              <p>{{ job.instanceOfProductId }}</p>
            </ion-label>
          </ion-item>
          <ion-item v-if="job.topic">
            <ion-label>
              <h2>{{ translate('Topic') }}</h2>
              <p>{{ job.topic }}</p>
            </ion-label>
          </ion-item>
        </ion-list>

        <!-- Schedule -->
        <ion-list-header>
          <ion-label>{{ translate('Schedule') }}</ion-label>
        </ion-list-header>
        <ion-list :inset="true">
          <ion-item>
            <ion-label>
              <h2>{{ translate('Cron Expression') }}</h2>
              <p>{{ job.cronExpression }}</p>
              <p><strong>{{ getCronString(job.cronExpression) }}</strong></p>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label>
              <h2>{{ translate('Run Times') }}</h2>
              <p>{{ translate('Repeat Count') }}: {{ job.repeatCount === -1 ? 'Infinite' : job.repeatCount }}</p>
            </ion-label>
          </ion-item>
          <ion-item v-if="job.fromDate">
            <ion-label>
              <h2>{{ translate('Valid From') }}</h2>
              <p>{{ job.fromDate }}</p>
            </ion-label>
          </ion-item>
          <ion-item v-if="job.thruDate">
            <ion-label>
              <h2>{{ translate('Valid To') }}</h2>
              <p>{{ job.thruDate }}</p>
            </ion-label>
          </ion-item>
        </ion-list>

        <!-- Execution Settings -->
        <ion-list-header>
          <ion-label>{{ translate('Execution Settings') }}</ion-label>
        </ion-list-header>
        <ion-list :inset="true">
          <ion-item>
            <ion-label>
              <h2>{{ translate('Priority') }}</h2>
              <p>{{ job.priority }}</p>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label>
              <h2>{{ translate('Transaction Timeout') }}</h2>
              <p>{{ job.transactionTimeout }} {{ translate('seconds') }}</p>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label>
              <h2>{{ translate('Retry & Locking') }}</h2>
              <p>{{ translate('Min Retry Time') }}: {{ job.minRetryTime }} {{ translate('minutes') }}</p>
              <p>{{ translate('Expire Lock Time') }}: {{ job.expireLockTime }} {{ translate('minutes') }}</p>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label>
              <h2>{{ translate('Local Only') }}</h2>
              <p>{{ job.localOnly === 'Y' ? translate('Yes') : translate('No') }}</p>
            </ion-label>
          </ion-item>
        </ion-list>

        <!-- Metadata -->
        <ion-list-header>
          <ion-label>{{ translate('Metadata') }}</ion-label>
        </ion-list-header>
        <ion-list :inset="true">
          <ion-item v-if="job.jobTypeEnumId">
            <ion-label>
              <h2>{{ translate('Job Type') }}</h2>
              <p>{{ job.jobTypeEnumId }}</p>
            </ion-label>
          </ion-item>
          <ion-item v-if="job.permissionGroupId">
            <ion-label>
              <h2>{{ translate('Permission Group') }}</h2>
              <p>{{ job.permissionGroupId }}</p>
            </ion-label>
          </ion-item>
          <ion-item v-if="job.parentJobName">
            <ion-label>
              <h2>{{ translate('Parent Job') }}</h2>
              <p>{{ job.parentJobName }}</p>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label>
              <h2>{{ translate('Stamps') }}</h2>
              <p>{{ translate('Created') }}: {{ job.createdStamp }}</p>
              <p>{{ translate('Updated') }}: {{ job.lastUpdatedStamp }}</p>
            </ion-label>
          </ion-item>
        </ion-list>

        <!-- Run History -->
        <ion-list-header>
          <ion-label>{{ translate('Run History') }}</ion-label>
        </ion-list-header>
        <div v-if="runs.length > 0">
          <ion-card v-for="run in runs" :key="run.jobRunId">
            <ion-card-header>
              <ion-card-title>
                <ion-badge :color="run.hasError === 'Y' ? 'danger' : 'success'">
                  {{ run.hasError === 'Y' ? translate('Failed') : translate('Success') }}
                </ion-badge>
                <span>#{{ run.jobRunId }}</span>
              </ion-card-title>
              <ion-card-subtitle>{{ run.startTime }}</ion-card-subtitle>
            </ion-card-header>
            <ion-card-content>
              <div>
                <p><strong>{{ translate('Duration') }}:</strong> {{ calculateDuration(run.startTime, run.endTime) }}</p>
                <p><strong>{{ translate('User') }}:</strong> {{ run.userId }}</p>
                <p><strong>{{ translate('Host') }}:</strong> {{ run.hostName }} ({{ run.hostAddress }})</p>
              </div>
              <div v-if="run.messages">
                <p>{{ run.messages }}</p>
              </div>
              
              <ion-accordion-group>
                <ion-accordion value="details">
                  <ion-item slot="header">
                    <ion-label>{{ translate('Technical Details') }}</ion-label>
                  </ion-item>
                  <div class="ion-padding" slot="content">
                    <div v-if="run.parameters">
                      <h3>{{ translate('Parameters') }}</h3>
                      <pre><code>{{ run.parameters }}</code></pre>
                    </div>
                    <div v-if="run.results">
                      <h3>{{ translate('Results') }}</h3>
                      <pre><code>{{ run.results }}</code></pre>
                    </div>
                    <div v-if="run.errors">
                      <h3>{{ translate('Errors') }}</h3>
                      <pre><code>{{ run.errors }}</code></pre>
                    </div>
                  </div>
                </ion-accordion>
              </ion-accordion-group>
            </ion-card-content>
          </ion-card>
        </div>
        <div v-else class="ion-padding ion-text-center">
          <p>{{ translate('No run history available') }}</p>
        </div>
      </div>

      <div v-else class="ion-padding ion-text-center">
        <p>{{ translate('Job not found') }}</p>
        <ion-button fill="clear" router-link="/catalog">{{ translate('Back to Catalog') }}</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonAccordion,
  IonAccordionGroup,
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPage,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import { defineComponent, computed } from 'vue';
import { useRoute } from 'vue-router';
import { translate } from '@common';
import { getCronString } from '@/utils';
import { mockJobs } from '@/mock/jobs';
import { mockJobRuns } from '@/mock/jobRuns';

export default defineComponent({
  name: 'JobDetail',
  components: {
    IonAccordion,
    IonAccordionGroup,
    IonBackButton,
    IonBadge,
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonPage,
    IonTitle,
    IonToolbar
  },
  setup() {
    const route = useRoute();
    const jobName = computed(() => route.params.jobName as string);

    const job = computed(() => {
      return mockJobs.find(j => j.jobName === jobName.value);
    });

    const runs = computed(() => {
      return mockJobRuns.filter(r => r.jobName === jobName.value);
    });

    const calculateDuration = (start: string | null, end: string | null) => {
      if (!start || !end) return 'N/A';
      const startDate = new Date(start);
      const endDate = new Date(end);
      const diff = endDate.getTime() - startDate.getTime();
      
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      
      if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
      }
      return `${seconds}s`;
    };

    return {
      calculateDuration,
      job,
      jobName,
      runs,
      translate,
      getCronString
    };
  }
});
</script>

<style scoped>
</style>
