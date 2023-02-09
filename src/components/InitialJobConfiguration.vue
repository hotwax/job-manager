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
        <ion-label class="ion-text-wrap" slot="end">{{ previousOccurence ? getTime(previousOccurence) : $t('No previous occurrence') }}</ion-label>
      </ion-item>

      <ion-item>
        <ion-icon slot="start" :icon="timeOutline" />
        <ion-label class="ion-text-wrap">{{ $t("Run time") }}</ion-label>
        <ion-label class="ion-text-wrap" @click="() => isOpen = true" slot="end">{{ runTime ? getTime(runTime) : $t('Select run time') }}</ion-label>
        <ion-modal :is-open="isOpen" @didDismiss="() => isOpen = false">
          <ion-content force-overscroll="false">
            <ion-datetime
              show-default-buttons
              hour-cycle="h23"
              :value="runTime ? getDateTime(runTime) : ''"
              @ionChange="updateRunTime($event)"
            />
          </ion-content>
        </ion-modal>
      </ion-item>
    </ion-list>

    <ion-button :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" size="small" fill="outline" expand="block" @click="runJob('Products')">{{ $t("Run import") }}</ion-button>
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
        <ion-label slot="end">{{ previousOccurence ? getTime(previousOccurence) : $t('No previous occurrence') }}</ion-label>
      </ion-item>

      <ion-item button>
        <ion-icon slot="start" :icon="timeOutline" />
        <ion-label class="ion-text-wrap">{{ $t("Run time") }}</ion-label>
        <ion-label @click="() => isOpen = true" slot="end">{{ runTime ? getTime(runTime) : $t('Select run time') }}</ion-label>
        <ion-modal class="date-time-modal" :is-open="isOpen" @didDismiss="() => isOpen = false">
          <ion-content force-overscroll="false">
            <ion-datetime          
              show-default-buttons
              hour-cycle="h12"
              :value="runTime ? getDateTime(runTime) : ''"
              @ionChange="updateRunTime($event)"
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
    </ion-list>

    <ion-button size="small" fill="outline" expand="block" :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" @click="runJob('Orders')">{{ $t("Run import") }}</ion-button>
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import {
  alertController,
  IonButton,
  IonContent,
  IonDatetime,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSelect,
  IonSelectOption,
} from "@ionic/vue";
import {
  calendarClearOutline,
  flagOutline,
  sendOutline,
  timeOutline,
} from "ionicons/icons";
import { mapGetters, useStore } from "vuex";
import { translate } from "@/i18n";
import { DateTime } from 'luxon';
import { handleDateTimeInput,isFutureDate, showToast } from '@/utils';
import { Actions, hasPermission } from '@/authorization'
import { JobService } from "@/services/JobService";

export default defineComponent({
  name: "InitialJobConfiguration",
  components: {
    IonButton,
    IonContent,
    IonDatetime,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonModal,
    IonSelect,
    IonSelectOption
  },
  data() {
    return {
      previousOccurence: '',
      isOpen: false,
      lastShopifyOrderId: this.shopifyOrderId,
      minDateTime: DateTime.now().toISO(),
      jobEnums: JSON.parse(process.env?.VUE_APP_INITIAL_JOB_ENUMS as string) as any,
      runTime: '' as any,
    }
  },
  mounted() {
    // Component is mounted even if there is no current job, do fetch previous occurrence if no current job
    if (this.currentJob && Object.keys(this.currentJob).length) this.fetchPreviousOccurrence();
  },
  props: ['type', 'shopifyOrderId'],
  computed: {
    ...mapGetters({
      currentJob: 'job/getCurrentJob',
    })
  },
  methods: {
    async fetchPreviousOccurrence() {
      this.previousOccurence = await JobService.fetchJobPreviousOccurence({
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
      job.runTime = this.runTime;

      // if job runTime is not a valid date then making runTime as empty
      if (job?.runTime && !isFutureDate(job?.runTime)) {
        job.runTime = ''
      }

      if (job?.statusId === 'SERVICE_DRAFT') {
        this.store.dispatch('job/runServiceNow', job)
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
    updateRunTime(ev: CustomEvent) {
      const currTime = DateTime.now().toMillis();
      const setTime = handleDateTimeInput(ev['detail'].value);
      if(setTime > currTime) {
        this.runTime = setTime;
      } else {
        showToast(translate("Provide a future date and time"))
      }
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
      hasPermission,
      calendarClearOutline,
      customFulfillmentOptions,
      customOrderOptions,
      flagOutline,
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

ion-modal {
  --width: 290px;
  --height: 440px;
  --border-radius: 8px;
}
</style>