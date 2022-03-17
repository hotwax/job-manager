<template>
  <section>
    <ion-item lines="none">
      <h1>New orders</h1>
      <ion-badge slot="end" color="dark">{{ $t("running in") }} 3 minutes</ion-badge>
    </ion-item>

    <ion-list>
      <ion-item>
        <ion-icon slot="start" :icon="calendarClearOutline" />
        <ion-label>{{ $t("Last run") }}</ion-label>
        <ion-label slot="end">2:00 PM EST</ion-label>
      </ion-item>

      <ion-item>
        <ion-icon slot="start" :icon="timeOutline" />
        <ion-label>{{ $t("Run time") }}</ion-label>
        <ion-label slot="end">3:00 PM EST</ion-label>
      </ion-item>

      <ion-item>
        <ion-icon slot="start" :icon="timerOutline" />
        <ion-label>{{ $t("Schedule") }}</ion-label>
        <DurationPopover />
      </ion-item>

      <ion-item>
        <ion-icon slot="start" :icon="syncOutline" />
        <ion-label>{{ $t("Repeat untill disabled") }}</ion-label>
        <ion-checkbox slot="end"></ion-checkbox>
      </ion-item>

      <ion-item>
        <ion-label>{{ $t("Auto disable after") }}</ion-label>
        <ion-input :placeholder="$t('occurances')" />
      </ion-item>
    </ion-list>

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
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  alertController
} from "@ionic/vue";
import DurationPopover from "@/components/DurationPopover.vue";
import {
  calendarClearOutline,
  timeOutline,
  timerOutline,
  syncOutline,
  personCircleOutline
} from "ionicons/icons";
export default defineComponent({
  name: "JobDetail",
  components: {
    IonBadge,
    IonButton,
    IonCheckbox,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    DurationPopover
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
          buttons: [this.$t('Cancel'), this.$t('Save')],
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
  },
  setup() {
    return {
      calendarClearOutline,
      timeOutline,
      timerOutline,
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
</style>