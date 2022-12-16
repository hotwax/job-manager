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
      <ion-note slot="end">2 {{ $t("stores selected") }}</ion-note>
    </ion-item>
    <ion-item>
      <ion-label>{{ $t("eCommerce") }}</ion-label>
      <ion-badge color="danger">{{ $t("no eCommerce selected") }}</ion-badge>
    </ion-item>
    <ion-item>
      <ion-label>{{ $t("Run time") }}</ion-label>
      <ion-label class="ion-text-wrap" @click="() => isOpen = true" slot="end">{{ runTime ? getTime(runTime) : $t('Select run time') }}</ion-label>
      <ion-modal class="date-time-modal" :is-open="isOpen" @didDismiss="() => isOpen = false">
        <ion-content force-overscroll="false">
          <ion-datetime 
            show-default-buttons 
            hour-cycle="h23" 
            :value="runTime ? getDateTime(runTime) : ''" 
            @ionChange="updateRunTime($event, job)" 
          />
        </ion-content>
      </ion-modal>
    </ion-item>
    <ion-item>
      <ion-label>{{ $t("Schedule") }}</ion-label>
      <ion-select :interface-options="customPopoverOptions" interface="popover" :placeholder='$t("Bulk schedule")'>
        <ion-select-option v-for="freq in generateFrequencyOptions" :key="freq.value" :value="freq.value">{{ $t(freq.label) }}</ion-select-option>
      </ion-select>
    </ion-item>
  </ion-card>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import {
  IonContent,
  IonDatetime,
  IonItem,
  IonLabel,
  IonModal,
  IonSelect,
  IonSelectOption,
  alertController,
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
    IonContent,
    IonDatetime,
    IonItem,
    IonLabel,
    IonModal,
    IonSelect,
    IonSelectOption,
  },
  data() {
    return {
      isOpenGlobal: false,
      isOpen: false,
      runTime: '' as any,
    }
  },
  props: ["job", "selectedEComStore", "selectedShopifyConfigs"],
  computed: {
    ...mapGetters({
      bulkJobs: 'job/getBulkJobs'
    }),
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

      const slow = [{
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
      return (this as any).type === 'slow' ? slow : optionDefault;
    },
    customPopoverOptions() {
      return {
        header: (this as any).title,
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
          this.runTime = setTime;
          // this.store.dispatch('job/setTimeForBulkJob', job.jobId);
        } else {
          showToast(translate("Provide a future date and time"));
        }
      }
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