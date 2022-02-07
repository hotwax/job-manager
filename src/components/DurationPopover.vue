<template>
  <!-- TODO Make values dynamic and internationalise text  -->
  <ion-select :interface-options="customPopoverOptions" interface="popover" :value="getJobStatus(id)" @ionChange="updateJob($event)" >
    <ion-select-option value="EVERY_5_MIN">Every 5 minutes</ion-select-option>
    <ion-select-option value="EVERY_15_MIN">Every 15 minutes</ion-select-option>
    <ion-select-option value="HOURLY">Hourly</ion-select-option>
    <ion-select-option value="DAILY">Daily</ion-select-option>
    <ion-select-option value="SERVICE_DRAFT">Disabled</ion-select-option>
  </ion-select>
</template>
<script lang="ts">
import { IonSelect, IonSelectOption } from '@ionic/vue';
import { defineComponent } from 'vue';
import { useStore } from "@/store";
import { mapGetters } from "vuex";

export default defineComponent({
  name: 'DurationPopover',
  props: { 
    id: String,
    frequencyType: String
  },
  components: {
    IonSelect,
    IonSelectOption
  },
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus'
    })
  },
  methods: {
     async updateJob(status: string) {
      const payload = {
        id: this.id,
        status: '',
        frequency: undefined as string | undefined
      }
      if ( status === "SERVICE_DRAFT") {
        payload.status = status;
      } else {
        payload.status = "SERVICE_PENDING";
        payload.frequency = status;
      }
      this.store.dispatch('job/updateJob', );
    },
  },
 setup(){
    const customPopoverOptions: any = {
      header: 'Import new orders',
      showBackdrop: false
    };
    const store = useStore();
    return {
      customPopoverOptions,
      store
    }
 }
});
</script>