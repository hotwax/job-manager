<template>
  <ion-select :interface-options="customPopoverOptions" interface="popover" :value="getJobStatus(id)" @ionChange="updateJob($event['detail'].value, id)">
    <ion-select-option value="HOURLY">Hourly</ion-select-option>
    <ion-select-option value="EVERY_6_HOURS">Every 6 Hours</ion-select-option>
    <ion-select-option value="DAILY">Daily</ion-select-option>
    <ion-select-option value="SERVICE_DRAFT">Disabled</ion-select-option>
  </ion-select>
</template>

<script lang="ts">
import { translate } from '@/i18n';
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
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      getShopifyConfigId: 'user/getShopifyConfigId',
      getCurrentEComStore: 'user/getCurrentEComStore'
    })
  },
  props: {
    id: String
  },
  methods: {
    async updateJob(status: string, id: string) {
      const job = this.getJob(id);

      // TODO: added this condition to not call the api when the value of the select automatically changes
      // need to handle this properly
      if (status === job.tempExprId) {
        return;
      }

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
        payload['shopifyConfigId'] = this.getShopifyConfigId
        payload['productStoreId'] = this.getCurrentEComStore.productStoreId
      } else if (job?.status === 'SERVICE_PENDING') {
        payload['tempExprId'] = status === 'SERVICE_DRAFT' ? job.tempExprId : status
        payload['jobId'] = job.id
      }

      job?.status === 'SERVICE_PENDING' ? this.store.dispatch('job/updateJob', payload) : this.store.dispatch('job/scheduleService', payload);
    }
  },
  setup() {
    const customPopoverOptions: any = {
      header: translate("Schedule product sync"),
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