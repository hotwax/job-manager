<template>
  <ion-menu side="start" content-id="main-content" type="overlay" :disabled="!isUserAuthenticated || $route.path === '/login'">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Job Manager") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-item
          v-if="isNewAppMenuVisible"
          button
          @click="goToExternalLink"
        >
          <ion-icon slot="start" :icon="openOutline" />
          <ion-label>{{ translate("New App") }}</ion-label>
        </ion-item>
        <ion-menu-toggle auto-hide="false" v-for="(page, index) in getValidMenuItems(appPages)" :key="index">
          <ion-item
            v-if="page.url"
            button
            router-direction="root"
            :router-link="page.url"
            class="hydrated"
            :class="{ selected: selectedIndex === index }">
            <ion-icon slot="start" :ios="page.iosIcon" :md="page.mdIcon" />
            <ion-label>{{ translate(page.title) }}</ion-label>
          </ion-item>
          <ion-item-divider color="light" v-else>
            <ion-label color="medium">{{ translate(page.title) }}</ion-label>
          </ion-item-divider> 
        </ion-menu-toggle>
      </ion-list>
    </ion-content>
    <DxpMenuFooterNavigation @update-ecom-store="setEComStore($event)" @update-shopify-config="setShopifyConfig($event)" />
  </ion-menu>
</template>

<script lang="ts">
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import { computed, defineComponent } from "vue";
import { mapGetters } from "vuex";
import { albumsOutline, calendarNumberOutline, compassOutline, iceCreamOutline, libraryOutline, pulseOutline, settingsOutline, sendOutline, shirtOutline, terminalOutline, ticketOutline, openOutline } from "ionicons/icons";
import { useStore } from "@/store";
import emitter from "@/event-bus"
import { hasPermission } from "@/authorization";
import { useRouter } from "vue-router";
import { translate, useAuthStore } from "@hotwax/dxp-components";
import { UserService } from "@/services/UserService";
import { showToast } from "@/utils";

