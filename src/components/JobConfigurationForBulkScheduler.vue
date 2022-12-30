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
      <ion-badge v-if="selectedShopifyConfigs.length === 0" color="danger">{{ $t("no eCommerce selected") }}</ion-badge>
      <ion-note v-else slot="end">{{ getShopifyConfigNames }}</ion-note>
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
        <ion-select-option v-for="freq in generateFrequencyOptions(job.freqType)" :key="freq.value" :value="freq.value">{{ $t(freq.label) }}</ion-select-option>
      </ion-select>
    </ion-item>
    <div class="actions">
      <ion-button size="small" fill="outline" color="danger" @click="removeJob(job.jobId)">
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
import { handleDateTimeInput, showToast, generateFrequencyOptions } from "@/utils";
import { DateTime } from 'luxon';
import { translate } from '@/i18n'

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
    IonSelectOption,
  },
  data() {
    return {
      isOpen: false,
    }
  },
  props: ["job", "selectedShopifyConfigs", "selectedEComStoreId"],
  computed: {
    ...mapGetters({
      bulkJobs: 'job/getBulkJobs',
      userProfile: 'user/getUserProfile',
      shopifyConfigs: 'user/getShopifyConfigs',
    }),
    getEComStoreName() {
      return this.userProfile.stores.find((store: any) => store.productStoreId === this.selectedEComStoreId).storeName;
    },
    getShopifyConfigNames() {
      // find matching shopifyConfig objects and return their names 
      return this.shopifyConfigs.filter((config: any) => this.selectedShopifyConfigs.includes(config.shopId)).map((config: any) => config.name).join(', ');
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
    async setFrequency(ev: CustomEvent, job: any) {
      job.frequency = ev['detail'].value;
      await this.store.dispatch('job/setBulkJobData', { value: ev['detail'].value, type: 'frequency', jobId: job.jobId, global: false });
    },
    getTime (time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
    },
    removeJob(jobId: any) {
      this.store.dispatch('job/removeBulkJob', jobId);
    },
  },
  setup() {
    const store = useStore();

    return {
      calendarClearOutline,
      copyOutline,
      flashOutline,
      timeOutline,
      timerOutline,
      store,
      syncOutline,
      personCircleOutline,
      pinOutline,
      closeOutline,
      generateFrequencyOptions
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