<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Orders") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section>
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Import") }}</ion-card-title>
            </ion-card-header>
            <!-- TODO: env file entry: REAL_WBHKS -->
            <ion-item>
              <ion-label>{{ $t("Realtime webhook") }}</ion-label>
              <ion-toggle color="secondary" slot="end" />
            </ion-item>
            <ion-item>
              <ion-label>{{ $t("New orders") }}</ion-label>
              <ion-button color="medium" fill="clear" @click="view($event)">View</ion-button>
              <!-- <DurationPopover :id="jobEnums['IMP_NEW_ORDERS']" /> -->
            </ion-item>
            <ion-item>
              <ion-label>{{ $t("Cancelled orders") }}</ion-label>
              <DurationPopover :id="jobEnums['IMP_CANCELLED_ORDERS']" />
            </ion-item>
            <ion-item>
              <ion-label>{{ $t("Cancelled items") }}</ion-label>
              <DurationPopover :id="jobEnums['IMP_CANCELLED_ITEMS']" />
            </ion-item>
            <ion-item>
              <ion-label>{{ $t("Payment status") }}</ion-label>
              <DurationPopover :id="jobEnums['IMP_PAYMENT_STATUS']" />
            </ion-item>
            <ion-item>
              <ion-label>{{ $t("Returns") }}</ion-label>
              <DurationPopover :id="jobEnums['IMP_RETURNS']" />
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Upload") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-label>{{ $t("Completed orders") }}</ion-label>
              <DurationPopover :id="jobEnums['UPLD_CMPLT_ORDRS']" />
            </ion-item>
            <ion-item>
              <ion-label>{{ $t("Cancelled orders") }}</ion-label>
              <DurationPopover :id="jobEnums['UPLD_CNCLD_ORDRS']" />
            </ion-item>
            <ion-item>
              <ion-label>{{ $t("Refunds") }}</ion-label>
              <DurationPopover :id="jobEnums['UPLD_REFUNDS']" />
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Auto cancelations") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-label>{{ $t("Days") }}</ion-label>
              <ion-input :placeholder="$t('before auto cancelation')" />
            </ion-item>
            <!-- TODO: run at 12 am daily -->
            <ion-item>
              <ion-label>{{ $t("Check daily") }}</ion-label>
              <ion-toggle color="secondary" slot="end" @ionChange="updateJob($event['detail'].checked, jobEnums['AUTO_CNCL_DAL'])" />
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap"><p>{{ $t("Unfulfilled orders that pass their auto cancelation date will be canceled automatically in HotWax Commerce. They will also be canceled in Shopify if upload for canceled orders is enabled.") }}</p></ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Notes") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-label>{{ $t("Promise date changes") }}</ion-label>
              <ion-toggle color="secondary" />
            </ion-item>
            <ion-item>
              <ion-label>{{ $t("Reroutes") }}</ion-label>
              <ion-toggle color="secondary" />
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Routing") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-label>{{ $t("Rejected orders") }}</ion-label>
              <DurationPopover :id="jobEnums['REJ_ORDR']" />
            </ion-item>
            <ion-item>
              <ion-label>{{ $t("Unfillable orders") }}</ion-label>
              <DurationPopover :id="jobEnums['UNFIL_ORDERS']" />
            </ion-item>
            <!-- TODO: env file entry UNFIL_ORDERS, run now as user with count 1-->
            <ion-item>
              <ion-button fill="outline" color="warning">{{ $t("Route unfillable orders now") }}</ion-button>
            </ion-item>
            <ion-item>
              <ion-label>{{ $t("Batch broker orders") }}</ion-label>
              <ion-toggle color="secondary" />
            </ion-item>
            <ion-item-divider>
              <ion-label>{{ $t("Batches") }}</ion-label>
              <ion-button fill="clear" slot="end">
                {{ $t("Add") }}
                <ion-icon :icon="addCircleOutline" slot="end" />
              </ion-button>
            </ion-item-divider>
            <ion-item detail>
              <ion-label>Batch 1</ion-label>
              <ion-note slot="end">9:30 am</ion-note>
            </ion-item>
            <ion-item @click="editBatch()" detail>
              <ion-label>Batch 2</ion-label>
              <ion-note slot="end">12:00 pm</ion-note>
            </ion-item>
            <ion-item detail>
              <ion-label>Batch 3</ion-label>
              <ion-note slot="end">3:00 pm</ion-note>
            </ion-item>
          </ion-card>
        </section>

        <aside class="desktop-only">
          <JobDetail />
        </aside>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  createAnimation,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonMenuButton,
  IonNote,
  IonPage,
  IonTitle,
  IonToggle,
  IonToolbar,
  modalController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { addCircleOutline } from 'ionicons/icons';
