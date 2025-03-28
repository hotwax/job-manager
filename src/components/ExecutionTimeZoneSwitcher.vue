<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>
        {{ translate("Execution Timezone") }}
      </ion-card-title>
    </ion-card-header>
    <ion-card-content>
      {{ translate("Select the timezone that data should be processed in. This should always be the same zone as integrated systems like eCommerce and ERPs.") }}
    </ion-card-content>
    <ion-item>
      <ion-label>
        <p class="overline">{{ translate("System TimeZone") }}</p>
        {{ browserTimeZone.id }}
        <p>{{ getCurrentTime(browserTimeZone.id, dateTimeFormat) }}</p>
      </ion-label>
    </ion-item>
    <ion-item lines="none">
      <ion-label>
        <p class="overline">{{ translate("Selected TimeZone") }}</p>
        {{ currentTimeZoneId }}
        <p  v-if="currentTimeZoneId">{{ getCurrentTime(currentTimeZoneId, dateTimeFormat) }}</p>
      </ion-label>
      <ion-button slot="end" fill="outline" color="dark" @click="changeTimeZone()">
        {{ translate(currentTimeZoneId ? "Change" : "Add") }}
      </ion-button>
    </ion-item>
  </ion-card>
</template>


<script lang="ts">
import { defineComponent } from "vue";
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  modalController
} from "@ionic/vue";
import { mapGetters } from "vuex";
import { translate, useUserStore } from "@hotwax/dxp-components";
import { DateTime } from 'luxon';
import TimeZoneModal from "@/components/TimeZoneModal.vue";

export default defineComponent({
  name: "ExecutionTimeZoneSwitcher",
  components: {
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonItem,
    IonLabel,
  },
  data() {
    return {
      dateTimeFormat: "t ZZZZ",
      browserTimeZone: {
        label: '',
        id: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    }
  },
  computed: {
    ...mapGetters({
      currentTimeZoneId: "util/getJobRecurrenceTimeZone"
    })
  },
  mounted() {
    console.log('enter')
  },
  methods: {
    getCurrentTime(zone: string, format = 't ZZZZ') {
      return DateTime.now().setZone(zone).toFormat(format)
    },
    async changeTimeZone() {
      const timeZoneModal = await modalController.create({
        component: TimeZoneModal,
      });
      return timeZoneModal.present();
    },
  },
  setup() {
    const userStore = useUserStore();

    return {
      translate,
      userStore
    };
  }
});
</script>