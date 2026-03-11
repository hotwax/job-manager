<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal()">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Create Job") }}</ion-title>
    </ion-toolbar>
    <ion-progress-bar :value="currentStep / totalSteps"></ion-progress-bar>
  </ion-header>

  <ion-content class="ion-padding">
    <form ref="jobForm" @submit.prevent="saveJob">
      <!-- Step 1: Core Details -->
      <div v-if="currentStep === 1">
        <ion-list>
            <ion-input
              id="job-name-input"
              v-model="jobData.name"
              :label="translate('Name')"
              label-placement="floating"
              fill="outline"
              :required="true"
              :error-text="isNameUnique ? translate('Field is required') : translate('Job name must be unique')"
              :class="{ 'ion-invalid': !isNameUnique && jobData.name }"
            ></ion-input>
            <br>
            <ion-textarea
              v-model="jobData.description"
              :label="translate('Description')"
              label-placement="floating"
              fill="outline"
              :auto-grow="true"
            ></ion-textarea>
            <br>
            <ion-select
              v-model="jobData.primaryCategory"
              :label="translate('Primary Category')"
              label-placement="floating"
              fill="outline"
              :required="true"
              :error-text="translate('Field is required')"
            >
              <ion-select-option v-for="category in categories" :key="category.productCategoryId" :value="category.productCategoryId">
                {{ category.categoryName }}
              </ion-select-option>
            </ion-select>
            <br>
            <ion-input
              v-model="jobData.service"
              :label="translate('Service')"
              label-placement="floating"
              fill="outline"
              placeholder="com.hotwax.example.Service"
              :required="true"
              :error-text="translate('Field is required')"
            ></ion-input>
            <br>
            <ion-input
              v-model="jobData.cronExpression"
              :label="translate('Cron Expression')"
              label-placement="floating"
              fill="outline"
              placeholder="0 0/15 * * * ?"
            ></ion-input>
            <p v-if="jobData.cronExpression" class="ion-margin-horizontal">
              <ion-label color="medium">{{ getCronString(jobData.cronExpression) }}</ion-label>
            </p>
        </ion-list>
      </div>

      <!-- Step 2: Custom Parameters -->
      <div v-if="currentStep === 2">
        <div v-if="jobData.parameters.length > 0">
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
                    label-placement="floating"
                    fill="outline"
                    :placeholder="translate('Key')"
                    :required="true"
                    :error-text="translate('Field is required')"
                  ></ion-input>
                  <ion-input
                    v-model="param.value"
                    :label="translate('Value')"
                    label-placement="floating"
                    fill="outline"
                    :placeholder="translate('Value')"
                    :required="true"
                    :error-text="translate('Field is required')"
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
        </div>

        <div v-else class="ion-text-center ion-padding">
          <p>{{ translate("No custom parameters, setup complete.") }}</p>
          <ion-button @click="saveJob()">
            {{ translate("Confirm & Create") }}
          </ion-button>
        </div>
      </div>
    </form>
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
import { defineComponent, ref, computed } from 'vue';
import { addOutline, closeOutline, trashOutline } from 'ionicons/icons';
import { translate } from '@common';
import { getCronString } from '@/utils';
import { serviceInParameters } from '@/mock/serviceInParameters';

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
    },
    existingJobNames: {
      type: Array as () => string[],
      default: () => []
    }
  },
  setup(props) {
    const currentStep = ref(1);
    const totalSteps = 2;
    const jobForm = ref<any>(null);

    const isNameUnique = computed(() => {
      if (!jobData.value.name) return true;
      return !props.existingJobNames.includes(jobData.value.name);
    });

    const validateForm = () => {
      if (jobForm.value) {
        const inputs = jobForm.value.querySelectorAll('ion-input, ion-select, ion-textarea');
        inputs.forEach((input: any) => {
          input.classList.add('ion-touched');
          // Manually trigger the invalid state if the component is required and has no value
          if (input.required && !input.value) {
            input.classList.add('ion-invalid');
          } else if (input.id === 'job-name-input' && !isNameUnique.value) {
             input.classList.add('ion-invalid');
          } else {
            input.classList.remove('ion-invalid');
          }
        });
      }
      return jobForm.value?.reportValidity() && isNameUnique.value;
    };

    const jobData = ref({
      name: '',
      description: '',
      primaryCategory: '',
      service: '',
      cronExpression: '',
      parameters: [{ key: '', value: '' }] as any[]
    });

    const closeModal = () => modalController.dismiss();

    const nextStep = () => {
      if (validateForm()) {
        if (currentStep.value === 1) {
          // Fetch parameters for the service
          const params = serviceInParameters[jobData.value.service] || [];
          if (params.length > 0) {
            jobData.value.parameters = params.map(p => ({ key: p, value: '' }));
          } else {
            jobData.value.parameters = [];
          }
          currentStep.value++;
        } else if (currentStep.value < totalSteps) {
          currentStep.value++;
        }
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
      if (validateForm()) {
        modalController.dismiss(jobData.value, 'confirm');
      }
    };

    return {
      addOutline,
      closeOutline,
      currentStep,
      jobData,
      jobForm,
      totalSteps,
      trashOutline,
      addParameter,
      closeModal,
      nextStep,
      prevStep,
      removeParameter,
      saveJob,
      translate,
      getCronString,
      isNameUnique
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
