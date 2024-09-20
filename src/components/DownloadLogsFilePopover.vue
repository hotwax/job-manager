<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ translate('Log Id') }}</ion-list-header>
      <ion-item button>
        {{ translate('Log file') }}
      </ion-item>
      <ion-item button>
        {{ translate('Uploaded file') }}
      </ion-item>
      <ion-item button lines="none">
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
} from "@ionic/vue";
import { defineComponent } from "vue";
import { translate } from "@hotwax/dxp-components";

export default defineComponent({
  name: "DownloadLogsFilePopover",
  components: { 
    IonContent,
    IonItem,
    IonList,
    IonListHeader
  },
  setup() {

    return {
      translate
    }
  }
});
</script> 