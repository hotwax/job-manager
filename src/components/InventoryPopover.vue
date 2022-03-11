<template>
  <!-- TODO Make values dynamic and internationalise text  -->
  <ion-select :interface-options="customPopoverOptions" interface="popover" :value="getJobStatus(id)" @ionChange="updateJob($event['detail'].value, id)" >
    <ion-select-option value="HOURLY">Hourly</ion-select-option>
    <ion-select-option value="EVERY_6_HOURS">Every 6 hours</ion-select-option>
    <ion-select-option value="NIGHTLY">Nightly</ion-select-option>
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
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob'
    })
  },
  methods: {
    async updateJob(status: string, id: string) {
      const job = this.getJob(id);
      const payload = {
        ...job,
        'systemJobEnumId': id,
        'statusId': status === "SERVICE_DRAFT" ? "SERVICE_DRAFT" : "SERVICE_PENDING"
      } as any
      if (job?.status === 'SERVICE_DRAFT') {
        payload['SERVICE_FREQUENCY'] = status
        payload['SERVICE_NAME'] = job.serviceName
        payload['count'] = -1
        payload['runAsSystem'] = true
      } else if (job?.status === 'SERVICE_PENDING') {
        payload['tempExprId'] = status === 'SERVICE_DRAFT' ? job.tempExprId : status
        payload['jobId'] = job.id
      }

      job?.status === 'SERVICE_PENDING' ? this.store.dispatch('job/updateJob', payload) : this.store.dispatch('job/scheduleService', payload);
    }
  },
  setup() {
    const customPopoverOptions: any = {
      header: translate('Schedule inventory hard sync'),
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