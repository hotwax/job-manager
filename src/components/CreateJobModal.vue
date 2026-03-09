<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="end">
        <ion-button @click="closeModal()">
          <ion-icon :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Create Job") }}</ion-title>
    </ion-toolbar>
    <ion-progress-bar :value="currentStep / totalSteps"></ion-progress-bar>
  </ion-header>

  <ion-content class="ion-padding">
    <!-- Step 1: Core Details -->
    <div v-show="currentStep === 1">
      <ion-list>
        <ion-item>
          <ion-input
            v-model="jobData.name"
            :label="translate('Name')"
            label-placement="stacked"
            fill="outline"
            :placeholder="translate('Job name')"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-textarea
            v-model="jobData.description"
            :label="translate('Description')"
            label-placement="stacked"
            fill="outline"
            :placeholder="translate('Job description')"
          ></ion-textarea>
        </ion-item>
        <ion-item>
          <ion-select
            v-model="jobData.primaryCategory"
            :label="translate('Primary Category')"
            label-placement="stacked"
            fill="outline"
            :placeholder="translate('Select Category')"
          >
            <ion-select-option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-input
            v-model="jobData.service"
            :label="translate('Service')"
            label-placement="stacked"
            fill="outline"
            placeholder="com.hotwax.example.Service"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-input
            v-model="jobData.cronExpression"
            :label="translate('Cron Expression')"
            label-placement="stacked"
            fill="outline"
            placeholder="0 0/15 * * * ?"
          ></ion-input>
        </ion-item>
      </ion-list>
    </div>

    <!-- Step 2: Custom Parameters -->
    <div v-show="currentStep === 2">
      <ion-list>
        <ion-list-header>
          <ion-label>{{ translate("Custom Parameters") }}</ion-label>
          <ion-button fill="clear" @click="addParameter()">
            <ion-icon slot="icon-only" :icon="addOutline"></ion-icon>
          </ion-button>
        </ion-list-header>
        <ion-item-sliding v-for="(param, index) in jobData.parameters" :key="index">
          <ion-item>
            <div class="parameter-inputs">
              <ion-input
                v-model="param.key"
                :label="translate('Key')"
                label-placement="stacked"
                fill="outline"
                :placeholder="translate('Key')"
              ></ion-input>
              <ion-input
                v-model="param.value"
                :label="translate('Value')"
                label-placement="stacked"
                fill="outline"
                :placeholder="translate('Value')"
              ></ion-input>
            </div>
          </ion-item>
          <ion-item-options side="end">
            <ion-item-option color="danger" @click="removeParameter(index)">
              <ion-icon slot="icon-only" :icon="trashOutline"></ion-icon>
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>
      <p v-if="jobData.parameters.length === 0" class="ion-text-center ion-padding">
        {{ translate("No custom parameters added.") }}
      </p>
    </div>
  </ion-content>

  <ion-footer>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button v-if="currentStep > 1" @click="prevStep()">
          {{ translate("Back") }}
        </ion-button>
        <ion-button v-else color="medium" @click="closeModal()">
          {{ translate("Cancel") }}
        </ion-button>
      </ion-buttons>
      <ion-buttons slot="end">
        <ion-button v-if="currentStep < totalSteps" color="primary" @click="nextStep()">
          {{ translate("Next") }}
        </ion-button>
        <ion-button v-else color="primary" @click="saveJob()">
          {{ translate("Create") }}
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-footer>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonListHeader,
  IonProgressBar,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
  modalController
} from '@ionic/vue';
import { defineComponent, ref } from 'vue';
import { addOutline, closeOutline, trashOutline } from 'ionicons/icons';
import { translate } from '@common';

export default defineComponent({
  name: 'CreateJobModal',
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonItemOption,
    IonItemOptions,
    IonItemSliding,
    IonLabel,
    IonList,
    IonListHeader,
    IonProgressBar,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonTitle,
    IonToolbar
  },
  props: {
    categories: {
      type: Array as any,
      required: true
    }
  },
  setup() {
    const currentStep = ref(1);
    const totalSteps = 2;

    const jobData = ref({
      name: '',
      description: '',
      primaryCategory: '',
      service: '',
      cronExpression: '',
      parameters: [] as any[]
    });

    const closeModal = () => modalController.dismiss();

    const nextStep = () => {
      if (currentStep.value < totalSteps) {
        currentStep.value++;
      }
    };

    const prevStep = () => {
      if (currentStep.value > 1) {
        currentStep.value--;
      }
    };

    const addParameter = () => {
      jobData.value.parameters.push({ key: '', value: '' });
    };

    const removeParameter = (index: number) => {
      jobData.value.parameters.splice(index, 1);
    };

    const saveJob = () => {
      modalController.dismiss(jobData.value, 'confirm');
    };

    return {
      addOutline,
      closeOutline,
      currentStep,
      jobData,
      totalSteps,
      trashOutline,
      addParameter,
      closeModal,
      nextStep,
      prevStep,
      removeParameter,
      saveJob,
      translate
    };
  }
});
</script>

<style scoped>
.parameter-inputs {
  display: flex;
  gap: 8px;
  width: 100%;
}

.parameter-inputs ion-input {
  flex: 1;
}

ion-item {
  margin-top: 8px;
}
</style>
