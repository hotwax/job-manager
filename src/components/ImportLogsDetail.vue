<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/pipeline" />
        <ion-title>{{ translate("Import logs")}}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="header">
        <div class="search ion-padding">
          <section>
            <ion-item lines="none">
              <h1>Import logs</h1>
            </ion-item>
            <ion-list>
              <ion-item>
                <ion-icon slot="start" :icon="pulseOutline" />
                <ion-label>Job</ion-label>
                <ion-label slot="end" class="ion-text-wrap">Job Id</ion-label>
              </ion-item>
              <ion-item>
                <ion-icon slot="start" :icon="fileTrayFullOutline" />
                <ion-label>Files received</ion-label>
                <ion-label slot="end">14</ion-label>
              </ion-item>
              <ion-item>
                <ion-icon slot="start" :icon="codeWorkingOutline" />
                <ion-label>Files processed</ion-label>
                <ion-label slot="end">14</ion-label>
              </ion-item>
              <ion-item lines="none">
                <ion-icon slot="start" :icon="warningOutline" />
                <ion-label>Files with errors</ion-label>
                <ion-label slot="end">14</ion-label>
              </ion-item>
            </ion-list>
          </section>
        </div>
        <div class="filters ion-padding">
          <ion-label lines="none">
            <p class="overline">Config Id</p>
            <h1>Config Name</h1>
          </ion-label>
          <ion-list>
            <ion-item>
              <ion-icon slot="start" :icon="shareSocialOutline" />
              <ion-label>Multithreading</ion-label>
              <ion-label slot="end">facilityId</ion-label>
            </ion-item>
            <ion-item>
              <ion-icon slot="start" :icon="globeOutline" />
              <ion-label>SFTP</ion-label>
              <ion-label slot="end" class="ion-text-wrap">path/SFTP</ion-label>
            </ion-item>
            <ion-item>
              <ion-icon slot="start" :icon="optionsOutline" />
              <ion-label>Mode</ion-label>
              <ion-label slot="end">Queued</ion-label>
            </ion-item>
          </ion-list>
        </div>
      </div>

      <div class="ion-padding">
        <ion-chip outline>
          <ion-label>All</ion-label>
          <ion-icon :icon="checkmarkOutline"/>
        </ion-chip>
        <ion-chip outline>
          <ion-label>Failed log</ion-label>
        </ion-chip>
        <ion-chip outline>
          <ion-label>Failed records</ion-label>
        </ion-chip>
      </div>

      <div class="list-item">
        <ion-item lines="none">
          <ion-icon slot="start" :icon="documentTextOutline" />
          <ion-label>
            <p class="overline">Log id</p>
            File Name
            <p>07/09/2024 10:00 PM</p>
          </ion-label>
        </ion-item>

        <ion-label>
          07/09/2024 10:00 PM
          <p>Started</p>
        </ion-label>

        <ion-label>
          07/09/2024 10:00 PM
          <p>Finished</p>
        </ion-label>
        
        <ion-badge color="success">Finished</ion-badge>

        <ion-label>
          <ion-icon slot="start" :icon="cloudDownloadOutline" />
          <p>Failed records</p>
        </ion-label>

        <ion-button fill="clear" color="medium" @click="openDownloadLogsFilePopover($event)">
          <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
        </ion-button>
      </div>

      <div class="list-item">
        <ion-item lines="none">
          <ion-icon slot="start" :icon="documentTextOutline" />
          <ion-label>
            <p class="overline">Log id</p>
            File Name
            <p>07/09/2024 10:00 PM</p>
          </ion-label>
        </ion-item>

        <ion-label>
          07/09/2024 10:00 PM
          <p>Started</p>
        </ion-label>

        <ion-label>
          07/09/2024 10:00 PM
          <p>Finished</p>
        </ion-label>
        
        <ion-badge color="danger">Failed</ion-badge>

        <ion-label>
          <ion-icon slot="start" :icon="cloudDownloadOutline" />
          <p>Failed records</p>
        </ion-label>

        <ion-button fill="clear" color="medium" @click="openDownloadLogsFilePopover($event)">
          <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import { checkmarkOutline, codeWorkingOutline, cloudDownloadOutline, documentTextOutline, ellipsisVerticalOutline, fileTrayFullOutline, globeOutline, optionsOutline, pulseOutline, shareSocialOutline, warningOutline } from "ionicons/icons";
import { IonBackButton, IonBadge, IonButton, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonPage, IonTitle, IonToolbar, popoverController } from "@ionic/vue";
import { defineComponent } from 'vue'
import { translate } from '@hotwax/dxp-components'
import DownloadLogsFilePopover from "./DownloadLogsFilePopover.vue";

export default defineComponent ({
  name: "ImportLogsDetail",
  components: {
    IonBackButton,
    IonBadge,
    IonButton,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonPage,
    IonTitle,
    IonToolbar,
  },
  methods : {
    async openDownloadLogsFilePopover(event) {
      const popover = await popoverController.create({
        component: DownloadLogsFilePopover,
        showBackdrop: false,
        event: event
      });
      return popover.present()
    }
  },
  setup() {
    return {
      checkmarkOutline,
      codeWorkingOutline,
      cloudDownloadOutline,
      documentTextOutline,
      ellipsisVerticalOutline,
      fileTrayFullOutline,
      globeOutline,
      optionsOutline,
      pulseOutline,
      shareSocialOutline,
      warningOutline,
      translate
    }
  }
})
</script>

<style scoped>
section {
  overflow: hidden;
  border: var(--border-medium);
  border-radius: 16px;
}

.list-item {
  --columns-desktop: 6;
  border-bottom : 1px solid var(--ion-color-medium);
}

.list-item > ion-item {
  width: 100%;
}

.header {
  display: grid;
  grid: "search filters"
        /1fr 1fr;
}

.search {
  grid-area: search;
}

.filters {
  grid-area: filters;
  align-self: end;
}

@media (max-width: 991px) {
  .header {
    grid: "search"
          "filters"
          / auto;
    padding: 0;
  }
}
</style> 