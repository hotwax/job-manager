<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Product") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main ref="main">
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
        </section>

        <aside class="desktop-only" v-show="currentJob" ref="aside">
          <JobDetail :title="title" :job="currentJob" :status="currentJobStatus" :type="freqType" :key="currentJob"/>
        </aside>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  createAnimation,
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
} from '@ionic/vue';
import { defineComponent, ref } from 'vue';
import { mapGetters, useStore } from 'vuex';
import JobDetail from '@/components/JobDetail.vue'

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
    JobDetail
  },
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus',
      getTemporalExpr: 'job/getTemporalExpr',
      getJob: 'job/getJob'
    }),
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_PRD_JOB_ENUMS as string) as any,
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
      currentJob: '',
      title: 'Import products',
      currentJobStatus: '',
      freqType: '',
      isJobDetailAnimationCompleted: false
    }
  },
  mounted () {
    this.store.dispatch("job/fetchJobs", {
      "inputFields":{
        "systemJobEnumId": Object.values(this.jobEnums),
        "systemJobEnumId_op": "in"
      }
    });
  },
  methods: {
    viewJobConfiguration(id: string, title: string, status: string) {
      this.currentJob = this.getJob(this.jobEnums[id])
      this.title = title
      this.currentJobStatus = status
      this.freqType = this.jobFrequencyType[id]

      if (this.currentJob && !this.isJobDetailAnimationCompleted) {
        const revealAnimation = createAnimation()
        .addElement(this.aside)
        .duration(1500)
        .easing('ease')
         .keyframes([
          { offset: 0, flex: '0', opacity: '0' },
          { offset: 0.5, flex: '1', opacity: '0' },
          { offset: 1, flex: '1', opacity: '1' }
        ])

        const gapAnimation = createAnimation()
          .addElement(this.main)
          .duration(500)
          .fromTo('gap', '0', 'var(--spacer-2xl)');

        createAnimation()
          .addAnimation([gapAnimation, revealAnimation])
          .play();

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
    const main = ref({} as Element)
    const aside = ref({} as Element)
    return {
      aside,
      customPopoverOptions,
      main,
      store
    }
  }
});
</script>
