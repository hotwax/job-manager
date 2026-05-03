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
        <ion-item
            button
            @click="redirectToExternalLink()"
          >
            <ion-icon slot="start" :icon="openOutline" />
            <ion-label>{{ translate("Legacy App") }}</ion-label>
          </ion-item>
      </ion-list>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-item lines="none">
          <ion-label class="ion-text-wrap">
            <p class="overline">{{ commonUtil.getOmsURL() }}</p>
          </ion-label>
          <ion-note :color="browserTimeZone === userStore.current?.userTimeZone ? '' : 'danger'" slot="end">{{ userStore.current?.userTimeZone }}</ion-note>
        </ion-item>
        <!-- showing product stores only when there are multiple options to choose from. -->
        <ion-item v-if="userProfile.stores?.length > 2" lines="none">
          <!-- WHY EVENTS ($emit) IS USED WITH ION CHANGE: https://michaelnthiessen.com/pass-function-as-prop/ -->
          <ion-select interface="popover" :value="currentProductStore.productStoreId" @ionChange="setProductStore($event.target.value)">
            <ion-select-option v-for="store in (userProfile ? userProfile.stores : [])" :key="store.productStoreId" :value="store.productStoreId" >{{ store.storeName || store.productStoreId }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item v-else lines="none">
          <ion-label class="ion-text-wrap">
            {{ currentProductStore.storeName }}
          </ion-label>
        </ion-item>
      </ion-toolbar>
    </ion-footer>
  </ion-menu>
</template>

<script setup lang="ts">
import { IonContent, IonFooter, IonHeader, IonIcon, IonItem, IonItemDivider, IonLabel, IonList, IonMenu, IonMenuToggle, IonNote, IonSelect, IonSelectOption, IonTitle, IonToolbar } from "@ionic/vue";
import { computed } from "vue";
import { albumsOutline, cloudUploadOutline, fileTrayStackedOutline, globeOutline, openOutline, pulseOutline, settingsOutline, timeOutline } from "ionicons/icons";
import { translate, commonUtil, cookieHelper, emitter } from "@common";
import { useAuth } from "@common/composables/useAuth";
import router from "../router";
import { useUserStore } from "@/store/user";
import { useJobStore } from "@/store/jobs";

const { isAuthenticated } = useAuth();
const userStore = useUserStore();

const currentProductStore = userStore.getCurrentProductStore
const userProfile = computed(() => userStore.getUserProfile)

const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

// Filtering array of app pages, retaining only those elements (pages) that have the necessary permissions for display.
const getValidMenuItems = (appPages: any) => {
  return appPages.filter((appPage: any) => (!appPage.meta || !appPage.meta.permissionId) || userStore.hasPermission(appPage.meta.permissionId));
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
    title: "Jobs"
  },
  {
    title: "Catalog",
    url: "/catalog",
    iosIcon: albumsOutline,
    mdIcon: albumsOutline,
    childRoutes: ["/job/"]
  },
  {
    title: "MDM"
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
    title: "System Messages"
  },
  {
    title: "Monitor",
    url: "/system-messages",
    iosIcon: pulseOutline,
    mdIcon: pulseOutline,
    childRoutes: ["/system-messages/"]
  },
  {
    title: "Message Types",
    url: "/system-message-types",
    iosIcon: fileTrayStackedOutline,
    mdIcon: fileTrayStackedOutline,
    childRoutes: ["/system-message-types/"]
  },
  {
    title: "Remote Systems",
    url: "/system-message-remotes",
    iosIcon: globeOutline,
    mdIcon: globeOutline,
    childRoutes: ["/system-message-remotes/"]
  },
  {
    title: "Settings"
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

const setProductStore = async (value: string) => {
  // If the value is same, no need to update
  // Handled case for programmatical changes
  // https://github.com/ionic-team/ionic-framework/discussions/25532
  // https://github.com/ionic-team/ionic-framework/issues/20106
  // https://github.com/ionic-team/ionic-framework/pull/25858
  if(userStore.current && currentProductStore?.productStoreId !== value) {
    await userStore.setCurrentProductStore({ "productStoreId": value })
    emitter.emit("productStoreUpdated")
  }
}

const redirectToExternalLink = () => {
  const oms = userStore.oms
  const token = cookieHelper().get("token")!
  const expirationTime = cookieHelper().get("expirationTime")!
  const maarg = decodeURIComponent(cookieHelper().get("maarg")!)
  const link = import.meta.env.VITE_LEGACY_APP_URL
  window.location.href = link.replace("{oms}", oms).replace("{token}", token).replace("{expirationTime}", expirationTime).replace("{omsRedirectionUrl}", maarg)
}
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
