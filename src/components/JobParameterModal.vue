<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>{{ runNow ? $t('Run now') : $t('Custom Parameters') }}</ion-title>
      <ion-buttons slot="end">
        <ion-button v-if="runNow" @click="confirmRunNow()" color="primary">{{ $t('Save') }}</ion-button>
        <ion-button @click="closeModal">{{ $t('Close') }}</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list v-if="customRequiredParameters.length || customOptionalParameters.length">
      <ion-item-group>
        <ion-item-divider v-if="customRequiredParameters.length" color="light">
          <ion-label>{{ $t('Required Parameters') }}</ion-label>
        </ion-item-divider>

        <ion-item :key="index" v-for="(parameter, index) in customRequiredParameters">
          <ion-label>{{ parameter.name }}</ion-label>
          <ion-input v-if="currentJob.statusId === 'SERVICE_DRAFT' || runNow" :placeholder="parameter.name" v-model="parameter.value" slot="end" />
          <ion-label v-else>{{ parameter.value }}</ion-label>
          <ion-note slot="helper">{{ parameter.type }}</ion-note>
        </ion-item>

        <ion-item-divider v-if="customOptionalParameters.length" color="light">
          <ion-label>{{ $t('Optional Parameters') }}</ion-label>
        </ion-item-divider>

        <ion-item :key="index" v-for="(parameter, index) in customOptionalParameters">
          <ion-label>{{ parameter.name }}</ion-label>
          <ion-input v-if="currentJob.statusId === 'SERVICE_DRAFT' || runNow" :placeholder="parameter.name" v-model="parameter.value" slot="end" />
          <ion-label v-else>{{ parameter.value }}</ion-label>
          <ion-note slot="helper">{{ parameter.type }}</ion-note>
        </ion-item>
      </ion-item-group>
    </ion-list>
    <ion-item v-else lines="none">
      <ion-label class="ion-text-center" >{{ $t('This job does not have any custom parameters.') }}</ion-label>
    </ion-item>
  </ion-content>
</template>

<script lang="ts">
import {
  IonButtons,
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonItemDivider,
  IonItemGroup,
  IonLabel,
  IonList,
  IonNote,
  IonTitle,
  IonToolbar,
  modalController,
  alertController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { closeOutline } from 'ionicons/icons';
import { useStore } from 'vuex';
import { generateJobCustomParameters, hasJobDataError } from '@/utils';

export default defineComponent({
  name: 'JobParameterModal',
  components: {
    IonButtons,
    IonButton,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonItemDivider,
    IonItemGroup,
    IonLabel,
    IonList,
    IonNote,
    IonTitle,
    IonToolbar,
  },
  props: ['currentJob', 'customRequiredParameters', 'customOptionalParameters', 'runNow'],
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true })
    },
    async confirmRunNow() {
      const jobAlert = await alertController.create({
        header: this.$t("Run now"),
        message: this.$t('Running this job now will not replace this job. A copy of this job will be created and run immediately. You may not be able to reverse this action.', { space: '<br/><br/>' }),
        buttons: [
          {
            text: this.$t("Cancel"),
            role: 'cancel',
          },
          {
            text: this.$t('Run now'),
            handler: () => {
              if (this.currentJob && !hasJobDataError(this.currentJob)) {
                // preparing the custom parameters those needs to passed with the job
                const jobCustomParameters = generateJobCustomParameters(this.customRequiredParameters, this.customOptionalParameters, this.currentJob.runtimeData)
                this.store.dispatch('job/runServiceNow', { job: this.currentJob, jobCustomParameters })
              }
              this.closeModal()
            }
          }
        ]
      });

      return jobAlert.present();
    }
  },
  setup() {
    const store = useStore();

    return {
      closeOutline,
      store
    };
  },
});
</script>