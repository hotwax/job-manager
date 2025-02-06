<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal()">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Schedule") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list>
      <ion-item>
        <ion-input label-placement="floating" :label="translate('Expression')" v-model="expression"></ion-input>
      </ion-item>
      <ion-item>
        <ion-icon slot="start" :icon="timerOutline"/>
        <ion-label>{{ isExpressionValid() && getCronString(expression) ? getCronString(expression) : "-" }}</ion-label>
      </ion-item>
      <ion-item>
        <ion-icon slot="start" :icon="timeOutline"/>
        <ion-label>{{ isExpressionValid() && getCronString(expression) ? getNextExecutionTime() : translate("Provide a valid cron expression") }}</ion-label>
      </ion-item>
    </ion-list>

    <ion-list-header>{{ translate("Schedule Options") }}</ion-list-header>

    <ion-list>
      <ion-radio-group v-model="expression">
        <ion-item :key="expression" v-for="(expression, description) in cronExpressions">
          <ion-radio label-placement="end" justify="start" :value="expression">{{ description }}</ion-radio>
        </ion-item>
      </ion-radio-group>
    </ion-list>
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button @click="saveChanges()" :disabled="!isExpressionUpdated() || !isExpressionValid() || getCronString(expression)?.length <= 0">
        <ion-icon :icon="saveOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonTitle,
  IonRadio,
  IonRadioGroup,
  IonToolbar,
  modalController,
} from "@ionic/vue";
import {
  closeOutline,
  saveOutline,
  timeOutline,
  timerOutline,
} from "ionicons/icons";
import { getCronString, getDateAndTime } from "@/utils";
import { mapGetters, useStore } from "vuex";
import { translate } from "@hotwax/dxp-components";
import logger from "@/logger";
import { Actions, hasPermission } from '@/authorization'
import cronParser from "cron-parser";
export default defineComponent({
  name: "ScheduleModal",
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonTitle,
    IonRadio,
    IonRadioGroup,
    IonToolbar
  },
  data() {
    return {
      cronExpressions: JSON.parse(process.env?.VUE_APP_CRON_EXPRESSIONS as string),
      expression: ""
    }
  },
  computed: {
    ...mapGetters({
      userProfile: "user/getUserProfile"
    })
  },
  props: ["cronExpression"],
  mounted() {
    this.expression = JSON.parse(JSON.stringify(this.cronExpression))
  },
  methods: {
    closeModal(expression = "") {
      modalController.dismiss({ expression })
    },
    isExpressionValid() {
      try {
        cronParser.parseExpression(this.expression, { tz: this.userProfile.timeZone })
        return true
      } catch(e) {
        logger.warn("Invalid expression", e)
        return false
      }
    },
    getNextExecutionTime() {
      try {
        const interval = cronParser.parseExpression(this.expression, { tz: this.userProfile.timeZone })
        return getDateAndTime((interval.next() as any)["_date"].ts)
      } catch(e) {
        logger.error("Invalid expression", e)
        return ""
      }
    },
    isExpressionUpdated() {
     return this.cronExpression !== this.expression
    },
    async saveChanges() {
      this.closeModal(this.expression)
    }
  }
  ,
  setup() {
    const store = useStore();
    return {
      Actions,
      closeOutline,
      getCronString,
      getDateAndTime,
      hasPermission,
      saveOutline,
      store,
      timeOutline,
      timerOutline,
      translate
    };
  }
});
</script>