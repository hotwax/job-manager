<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ dataManagerLog.logId }}</ion-list-header>
      <ion-item button @click="downloadFile('logFile')">
        {{ translate('Log file') }}
      </ion-item>
      <ion-item button @click="downloadFile('uploadedFile')">
        {{ translate('Uploaded file') }}
      </ion-item>
      <ion-item button :disabled="!dataManagerLog?.errorRecordContentId" lines="none" @click="downloadFile('failedRecords')">
        {{ translate('Failed records') }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script lang="ts">
import {
  IonContent,
  IonItem,
  IonList,
  IonListHeader,
  popoverController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { translate } from "@common";

export default defineComponent({
  name: "DownloadLogsFilePopover",
  props: ["dataManagerLog"],
  components: { 
    IonContent,
    IonItem,
    IonList,
    IonListHeader
  },
  setup() {
    function downloadFile(type: string) {
      popoverController.dismiss();
      // Implementation placeholder for download logic
      console.log(`Downloading ${type}`);
    }

    return {
      downloadFile,
      translate
    }
  }
});
</script>