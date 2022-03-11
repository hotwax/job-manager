<template>
  <!-- TODO Make values dynamic and internationalise text  -->
  <ion-select :interface-options="customPopoverOptions" interface="popover" :value="getJobStatus(id)" @ionChange="updateJob(id)" >
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
import { translate } from '@/i18n';

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
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob'
    })
  },
  methods: {
    async updateJob(id: string) {
      const job = this.getJob(id);
      const payload = {
        ...job,
        'systemJobEnumId': id,
        'statusId' : "SERVICE_PENDING"
      } as any
      if (job?.status === 'SERVICE_DRAFT') {
        payload['SERVICE_FREQUENCY'] = 'EVERY_15_MIN'
      } else if (job?.status === 'SERVICE_PENDING') {
        payload['tempExprId'] = 'EVERY_15_MIN'
        payload['jobId'] = job.id
      }

      job?.status === 'SERVICE_PENDING' ? this.store.dispatch('job/updateJob', payload) : this.store.dispatch('job/scheduleService', payload);
    }
  },
 setup(){
    const customPopoverOptions: any = {
      header: translate('Import new orders'),
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