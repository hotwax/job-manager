<template>
  <ion-card>
    <ion-item lines="none">
      <ion-label class="ion-text-wrap">
        {{ job.jobName }}
        <p>{{ job.description }}</p>
      </ion-label>
    </ion-item>
    <ion-item-divider>
      {{ $t("Parameters") }}
    </ion-item-divider>
    <ion-item>
      <ion-label>{{ $t("Store") }}</ion-label>
      <ion-note slot="end">{{ getEComStoreName }}</ion-note>
    </ion-item>
    <ion-item>
      <ion-label>{{ $t("eCommerce") }}</ion-label>
      <ion-badge :color="selectedShopifyConfigs?.length > 0 ? '' : 'danger'">{{ selectedShopifyConfigs?.length === 0 ? $t("no eCommerce selected") : $t("eCommerce selected", {count: selectedShopifyConfigs.length})}}</ion-badge>
    </ion-item>
    <ion-item>
      <ion-label>{{ $t("Run time") }}</ion-label>
      <ion-label class="ion-text-wrap" @click="() => isOpen = true" slot="end">{{ job.setTime ? getTime(job.setTime) : $t('Select run time') }}</ion-label>
      <ion-modal class="date-time-modal" :is-open="isOpen" @didDismiss="() => isOpen = false">
        <ion-content force-overscroll="false">
          <ion-datetime 
            show-default-buttons 
            hour-cycle="h23" 
            :value="job.setTime ? getDateTime(job.setTime) : ''" 
            @ionChange="updateRunTime($event, job)" 
          />
        </ion-content>
      </ion-modal>
    </ion-item>
    <ion-item>
      <ion-label>{{ $t("Schedule") }}</ion-label>
      <ion-select :interface-options="customPopoverOptions" :value="job.frequency" interface="popover" :placeholder='$t("Bulk schedule")' @ionChange='setFrequency($event, job)'>
        <ion-select-option v-for="freq in generateFrequencyOptions" :key="freq.value" :value="freq.value">{{ $t(freq.label) }}</ion-select-option>
      </ion-select>
    </ion-item>
  </ion-card>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import {
  IonBadge,
  IonCard,
  IonContent,
  IonDatetime,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonNote,
  IonModal,
  IonSelect,
  IonSelectOption,
} from "@ionic/vue";
import {
  calendarClearOutline,
  flashOutline,
  copyOutline,
  timeOutline,
  timerOutline,
  syncOutline,
  personCircleOutline,
  pinOutline,
} from "ionicons/icons";
import { mapGetters, useStore } from "vuex";
import { useRouter } from "vue-router";
import { handleDateTimeInput, showToast } from "@/utils";
import { DateTime } from 'luxon';
import { translate } from '@/i18n'

export default defineComponent({
  name: "JobConfigurationForBulkScheduler",
  components: {
    IonBadge,
    IonCard,
    IonContent,
    IonDatetime,
    IonItem,
    IonItemDivider,
    IonLabel,
    IonModal,
    IonNote,
    IonSelect,
    IonSelectOption,
  },
  data() {
    return {
      isOpen: false,
      eComStore: '',
    }
  },
  props: ["job", "selectedShopifyConfigs", "selectedEComStoreId"],
  computed: {
    ...mapGetters({
      bulkJobs: 'job/getBulkJobs',
      userProfile: 'user/getUserProfile',
    }),
    getEComStoreName() {
      return this.userProfile.stores.find((store: any) => store.productStoreId === this.selectedEComStoreId).storeName;
    },
    generateFrequencyOptions(): any {
      const optionDefault = [{
          "value": "EVERY_1_MIN",
          "label": "Every 1 minute"
        },{
          "value": "EVERY_5_MIN",
          "label": "Every 5 minutes"
        },{
          "value": "EVERY_15_MIN",
          "label": "Every 15 minutes"
        },{
          "value": "EVERY_30_MIN",
          "label": "Every 30 minutes"
        },{
          "value": "HOURLY",
          "label": "Hourly"
        },{
          "value": "EVERY_6_HOUR",
          "label": "Every 6 hours"
        },{
          "value": "EVERYDAY",
          "label": "Every day"
        }
      ]

      return optionDefault;
    },
    customPopoverOptions() {
      return {
        header: (this as any).job.jobName,
        showBackdrop: false
      }
    }
  },
  methods: {
    getDateTime(time: any) {
      return DateTime.fromMillis(time).toISO()
    },
    updateRunTime(ev: CustomEvent, job: any) {
      if (job) {
        const currTime = DateTime.now().toMillis();
        const setTime = handleDateTimeInput(ev['detail'].value);
        
        if(setTime > currTime) {
          job.setTime = setTime;
          this.store.dispatch('job/setBulkJobData', { value: setTime, type: 'setTime', jobId: job.jobId, global: false });
        } else {
          showToast(translate("Provide a future date and time"));
        }
      }
    },
    setFrequency(ev: CustomEvent, job: any) {
      this.store.dispatch('job/setBulkJobData', { value: ev['detail'].value, jobId: job.jobId, global: false });
    },
    getTime (time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
    },
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      calendarClearOutline,
      copyOutline,
      flashOutline,
      timeOutline,
      timerOutline,
      store,
      router,
      syncOutline,
      personCircleOutline,
      pinOutline
    };
  }
});
</script>
<style scoped>
ion-modal {
  --width: 290px;
  --height: 440px;
  --border-radius: 8px;
}
</style>