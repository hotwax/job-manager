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
    <ion-searchbar v-model="queryString" :placeholder="$t('Search jobs')" @keyup.enter="queryString = $event.target.value; search($event)" />
    
    <ion-list v-for="job in jobs" :key="job.jobId">
      <ion-item lines="none">
        <ion-label>
          <h2>{{ job.jobName }}</h2>
          <!-- <p>{{ job.jobId }}</p> -->
        </ion-label>
        <ion-icon color="success" :icon="checkmarkCircle" />
        <ion-button>{{ $t("Add to Bulk Scheduler") }}</ion-button>
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
      const params = {
        "inputFields": {
          "enumTypeParentId": "SYSTEM_JOB",
          "statusId": ["SERVICE_DRAFT", "SERVICE_PENDING"],
          "statusId_op": "in",
          "systemJobEnumId_op": "not-empty",
          "description_value": this.queryString,
          "description_op": "contains",
          "description_ic": "Y",
          "shopId_fld0_value": this.currentShopifyConfig?.shopId,
          "shopId_fld0_grp": "1",
          "shopId_fld0_op": "equals",
          "shopId_fld1_grp": "2",
          "shopId_fld1_op": "empty"
        } as any,
        "fieldList": ["systemJobEnumId", "runTime", "tempExprId", "parentJobId", "serviceName", "jobId", "jobName", "statusId", "cancelDateTime", "finishDateTime", "startDateTime", "enumTypeId"],
        "noConditionFind": "Y",
        "viewSize": viewSize,
        "viewIndex": viewIndex,
        "orderBy": "runTime DESC"
      }

      try {
        const resp = await JobService.fetchJobInformation(params)
        if (resp.status === 200 && !hasError(resp) && resp.data.docs?.length > 0) {
          const data = resp.data.docs.map((job: any) => {
            return {
              ...job,
              'status': job?.statusId
            }
          })
          this.jobs = viewIndex === 0 ? data : [...this.jobs, ...data];
          this.isScrollable = (this.jobs.length % (process.env.VUE_APP_VIEW_SIZE as any)) === 0;
        } else {
          this.isScrollable = false;
        }
      } catch (error) {
        console.error(error);
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
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    selectSearchBarText(event: any) {
      event.target.getInputElement().then((element: any) => {
        element.select();
      })
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
