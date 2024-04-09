<template>
  <ion-card>
    <ion-item lines="none">
      <ion-label class="ion-text-wrap">
        {{ job.enumName ? job.enumName : job.jobName }}
        <p>{{ job.description }}</p>
      </ion-label>
    </ion-item>
    <ion-item-divider>
      {{ $t("Parameters") }}
    </ion-item-divider>
    <ion-item>
      <ion-label>{{ $t("Store") }}</ion-label>
      <ion-note slot="end">{{ eComStoreName }}</ion-note>
    </ion-item>
    <ion-item>
      <ion-label>{{ $t("eCommerce") }}</ion-label>
      <ion-badge v-if="selectedShopifyConfigs.length === 0" color="danger">{{ $t("no eCommerce selected") }}</ion-badge>
      <ion-note v-else slot="end">{{ shopifyConfigNames }}</ion-note>
    </ion-item>
    <ion-item>
      <ion-select :label="$t('Run time')" interface="popover" :placeholder="$t('Select run time')" :value="job.runTime" @ionChange="updateRunTime($event)">
        <ion-select-option v-for="runTime in runTimes" :key="runTime.value" :value="runTime.value">{{ $t(runTime.label) }}</ion-select-option>
      </ion-select>
      <ion-modal class="date-time-modal" :is-open="isDateTimeModalOpen" @didDismiss="() => isDateTimeModalOpen = false">
        <ion-content force-overscroll="false">
          <ion-datetime 
            show-default-buttons 
            hour-cycle="h23" 
            :value="job.runTime ? (isCustomRunTime(job.runTime) ? getDateTime(job.runTime) : getDateTime(DateTime.now().toMillis() + job.runTime)) : getNowTimestamp()"
            @ionChange="updateCustomTime($event)"
          />
        </ion-content>
      </ion-modal>
    </ion-item>
    <ion-item>
      <ion-select :label="$t('Schedule')" :interface-options="{ header: $t('Frequency') }" :value="job.frequency" interface="popover" :placeholder='$t("Bulk schedule")' @ionDismiss="job.frequency == 'CUSTOM' && setCustomFrequency()" @ionChange='setFrequency($event)'>
        <ion-select-option v-for="freq in frequencyOptions" :key="freq.id" :value="freq.id">{{ $t(freq.description) }}</ion-select-option>
      </ion-select>
    </ion-item>
    <div class="actions">
      <ion-button size="small" fill="outline" color="danger" @click="removeJob(job.systemJobEnumId)">
        <ion-icon slot="start" :icon="closeOutline"/>
        {{ $t("Remove") }}
      </ion-button>
    </div>
  </ion-card>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import {
  IonBadge,
  IonButton,
  IonCard,
  IonContent,
  IonDatetime,
  IonIcon,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonNote,
  IonModal,
  IonSelect,
  IonSelectOption,
  modalController
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
  closeOutline
} from "ionicons/icons";
import { mapGetters, useStore } from "vuex";
import { isCustomRunTime, getNowTimestamp, generateAllowedRunTimes, generateAllowedFrequencies, handleDateTimeInput, showToast } from "@/utils";
import { DateTime } from 'luxon';
import { translate } from '@/i18n'
import { Actions, hasPermission } from '@/authorization'
import CustomFrequencyModal from '@/components/CustomFrequencyModal.vue';

