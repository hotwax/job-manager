<template>
  <ion-menu side="start" content-id="main-content" type="overlay" :disabled="!isUserAuthenticated">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ $t("Job Manager") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-menu-toggle auto-hide="false" v-for="(page, index) in appPages" :key="index">
          <ion-item
            button
            @click="selectedIndex = index"
            router-direction="root"
            :router-link="page.url"
            class="hydrated"
            :class="{ selected: selectedIndex === index }">
            <ion-icon slot="start" :ios="page.iosIcon" :md="page.mdIcon" />
            <ion-label>{{ $t(page.title) }}</ion-label>
          </ion-item>
        </ion-menu-toggle>
      </ion-list>
    </ion-content>
    <ion-footer>
      <ion-toolbar>
        <ion-item lines="none">
          <ion-label class="ion-text-wrap">
            <p class="overline">{{ instanceUrl }}</p>
            {{ eComStore.storeName }}
            <p>{{ currentShopifyConfig.name ? currentShopifyConfig.name : currentShopifyConfig.shopifyConfigName }}</p>
          </ion-label>
          <ion-note slot="end">{{ userProfile?.userTimeZone }}</ion-note>
        </ion-item>
      </ion-toolbar>
    </ion-footer>
  </ion-menu>
</template>

<script lang="ts">
import {
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
  IonNote,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import { defineComponent, ref } from "vue";
import { mapGetters } from "vuex";
import { pulseOutline, calendarNumberOutline, ticketOutline, albumsOutline, shirtOutline, settings, iceCreamOutline, libraryOutline } from "ionicons/icons";
import { useStore } from "@/store";
export default defineComponent({
  name: "Menu",
  components: {
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonMenuToggle,
    IonNote,
    IonTitle,
    IonToolbar
  },
  created() {
    // When open any specific screen it should show that screen selected
    this.selectedIndex = this.appPages.findIndex((screen) => {
      return screen.url === this.$router.currentRoute.value.path;
    })
  },
  computed: {
    ...mapGetters({
      isUserAuthenticated: 'user/isUserAuthenticated',
      currentFacility: 'user/getCurrentFacility',
      eComStore: 'user/getCurrentEComStore',
      instanceUrl: 'user/getInstanceUrl',
      userProfile: 'user/getUserProfile',
      currentShopifyConfig: 'user/getCurrentShopifyConfig'
    })
  },
  watch:{
    $route (to) {
      // When logout and login it should point to Oth index
      if (to.path === '/login') {
        this.selectedIndex = 0;
      }
    },
  }, 
  setup() {
    const store = useStore();
    const selectedIndex = ref(0);
    let appPages = [
      {
        title: "Pipeline",
        url: "/pipeline",
        iosIcon: pulseOutline,
        mdIcon: pulseOutline,
        dependsOnBaseURL: true
      },
      {
        title: "Initial load",
        url: "/initial-load",
        iosIcon: iceCreamOutline,
        mdIcon: iceCreamOutline,
        dependsOnBaseURL: false
      },
      {
        title: "Pre-order",
        url: "/pre-order",
        iosIcon: calendarNumberOutline,
        mdIcon: calendarNumberOutline,
        dependsOnBaseURL: false
      },
      {
        title: "Orders",
        url: "/orders",
        iosIcon: ticketOutline,
        mdIcon: ticketOutline,
        dependsOnBaseURL: false
      },
      {
        title: "Inventory",
        url: "/inventory",
        iosIcon: albumsOutline,
        mdIcon: albumsOutline,
        dependsOnBaseURL: false
      },
      {
        title: "Products",
        url: "/product",
        iosIcon: shirtOutline,
        mdIcon: shirtOutline,
        dependsOnBaseURL: false
      },
      {
        title: "Miscellaneous",
        url: "/miscellaneous",
        iosIcon: libraryOutline,
        mdIcon: libraryOutline,
        dependsOnBaseURL: false
      },
      {
        title: "Settings",
        url: "/settings",
        iosIcon: settings,
        mdIcon: settings,
        dependsOnBaseURL: true
      },
    ];
    if (process.env.VUE_APP_BASE_URL) {
      appPages = appPages.filter((page) => page.dependsOnBaseURL);
    }
    return {
      selectedIndex,
      appPages,
      pulseOutline, 
      calendarNumberOutline, 
      ticketOutline, 
      albumsOutline, 
      shirtOutline,
      settings,
      iceCreamOutline,
      store,
      libraryOutline
    };
  },
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
