<template>
  <section>
    <ion-item lines="none">
      <h1>New orders</h1>
      <ion-badge slot="end" color="dark" v-if="job?.runTime">{{ $t("running") }} {{ timeTillJob(job.runTime) }}</ion-badge>
    </ion-item>

    <ion-list>
      <ion-item>
        <ion-icon slot="start" :icon="calendarClearOutline" />
        <ion-label>{{ $t("Last run") }}</ion-label>
        <ion-label slot="end">{{ job?.lastUpdatedStamp ? getTime(job.lastUpdatedStamp) : 'No previous occurrence' }}</ion-label>
      </ion-item>

      <ion-item>
        <ion-icon slot="start" :icon="timeOutline" />
        <ion-label>{{ $t("Run time") }}</ion-label>
        <ion-label id="open-run-time-modal" slot="end" v-show="job?.runTime">{{ getTime(job.runTime) }}</ion-label>
        <ion-button size="small" fill="outline" color="medium" @click="skipJob">{{ $t("Skip once") }}</ion-button>
        <ion-modal trigger="open-run-time-modal">
          <ion-content force-overscroll="false">
            <ion-datetime
              :value="job?.runTime ? $filters.formatDate(getTime(job.runTime)) : ''"
            />
          </ion-content>
        </ion-modal>
      </ion-item>

      <ion-item>
        <ion-icon slot="start" :icon="timerOutline" />
        <ion-label>{{ $t("Schedule") }}</ion-label>
        <ion-select :interface-options="customPopoverOptions" interface="popover" :value="jobStatus" placeholder="Disabled">
          <ion-select-option value="HOURLY">Hourly</ion-select-option>
          <ion-select-option value="EVERY_6_HOUR">Every 6 hours</ion-select-option>
          <ion-select-option value="NIGHTLY">Nightly</ion-select-option>
        </ion-select>
      </ion-item>

      <!-- <ion-item>
        <ion-icon slot="start" :icon="syncOutline" />
        <ion-label>{{ $t("Repeat untill disabled") }}</ion-label>
        <ion-checkbox slot="end" :checked="repeat" @ionChange="repeatUntillDisabled($event['detail'].checked)"/>
      </ion-item>

      <ion-item v-show="!repeat">
        <ion-label>{{ $t("Auto disable after") }}</ion-label>
        <ion-input :placeholder="$t('occurances')" v-model="count"/>
      </ion-item>
    </ion-list> -->

    <div class="actions">
      <div>
        <ion-button size="small" fill="outline" color="medium" @click="skipJob">{{ $t("Skip once") }}</ion-button>
        <ion-button size="small" fill="outline" color="danger" @click="cancelJob">{{ $t("Disable") }}</ion-button>
      </div>
      <div>
        <ion-button size="small" fill="outline" @click="saveChanges">{{ $t("Save changes") }}</ion-button>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import {
  IonBadge,
  IonButton,
  IonCheckbox,
  IonContent,
  IonDatetime,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSelect,
  IonSelectOption,
  alertController
} from "@ionic/vue";
import {
  calendarClearOutline,
  timeOutline,
  timerOutline,
  syncOutline,
  personCircleOutline
} from "ionicons/icons";
import { mapGetters, useStore } from "vuex";
import { translate } from "@/i18n";
import { DateTime } from 'luxon';

export default defineComponent({
  name: "JobDetail",
  components: {
    IonBadge,
    IonButton,
    IonCheckbox,
    IonContent,
    IonDatetime,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonModal,
    IonSelect,
    IonSelectOption
  },
  data() {
    return {
      job: {},
      jobStatus: ''
    }
  },
  async mounted() {
    this.job = await this.getJob('ping')
    this.jobStatus = await this.getJobStatus('ping')
  },
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      getShopifyConfigId: 'user/getShopifyConfigId',
      getCurrentEComStore: 'user/getCurrentEComStore'
    })
  },
  methods: {
    async skipJob() {
      const alert = await alertController
        .create({
          header: this.$t('Skip job'),
          message: this.$t('Skipping will run this job at the next occurance based on the temporal expression.'),
          buttons: [this.$t('Dont skip'), this.$t('Skip')],
        });
      return alert.present();
    },
    async cancelJob() {
      const alert = await alertController
        .create({
          header: this.$t('Cancel job'),
          message: this.$t('Canceling this job will cancel this occurance and all following occurances. This job will have to be re-enabled manually to run it again.'),
          buttons: [this.$t('Dont cancel'), this.$t('Cancel')],
        });
      return alert.present();
    },
    async saveChanges() {
      const alert = await alertController
        .create({
          header: this.$t('Save changes'),
          message: this.$t('Are you sure you want to save these changes?'),
          buttons: [{
            text: this.$t('Cancel'),
            role: 'cancel'
          }, {
            text: this.$t('Save'),
            handler: () => {
              this.updateJob();
            }
          }]
        });
      return alert.present();
    },
    async discardChanges() {
      const alert = await alertController
        .create({
          header: this.$t('Discard changes'),
          message: this.$t('All unsaved changes will be lost. Are you sure you want to leave this page.'),
          buttons: [this.$t('Cancel'), this.$t('Save')],
        });
      return alert.present();
    },
    async updateJob(id = 'ping') {
      const job = this.getJob(id);

      // TODO: added this condition to not call the api when the value of the select automatically changes
      // need to handle this properly
      if (this.jobStatus === job?.tempExprId) {
        return;
      }

      const payload = {
        ...job,
        'systemJobEnumId': id,
        'statusId': "SERVICE_PENDING"
      } as any
      if (job?.status === 'SERVICE_DRAFT') {
        payload['SERVICE_FREQUENCY'] = this.jobStatus
        payload['SERVICE_NAME'] = job.serviceName
        payload['count'] = -1
        payload['runAsSystem'] = true
        payload['shopifyConfigId'] = this.getShopifyConfigId
        payload['productStoreId'] = this.getCurrentEComStore.productStoreId

        this.store.dispatch('job/scheduleService', payload)
      } else if (job?.status === 'SERVICE_PENDING') {
        payload['tempExprId'] = this.jobStatus
        payload['jobId'] = job.id

        this.store.dispatch('job/updateJob', payload)
      }
    },
    getTime (time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
    },
    timeTillJob (time: any) {
      const timeDiff = DateTime.fromMillis(time).diff(DateTime.local());
      return DateTime.local().plus(timeDiff).toRelative();
    },
  },
  setup() {
    const customPopoverOptions: any = {
      header: translate('Schedule inventory hard sync'),
      showBackdrop: false
    }
    const store = useStore();
    return {
      calendarClearOutline,
      customPopoverOptions,
      timeOutline,
      timerOutline,
      store,
      syncOutline,
      personCircleOutline
    };
  }
});
</script>

<style scoped>
section {
  overflow: hidden;
  flex: 1 355px;
  border: 1px solid var(--ion-color-medium);
  border-radius: 16px;
}
ion-list {
  margin-top: var(--spacer-xs);
}
.actions {
  display: flex;
  justify-content: space-between;
  margin: var(--spacer-base) var(--spacer-sm) var(--spacer-base);
}

ion-modal {
  --width: 290px;
  --height: 382px;
  --border-radius: 8px;
}
</style>