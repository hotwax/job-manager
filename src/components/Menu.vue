<template>
  <ion-menu side="start" content-id="main-content" type="overlay" :disabled="!isUserAuthenticated || router.currentRoute.value.path === '/login'">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Job Manager") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
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
import { albumsOutline, barChartOutline, calendarNumberOutline, compassOutline, hourglassOutline, libraryOutline, pulseOutline, settingsOutline, sendOutline, terminalOutline, ticketOutline, timeOutline, cloudUploadOutline } from "ionicons/icons";
import { useUserStore } from "@/store/user";
import { hasPermission } from "@/authorization";
import router from "../router";
import { translate } from "@common";
import { useAuth } from "@/composables/auth";

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
  computed: {
    isUserAuthenticated(): any {
      return useAuth().isAuthenticated.value
    },
    userProfile(): any {
      return this.userStore.getUserProfile
    },
    currentShopifyConfig(): any {
      return this.userStore.getCurrentShopifyConfig
    },
    shopifyConfigs(): any {
      return this.userStore.getShopifyConfigs
    },
  },
  setup() {
    const userStore = useUserStore();
    
    // Filtering array of app pages, retaining only those elements (pages) that have the necessary permissions for display.
    const getValidMenuItems = (appPages: any) => {
      return appPages.filter((appPage: any) => (!appPage.meta || !appPage.meta.permissionId) || hasPermission(appPage.meta.permissionId));
    }

    let appPages = [
      {
        title: "Dashboard",
        url: "/pipeline",
        iosIcon: pulseOutline,
        mdIcon: pulseOutline,
        dependsOnBaseURL: true,
        meta: {
          permissionId: ""
        }
      },
      {
        title: "Catalog",
        url: "/catalog",
        iosIcon: albumsOutline,
        mdIcon: albumsOutline,
        dependsOnBaseURL: false,
        meta: {
          permissionId: ""
        }
      },
      {
        title: "Import monitor",
        url: "/import-monitor",
        iosIcon: hourglassOutline,
        mdIcon: hourglassOutline,
        dependsOnBaseURL: false,
        meta: {
          permissionId: ""
        }
      },
      {
        title: "File history",
        url: "/file-history",
        iosIcon: timeOutline,
        mdIcon: timeOutline,
        dependsOnBaseURL: false,
      },
      {
        title: "Manual uploads",
        url: "/manual-uploads",
        iosIcon: cloudUploadOutline,
        mdIcon: cloudUploadOutline,
        dependsOnBaseURL: false,
      },
      {
        title: "Settings",
        url: "/settings",
        iosIcon: settingsOutline,
        mdIcon: settingsOutline,
        dependsOnBaseURL: false,
      },
    ] as any;
    if (import.meta.env.VUE_APP_BASE_URL) {
      appPages = appPages.filter((page : any) => page.dependsOnBaseURL);
    }

    const route = router.currentRoute.value;
    const selectedIndex = computed(() => {
      const path = route.path
      return getValidMenuItems(appPages).findIndex((screen : any) => screen.url === path || screen.childRoutes?.includes(path))
    })

    return {
      albumsOutline,
      appPages,
      cloudUploadOutline,
      compassOutline,
      barChartOutline,
      calendarNumberOutline,
      getValidMenuItems,
      hasPermission,
      hourglassOutline,
      libraryOutline,
      pulseOutline,
      selectedIndex,
      translate,
      userStore,
      router
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
