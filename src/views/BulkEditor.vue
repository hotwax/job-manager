<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Schedule in bulk") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <section>
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle class="overline">{{ translate("Product Store") }}</ion-card-subtitle>
            <ion-card-title>{{ translate("Stores") }}</ion-card-title>
          </ion-card-header>
          
          <ion-item>
            <ion-select interface="popover" :value="selectedEComStoreId" @ionChange="setEComStore($event)">
              <ion-select-option v-for="store in (userProfile ? userProfile.stores : [])" :key="store.productStoreId"
                :value="store.productStoreId">{{ store.storeName }}</ion-select-option>
            </ion-select>
          </ion-item>
          
          <ion-card-content>
            {{ translate("A store represents a company or a unique catalog of products. If your OMS is connected to multiple eCommerce stores sellling different collections of products, you may have multiple Product Stores set up in HotWax Commerce.") }}
          </ion-card-content>
        </ion-card> 
            
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle class="overline">{{ translate("Shop Config") }}</ion-card-subtitle>
            <ion-card-title>{{ translate("eCommerce") }}</ion-card-title>
          </ion-card-header>
          
          <ion-item button v-for="shopifyConfig in shopifyConfigsForEComStore" :key="shopifyConfig?.shopifyConfigId" :value="shopifyConfig?.shopifyConfigId" @click="updateSelectedShopifyConfigs(shopifyConfig.shopId)">
            <ion-checkbox :checked="selectedShopifyConfigs.includes(shopifyConfig.shopId)">
              <ion-label>{{ shopifyConfig.name ? shopifyConfig.name : shopifyConfig.shopifyConfigName }}</ion-label>
            </ion-checkbox>
          </ion-item>
            
          <ion-card-content>
            {{ translate("eCommerce stores are directly connected to one Shop Config. If your OMS is connected to multiple eCommerce stores selling the same catalog operating as one Company, you may have multiple Shop Configs for the selected Product Store.") }}
          </ion-card-content>
        </ion-card>   
           
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle class="overline">{{ translate("Shop Config") }}</ion-card-subtitle>
            <ion-card-title>{{ translate("Scheduler") }}</ion-card-title>
          </ion-card-header>
          <ion-item>
            <ion-icon slot="start" :icon="timeOutline" />
            <ion-select :label="translate('Run time')" interface="popover" :placeholder="translate('Select run time')" :value="globalRuntime" @ionChange="updateRunTime($event)">
              <ion-select-option v-for="runTime in runTimes" :key="runTime.value" :value="runTime.value">{{ translate(runTime.label) }}</ion-select-option>
            </ion-select>
            <ion-modal class="date-time-modal" :is-open="isDateTimeModalOpen" @didDismiss="() => isDateTimeModalOpen = false">
              <ion-content force-overscroll="false">
                <ion-datetime            
                  show-default-buttons 
                  hour-cycle="h23" 
                  :value="globalRuntime ? (isCustomRunTime(globalRuntime) ? getDateTime(globalRuntime) : getDateTime(DateTime.now().toMillis() + globalRuntime)) : getNowTimestamp()"
                  @ionChange="updateCustomTime($event)"
                />
              </ion-content>
            </ion-modal>
          </ion-item>
          <ion-item>
            <ion-icon slot="start" :icon="timerOutline" />
            <ion-select :label="translate('Schedule')" interface="popover" :interface-options="{ header: translate('Frequency') }" :value="globalFreq" :placeholder='translate("Schedule")' @ionChange=setFrequency($event) @ionDismiss="globalFreq == 'CUSTOM' && setCustomFrequency()">
              <ion-select-option v-for="freq in frequencyOptions" :key="freq.id" :value="freq.id">{{ translate(freq.description) }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>
      </section>
        
      <ion-button fill="outline" :trackable="JSON.stringify({ label: 'ScheduleInBulk/SelectJobs', id: 'bulk schedule' })" @click="selectJobs() ">
        <ion-icon slot="start" :icon="addOutline"/>
        {{ translate("select jobs") }}
      </ion-button>

      <section>
        <JobConfigurationForBulkScheduler :job="job" v-for="job in bulkJobs" :key="job.jobId" :selectedShopifyConfigs="selectedShopifyConfigs" :selectedEComStoreId="selectedEComStoreId"/>
      </section>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="saveChanges()" :disabled="bulkJobs?.length === 0">
          <ion-icon :icon="iceCreamOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCheckbox,
  IonContent,
  IonDatetime,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonMenuButton,
  IonModal,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  alertController,
  modalController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { mapGetters, useStore } from 'vuex';
import { addOutline, iceCreamOutline, timeOutline, timerOutline } from 'ionicons/icons';
import { useRouter } from 'vue-router';
import SelectJobsModal from '@/views/SelectJobsModal.vue';
import { UserService } from '@/services/UserService'
import { isCustomRunTime, getNowTimestamp, generateAllowedRunTimes, generateAllowedFrequencies, hasError, showToast, handleDateTimeInput } from '@/utils'
import { translate } from '@hotwax/dxp-components'
import JobConfigurationForBulkScheduler from '@/components/JobConfigurationForBulkScheduler.vue'
import { DateTime } from 'luxon';
import { Actions, hasPermission } from '@/authorization'
import CustomFrequencyModal from '@/components/CustomFrequencyModal.vue';
import { useAnalytics } from '@hotwax/dxp-components';

export default defineComponent({
  name: 'BulkEditor',
  components: {
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCheckbox,
    IonContent,
    IonDatetime,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonMenuButton,
    IonModal,
    IonPage,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
    JobConfigurationForBulkScheduler
  },
  data(){
    return {
      isDateTimeModalOpen: false,
      selectedEComStoreId: '',
      selectedShopifyConfigs: [] as Array<string>, // shopifyConfigs for which the user wants to schedule jobs
      shopifyConfigsForEComStore: [] as any,
      runTimes: [] as any,
      frequencyOptions: [] as any
    }
  },
  computed: {
    ...mapGetters({
      userProfile: 'user/getUserProfile',
      currentEComStore: 'user/getCurrentEComStore',
      currentShopifyConfig: 'user/getCurrentShopifyConfig',
      bulkJobs: 'job/getBulkJobs',
      globalRuntime: 'job/getGlobalRuntime',
      globalFreq: 'job/getGlobalFreq',
      shopifyConfigs: 'user/getShopifyConfigs',
    }),
  },
  setup() {
    useAnalytics();
    const store = useStore();
    const router = useRouter();

    return {
      addOutline,
      DateTime,
      iceCreamOutline,
      isCustomRunTime,
      getNowTimestamp,
      store,
      router,
      timeOutline,
      timerOutline,
      translate
    }
  },
  mounted() {
    // On initial load, show the currently set store's configs.
    this.shopifyConfigsForEComStore = this.shopifyConfigs;
    this.selectedEComStoreId = this.currentEComStore.productStoreId;
    this.selectedShopifyConfigs.push(this.currentShopifyConfig.shopId)
    this.generateRunTimes()
    this.generateFrequencyOptions()
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
      this.store.dispatch('job/setBulkJobGlobalRuntime', { runtime: currentRunTime });
    },
    async generateFrequencyOptions(currentFrequency?: any) {
      const frequencyOptions = JSON.parse(JSON.stringify(generateAllowedFrequencies()));
      if (hasPermission(Actions.APP_CUSTOM_FREQ_VIEW)) frequencyOptions.push({ "id": "CUSTOM", "description": "Custom"})
      if (currentFrequency) {
        const selectedFrequency = frequencyOptions.find((frequency: any) => frequency.id === currentFrequency);
        if (!selectedFrequency ) {
          const frequencies = await this.store.dispatch("job/fetchTemporalExpression", [ currentFrequency ]);
          const frequency = frequencies[currentFrequency];
          frequency && (frequencyOptions.push({ "id": frequency.tempExprId,  "description": frequency.description }))
        }
      }
      this.frequencyOptions = frequencyOptions;
    },
    async setCustomFrequency() {
      const customFrequencyModal = await modalController.create({
        component: CustomFrequencyModal,
      });
      customFrequencyModal.onDidDismiss()
        .then((result) => {
          let frequency = "";
          if (result.data && result.data.frequencyId) {
            frequency = result.data.frequencyId;
          }
          this.store.dispatch('job/setBulkJobGlobalFrequency', { frequency });
          this.generateFrequencyOptions(frequency);
        });
      return customFrequencyModal.present();
    },
    async saveChanges() {
      const alert = await alertController
        .create({
          header: translate('Save changes'),
          message: translate('Are you sure you want to schedule these jobs?'),
          buttons: [{
            text: translate('No'),
            role: 'cancel'
          }, {
            text: translate('Yes'),
            handler: async () => {
              await this.schedule();
            }
          }]
        });
      return alert.present();
    },
    async schedule() {
      await this.store.dispatch('job/scheduleBulkJobs', { jobs: this.bulkJobs, eComStoreId: this.selectedEComStoreId, shopifyConfigs: this.selectedShopifyConfigs })
    },
    async setEComStore(event: any) {
      this.selectedEComStoreId = event?.detail?.value
      this.shopifyConfigsForEComStore = [];
      if (this.selectedEComStoreId) {
        let resp;
        const payload = {
          "inputFields": {
            "productStoreId": this.selectedEComStoreId,
          },
          "entityName": "ShopifyShopAndConfig",
          "noConditionFind": "Y",
          "fieldList": ["shopifyConfigId", "name", "shopId"]
        }
        try {
          resp = await UserService.getShopifyConfig(payload);
          if (resp.status === 200 && !hasError(resp) && resp.data?.docs?.length > 0) {
            this.shopifyConfigsForEComStore = resp.data.docs;
          } else {
            this.shopifyConfigsForEComStore = [];
          }
        } catch (err) {
          this.$log.error(err);
        }
      } else {
        this.shopifyConfigsForEComStore = [];
      }
      this.selectedShopifyConfigs = [];
    },
    updateSelectedShopifyConfigs (shopifyConfigId: string) {
      this.selectedShopifyConfigs.includes(shopifyConfigId)
      ? this.selectedShopifyConfigs.splice(this.selectedShopifyConfigs.indexOf(shopifyConfigId), 1)
      : this.selectedShopifyConfigs.push(shopifyConfigId);
    },
    async selectJobs() {
      const selectJobsModal = await modalController.create({
        component: SelectJobsModal,
        componentProps: {
          eComStoreId: this.selectedEComStoreId,
          shopifyConfigs: this.selectedShopifyConfigs,
        }
      });
      return selectJobsModal.present();
    },
    getDateTime(time: any) {
      return DateTime.fromMillis(time).toISO()
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
    setFrequency(event: CustomEvent) {
      this.store.dispatch('job/setBulkJobGlobalFrequency', { frequency: event.detail.value });
    },
    getTime (time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
    }
  }
});
</script>

<style scoped>
  section {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    align-items: start;
  }
  
  ion-button {
    margin: var(--spacer-base) var(--spacer-xs);
  }

  ion-modal {
    --width: 290px;
    --height: 440px;
    --border-radius: 8px;
  }
</style>
