<template>
  <ion-menu side="start" content-id="main-content" type="overlay" :disabled="!isAuthenticated || router.currentRoute.value.path === '/login'">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Job Manager") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-menu-toggle :auto-hide="false" v-for="(page, index) in getValidMenuItems(appPages)" :key="index">
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

<script setup lang="ts">
import { IonContent, IonHeader, IonIcon, IonItem, IonItemDivider, IonLabel, IonList, IonMenu, IonMenuToggle, IonTitle, IonToolbar } from "@ionic/vue";
import { computed } from "vue";
import { albumsOutline, pulseOutline, settingsOutline, timeOutline, cloudUploadOutline } from "ionicons/icons";
import { hasPermission } from "@/authorization";
import { translate } from "@common";
import { useAuth } from "@/composables/auth";
import { useRouter } from "vue-router";

const { isAuthenticated } = useAuth();
const router = useRouter();
    
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
    meta: {
      permissionId: "HIDDEN"
    }
  },
  {
    title: "Catalog",
    url: "/catalog",
    iosIcon: albumsOutline,
    mdIcon: albumsOutline,
    meta: {
      permissionId: "HIDDEN"
    }
  },
  {
    title: "File history",
    url: "/file-history",
    iosIcon: timeOutline,
    mdIcon: timeOutline,
    childRoutes: ["/file-history/"]
  },
  {
    title: "Manual uploads",
    url: "/manual-uploads",
    iosIcon: cloudUploadOutline,
    mdIcon: cloudUploadOutline,
    childRoutes: ["/manual-uploads/"]
  },
  {
    title: "Settings",
    url: "/settings",
    iosIcon: settingsOutline,
    mdIcon: settingsOutline,
  },
] as any;

const selectedIndex = computed(() => {
  const path = router.currentRoute.value.path
  return getValidMenuItems(appPages).findIndex((screen : any) => screen.url === path || screen.childRoutes?.includes(path) || screen.childRoutes?.some((route: string) => path.includes(route)))
})
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
