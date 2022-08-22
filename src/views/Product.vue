<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Product") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section>
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Sync") }}</ion-card-title>
            </ion-card-header>
            <ion-item button @click="viewJobConfiguration('IMP_PRDTS', 'Import products', getJobStatus(this.jobEnums['IMP_PRDTS']))" detail>
              <ion-label class="ion-text-wrap">{{ $t("Import products") }}</ion-label>
              <ion-label slot="end">{{ getTemporalExpression('IMP_PRDTS') }}</ion-label>
            </ion-item>
            <ion-item button @click="viewJobConfiguration('SYNC_PRDTS', 'Sync products', getJobStatus(this.jobEnums['SYNC_PRDTS']))" detail>
              <ion-label class="ion-text-wrap">{{ $t("Sync products") }}</ion-label>
              <ion-label slot="end">{{ getTemporalExpression('SYNC_PRDTS') }} </ion-label>
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap"><p>{{ $t("Sync products and category structures from Shopify into HotWax Commerce and keep them up to date.") }}</p></ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Webhooks") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("New products") }}</ion-label>
              <ion-toggle slot="end" :checked="newProductsWebhook" @ionChange="updateWebhook($event['detail'].checked, 'NEW_PRODUCTS')" color="secondary" />
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">{{ $t("Delete products") }}</ion-label>
              <ion-toggle slot="end" :checked="deleteProductsWebhook" @ionChange="updateWebhook($event['detail'].checked, 'DELETE_PRODUCTS')" color="secondary" />
            </ion-item>
          </ion-card>
        </section>

        <aside class="desktop-only" v-if="isDesktop" v-show="currentJob">
          <JobConfiguration :title="title" :status="currentJobStatus" :type="freqType" :key="currentJob"/>
        </aside>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
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
  IonToggle,
  isPlatform
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { mapGetters, useStore } from 'vuex';
import JobConfiguration from '@/components/JobConfiguration.vue'
import { isFutureDate } from '@/utils';
import emitter from '@/event-bus';
import { useRouter } from 'vue-router'

export default defineComponent({
  name: 'Product',
  components: {
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
    IonToggle,
    JobConfiguration
  },
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus',
      getTemporalExpr: 'job/getTemporalExpr',
      getJob: 'job/getJob',
      currentShopifyConfigId: 'user/getCurrentShopifyConfigId',
      getCachedWebhook: 'webhook/getCachedWebhook'
    }),
    newProductsWebhook(): boolean {
      const webhookTopic = this.webhookEnums['NEW_PRODUCTS']
      return this.getCachedWebhook[webhookTopic]
    },
    deleteProductsWebhook(): boolean {
      const webhookTopic = this.webhookEnums['DELETE_PRODUCTS']
      return this.getCachedWebhook[webhookTopic]
    }
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_PRD_JOB_ENUMS as string) as any,
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
      currentJob: '' as any,
      title: 'Import products',
      currentJobStatus: '',
      freqType: '',
      isJobDetailAnimationCompleted: false,
      isDesktop: isPlatform('desktop'),
      webhookEnums: JSON.parse(process.env?.VUE_APP_WEBHOOK_ENUMS as string) as any,
    }
  },
  mounted () {
    this.store.dispatch("job/fetchJobs", {
      "inputFields":{
        "systemJobEnumId": Object.values(this.jobEnums),
        "systemJobEnumId_op": "in"
      }
    });
    this.store.dispatch('webhook/fetchWebhooks')
  },
  methods: {
    async updateWebhook(checked: boolean, enumId: string) {
      const webhook = this.getCachedWebhook[this.webhookEnums[enumId]]

      // TODO: added this condition to not call the api when the value of the select automatically changes
      // need to handle this properly
      if ((checked && webhook) || (!checked && !webhook)) {
        return;
      }

      if (checked) {
        await this.store.dispatch('webhook/subscribeWebhook', enumId)
      } else {
        await this.store.dispatch('webhook/unsubscribeWebhook', { webhookId: webhook?.id, shopifyConfigId: this.currentShopifyConfigId })
      }
    },
    async viewJobConfiguration(id: string, title: string, status: string) {
      this.currentJob = this.getJob(this.jobEnums[id])
      this.title = title
      this.currentJobStatus = status
      this.freqType = id && this.jobFrequencyType[id]

      await this.store.dispatch('job/updateCurrentJob', { job: this.currentJob });
      if(!this.isDesktop && this.currentJob) {
        this.router.push({name: 'JobDetails', params: { title: this.title, jobId: this.currentJob.jobId, category: "product"}});
        return;
      }

      // if job runTime is not a valid date then making runTime as empty
      if (this.currentJob?.runTime && !isFutureDate(this.currentJob?.runTime)) {
        this.currentJob.runTime = ''
      }
      if (this.currentJob && !this.isJobDetailAnimationCompleted) {
        emitter.emit('playAnimation');
        this.isJobDetailAnimationCompleted = true;
      }
    },
    getTemporalExpression(enumId: string) {
      return this.getTemporalExpr(this.getJobStatus(this.jobEnums[enumId]))?.description ?
        this.getTemporalExpr(this.getJobStatus(this.jobEnums[enumId]))?.description :
        this.$t('Disabled')
    }
  },
  setup() {
    const customPopoverOptions: any = {
      header: 'Schedule product sync',
      showBackdrop: false
    }
    const store = useStore();
    const router = useRouter();
    return {
      customPopoverOptions,
      store,
      router
    }
  }
});
</script>
