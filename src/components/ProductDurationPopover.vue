<template>
  <ion-select :interface-options="customPopoverOptions" interface="popover" :value="getJobStatus(id) ? getJobStatus(id) : 'SERVICE_DRAFT'" @ionChange="updateJob($event)">
    <ion-select-option value="HOURLY">Hourly</ion-select-option>
    <ion-select-option value="EVERY_6_HOURS">Every 6 Hours</ion-select-option>
    <ion-select-option value="DAILY">Daily</ion-select-option>
    <ion-select-option value="SERVICE_DRAFT">Disabled</ion-select-option>
  </ion-select>
</template>

<script lang="ts">
import { IonSelect, IonSelectOption } from '@ionic/vue';
import { defineComponent } from 'vue';
import { mapGetters, useStore } from 'vuex';
export default defineComponent({
  name: 'ProductDurationPopover',
  components: {
    IonSelect,
    IonSelectOption,
  },
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus'
    })
  },
  props: {
    id: String
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
  setup() {
    const customPopoverOptions: any = {
      header: "Schedule product sync",
      showBackdrop: false,
    };
    const store = useStore();
    return {
      customPopoverOptions,
      store
    }
  }
});
</script>