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
      <ion-note slot="end">{{ eComStoreName }}</ion-note>
    </ion-item>
    <ion-item>
      <ion-label>{{ $t("eCommerce") }}</ion-label>
      <ion-badge v-if="selectedShopifyConfigs.length === 0" color="danger">{{ $t("no eCommerce selected") }}</ion-badge>
      <ion-note v-else slot="end">{{ shopifyConfigNames }}</ion-note>
    </ion-item>
    <ion-item>
      <ion-label>{{ $t("Run time") }}</ion-label>
      <ion-label class="ion-text-wrap" @click="() => isDateTimeModalOpen = true" slot="end">{{ job.runTime ? getTime(job.runTime) : $t('Select run time') }}</ion-label>
      <ion-modal class="date-time-modal" :is-open="isDateTimeModalOpen" @didDismiss="() => isDateTimeModalOpen = false">
        <ion-content force-overscroll="false">
          <ion-datetime 
            show-default-buttons 
            hour-cycle="h23" 
            :value="job.runTime ? getDateTime(job.runTime) : ''" 
            @ionChange="updateRunTime($event)" 
          />
        </ion-content>
      </ion-modal>
    </ion-item>
    <ion-item>
      <ion-label>{{ $t("Schedule") }}</ion-label>
      <ion-select :interface-options="customPopoverOptions" :value="job.frequency" interface="popover" :placeholder='$t("Bulk schedule")' @ionChange='setFrequency($event)'>
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
      isDateTimeModalOpen: false,
    }
  },
  props: ["job", "selectedShopifyConfigs", "selectedEComStoreId"],
  computed: {
    ...mapGetters({
      bulkJobs: 'job/getBulkJobs',
      userProfile: 'user/getUserProfile',
      shopifyConfigs: 'user/getShopifyConfigs',
    }),
    eComStoreName() {
      return this.userProfile.stores.find((store: any) => store.productStoreId === this.selectedEComStoreId).storeName;
    },
    shopifyConfigNames() {
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
    updateRunTime(ev: CustomEvent) {
      const currTime = DateTime.now().toMillis();
      const setTime = handleDateTimeInput(ev['detail'].value);
      
      if(setTime > currTime) {
        this.store.dispatch('job/setBulkJobRuntime', { runtime: setTime, jobId: this.job.jobId });
      } else {
        showToast(translate("Provide a future date and time"));
      }
    },
    async setFrequency(ev: CustomEvent) {
      const frequency = ev['detail'].value;
      await this.store.dispatch('job/setBulkJobFrequency', { frequency: frequency, jobId: this.job.jobId });
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