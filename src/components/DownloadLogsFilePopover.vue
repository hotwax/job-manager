<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ translate('Log Id') }}</ion-list-header>
      <ion-item button @click="downloadLogFile('logFile')">
        {{ translate('Log file') }}
      </ion-item>
      <ion-item button :lines="log?.errorRecordContentId ? undefined : 'none'" @click="downloadLogFile('uploadedFle')">
        {{ translate('Uploaded file') }}
      </ion-item>
      <ion-item v-if="log?.errorRecordContentId" button lines="none" @click="downloadLogFile('failedRecords')">
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
import { mapGetters } from 'vuex';
import { defineComponent } from "vue";
import { translate } from "@hotwax/dxp-components";
import { JobService } from "@/services/JobService";
import { responseFileType, showToast } from '@/utils';
import logger from "@/logger";

export default defineComponent({
  name: "DownloadLogsFilePopover",
  components: { 
    IonContent,
    IonItem,
    IonList,
    IonListHeader
  },
  computed: {
    ...mapGetters({
      getDataResourceId: 'job/getDataResourceIds',
    }),
  },  
  props: ["log"],
  methods: {
    async downloadLogFile(type: any) {
      let contentIdType;
      let dataResource = {} as any;

      if (type === 'logFile') {
        contentIdType = 'logFileContentId';
      } else if (type === 'failedRecords') {
        contentIdType = 'errorRecordContentId';
      } else if (type === 'uploadedFle') {
        dataResource.dataResourceId = this.log.dataResourceId;
        dataResource.name = this.log.contentName
      } 

      if (contentIdType) {
        dataResource = this.getDataResourceId(this.log[contentIdType]);
      }

      if (dataResource) {
        try {
          const response = await JobService.downloadCsv({
            dataResourceId: dataResource.dataResourceId
          });
          responseFileType(response.data, dataResource.name);
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