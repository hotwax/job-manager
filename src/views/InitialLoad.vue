<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Initial load") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section>
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Products") }}</ion-card-title>
            </ion-card-header>
            <ion-button expand="block" fill="outline" @click="viewJobConfiguration('products', jobEnums['IMP_PRDTS_BLK'])">{{ $t("Import products in bulk") }}</ion-button>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p>{{ $t("Import all products from Shopify. Make sure you run this before importing orders in bulk during intial setup.") }}</p>
              </ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Orders") }}</ion-card-title>
            </ion-card-header>
            <ion-button expand="block" fill="outline" @click="viewJobConfiguration('orders', jobEnums['IMP_ORDERS_BLK'])">{{ $t("Import orders in bulk") }}</ion-button>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p>{{ $t("Before importing historical orders in bulk, make sure all products are set up or else order import will not run correctly.") }}</p>
                <br />
                <p>{{ $t("By default only open and unshipped orders will be imported.") }}</p>
              </ion-label>
            </ion-item>
          </ion-card>
        </section>

        <aside class="desktop-only" v-show="currentSelectedJobModal">
          <section v-show="currentSelectedJobModal === 'products'">
            <ion-item lines="none">
              <h1>{{ $t("Products") }}</h1>
              <!-- TODO: make the badges dynamic on the basis of job status -->
              <!-- <ion-badge slot="end" color="warning">running</ion-badge> -->
            </ion-item>

            <ion-list>
              <ion-item>
                <ion-icon slot="start" :icon="calendarClearOutline" />
                <ion-label class="ion-text-wrap">{{ $t("Last run") }}</ion-label>
                <ion-label slot="end">{{ job?.lastUpdatedStamp ? getTime(job.lastUpdatedStamp) : $t('No previous occurrence') }}</ion-label>
              </ion-item>

              <ion-item id="product-run-time-modal" button>
                <ion-icon slot="start" :icon="timeOutline" />
                <ion-label class="ion-text-wrap">{{ $t("Run time") }}</ion-label>
                <ion-label slot="end">{{ job?.runTime ? getTime(job.runTime) : $t('Select run time') }}</ion-label>
                <ion-modal trigger="product-run-time-modal">
                  <ion-content force-overscroll="false">
                    <ion-datetime
                      :min="minDateTime"
                      :value="job?.runTime ? getDateTime(job.runTime) : ''"
                      @ionChange="updateRunTime($event, job)"
                    />
                  </ion-content>
                </ion-modal>
              </ion-item>
            </ion-list>

            <ion-button size="small" fill="outline" expand="block" @click="runJob('Products', jobEnums['IMP_PRDTS_BLK'])">{{ $t("Run import") }}</ion-button>
          </section>

           <section v-show="currentSelectedJobModal === 'orders'">
            <ion-item lines="none">
              <h1>{{ $t("Orders") }}</h1>
              <!-- TODO: make the badges dynamic on the basis of job status -->
              <!-- <ion-badge slot="end" color="medium">pending</ion-badge> -->
            </ion-item>

            <ion-list>
              <ion-item>
                <ion-icon slot="start" :icon="calendarClearOutline" />
                <ion-label class="ion-text-wrap">{{ $t("Last run") }}</ion-label>
                <ion-label slot="end">{{ job?.lastUpdatedStamp ? getTime(job.lastUpdatedStamp) : $t('No previous occurrence') }}</ion-label>
              </ion-item>

              <ion-item id="order-run-time-modal" button>
                <ion-icon slot="start" :icon="timeOutline" />
                <ion-label class="ion-text-wrap">{{ $t("Run time") }}</ion-label>
                <ion-label slot="end">{{ job?.runTime ? getTime(job.runTime) : $t('Select run time') }}</ion-label>
                <ion-modal trigger="order-run-time-modal">
                  <ion-content force-overscroll="false">
                    <ion-datetime
                      :min="minDateTime"
                      :value="job?.runTime ? getDateTime(job.runTime) : ''"
                      @ionChange="updateRunTime($event, job)"
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

            <ion-button size="small" fill="outline" expand="block" @click="runJob('Orders', jobEnums['IMP_ORDERS_BLK'])">{{ $t("Run import") }}</ion-button>
          </section>
        </aside>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  alertController,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonDatetime,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonModal,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import { defineComponent } from 'vue';
import {
  calendarClearOutline,
  flagOutline,
  sendOutline,
  timeOutline,
} from "ionicons/icons";
import { translate } from '@/i18n';
import { DateTime } from 'luxon';
import { mapGetters, useStore } from 'vuex';
import { isValidDate } from '@/utils';
import emitter from '@/event-bus';

export default defineComponent({
  name: 'InitialLoad',
  components: {
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonDatetime,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonMenuButton,
    IonModal,
    IonPage,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_INITIAL_JOB_ENUMS as string) as any,
      currentSelectedJobModal: '',
      job: {} as any,
      lastShopifyOrderId: '',
      minDateTime: DateTime.now().toISO(),
      isJobDetailAnimationCompleted: false
    }
  },
  mounted () {
    this.store.dispatch("job/fetchJobs", {
      "inputFields":{
        "systemJobEnumId": Object.values(this.jobEnums),
        "systemJobEnumId_op": "in"
      }
    })
  },
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      shopifyConfigId: 'user/getShopifyConfigId',
      currentEComStore: 'user/getCurrentEComStore'
    })
  },
  methods: {
    viewJobConfiguration(label: string, id: string) {
      this.currentSelectedJobModal = label;
      this.job = this.getJob(id);
      if(this.job?.runtimeData?.sinceId?.length >= 0) {
        this.lastShopifyOrderId = this.job.runtimeData.sinceId !== 'null' ? this.job.runtimeData.sinceId : ''
      }
      // if job runTime is not a valid date then assigning current date to the runTime
      if (this.job?.runTime && !isValidDate(this.job?.runTime)) {
        this.job.runTime = ''
      }

      if (this.job && !this.isJobDetailAnimationCompleted) {
        emitter.emit('playAnimation');
        this.isJobDetailAnimationCompleted = true;
      }
    },
    async runJob(header: string, id: string) {
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
                await this.updateJob(id)
              }
            }
          ]
        });

      return alert.present();
    },
    async updateJob(id: string) {
      const job = this.getJob(id);

      if(!job) {
        return;
      }

      job['sinceId'] = this.lastShopifyOrderId
      job['jobStatus'] = job.tempExprId

      // if job runTime is not a valid date then making runTime as empty
      if (job?.runTime && !isValidDate(job?.runTime)) {
        job.runTime = ''
      }

      if (job?.status === 'SERVICE_DRAFT') {
        this.store.dispatch('job/runServiceNow', job)
      } else if (job?.status === 'SERVICE_PENDING') {
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
    const customOrderOptions: any = {
      header: translate('Order status'),
    };
    const customFulfillmentOptions: any = {
      header: translate('Fulfillment status'),
    };
    const store = useStore();

    return {
      calendarClearOutline,
      flagOutline,
      sendOutline,
      timeOutline,
      customOrderOptions,
      customFulfillmentOptions,
      store
    }
  }
});
</script>

<style scoped>
ion-card > ion-button {
  margin: var(--spacer-sm);
}

aside > section {
  overflow: hidden;
  border: 1px solid var(--ion-color-medium);
  border-radius: 16px;
}

aside > section > ion-list {
  margin-top: var(--spacer-xs);
}

aside > section > ion-button {
  margin: var(--spacer-base) var(--spacer-sm);
}

ion-modal {
  --width: 290px;
  --height: 382px;
  --border-radius: 8px;
}
</style>
