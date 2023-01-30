<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Select jobs") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-searchbar v-model="queryString" :placeholder="$t('Search jobs')" @keyup.enter="search($event)" />

    <div v-if="jobs.length === 0" class="ion-text-center">
      <p>{{ $t("No jobs found") }}</p>
    </div>
    
    <ion-list v-else v-for="job in jobs" :key="job.jobId">
      <ion-item lines="none">
        <ion-label Class="ion-text-wrap">
          <h2>{{ job.jobName }}</h2>
        </ion-label>
        <ion-icon v-if="isJobAddedToBulkScheduler(job.jobId)" color="success" :icon="checkmarkCircle" />
        <ion-button v-else fill="outline" @click="addToBulkScheduler(job)">{{ $t("Add") }}</ion-button>
      </ion-item>
    </ion-list>

    <ion-infinite-scroll @ionInfinite="loadMoreJobs($event)" threshold="100px" :disabled="!isScrollable">
      <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')" />
    </ion-infinite-scroll>
  </ion-content>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  modalController,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { closeOutline, checkmarkCircle } from 'ionicons/icons';
import { mapGetters } from 'vuex'
import { useStore } from "@/store";
import { showToast, hasError } from '@/utils'
import { translate } from '@/i18n'
import { JobService } from '@/services/JobService'

export default defineComponent({
  name: "SelectJobsModal",
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonItem,
    IonLabel,
    IonList,
    IonSearchbar,
    IonTitle,
    IonToolbar,
  },
  props: ["eComStoreId", "shopifyConfigs"],
  data() {
    return {
      queryString: '',
      jobs: [] as any,
      isScrollable: true,
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
    }
  },
  computed: {
    ...mapGetters({
      currentShopifyConfig: 'user/getCurrentShopifyConfig',
      isJobAddedToBulkScheduler: 'job/isJobAddedToBulkScheduler',
    })
  },
  methods: {
    async search(event: any) {
      this.queryString = event.target.value.trim();
      if(this.queryString.length > 0) this.getJobs();
    },
    async getJobs(vSize?: any, vIndex?: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const params = {
        "inputFields": {
          "enumTypeParentId": "SYSTEM_JOB",
          "statusId": "SERVICE_DRAFT",
          "systemJobEnumId_op": "not-empty",
          "description_value": this.queryString,
          "description_op": "contains",
          "productStoreId": "",
          "description_ic": "Y",
          "shopId_fld0_value": this.shopifyConfigs,
          "shopId_fld0_grp": "1",
          "shopId_fld0_op": "in",
          "shopId_fld1_grp": "2",
          "shopId_fld1_op": "empty",
        },
        "fieldList": ["systemJobEnumId", "runTime", "tempExprId", "parentJobId", "serviceName", "jobId", "jobName", "statusId", "cancelDateTime", "finishDateTime", "startDateTime", "enumTypeId", "description", "runtimeDataId"],
        "noConditionFind": "Y",
        "viewSize": viewSize,
        "viewIndex": viewIndex,
        "orderBy": "runTime DESC"
      }

      try {
        const resp = await JobService.fetchJobInformation(params)
        if (resp.status === 200 && !hasError(resp) && resp.data.docs?.length > 0) {
          const data = resp.data.docs.map((job: any) => {
            job.status = job.statusId;
            delete job.runTime;
            return job;
          })
          this.jobs = viewIndex === 0 ? data : [...this.jobs, ...data];
          this.isScrollable = (this.jobs.length % (process.env.VUE_APP_VIEW_SIZE as any)) === 0;
        } else {
          if (viewIndex === 0) this.jobs.length = 0;
          this.isScrollable = false;
        }
      } catch (error) {
        this.$log.error(error);
        showToast(translate("Something went wrong"));
      }
    },
    async loadMoreJobs(event: any) {
      this.getJobs(
        undefined,
        Math.ceil(this.jobs.length / (process.env.VUE_APP_VIEW_SIZE as any)).toString()
      ).then(() => {
        event.target.complete();
      })
    },
    addToBulkScheduler(job: any) {
      this.store.dispatch('job/addToBulkScheduler', job);
    },
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
  },
  setup() {
    const store = useStore();
    return {
      closeOutline,
      checkmarkCircle,
      store,
    };
  },
});
</script>
