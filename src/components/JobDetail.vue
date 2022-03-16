<template>
  <section>
    <ion-item lines="none">
      <h1>New orders</h1>
      <ion-badge slot="end" color="dark">running in 3 minutes</ion-badge>
    </ion-item>

    <ion-list>
      <ion-item>
        <ion-icon slot="start" :icon="calendarClearOutline" />
        <ion-label>Last run</ion-label>
        <ion-label slot="end">2:00 PM EST</ion-label>
      </ion-item>

      <ion-item>
        <ion-icon slot="start" :icon="timeOutline" />
        <ion-label>Run time</ion-label>
        <ion-label slot="end">3:00 PM EST</ion-label>
      </ion-item>

      <ion-item>
        <ion-icon slot="start" :icon="timerOutline" />
        <ion-label>Schedule</ion-label>
        <DurationPopover />
      </ion-item>

      <ion-item>
        <ion-icon slot="start" :icon="syncOutline" />
        <ion-label>Repeat untill disabled</ion-label>
        <ion-checkbox slot="end"></ion-checkbox>
      </ion-item>

      <ion-item>
        <ion-label> Auto disable after</ion-label>
        <ion-input placeholder="occurances" />
      </ion-item>
    </ion-list>

    <div class="actions">
      <div>
        <ion-button size="small" fill="outline" color="medium">Skip once</ion-button>
        <ion-button size="small" fill="outline" color="danger">Disable</ion-button>
      </div>
      <div>
        <ion-button size="small" fill="outline">Save changes</ion-button>
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
  IonLabel
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
  width: 547px;
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