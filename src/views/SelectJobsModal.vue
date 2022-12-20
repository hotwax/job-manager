<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Add jobs") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-searchbar v-model="queryString" :placeholder="$t('Search jobs')"
      @keyup.enter="queryString = $event.target.value; search($event)" />

    <ion-list v-for="job in jobs" :key="job.jobId">
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
      this.queryString = event.target.value;
      this.getJobs();
    },
    async getJobs(vSize?: any, vIndex?: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const fetchJobRequests = [];
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
          "shopId_fld0_op": "equals",
          "shopId_fld1_grp": "2",
          "shopId_fld1_op": "empty",
        },
        "fieldList": ["systemJobEnumId", "runTime", "tempExprId", "parentJobId", "serviceName", "jobId", "jobName", "statusId", "cancelDateTime", "finishDateTime", "startDateTime", "enumTypeId", "description", "runtimeDataId"],
        "noConditionFind": "Y",
        "viewSize": viewSize,
        "viewIndex": viewIndex,
        "orderBy": "runTime DESC"
      }

      fetchJobRequests.push(JobService.fetchJobInformation(params).catch((err) => {
        return err;
      }))

      // Deep cloning in order to avoid mutating the same reference causing side effects
      // params = JSON.parse(JSON.stringify(params));

      // // Fetching pending jobs
      // params.inputFields.statusId = "SERVICE_PENDING";
      // params.inputFields.productStoreId = this.eComStoreId;

      // fetchJobRequests.push(JobService.fetchJobInformation(params).catch((err) => {
      //   return err;
      // }))

      try {
        const resp = await Promise.all(fetchJobRequests)
        const responseJobs = resp.reduce((responseJobs: any, response: any) => {
          response.status === 200 && !hasError(response) && response.data.docs && (responseJobs = [...responseJobs, ...response.data.docs]);
          return responseJobs;
        }, [])

        responseJobs.map((job: any) => {
          return {
            ...job,
            'status': job?.statusId
          }
        })
        this.jobs = viewIndex === 0 ? (responseJobs) : [...this.jobs, ...responseJobs];
        this.isScrollable = (this.jobs.length % (process.env.VUE_APP_VIEW_SIZE as any)) === 0;

        // else         
        // this.isScrollable = false;
      } catch (err) {
        console.error(err);
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
      this.store.dispatch('job/addJobToBulkScheduler', job);
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
