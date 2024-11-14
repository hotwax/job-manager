<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ currentJob?.enumName ? currentJob.enumName : currentJob?.jobName ? currentJob.jobName : currentJob?.description }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <div v-if="jobHistory?.length === 0">
      <p class="ion-text-center">{{ translate("No jobs have run yet")}}</p>
    </div>

    <div v-else>
      <ion-list v-if="isMaargJob">
        <template  v-for="(history, index) in jobHistory" :key="index">
          <ion-item v-if="history.endTime">
            <ion-label>
              <h3>{{ getTime(history.startTime) }}</h3>
              <p>{{ getDate(history.startTime) }}</p>
            </ion-label>
            <ion-badge color="dark" v-if="history.endTime">{{ timeTillRun(history.endTime) }}</ion-badge>
          </ion-item>
        </template>
      </ion-list>
      <ion-list v-else>
        <ion-item v-for="(job, index) in jobHistory" :key="index">
          <ion-label>
            {{ job.runTime ? getTime(job.runTime) : "-" }}
            <p v-if="job.runTime">{{ getDate(job.runTime) }}</p>
          </ion-label>
          <ion-badge v-if="job.statusId" :color="job.statusId === 'SERVICE_FINISHED' ? 'success' : 'danger'">{{ getStatusDesc(job.statusId) }}</ion-badge>
        </ion-item>
      </ion-list>
    </div>
  </ion-content>
</template>

<script lang="ts">
import {
  IonButtons,
  IonButton,
  IonBadge,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
  modalController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { closeOutline } from 'ionicons/icons';
import { mapGetters, useStore } from 'vuex';
import { DateTime } from 'luxon';
import { JobService } from '@/services/JobService'
import { hasError, timeTillRun } from '@/utils';
import { translate } from '@hotwax/dxp-components';
import logger from '@/logger';
import { MaargJobService } from '@/services/MaargJobService';

export default defineComponent({
  name: 'JobHistoryModal',
  components: {
    IonButtons,
    IonButton,
    IonBadge,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonTitle,
    IonToolbar,
  },
  data() {
    return {
      jobHistory: [] as any
    }
  },
  props: ['currentJob', 'isMaargJob'],
  computed: {
    ...mapGetters({
      getCurrentEComStore:'user/getCurrentEComStore',
      getStatusDesc: 'util/getStatusDesc',
      currentShopifyConfig: 'user/getCurrentShopifyConfig'
    })
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    getDate (runTime: any) {
      return DateTime.fromMillis(runTime).toLocaleString(DateTime.DATE_MED);
    },
    getTime (runTime: any) {
      return DateTime.fromMillis(runTime).toLocaleString(DateTime.TIME_SIMPLE);
    },
    async fetchJobHistory() {
      let resp;

      try {
        resp = await JobService.fetchJobInformation({
          "inputFields": {
            "productStoreId": this.getCurrentEComStore.productStoreId,
            "statusId": ["SERVICE_CANCELLED", "SERVICE_CRASHED", "SERVICE_FAILED", "SERVICE_FINISHED"],
            "statusId_op": "in",
            "systemJobEnumId": this.currentJob?.systemJobEnumId,
            "shopId_fld0_value": this.currentShopifyConfig?.shopId,
            "shopId_fld0_grp": "1",
            "shopId_fld0_op": "equals",
            "shopId_fld1_grp": "2",
            "shopId_fld1_op": "empty"
          },
          "fieldList": [ "runTime", "statusId" ],
          "noConditionFind": "Y",
          "viewSize": process.env.VUE_APP_VIEW_SIZE,
          "orderBy": "runTime DESC"
        })
        if(resp.status === 200 && resp.data.docs?.length > 0 && !hasError(resp)) {
          this.jobHistory = resp.data.docs;
        } else {
          this.jobHistory = [];
        }
      } catch(err) {
        this.$log.error(err);
      }
    },
    async fetchMaargJobHistory() {
      try {
        const resp = await MaargJobService.fetchMaargJobHistory({
          jobName: this.currentJob.jobName,
          pageSize: 200,
          orderByField: "startTime DESC"
        });

        if(!hasError(resp)) {
          this.jobHistory = resp.data
        } else {
          throw resp;
        }
      } catch(error: any) {
        logger.error(error);
      }
    }
  },
  mounted() {
    this.isMaargJob ? this.fetchMaargJobHistory() : this.fetchJobHistory()
  },
  setup() {
    const store = useStore();

    return {
      closeOutline,
      store,
      timeTillRun,
      translate
    };
  },
});
</script>