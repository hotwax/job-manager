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

        <aside class="desktop-only" v-if="isDesktop" v-show="currentSelectedJobModal">
          <InitialLoadJobModal :type='currentSelectedJobModal' :shopifyOrderId='lastShopifyOrderId' :key="job" />
        </aside>
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
  IonItem,
  IonLabel,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar,
  isPlatform
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { mapGetters, useStore } from 'vuex';
import { isFutureDate } from '@/utils';
import emitter from '@/event-bus';
import InitialLoadJobModal from '@/components/InitialLoadJobModal.vue';
import { useRouter } from 'vue-router';

export default defineComponent({
  name: 'InitialLoad',
  components: {
    InitialLoadJobModal,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonMenuButton,
    IonPage,
    IonTitle,
    IonToolbar
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_INITIAL_JOB_ENUMS as string) as any,
      currentSelectedJobModal: '',
      job: {} as any,
      lastShopifyOrderId: '',
      isJobDetailAnimationCompleted: false,
      isDesktop: isPlatform('desktop')
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
    async viewJobConfiguration(label: string, id: string) {
      this.currentSelectedJobModal = label;
      this.job = this.getJob(id);

      if(this.job?.runtimeData?.sinceId?.length >= 0) {
        this.lastShopifyOrderId = this.job.runtimeData.sinceId !== 'null' ? this.job.runtimeData.sinceId : ''
      }
      // if job runTime is not a valid date then assigning current date to the runTime
      if (this.job?.runTime && !isFutureDate(this.job?.runTime)) {
        this.job.runTime = ''
      }

      await this.store.dispatch('job/updateCurrentJob', { job: this.job });
      if(!this.isDesktop && this.job) {
        this.router.push({name: 'JobDetails', params: { title: this.currentSelectedJobModal, jobId: this.job.jobId, category: "initial-load"}});
        return;
      }

      if (this.job && !this.isJobDetailAnimationCompleted) {
        emitter.emit('playAnimation');
        this.isJobDetailAnimationCompleted = true;
      }
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      store,
      router
    }
  }
});
</script>

<style scoped>
ion-card > ion-button {
  margin: var(--spacer-sm);
}
</style>
