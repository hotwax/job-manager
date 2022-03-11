<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Orders") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ $t("Import") }}</ion-card-title>
          </ion-card-header>
          <ion-item>
            <ion-label>{{ $t("New orders") }}</ion-label>
            <DurationPopover :id="jobEnums['IMP_NEW_ORDERS']" />
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
            <ion-label>{{ $t("Unfillable orders") }}</ion-label>
            <DurationPopover :id="jobEnums['UNFIL_ORDERS']" />
          </ion-item>
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
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemDivider,
  IonLabel,
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
    IonItem,
    IonItemDivider,
    IonLabel,
    IonNote,
    IonPage,
    IonTitle,
    IonToggle,
    IonToolbar,
    DurationPopover
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
    async updateJob(status: string, id: string) {
      const job = this.getJob(id);
      // TODO: check for parentJobId and jobEnum and handle this values properly
      const payload = {
        ...job,
        'systemJobEnumId': id,
        'statusId': status ? "SERVICE_PENDING" : "SERVICE_DRAFT"
      } as any
      if (job?.status === 'SERVICE_DRAFT') {
        payload['SERVICE_FREQUENCY'] = 'HOURLY'
        payload['SERVICE_NAME'] = job.serviceName
        payload['count'] = -1
        payload['runAsSystem'] = true
        payload['shopifyConfigId'] = this.getShopifyConfigId
        payload['productStoreId'] = this.getCurrentEComStore.productStoreId
      } else if (job?.status === 'SERVICE_PENDING') {
        payload['tempExprId'] = 'HOURLY'
        payload['jobId'] = job.id
      }

      job?.status === 'SERVICE_PENDING' ? this.store.dispatch('job/updateJob', payload) : this.store.dispatch('job/scheduleService', payload);
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
main {
  max-width: 343px;
  margin-top: 20px;
  margin-right: auto;
  margin-left: auto;
}
</style>
