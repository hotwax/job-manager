<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Settings") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <!-- Select eCom store -->
      <ion-item>
        <ion-icon :icon="globeOutline" slot="start" />
        <ion-label>{{$t("eCom Store")}}</ion-label>
        <ion-select interface="popover" :value="currentEComStore.productStoreId" @ionChange="setEComStore($event)">
          <ion-select-option v-for="store in (userProfile ? userProfile.stores : [])" :key="store.productStoreId" :value="store.productStoreId" >{{ store.storeName }}</ion-select-option>
        </ion-select>
      </ion-item>
      <!-- Select shopify config -->
      <ion-item>
        <ion-icon :icon="basketOutline" slot="start" />
        <ion-label>{{ $t("Shopify Config") }}</ion-label>
        <ion-select interface="popover" :value="currentShopifyConfig?.shopifyConfigId" @ionChange="setShopifyConfig($event)">
          <ion-select-option v-for="shopifyConfig in shopifyConfigs" :key="shopifyConfig.shopifyConfigId" :value="shopifyConfig.shopifyConfigId" >{{ shopifyConfig.name ? shopifyConfig.name : shopifyConfig.shopifyConfigName }}</ion-select-option>
        </ion-select>
      </ion-item>
      <!-- OMS information -->
      <ion-item>
        <ion-icon :icon="codeWorkingOutline" slot="start"/>
        <ion-label>{{ $t("OMS") }}</ion-label>
        <p slot="end">{{ baseURL ? baseURL : instanceUrl }}</p>
      </ion-item>
         
      <ion-item>
        <ion-icon :icon="timeOutline" slot="start"/>
        <ion-label> {{ userProfile && userProfile.userTimeZone ? userProfile.userTimeZone : '-' }} </ion-label>
        <ion-button @click="changeTimeZone()" slot="end" fill="outline" color="dark">{{ $t("Change") }}</ion-button>
      </ion-item>

      <!-- Profile of user logged in -->
      <ion-item>
        <ion-icon :icon="personCircleOutline" slot="start" />
        <ion-label>{{ userProfile !== null ? userProfile.partyName : '' }}</ion-label>
        <ion-button slot="end" fill="outline" color="dark" @click="logout()">{{ $t("Logout") }}</ion-button>
      </ion-item>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonButton, IonContent, IonHeader,IonIcon, IonItem, IonLabel, IonMenuButton, IonPage, IonSelect, IonSelectOption, IonTitle, IonToolbar, modalController } from '@ionic/vue';
import { defineComponent } from 'vue';
import { codeWorkingOutline, ellipsisVertical, globeOutline, personCircleOutline, storefrontOutline, timeOutline, basketOutline} from 'ionicons/icons'
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';
import TimeZoneModal from '@/views/TimezoneModal.vue';

export default defineComponent({
  name: 'Settings',
  components: {
    IonButton, 
    IonContent, 
    IonHeader, 
    IonIcon,
    IonItem, 
    IonLabel,
    IonMenuButton,
    IonPage, 
    IonSelect, 
    IonSelectOption,
    IonTitle, 
    IonToolbar
  },
  data() {
    return {
      baseURL: process.env.VUE_APP_BASE_URL
    };
  },
  computed: {
    ...mapGetters({
      userProfile: 'user/getUserProfile',
      currentEComStore: 'user/getCurrentEComStore',
      instanceUrl: 'user/getInstanceUrl',
      shopifyConfigs: 'user/getShopifyConfigs',
      currentShopifyConfig: 'user/getCurrentShopifyConfig'
    })
  },
  methods: {
    setEComStore(store: any) {
      if(this.userProfile) {
        const productStoreId = store['detail'].value
        this.store.dispatch('user/setEcomStore', {
          'productStoreId' : productStoreId ? productStoreId : {}
        })
      }
    },
    setShopifyConfig(event: any){
      // const currentShopifyConfig = this.shopifyConfigs.find((shopifyConfig: any) => shopifyConfig.shopifyConfigId === event.detail.value);
      const shopifyConfigId = event.detail.value;
      this.store.dispatch('user/setCurrentShopifyConfig', {
        'shopifyConfig' : shopifyConfigId ? shopifyConfigId : {}
      });
    },
    async changeTimeZone() {
      const timeZoneModal = await modalController.create({
        component: TimeZoneModal,
      });
      return timeZoneModal.present();
    },
    logout () {
      this.store.dispatch('user/logout').then(() => {
        this.router.push('/login');
      })
    }
  },
  setup(){
    const store = useStore();
    const router = useRouter();

    return {
      codeWorkingOutline,
      ellipsisVertical,
      globeOutline,
      personCircleOutline,
      storefrontOutline,
      store,
      timeOutline,
      router,
      basketOutline
    }
  }
});
</script>