import { isFutureDate, showToast } from '../utils';
import { translate } from "../i18n";

export default {
  methods: {
    async updateWebhook(checked: boolean, enumId: string) {
      const webhook = this.getCachedWebhook[this.webhookEnums[enumId]]

      // TODO: added this condition to not call the api when the value of the select automatically changes
      // need to handle this properly
      if ((checked && webhook) || (!checked && !webhook)) {
        return;
      }

      if (checked) {
        await this.store.dispatch('webhook/subscribeWebhook', enumId)
      } else {
        await this.store.dispatch('webhook/unsubscribeWebhook', { webhookId: webhook?.id, shopifyConfigId: this.shopifyConfigId })
      }
    },
    async updateJob(checked: boolean, id: string, status = 'EVERY_15_MIN') {
      const job = this.getJob(id);

      // TODO: added this condition to not call the api when the value of the select automatically changes
      // need to handle this properly
      if ((checked && job?.status === 'SERVICE_PENDING') || (!checked && job?.status === 'SERVICE_DRAFT')) {
        return;
      }

      // added check that if the job is not present, then display a toast and then return
      if (!job) {
        showToast(translate('Configuration missing'))
        return;
      }

      job['jobStatus'] = status

      // if job runTime is not a valid date then making runTime as empty
      if (job?.runTime && !isFutureDate(job?.runTime)) {
        job.runTime = ''
      }

      if (!checked) {
        this.store.dispatch('job/cancelJob', job)
      } else if (job?.status === 'SERVICE_DRAFT') {
        this.store.dispatch('job/scheduleService', job)
      } else if (job?.status === 'SERVICE_PENDING') {
        this.store.dispatch('job/updateJob', job)
      }
    },
  }
}