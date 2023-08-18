<template>
  <section v-if="type === 'products'">
    <ion-item lines="none">
      <h1>{{ $t("Products") }}</h1>
      <!-- TODO: make the badges dynamic on the basis of job status -->
      <!-- <ion-badge slot="end" color="warning">running</ion-badge> -->
    </ion-item>

    <ion-list>
      <ion-item>
        <ion-icon slot="start" :icon="calendarClearOutline" />
        <ion-label class="ion-text-wrap">{{ $t("Last run") }}</ion-label>
        <ion-label class="ion-text-wrap" slot="end">{{ previousOccurrence ? getTime(previousOccurrence) : $t('No previous occurrence') }}</ion-label>
      </ion-item>

      <ion-item>
        <ion-icon slot="start" :icon="timeOutline" />
        <ion-label class="ion-text-wrap">{{ $t("Run time") }}</ion-label>
        <ion-select interface="popover" :placeholder="$t('Select')" :value="runTime" @ionChange="updateRunTime($event)">
          <ion-select-option v-for="runTime in runTimes" :key="runTime.value" :value="runTime.value">{{ $t(runTime.label) }}</ion-select-option>
        </ion-select>
        <ion-modal :is-open="isDateTimeModalOpen" @didDismiss="() => isDateTimeModalOpen = false">
          <ion-content force-overscroll="false">
            <ion-datetime
              show-default-buttons
              hour-cycle="h23"
              :value="runTime ? (isCustomRunTime(runTime) ? getDateTime(runTime) : getDateTime(DateTime.now().toMillis() + runTime)) : ''"
              @ionChange="updateCustomTime($event)"
            />
          </ion-content>
        </ion-modal>
      </ion-item>

      <ion-item lines="none">
        <ion-chip @click="openJobCustomParameterModal" outline v-if="!Object.keys(generateCustomParameters).length">
          <ion-icon :icon="addOutline" />
          <ion-label>{{ $t('Add custom parameters') }}</ion-label>
        </ion-chip>
        <ion-row v-else>
          <ion-chip @click="openJobCustomParameterModal" outline :color="value ? undefined :'danger'" :key="name" v-for="(value, name) in generateCustomParameters">
            {{ name }} : {{ value }}
          </ion-chip>
        </ion-row>
        <ion-button @click="openJobCustomParameterModal" id="open-modal" slot="end" fill="clear">
          <ion-icon slot="icon-only" :icon="listCircleOutline"/>
        </ion-button>
      </ion-item>
    </ion-list>

    <ion-button :disabled="!hasPermission(Actions.APP_JOB_UPDATE) || isRequiredParametersMissing" size="small" fill="outline" expand="block" @click="runJob('Products')">{{ $t("Run import") }}</ion-button>
  </section>

  <section v-else>
    <ion-item lines="none">
      <h1>{{ $t("Orders") }}</h1>
      <!-- TODO: make the badges dynamic on the basis of job status -->
      <!-- <ion-badge slot="end" color="medium">pending</ion-badge> -->
    </ion-item>

    <ion-list>
      <ion-item>
        <ion-icon slot="start" :icon="calendarClearOutline" />
        <ion-label class="ion-text-wrap">{{ $t("Last run") }}</ion-label>
        <ion-label slot="end">{{ previousOccurrence ? getTime(previousOccurrence) : $t('No previous occurrence') }}</ion-label>
      </ion-item>

      <ion-item button>
        <ion-icon slot="start" :icon="timeOutline" />
        <ion-label class="ion-text-wrap">{{ $t("Run time") }}</ion-label>
        <ion-select interface="popover" :placeholder="$t('Select')" :value="runTime" @ionChange="updateRunTime($event)">
          <ion-select-option v-for="runTime in runTimes" :key="runTime.value" :value="runTime.value">{{ $t(runTime.label) }}</ion-select-option>
        </ion-select>
        <ion-modal class="date-time-modal" :is-open="isDateTimeModalOpen" @didDismiss="() => isDateTimeModalOpen = false">
          <ion-content force-overscroll="false">
            <ion-datetime          
              show-default-buttons
              hour-cycle="h12"
              :value="runTime ? (isCustomRunTime(runTime) ? getDateTime(runTime) : getDateTime(DateTime.now().toMillis() + runTime)) : ''"
              @ionChange="updateCustomTime($event)"
            />
          </ion-content>
        </ion-modal>
      </ion-item>

      <ion-item>
        <ion-icon slot="start" :icon="flagOutline" />
        <ion-label class="ion-text-wrap">{{ $t("Order status") }}</ion-label>
        <ion-select value="open" :interface-options="customOrderOptions" interface="popover">
          <ion-select-option value="open">{{ $t("Open") }}</ion-select-option>
          <!-- TODO: commenting options for now, enable it once having support -->
          <!-- <ion-select-option value="archived">{{ $t("Archived") }}</ion-select-option>
          <ion-select-option value="canceled">{{ $t("Canceled") }}</ion-select-option> -->
        </ion-select>
      </ion-item>

      <ion-item>
        <ion-icon slot="start" :icon="sendOutline" />
        <ion-label class="ion-text-wrap">{{ $t("Fulfillment status") }}</ion-label>
        <ion-select value="unshipped" :interface-options="customFulfillmentOptions" interface="popover">
          <!-- TODO: commenting options for now, enable it once having support -->
          <ion-select-option value="unshipped">{{ $t("Unfulfilled") }}</ion-select-option>
          <!-- <ion-select-option value="partially-fulfilled">{{ $t("Partally fulfilled") }}</ion-select-option>
          <ion-select-option value="on-hold">{{ $t("On hold") }}</ion-select-option>
          <ion-select-option value="fulfilled">{{ $t("Fulfilled") }}</ion-select-option> -->
        </ion-select>
      </ion-item>

      <ion-item>
        <ion-label class="ion-text-wrap">{{ $t("Last Shopify Order ID") }}</ion-label>
        <ion-input v-model="lastShopifyOrderId" :placeholder="$t('Internal Shopify Order ID')" />
      </ion-item>

      <ion-item lines="none">
        <ion-chip @click="openJobCustomParameterModal" outline v-if="!Object.keys(generateCustomParameters).length">
          <ion-icon :icon="addOutline" />
          <ion-label>{{ $t('Add custom parameters') }}</ion-label>
        </ion-chip>
        <ion-row v-else>
          <ion-chip @click="openJobCustomParameterModal" outline :color="value ? undefined :'danger'" :key="name" v-for="(value, name) in generateCustomParameters">
            {{ name }} : {{ value }}
          </ion-chip>
        </ion-row>
        <ion-button @click="openJobCustomParameterModal" id="open-modal" slot="end" fill="clear">
          <ion-icon slot="icon-only" :icon="listCircleOutline"/>
        </ion-button>
      </ion-item>
    </ion-list>

    <ion-button size="small" fill="outline" expand="block" :disabled="!hasPermission(Actions.APP_JOB_UPDATE) || isRequiredParametersMissing" @click="runJob('Orders')">{{ $t("Run import") }}</ion-button>
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import {
  alertController,
  IonButton,
  IonChip,
  IonContent,
  IonDatetime,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonRow,
  IonSelect,
  IonSelectOption,
  modalController
} from "@ionic/vue";
import {
  addOutline,
  calendarClearOutline,
  flagOutline,
  listCircleOutline,
  sendOutline,
  timeOutline,
} from "ionicons/icons";
import { mapGetters, useStore } from "vuex";
import { translate } from "@/i18n";
import { DateTime } from 'luxon';
import { isCustomRunTime, generateAllowedRunTimes, generateJobCustomParameters, generateJobCustomOptions, handleDateTimeInput, isFutureDate, showToast } from '@/utils';
import { Actions, hasPermission } from '@/authorization'
import { JobService } from "@/services/JobService";
import JobParameterModal from '@/components/JobParameterModal.vue'