export default defineComponent({
  name: "JobConfigurationForBulkScheduler",
  components: {
    IonBadge,
    IonButton,
    IonCard,
    IonContent,
    IonDatetime,
    IonIcon,
    IonItem,
    IonItemDivider,
    IonLabel,
    IonModal,
    IonNote,
    IonSelect,
    IonSelectOption
  },
  data() {
    return {
      isDateTimeModalOpen: false,
      runTimes: [] as any,
      frequencyOptions: [] as any
    }
  },
  props: ["job", "selectedShopifyConfigs", "selectedEComStoreId"],
  computed: {
    ...mapGetters({
      bulkJobs: 'job/getBulkJobs',
      userProfile: 'user/getUserProfile',
      shopifyConfigs: 'user/getShopifyConfigs',
      globalFreq: 'job/getGlobalFreq',
    }),
    eComStoreName() {
      return this.userProfile.stores.find((store: any) => store.productStoreId === this.selectedEComStoreId).storeName;
    },
    shopifyConfigNames() {
      // find matching shopifyConfig objects and return their names 
      return this.shopifyConfigs.filter((config: any) => this.selectedShopifyConfigs.includes(config.shopId)).map((config: any) => config.name).join(', ');
    }
  },
  mounted() {
    this.generateRunTimes(this.job.runTime)
    this.generateFrequencyOptions(this.job.frequency)
  },
  updated() {
    this.generateFrequencyOptions(this.job.frequency)
  },
  methods: {
    async generateRunTimes(currentRunTime?: any) {
      const runTimes = JSON.parse(JSON.stringify(generateAllowedRunTimes()))
      let selectedRunTime
      // 0 check for the 'Now' value and '' check for initial render
      if (currentRunTime || currentRunTime === 0 || currentRunTime === '') {
        selectedRunTime = runTimes.some((runTime: any) => runTime.value === currentRunTime)
        if (!selectedRunTime) runTimes.push({ label: this.getTime(currentRunTime), value: currentRunTime })
      }
      this.runTimes = runTimes
      this.store.dispatch('job/setBulkJobRuntime', { runtime: currentRunTime, jobId: this.job.jobId });
    },
    async generateFrequencyOptions(jobFrequency?: any) {
      const frequencyOptions = JSON.parse(JSON.stringify(generateAllowedFrequencies(this.job.freqType)));
      if (hasPermission(Actions.APP_CUSTOM_FREQ_VIEW)) frequencyOptions.push({ "id": "CUSTOM", "description": "Custom"})
      if (jobFrequency) {
        const selectedFrequency = frequencyOptions.find((frequency: any) => frequency.id === jobFrequency);
        if (!selectedFrequency ) {
          const frequencies = await this.store.dispatch("job/fetchTemporalExpression", [ jobFrequency ]);
          const frequency = frequencies[jobFrequency];
          frequency && (frequencyOptions.push({ "id": frequency.tempExprId,  "description": frequency.description }))
        }
      }
      this.frequencyOptions = frequencyOptions;
    },
    getDateTime(time: any) {
      return DateTime.fromMillis(time).toISO()
    },

    async setCustomFrequency() {
      const customFrequencyModal = await modalController.create({
        component: CustomFrequencyModal,
      });
      customFrequencyModal.onDidDismiss()
        .then(async (result: any) => {
          let jobFrequency = this.job.freqType === 'slow' ? (generateAllowedFrequencies('slow') as any).pop().id : this.globalFreq;
          if (result.data && result.data.frequencyId) {
            jobFrequency = result.data.frequencyId;
            await this.store.dispatch('job/setBulkJobFrequency', { frequency: jobFrequency, jobId: this.job.jobId });
          }
          this.generateFrequencyOptions(jobFrequency);
        });
      return customFrequencyModal.present();
    },
    updateRunTime(event: CustomEvent) {
      const value = event.detail.value
      if (value != 'CUSTOM') this.generateRunTimes(value)
      else this.isDateTimeModalOpen = true
    },
    updateCustomTime(event: CustomEvent) {
      const currTime = DateTime.now().toMillis();
      const setTime = handleDateTimeInput(event.detail.value);
      if (setTime > currTime) this.generateRunTimes(setTime)
      else showToast(translate("Provide a future date and time"))
    },
    async setFrequency(ev: CustomEvent) {
      const frequency = ev['detail'].value;
      await this.store.dispatch('job/setBulkJobFrequency', { frequency: frequency, jobId: this.job.jobId });
    },
    getTime (time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
    },
    removeJob(systemJobEnumId: any) {
      this.store.dispatch('job/removeBulkJob', systemJobEnumId);
    }
  },
  setup() {
    const store = useStore();

    return {
      calendarClearOutline,
      copyOutline,
      DateTime,
      flashOutline,
      isCustomRunTime,
      getNowTimestamp,
      timeOutline,
      timerOutline,
      store,
      syncOutline,
      personCircleOutline,
      pinOutline,
      closeOutline
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

.actions > ion-button {
  margin: var(--spacer-sm);
}
</style>