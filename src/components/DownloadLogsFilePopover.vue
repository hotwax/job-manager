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
import { translate } from "@hotwax/dxp-components";
import { JobService } from "@/services/JobService";
import { saveDataFile, showToast } from '@/utils';
import logger from "@/logger";

export default defineComponent({
  name: "DownloadLogsFilePopover",
  components: { 
    IonContent,
    IonItem,
    IonList,
    IonListHeader
  },
  props: ["dataManagerLog"],
  methods: {
    async downloadFile(type: string) {
      let dataResource = {} as any;

      if (type === 'logFile') {
        dataResource.dataResourceId = this.dataManagerLog.logFileDataResourceId
        dataResource.name = this.dataManagerLog.logFileContentName
      } else if (type === 'uploadedFile') {
        dataResource.name = this.dataManagerLog.contentName
        dataResource.dataResourceId = this.dataManagerLog.dataResourceId
      } else if (type === 'failedRecords') {
        dataResource.dataResourceId = this.dataManagerLog.errorRecordDataResourceId
        dataResource.name = this.dataManagerLog.errorRecordContentName
      }

      if (dataResource.dataResourceId) {
        try {
          const response = await JobService.fetchFileData({
            dataResourceId: dataResource.dataResourceId
          });
          saveDataFile(response.data, dataResource.name);
        } catch (error) {
          showToast(translate('Error downloading file'))
          logger.error(error)
        }
      }
      popoverController.dismiss();
    }
  },
  setup() {
    return {
      translate
    }
  }
});
</script> 