export default defineComponent({
  name: "Menu",
  components: {
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonItemDivider,
    IonLabel,
    IonList,
    IonMenu,
    IonMenuToggle,
    IonTitle,
    IonToolbar
  },
  data() {
    return {
      systemVersion: process.env.VUE_APP_REDIRECT_COMPATIBLE_VERSION
    }
  },
  computed: {
    ...mapGetters({
      isUserAuthenticated: 'user/isUserAuthenticated',
      currentFacility: 'user/getCurrentFacility',
      eComStore: 'user/getCurrentEComStore',
      instanceUrl: 'user/getInstanceUrl',
      userProfile: 'user/getUserProfile',
      currentShopifyConfig: 'user/getCurrentShopifyConfig',
      currentEComStore: 'user/getCurrentEComStore',
      shopifyConfigs: 'user/getShopifyConfigs',
      omsRedirectionInfo: 'user/getOmsRedirectionInfo',
      systemInformation: "util/getSystemInfo"
    }),
    isNewAppMenuVisible() {
      const currentVersion = this.systemInformation?.instanceInfo?.componentRelease;
      const requiredVersion = process.env.VUE_APP_REDIRECT_COMPATIBLE_VERSION;

      if (!currentVersion || !requiredVersion) return false;

      const currentParts = currentVersion.split('.').map(Number);
      const requiredParts = requiredVersion.split('.').map(Number);

      for (let i = 0; i < 3; i++) {
        const part1 = currentParts[i] || 0;
        const part2 = requiredParts[i] || 0;
        if (part1 >= part2) {
          return true;
        }
      }
      return false;
    }
  },
  methods: {
    async setEComStore(event: CustomEvent) {
      if(this.userProfile && this.eComStore?.productStoreId !== event.detail.value) {
        await this.store.dispatch('user/setEcomStore', { 'productStoreId': event.detail.value })
        emitter.emit("productStoreOrConfigChanged", true)
      }
    },
    async setShopifyConfig(event: CustomEvent){
      await this.store.dispatch('user/setCurrentShopifyConfig', { 'shopifyConfigId': event.detail.value });
      emitter.emit("productStoreOrConfigChanged", true)
    },
    set(name: string, value: string, maxAge?: number) {
      let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; SameSite=Lax;`;
      if (maxAge) {
        cookieString += `; max-age=${maxAge}`;
      } else {
        cookieString += `; max-age=86400`; // Default to 1 day
      }
      document.cookie = cookieString;
    },
    async goToExternalLink() {
      if(this.userProfile?.moquiUserId) {
        this.set("oms", this.authStore.oms)
        this.set("token", this.authStore.token.value)
        this.set("maarg", this.omsRedirectionInfo.url)
        this.set("expirationTime", this.authStore.token.expiration)
        this.set("userId", this.userProfile.moquiUserId)
        window.location.href = "https://job-manager.hotwax.io/login"
      } else {
        showToast(translate("Redirection failed, please try again or contact administrator"))
      }
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    const authStore = useAuthStore();
    
    // Filtering array of app pages, retaining only those elements (pages) that have the necessary permissions for display.
    const getValidMenuItems = (appPages: any) => {
      return appPages.filter((appPage: any) => (!appPage.meta || !appPage.meta.permissionId) || hasPermission(appPage.meta.permissionId));
    }

    let appPages = [
      {
        title: "Pipeline",
        url: "/pipeline",
        iosIcon: pulseOutline,
        mdIcon: pulseOutline,
        dependsOnBaseURL: true,
        meta: {
          permissionId: "APP_PIPELINE_VIEW"
        }
      },
      {
        title: "Initial load",
        url: "/initial-load",
        iosIcon: iceCreamOutline,
        mdIcon: iceCreamOutline,
        dependsOnBaseURL: false,
        meta: {
          permissionId: "APP_INITIAL_LOAD_VIEW"
        }
      },
      {
        title: "Pre-order",
        url: "/pre-order",
        iosIcon: calendarNumberOutline,
        mdIcon: calendarNumberOutline,
        dependsOnBaseURL: false,
        meta: {
          permissionId: "APP_PREORDER_VIEW"
        }
      },
      {
        title: "Orders",
        url: "/orders",
        iosIcon: ticketOutline,
        mdIcon: ticketOutline,
        dependsOnBaseURL: false,
        meta: {
          permissionId: "APP_ORDERS_VIEW"
        }
      },
      {
        title: "Fulfillment",
        url: "/fulfillment",
        iosIcon: sendOutline,
        mdIcon: sendOutline,
        dependsOnBaseURL: false,
        meta: {
          permissionId: "APP_FULFILLMENT_VIEW"
        }
      },
      {
        title: "Inventory",
        url: "/inventory",
        iosIcon: albumsOutline,
        mdIcon: albumsOutline,
        dependsOnBaseURL: false,
        meta: {
          permissionId: "APP_INVENTORY_VIEW"
        }
      },
      {
        title: "Products",
        url: "/product",
        iosIcon: shirtOutline,
        mdIcon: shirtOutline,
        dependsOnBaseURL: false,
        meta: {
          permissionId: "APP_PRODUCT_VIEW"
        }
      },
      {
        title: "Miscellaneous",
        url: "/miscellaneous",
        iosIcon: libraryOutline,
        mdIcon: libraryOutline,
        dependsOnBaseURL: false,
        meta: {
          permissionId: "APP_MISC_VIEW"
        }
      },
      {
        title: "Settings",
        url: "/settings",
        iosIcon: settingsOutline,
        mdIcon: settingsOutline,
        dependsOnBaseURL: true
      }
    ] as any;
    if (process.env.VUE_APP_BASE_URL) {
      appPages = appPages.filter((page : any) => page.dependsOnBaseURL);
    }

    const selectedIndex = computed(() => {
      const path = router.currentRoute.value.path
      return getValidMenuItems(appPages).findIndex((screen : any) => screen.url === path || screen.childRoutes?.includes(path))
    })

    return {
      albumsOutline,
      appPages,
      compassOutline,
      calendarNumberOutline,
      getValidMenuItems,
      hasPermission,
      iceCreamOutline,
      libraryOutline,
      pulseOutline,
      selectedIndex,
      settingsOutline,
      sendOutline,
      shirtOutline,
      store,
      terminalOutline,
      ticketOutline,
      translate,
      openOutline,
      authStore
    };
  }
});
</script>

<style scoped>
ion-menu.md ion-item.selected ion-icon {
  color: var(--ion-color-secondary);
}
ion-menu.ios ion-item.selected ion-icon {
  color: var(--ion-color-secondary);
}
ion-item.selected {
  --color: var(--ion-color-secondary);
}
</style>
