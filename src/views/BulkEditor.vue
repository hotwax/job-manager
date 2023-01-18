<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Schedule in bulk") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <section>
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle class="overline">{{ $t("Product Store") }}</ion-card-subtitle>
            <ion-card-title>{{ $t("Stores") }}</ion-card-title>
          </ion-card-header>
          
          <ion-item>
            <ion-select interface="popover" :value="selectedEComStoreId" @ionChange="setEComStore($event)">
              <ion-select-option v-for="store in (userProfile ? userProfile.stores : [])" :key="store.productStoreId"
                :value="store.productStoreId">{{ store.storeName }}</ion-select-option>
            </ion-select>
          </ion-item>
          
          <ion-card-content>
            {{ $t("A store repesents a company or a unique catalog of products. If your OMS is connected to multiple eCommerce stores sellling different collections of products, you may have multiple Product Stores set up in HotWax Commerce.") }}
          </ion-card-content>
        </ion-card> 
            
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle class="overline">{{ $t("Shop Config") }}</ion-card-subtitle>
            <ion-card-title>{{ $t("eCommerce") }}</ion-card-title>
          </ion-card-header>
          
          <ion-item button v-for="shopifyConfig in shopifyConfigsForEComStore" :key="shopifyConfig?.shopifyConfigId" :value="shopifyConfig?.shopifyConfigId" @click="updateSelectedShopifyConfigs(shopifyConfig.shopId)">
            <ion-label>{{ shopifyConfig.name ? shopifyConfig.name : shopifyConfig.shopifyConfigName }}</ion-label>
            <ion-checkbox slot="end" :checked="selectedShopifyConfigs.includes(shopifyConfig.shopId)"/>
          </ion-item>
            
          <ion-card-content>
            {{ $t("eCommerce stores are directly connected to one Shop Config. If your OMS is connected to multiple eCommerce stores selling the same catalog operating as one Company, you may have multiple Shop Configs for the selected Product Store.") }}
          </ion-card-content>
        </ion-card>   
           
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle class="overline">{{ $t("Shop Config") }}</ion-card-subtitle>
            <ion-card-title>{{ $t("Scheduler") }}</ion-card-title>
          </ion-card-header>
          <ion-item>
            <ion-icon slot="start" :icon="timeOutline" />
            <ion-label>{{ $t("Run time") }}</ion-label>
            <ion-label class="ion-text-wrap" @click="() => isDateTimeModalOpen = true" slot="end">{{ globalRuntime ? getTime(globalRuntime) : $t('Select run time') }}</ion-label>
            <ion-modal class="date-time-modal" :is-open="isDateTimeModalOpen" @didDismiss="() => isDateTimeModalOpen = false">
              <ion-content force-overscroll="false">
                <ion-datetime            
                  show-default-buttons 
                  hour-cycle="h23" 
                  :value="globalRuntime ? getDateTime(globalRuntime) : ''" 
                  @ionChange="updateRuntime($event)" 
                />
              </ion-content>
            </ion-modal>
          </ion-item>
          <ion-item>
            <ion-icon slot="start" :icon="timerOutline" />
            <ion-label>{{ $t("Schedule") }}</ion-label>
            <ion-select interface="popover" :value="globalFreq" :placeholder='$t("Schedule")' @ionChange=setFrequency($event)>
              <ion-select-option v-for="freq in generateFrequencyOptions()" :key="freq.value" :value="freq.value">{{ $t(freq.label) }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-card-content>
            description 
          </ion-card-content>
        </ion-card>
      </section>
        
      <ion-button fill="outline" @click="selectJobs()">
        <ion-icon slot="start" :icon="addOutline"/>
        {{ $t("select jobs") }}
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
import { hasError, showToast, handleDateTimeInput, generateFrequencyOptions } from '@/utils'
import { translate } from '@/i18n'
import JobConfigurationForBulkScheduler from '@/components/JobConfigurationForBulkScheduler.vue'
import { DateTime } from 'luxon';

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
    const store = useStore();
    const router = useRouter();

    return {
      addOutline,
      iceCreamOutline,
      store,
      router,
      timeOutline,
      timerOutline,
      generateFrequencyOptions
    }
  },
  mounted() {
    // On initial load, show the currently set store's configs.
    this.shopifyConfigsForEComStore = this.shopifyConfigs;
    this.selectedEComStoreId = this.currentEComStore.productStoreId;
    this.selectedShopifyConfigs.push(this.currentShopifyConfig.shopId)
  },
  methods: {
    async saveChanges() {
      const alert = await alertController
        .create({
          header: this.$t('Save changes'),
          message: this.$t('Are you sure you want to schedule these jobs?'),
          buttons: [{
            text: this.$t('No'),
            role: 'cancel'
          }, {
            text: this.$t('Yes'),
            handler: () => {
              this.schedule();
            }
          }]
        });
      return alert.present();
    },
    schedule() {
      this.store.dispatch('job/scheduleBulkJobs', { jobs: this.bulkJobs, eComStoreId: this.selectedEComStoreId, shopifyConfigs: this.selectedShopifyConfigs })
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
          console.error(err);
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
    updateRuntime(ev: CustomEvent) {
      if (this.bulkJobs) {
        const currTime = DateTime.now().toMillis();
        const setTime = handleDateTimeInput(ev['detail'].value);
        if(setTime > currTime) {
          this.store.dispatch('job/setBulkJobGlobalRuntime', { runtime: setTime });
        } else {
          showToast(translate("Provide a future date and time"));
        }
      }
    },
    setFrequency(ev: CustomEvent) {
      this.store.dispatch('job/setBulkJobGlobalFrequency', { frequency: ev['detail'].value });
    },
    getTime (time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
    },
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
