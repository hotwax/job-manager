<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Settings") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <div class="user-profile">
        <ion-card>
          <ion-item lines="full">
            <ion-avatar slot="start" v-if="userProfile?.partyImageUrl">
              <Image :src="userProfile.partyImageUrl"/>
            </ion-avatar>
            <ion-label>
              {{ userProfile?.partyName }}
              <p>{{ userProfile?.userLoginId }}</p>
            </ion-label>
          </ion-item>
          <ion-button fill="outline" color="danger" @click="logout()">{{ $t("Logout") }}</ion-button>
          <!-- Commenting this code as we currently do not have reset password functionality -->
          <!-- <ion-button fill="outline" color="medium">{{ $t("Reset password") }}</ion-button> -->
        </ion-card>
      </div>

      <h1>{{ $t('OMS') }}</h1>
      <section>
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              {{ $t("OMS instance") }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ instanceUrl }}
            </ion-card-title>
          </ion-card-header>

          <ion-card-content>
            {{ $t('This is the name of the OMS you are connected to right now. Make sure that you are connected to the right instance before proceeding.') }}
          </ion-card-content>

          <ion-button @click="goToOms" fill="clear">
            {{ $t('Go to OMS') }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              {{ $t("Product Store") }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ $t("Store") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ $t('A store repesents a company or a unique catalog of products. If your OMS is connected to multiple eCommerce stores sellling different collections of products, you may have multiple Product Stores set up in HotWax Commerce.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label> {{ $t("Select store") }} </ion-label>
            <ion-select interface="popover" :value="currentEComStore.productStoreId" @ionChange="setEComStore($event)">
              <ion-select-option v-for="store in (userProfile ? userProfile.stores : [])" :key="store.productStoreId" :value="store.productStoreId" >{{ store.storeName }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              {{ $t("Shopify Config") }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ $t("eCommerce") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ $t('eCommerce stores are directly connected to one Shop Configs. If your OMS is connected to multiple eCommerce stores selling the same catalog operating as one Company, you may have multiple Shop Configs for the selected Product Store.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label>{{ $t("Select eCommerce") }}</ion-label>
            <ion-select interface="popover" :value="currentShopifyConfig?.shopifyConfigId" @ionChange="setShopifyConfig($event)">
              <ion-select-option v-for="shopifyConfig in shopifyConfigs" :key="shopifyConfig.shopifyConfigId" :value="shopifyConfig.shopifyConfigId" >{{ shopifyConfig.name ? shopifyConfig.name : shopifyConfig.shopifyConfigName }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>
      </section>
      <hr />
      <h1>{{ $t('App') }}</h1>

      <section>
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ $t('Timezone') }}
            </ion-card-title>
          </ion-card-header>

          <ion-card-content>
            {{ $t('The timezone you select is used to ensure automations you schedule are always accurate to the time you select.') }}
          </ion-card-content>

          <ion-item lines="none">
            <ion-label> {{ userProfile && userProfile.userTimeZone ? userProfile.userTimeZone : '-' }} </ion-label>
            <ion-button @click="changeTimeZone()" slot="end" fill="outline" color="dark">{{ $t("Change") }}</ion-button>
          </ion-item>
        </ion-card>
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              {{ $t("File upload")}}
            </ion-card-subtitle>
            <ion-card-title>
              {{ $t("Date Format") }}
            </ion-card-title>
          </ion-card-header>

          <ion-card-content>
            {{ $t('Enter a custom date time format that you want to use when uploading documents to HotWax Commerce.') }}
            <p>{{ $t('Luxon date time formats can be found') }} <a href="https://moment.github.io/luxon/#/formatting?id=presets">{{ $t("here") }}</a></p>
          </ion-card-content>
          <ion-item>
            <ion-input clear-input='true' @keyup.enter="dateTimeFormat = $event.target.value; parse()" v-model="dateTimeFormat" :value="dateTimeFormat" />
          </ion-item>
          <ion-item>
            <ion-label>{{ sampleDateTime }}</ion-label>
            <ion-badge color="warning">
              <ion-label>{{ $t("Sample") }}</ion-label>
            </ion-badge>
          </ion-item>
          <ion-button fill="clear" @click="updateDateTimeFormat()">
            {{ $t("Save") }}
            <ion-icon slot="end" :icon="saveOutline" />
          </ion-button>
        </ion-card>
      </section>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonAvatar, IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader,IonIcon, IonItem, IonInput, IonLabel, IonMenuButton, IonPage, IonSelect, IonSelectOption, IonTitle, IonToolbar, modalController } from '@ionic/vue';
import { defineComponent } from 'vue';
import { codeWorkingOutline, ellipsisVertical, personCircleOutline, openOutline, saveOutline, timeOutline } from 'ionicons/icons'
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';
import TimeZoneModal from '@/views/TimezoneModal.vue';
import { DateTime } from 'luxon';
import Image from '@/components/Image.vue'

export default defineComponent({
  name: 'Settings',
  components: {
    IonAvatar,
    IonBadge,
    IonButton, 
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonContent, 
    IonHeader, 
    IonIcon,
    IonInput,
    IonItem, 
    IonLabel,
    IonMenuButton,
    IonPage, 
    IonSelect,
    IonSelectOption,
    IonTitle, 
    IonToolbar,
    Image
  },
  data() {
    return {
      baseURL: process.env.VUE_APP_BASE_URL,
      sampleDateTime: '',
      dateTimeFormat: ''
    };
  },
  computed: {
    ...mapGetters({
      userProfile: 'user/getUserProfile',
      currentEComStore: 'user/getCurrentEComStore',
      instanceUrl: 'user/getInstanceUrl',
      shopifyConfigs: 'user/getShopifyConfigs',
      currentShopifyConfig: 'user/getCurrentShopifyConfig',
      currentDateTimeFormat: 'user/getDateTimeFormat'
    })
  },
  mounted(){
    this.dateTimeFormat = this.currentDateTimeFormat
    this.parse();
  },
  methods: {
    setEComStore(event: any) {
      if(this.userProfile) {
        this.store.dispatch('user/setEcomStore', { 'productStoreId': event.detail.value })
      }
    },
    setShopifyConfig(event: any){
      this.store.dispatch('user/setCurrentShopifyConfig', { 'shopifyConfigId': event.detail.value });
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
    },
    parse(){
      this.sampleDateTime = DateTime.now().toFormat(this.dateTimeFormat);
    },
    goToOms(){
      window.location.href = this.instanceUrl.startsWith('http') ? this.instanceUrl.replace('api/', "") : `https://${this.instanceUrl}.hotwax.io/`;
    },
    updateDateTimeFormat(){
      this.store.dispatch('user/setDateTimeFormat', this.dateTimeFormat);
    },
  },
  setup(){
    const store = useStore();
    const router = useRouter();

    return {
      codeWorkingOutline,
      ellipsisVertical,
      personCircleOutline,
      store,
      timeOutline,
      router,
      openOutline,
      saveOutline,
    }
  }
});
</script>

<style scoped>
  ion-card > ion-button {
    margin: var(--spacer-xs);
  }
  h1 {
    padding: var(--spacer-xs) 10px 0;
  }
  section {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    align-items: start;
  }
  .user-profile {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  }
  hr {
    border-top: 1px solid var(--ion-color-medium);
  }
</style>