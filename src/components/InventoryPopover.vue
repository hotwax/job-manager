<template>
  <!-- TODO Make values dynamic and internationalise text  -->
  <ion-select :interface-options="customPopoverOptions" interface="popover" :value="getJobStatus(id)" @ionChange="updateJob($event)" >
    <ion-select-option value="HOURLY">Hourly</ion-select-option>
    <ion-select-option value="EVERY_6_HOURS">Every 6 hours</ion-select-option>
    <ion-select-option value="NIGHTLY">Nightly</ion-select-option>
    <ion-select-option value="DAILY">Daily</ion-select-option>
  </ion-select>
</template>
<script lang="ts">
import { IonSelect, IonSelectOption } from '@ionic/vue';
import { defineComponent } from 'vue';
import { useStore } from "@/store";
import { mapGetters } from "vuex";

export default defineComponent({
  name: 'InventoryPopover',
  props: { 
    id: String
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
      this.store.dispatch('job/updateJob', payload);
    },
  },
  setup() {
    const customPopoverOptions: any = {
      header: 'Schedule inventory hard sync',
      showBackdrop: false
    }
    const store = useStore();
    return {
      customPopoverOptions,
      store
    }  
  }
});
</script>