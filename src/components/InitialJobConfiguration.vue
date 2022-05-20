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
        <ion-label slot="end">{{ currentJob?.lastUpdatedStamp ? getTime(currentJob?.lastUpdatedStamp) : $t('No previous occurrence') }}</ion-label>
      </ion-item>

      <ion-item button>
        <ion-icon slot="start" :icon="timeOutline" />
        <ion-label class="ion-text-wrap">{{ $t("Run time") }}</ion-label>
        <ion-label @click="() => isOpen = true" slot="end">{{ currentJob?.runTime ? getTime(currentJob?.runTime) : $t('Select run time') }}</ion-label>
        <ion-modal :is-open="isOpen" @didDismiss="() => isOpen = false">
          <ion-content force-overscroll="false">
            <ion-datetime
              :min="minDateTime"
              :value="currentJob?.runTime ? getDateTime(currentJob.runTime) : ''"
              @ionChange="updateRunTime($event, currentJob)"
            />
          </ion-content>
        </ion-modal>
      </ion-item>
    </ion-list>

    <ion-button size="small" fill="outline" expand="block" @click="runJob('Products')">{{ $t("Run import") }}</ion-button>
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
        <ion-label slot="end">{{ currentJob?.lastUpdatedStamp ? getTime(currentJob?.lastUpdatedStamp) : $t('No previous occurrence') }}</ion-label>
      </ion-item>

      <ion-item button>
        <ion-icon slot="start" :icon="timeOutline" />
        <ion-label class="ion-text-wrap">{{ $t("Run time") }}</ion-label>
        <ion-label @click="() => isOpen = true" slot="end">{{ currentJob?.runTime ? getTime(currentJob.runTime) : $t('Select run time') }}</ion-label>
        <ion-modal :is-open="isOpen" @didDismiss="() => isOpen = false">
          <ion-content force-overscroll="false">
            <ion-datetime
              :min="minDateTime"
              :value="currentJob?.runTime ? getDateTime(currentJob?.runTime) : ''"
              @ionChange="updateRunTime($event, currentJob)"
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

    <ion-button size="small" fill="outline" expand="block" @click="runJob('Orders')">{{ $t("Run import") }}</ion-button>
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
import { isFutureDate } from '@/utils';

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
      isOpen: false,
      lastShopifyOrderId: this.shopifyOrderId,
      minDateTime: DateTime.now().toISO(),
      jobEnums: JSON.parse(process.env?.VUE_APP_INITIAL_JOB_ENUMS as string) as any
    }
  },
  props: ['type', 'shopifyOrderId'],
  computed: {
    ...mapGetters({
      currentJob: 'job/getCurrentJob',
    })
  },
  methods: {
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

      if(!job) {
        return;
      }

      job['sinceId'] = this.lastShopifyOrderId
      job['jobStatus'] = job.tempExprId

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
      return DateTime.fromMillis(time)
    },
    getTime (time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
    },
    timeTillJob (time: any) {
      const timeDiff = DateTime.fromMillis(time).diff(DateTime.local());
      return DateTime.local().plus(timeDiff).toRelative();
    },
    updateRunTime(ev: CustomEvent, job: any) {
      if (job) {
        job.runTime = DateTime.fromISO(ev['detail'].value).toMillis()
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
}

ion-modal {
  --width: 290px;
  --height: 385px;
  --border-radius: 8px;
}
</style>