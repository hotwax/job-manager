<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal()">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Select service") }}</ion-title>
    </ion-toolbar>
    <ion-toolbar>
      <ion-searchbar
        :value="queryString"
        @ionInput="queryString = ($event as any).detail.value || ''"
        :debounce="200"
        :placeholder="translate('Search by package, file, or service name')"
      />
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list v-if="matchingGroups.length" lines="full">
      <template v-for="group in matchingGroups" :key="group.path">
        <ion-list-header>
          <ion-label>
            <p class="overline">{{ group.namespace }}</p>
            {{ group.fileName }}
          </ion-label>
        </ion-list-header>
        <ion-item v-for="service in group.services" :key="service.name" button :detail="false" @click="selectService(service.name)">
          <ion-icon slot="start" :icon="service.name === currentValue ? checkmarkCircleOutline : ellipseOutline" :color="service.name === currentValue ? 'primary' : 'medium'" />
          <ion-label class="ion-text-wrap">
            {{ service.label }}
            <p>{{ service.name }}</p>
          </ion-label>
        </ion-item>
      </template>
    </ion-list>

    <div v-else class="ion-text-center ion-padding">
      <p>{{ translate("No service matches this search.") }}</p>
      <ion-button v-if="queryString.trim()" fill="outline" size="small" @click="selectService(queryString.trim())">
        {{ translate("Use this service name") }}
      </ion-button>
    </div>

    <!-- The instance exposes no service catalog, so this list is what jobs already run. -->
    <p class="ion-padding ion-text-center source-note">
      {{ translate("Showing services already used by jobs on this instance. A service that is not listed can still be typed in directly.") }}
    </p>
  </ion-content>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  modalController
} from "@ionic/vue";
import { computed, ref } from "vue";
import { checkmarkCircleOutline, closeOutline, ellipseOutline } from "ionicons/icons";
import { translate } from "@common";

const props = defineProps({
  serviceNames: {
    type: Array as () => string[],
    default: () => []
  },
  currentValue: {
    type: String,
    default: ""
  }
});

const queryString = ref("");

// A Moqui service name reads package.path.ServiceFile.verb#Noun, so the last dot splits
// the service itself from the file it lives in, and the file's package is its namespace.
const parseServiceName = (name: string) => {
  const lastDot = name.lastIndexOf(".");
  const path = lastDot > 0 ? name.slice(0, lastDot) : name;
  const label = lastDot > 0 ? name.slice(lastDot + 1) : name;
  const fileDot = path.lastIndexOf(".");
  return {
    name,
    label,
    path,
    namespace: fileDot > 0 ? path.slice(0, fileDot) : "",
    fileName: fileDot > 0 ? path.slice(fileDot + 1) : path
  };
};

// _NA_ is the placeholder left on jobs whose service is unset; it is not selectable.
const parsedServices = computed(() => props.serviceNames
  .filter((name: string) => name && name !== "_NA_")
  .map(parseServiceName)
  .sort((first, second) => first.name.localeCompare(second.name)));

const matchingGroups = computed(() => {
  const query = queryString.value.trim().toLowerCase();
  const matches = query
    ? parsedServices.value.filter((service) => service.name.toLowerCase().includes(query))
    : parsedServices.value;

  const groups: Array<any> = [];
  matches.forEach((service) => {
    const current = groups[groups.length - 1];
    if (current?.path === service.path) {
      current.services.push(service);
    } else {
      groups.push({ path: service.path, namespace: service.namespace, fileName: service.fileName, services: [service] });
    }
  });
  return groups;
});

const selectService = (serviceName: string) => modalController.dismiss(serviceName, "confirm");

const closeModal = () => modalController.dismiss();
</script>

<style scoped>
.source-note {
  color: var(--ion-color-medium);
}
</style>
