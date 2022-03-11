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
      getJobStatus: 'job/getJobStatus'
    })
  },
  methods: {
     async editBatch() {
      const batchmodal = await modalController.create({
        component: BatchModal
      });
      return batchmodal.present();
    },
  },
  mounted () { 
    this.store.dispatch("job/fetchJobs", {
      "inputFields":{
        "systemJobEnumId": Object.values(this.jobEnums),
        "systemJobEnumId_op": "in"
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