export default defineComponent({
  name: "InitialJobConfiguration",
  components: {
    IonButton,
    IonChip,
    IonContent,
    IonDatetime,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonModal,
    IonRow,
    IonSelect,
    IonSelectOption
  },
  data() {
    return {
      previousOccurrence: '',
      isDateTimeModalOpen: false,
      lastShopifyOrderId: this.shopifyOrderId,
      minDateTime: DateTime.now().toISO(),
      jobEnums: JSON.parse(process.env?.VUE_APP_INITIAL_JOB_ENUMS as string) as any,
      runTime: '' as any,
      runTimes: [] as any,
      customOptionalParameters: [] as any,
      customRequiredParameters: [] as any
    }
  },
  mounted() {
    // Component is mounted even if there is no current job, do fetch previous occurrence if no current job
    if (this.currentJob && Object.keys(this.currentJob).length) {
      this.fetchPreviousOccurrence();
      // Appendng and setting the previous run time
      this.runTime = this.currentJob?.runTime
      this.generateRunTimes(this.runTime)

      this.customOptionalParameters = generateJobCustomOptions(this.currentJob).optionalParameters;
      this.customRequiredParameters = generateJobCustomOptions(this.currentJob).requiredParameters;
    }
  },
  props: ['type', 'shopifyOrderId'],
  computed: {
    ...mapGetters({
      currentJob: 'job/getCurrentJob',
    }),
    isRequiredParametersMissing() {
      return this.customRequiredParameters.some((parameter: any) => !parameter.value?.trim())
    },
    generateCustomParameters() {
      return generateJobCustomParameters(this.customRequiredParameters, this.customOptionalParameters, {})
    }
  },
  methods: {
    async generateRunTimes(currentRunTime?: any) {
      const runTimes = JSON.parse(JSON.stringify(generateAllowedRunTimes()))
      let selectedRunTime
      // 0 check for the 'Now' value and '' check for initial render
      if (currentRunTime || currentRunTime === 0 || currentRunTime === '') {
        selectedRunTime = runTimes.some((runTime: any) => runTime.value === currentRunTime)
        if (!selectedRunTime) runTimes.push({ label: this.getTime(currentRunTime), value: currentRunTime })
      }
      this.runTime = currentRunTime
      this.runTimes = runTimes
    },
    async fetchPreviousOccurrence() {
      this.previousOccurrence = await JobService.fetchJobPreviousOccurrence({
        systemJobEnumId: this.currentJob?.systemJobEnumId
      })
    },
    async runJob(header: string) {
      const alert = await alertController
        .create({
          header: this.$t(header),
          message: this.$t('This job may take several minutes to run. Wait till the job has moved to the pipeline history before checking results.', {space: '<br/><br/>'}),
          buttons: [
            {
              text: this.$t("Cancel"),
              role: 'cancel',
            },
            {
              text: this.$t('Run now'),
              handler: async () => {
                await this.updateJob()
              }
            }
          ]
        });

      return alert.present();
    },
    async updateJob() {
      const job = this.currentJob;

      job['sinceId'] = this.lastShopifyOrderId
      job['jobStatus'] = job.tempExprId

      // Handling the case for 'Now'. Sending the now value will fail the API as by the time
      // the job is ran, the given 'now' time would have passed. Hence, passing empty 'run time'
      job.runTime = !isCustomRunTime(this.runTime) ? DateTime.now().toMillis() + this.runTime : this.runTime

      // if job runTime is not a valid date then making runTime as empty
      if (job?.runTime && !isFutureDate(job?.runTime)) {
        job.runTime = ''
      }

      if (job?.statusId === 'SERVICE_DRAFT') {
        const jobCustomParameters = generateJobCustomParameters(this.customRequiredParameters, this.customOptionalParameters, job.runtimeData)
        this.store.dispatch('job/scheduleService', { job, jobCustomParameters })
      } else if (job?.statusId === 'SERVICE_PENDING') {
        this.store.dispatch('job/updateJob', job)
      }
    },
    getDateTime(time: any) {
      return DateTime.fromMillis(time).toISO()
    },
    getTime (time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
    },
    timeTillJob (time: any) {
      const timeDiff = DateTime.fromMillis(time).diff(DateTime.local());
      return DateTime.local().plus(timeDiff).toRelative();
    },
    updateRunTime(event: CustomEvent) {
      const value = event.detail.value
      if (value != 'CUSTOM') this.generateRunTimes(value)
      else this.isDateTimeModalOpen = true
    },
    updateCustomTime(event: CustomEvent) {
      const currTime = DateTime.now().toMillis();
      const setTime = handleDateTimeInput(event.detail.value);
      if (setTime > currTime) this.generateRunTimes(setTime)
      else showToast(translate("Provide a future date and time"))
    },
    async openJobCustomParameterModal() {
      const jobParameterModal = await modalController.create({
        component: JobParameterModal,
        componentProps: { customOptionalParameters: this.customOptionalParameters, customRequiredParameters: this.customRequiredParameters, currentJob: this.currentJob },
        breakpoints: [0, 0.25, 0.5, 0.75, 1],
        initialBreakpoint: 0.75
      });
      await jobParameterModal.present();
    }
  },
  setup() {
    const store = useStore();
    const customOrderOptions: any = {
      header: translate('Order status'),
    };
    const customFulfillmentOptions: any = {
      header: translate('Fulfillment status'),
    };

    return {
      Actions,
      addOutline,
      calendarClearOutline,
      customFulfillmentOptions,
      customOrderOptions,
      DateTime,
      flagOutline,
      hasPermission,
      listCircleOutline,
      isCustomRunTime,
      sendOutline,
      store,
      timeOutline
    };
  }
});
</script>

<style scoped>
ion-list {
  margin: var(--spacer-base) 0;
}

ion-item:nth-child(2) > ion-label:nth-child(3) {
  cursor: pointer;
}

@media (min-width: 991px) {  
  section {
    overflow: hidden;
    border: var(--border-medium);
    border-radius: 16px;
  }

  section > ion-list {
    margin-top: var(--spacer-xs);
  }

  section > ion-button {
    margin: var(--spacer-base) var(--spacer-sm);
  }

  .mobile-only {
    display: none;
  }  

  ion-modal {
    --width: 290px;
    --height: 440px;
    --border-radius: 8px;
  }
}

ion-modal.date-time-modal {
  --width: 290px;
  --height: 440px;
  --border-radius: 8px;
}
</style>