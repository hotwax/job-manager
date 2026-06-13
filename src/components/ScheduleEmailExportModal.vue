<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal()">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Schedule email export") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding">
    <p class="ion-padding-horizontal">
      <ion-text color="medium">
        {{ translate("Exports the full document on a schedule and emails the CSV. A record of each send is kept for reference.") }}
      </ion-text>
    </p>

    <ion-list>
      <ion-item>
        <ion-input
          v-model="toEmailAddress"
          type="email"
          :label="translate('Send to')"
          label-placement="stacked"
          placeholder="name@example.com"
          :helper-text="translate('Comma separate multiple recipients')"
        />
      </ion-item>
      <ion-item>
        <ion-input
          v-model="ccAddresses"
          type="email"
          :label="translate('CC (optional)')"
          label-placement="stacked"
          placeholder="name@example.com"
        />
      </ion-item>

      <ion-item>
        <ion-select
          v-model="frequency"
          :label="translate('Frequency')"
          label-placement="stacked"
          interface="popover"
        >
          <ion-select-option value="daily">{{ translate("Daily") }}</ion-select-option>
          <ion-select-option value="weekly">{{ translate("Weekly") }}</ion-select-option>
          <ion-select-option value="hourly">{{ translate("Hourly") }}</ion-select-option>
          <ion-select-option value="custom">{{ translate("Custom") }}</ion-select-option>
        </ion-select>
      </ion-item>

      <ion-item v-if="frequency === 'weekly'">
        <ion-select
          v-model="dayOfWeek"
          :label="translate('Day of week')"
          label-placement="stacked"
          interface="popover"
        >
          <ion-select-option v-for="day in daysOfWeek" :key="day.value" :value="day.value">
            {{ translate(day.label) }}
          </ion-select-option>
        </ion-select>
      </ion-item>

      <ion-item v-if="frequency === 'daily' || frequency === 'weekly'">
        <ion-input
          v-model="timeOfDay"
          type="time"
          :label="translate('Time')"
          label-placement="stacked"
        />
      </ion-item>

      <ion-item v-if="frequency === 'custom'">
        <ion-input
          v-model="customCron"
          :label="translate('Cron expression')"
          label-placement="stacked"
          placeholder="0 0 6 * * ?"
        />
      </ion-item>
    </ion-list>

    <p class="ion-padding-horizontal">
      <ion-text :color="cronDescription ? 'medium' : 'danger'">
        <small>{{ cronDescription || translate("Enter a valid schedule.") }}</small>
      </ion-text>
    </p>
  </ion-content>

  <ion-footer>
    <ion-toolbar>
      <ion-buttons slot="end">
        <ion-button :disabled="!canSchedule" @click="schedule()">
          <ion-icon slot="start" :icon="timeOutline" />
          {{ translate("Schedule") }}
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-footer>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTitle,
  IonToolbar,
  modalController
} from "@ionic/vue";
import { closeOutline, timeOutline } from "ionicons/icons";
import { computed, ref } from "vue";

import { translate } from "@common";
import { getCronString } from "@/utils";

const toEmailAddress = ref("");
const ccAddresses = ref("");
const frequency = ref("daily");
const dayOfWeek = ref("MON");
const timeOfDay = ref("06:00");
const customCron = ref("");

const daysOfWeek = [
  { value: "MON", label: "Monday" },
  { value: "TUE", label: "Tuesday" },
  { value: "WED", label: "Wednesday" },
  { value: "THU", label: "Thursday" },
  { value: "FRI", label: "Friday" },
  { value: "SAT", label: "Saturday" },
  { value: "SUN", label: "Sunday" }
];

// Build a Quartz cron (sec min hour day-of-month month day-of-week) from the picker.
const cronExpression = computed(() => {
  if (frequency.value === "custom") return customCron.value.trim();
  if (frequency.value === "hourly") return "0 0 * * * ?";
  const [hour = "0", minute = "0"] = (timeOfDay.value || "06:00").split(":");
  const h = Number(hour);
  const m = Number(minute);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  if (frequency.value === "weekly") return `0 ${m} ${h} ? * ${dayOfWeek.value}`;
  return `0 ${m} ${h} * * ?`; // daily
});

const cronDescription = computed(() => (cronExpression.value ? getCronString(cronExpression.value) : ""));

const isValidEmail = (value: string) =>
  value.split(",").map((part) => part.trim()).filter(Boolean).every((part) => /.+@.+\..+/.test(part));

const canSchedule = computed(() =>
  !!toEmailAddress.value.trim() && isValidEmail(toEmailAddress.value) && !!cronExpression.value && !!cronDescription.value
);

const closeModal = () => modalController.dismiss();

const schedule = () => {
  if (!canSchedule.value) return;
  modalController.dismiss(
    {
      toEmailAddress: toEmailAddress.value.trim(),
      ccAddresses: ccAddresses.value.trim(),
      cronExpression: cronExpression.value
    },
    "confirm"
  );
};
</script>