import DurationPopover from '@/components/DurationPopover.vue'
import BatchModal from '@/components/BatchModal.vue';
import { useStore } from "@/store";
import { mapGetters } from "vuex";
import JobDetail from '@/components/JobDetail.vue';

export default defineComponent({
  name: 'Orders',
  components: {
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonItemDivider,
    IonLabel,
    IonMenuButton,
    IonNote,
    IonPage,
    IonTitle,
    IonToggle,
    IonToolbar,
    DurationPopover,
    JobDetail
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_ODR_JOB_ENUMS as string) as any,
    }
  },
  computed: {
    ...mapGetters({
      order: 'job/getOrderInformation',
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      getShopifyConfigId: 'user/getShopifyConfigId',
      getCurrentEComStore: 'user/getCurrentEComStore'
    })
  },
  methods: {  
    async editBatch() {
      const batchmodal = await modalController.create({
        component: BatchModal
      });
      return batchmodal.present();
    },
    async updateJob(checked: boolean, id: string) {
      const job = this.getJob(id);

      // TODO: added this condition to not call the api when the value of the select automatically changes
      // need to handle this properly
      if (checked && job?.status === 'SERVICE_PENDING') {
        return;
      }

      // TODO: check for parentJobId and jobEnum and handle this values properly
      const payload = {
        ...job,
        'systemJobEnumId': id,
        'statusId': checked ? "SERVICE_PENDING" : "SERVICE_CANCELLED"
      } as any
      if (!checked) {
        this.store.dispatch('job/updateJob', payload)
      } else if (job?.status === 'SERVICE_DRAFT') {
        payload['SERVICE_FREQUENCY'] = 'HOURLY'
        payload['SERVICE_NAME'] = job.serviceName
        payload['count'] = -1
        payload['runAsSystem'] = true
        payload['shopifyConfigId'] = this.getShopifyConfigId
        payload['productStoreId'] = this.getCurrentEComStore.productStoreId

        this.store.dispatch('job/scheduleService', payload)
      } else if (job?.status === 'SERVICE_PENDING') {
        payload['tempExprId'] = 'HOURLY'
        payload['jobId'] = job.id

        this.store.dispatch('job/updateJob', payload)
      }
    },

    async view(event: any, element: any) {
      const asideAnimation = createAnimation()
        .addElement(document.querySelector('aside') as Element)
        .duration(1500)
        .easing('ease')
         .keyframes([
          { offset: 0, flex: '0', opacity: '0' },
          { offset: 0.5, flex: '1', opacity: '0' },
          { offset: 1, flex: '1', opacity: '1' }
        ])         

      const mainAnimation = createAnimation()
        .addElement(document.querySelector('main') as Element)
        .duration(500)
        .fromTo('gap', '0', 'var(--spacer-2xl)');

        mainAnimation.play();  
        asideAnimation.play();
    }
  },
  mounted () { 
    this.store.dispatch("job/fetchJobs", {
      "inputFields":{
        "serviceName": Object.values(this.jobEnums),
        "serviceName_op": "in"
      }
    });
  },
  setup() {
    const store = useStore();     
    return {
      addCircleOutline,
      store
    };
  },
});
</script>

<style scoped>
aside {
  width: 0px;
  opacity: 0;
}
</style>