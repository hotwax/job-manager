<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Settings") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <div class="user-profile">
        <ion-card>
          <ion-item lines="full">
            <ion-avatar slot="start" v-if="userProfile?.partyImageUrl">
              <Image :src="userProfile.partyImageUrl"/>
            </ion-avatar>
            <!-- ion-no-padding to remove extra side/horizontal padding as additional padding 
            is added on sides from ion-item and ion-padding-vertical to compensate the removed
            vertical padding -->
            <ion-card-header class="ion-no-padding ion-padding-vertical">
              <ion-card-subtitle>{{ userProfile.username }}</ion-card-subtitle>
              <ion-card-title>{{ userProfile.userFullName || userProfile.partyId }}</ion-card-title>
            </ion-card-header>
          </ion-item>
          <ion-button color="danger" @click="logout()">{{ translate("Logout") }}</ion-button>
          <ion-button fill="outline" @click="goToLaunchpad()">
            {{ translate("Go to Launchpad") }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
          <!-- Commenting this code as we currently do not have reset password functionality -->
          <!-- <ion-button fill="outline" color="medium">{{ translate("Reset password") }}</ion-button> -->
        </ion-card>
      </div>

      <div class="section-header">
        <h1>{{ translate('OMS') }}</h1>
      </div>
      <section>
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              {{ translate('OMS instance') }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ cookieHelper().get("oms") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('This is the name of the OMS you are connected to right now. Make sure that you are connected to the right instance before proceeding.') }}
          </ion-card-content>
          <ion-button :standalone-hidden="!hasPermission(Actions.APP_PWA_STANDALONE_ACCESS)" @click="goToOms()" fill="clear" :disabled="!hasPermission(Actions.APP_COMMERCE_VIEW)">
            {{ translate('Go to OMS') }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              {{ translate("Product Store") }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ translate("Store") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate("A store represents a company or a unique catalog of products. If your OMS is connected to multiple eCommerce stores sellling different collections of products, you may have multiple Product Stores set up in HotWax Commerce.") }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-select :label="translate('Select store')" interface="popover" :value="currentProductStore.productStoreId" @ionChange="setEComStore($event)">
              <ion-select-option v-for="store in (userProfile ? userProfile.stores : [])" :key="store.productStoreId" :value="store.productStoreId" >{{ store.storeName }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              {{ translate("Shopify Config") }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ translate("eCommerce") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('eCommerce stores are directly connected to one Shop Config. If your OMS is connected to multiple eCommerce stores selling the same catalog operating as one Company, you may have multiple Shop Configs for the selected Product Store.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-select :label="translate('Select eCommerce')" interface="popover" :value="currentShopifyConfig?.shopifyConfigId" @ionChange="setShopifyConfig($event)">
              <ion-select-option v-for="shopifyConfig in shopifyConfigs" :key="shopifyConfig.shopifyConfigId" :value="shopifyConfig.shopifyConfigId" >{{ shopifyConfig.name ? shopifyConfig.name : shopifyConfig.shopifyConfigName }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>
      </section>
      <hr />
      <div class="section-header">
        <div>
          <h1>{{ translate('App') }}</h1>
          <p class="overline">{{ translate("Version: ", { appVersion }) }}</p>
        </div>
        <div class="ion-text-end">
          <p class="overline">{{ translate("Built: ", { builtDateTime: getDateTime(appInfo.builtTime) }) }}</p>
          <ion-button v-if="userStore.getPwaState.updateExists" @click="refreshApp()" fill="outline" color="dark" size="small">{{ translate("Update") }}</ion-button>
        </div>
      </div>

      <section>
        <DxpTimeZoneSwitcher @timeZoneUpdated="timeZoneUpdated" />
      </section>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonAvatar, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader,IonIcon, IonItem, IonMenuButton, IonPage, IonSelect, IonSelectOption, IonTitle, IonToolbar } from '@ionic/vue';
import { computed, defineComponent } from 'vue';
import { codeWorkingOutline, ellipsisVertical, personCircleOutline, openOutline, saveOutline, timeOutline } from 'ionicons/icons'
import router from '@/router';
import { useUserStore } from '@/store/auth';
import Image from '@/components/Image.vue'
import { cookieHelper, translate, goToOms } from '@common';
import { useAuth } from '@/composables/auth';
import Actions from '@/authorization/Actions';
import { hasPermission } from '@/authorization';
import { DateTime } from 'luxon';

const userStore = useUserStore();
const userProfile = computed(() => userStore.getUserProfile)
const currentProductStore = computed(() => userStore.getCurrentProductStore)
const shopifyConfigs = computed(() => userStore.getShopifyConfigs)
const currentShopifyConfig = computed(() => userStore.getCurrentShopifyConfig)

const appInfo = (import.meta.env.VUE_APP_VERSION_INFO ? JSON.parse(import.meta.env.VUE_APP_VERSION_INFO) : {}) as any;
const appVersion = appInfo.branch ? (appInfo.branch + "-" + appInfo.revision) : appInfo.tag;
const getDateTime = (time: any) => time ? DateTime.fromMillis(time).setZone(userStore.current.timezoneId).toLocaleString(DateTime.DATETIME_MED) : DateTime.now();

const refreshApp = () => {
  userStore.updatePwaState({ registration: userStore.getPwaState.registration, updateExists: false })
  if (!userStore.getPwaState.registration || !userStore.getPwaState.registration.waiting) return
  userStore.getPwaState.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
}

const setEComStore = (event: any) => {
  // If the value is same, no need to update
  // Handled case for programmatical changes
  // https://github.com/ionic-team/ionic-framework/discussions/25532
  // https://github.com/ionic-team/ionic-framework/issues/20106
  // https://github.com/ionic-team/ionic-framework/pull/25858
  if(userProfile && currentProductStore?.value.productStoreId !== event.detail.value) {
    userStore.setCurrentProductStore({ 'productStoreId': event.detail.value })
  }
}
const setShopifyConfig = (event: any) => {
  userStore.setCurrentShopifyConfig({ 'shopifyConfigId': event.detail.value });
}
const timeZoneUpdated = async(tzId: string) => {
  await userStore.setUserTimeZone(tzId)
}
const logout = () => {
  useAuth().logout({ isUserUnauthorised: false }).then((redirectionUrl) => {
    // redirectionUrl is only present when SSO enables, thus when not present redirect user to login
    if(!redirectionUrl) {
      router.replace("/login");
    } else {
      window.location.href = redirectionUrl
    }
  })
}
const goToLaunchpad = () => {
  window.location.href = `${import.meta.env.VUE_APP_LOGIN_URL}`
}
</script>

<style scoped>
  ion-card > ion-button {
    margin: var(--spacer-xs);
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

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacer-xs) 10px 0px;
  }
</style>