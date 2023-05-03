<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Custom frequency") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <!-- Empty state -->
    <div class="empty-state" v-if="customFrequencies && customFrequencies.length === 0">
      <p>{{ $t("No frequency found")}}</p>
    </div>

    <!-- Frequencies -->
    <div v-else>
      <ion-list>
        <ion-radio-group v-model="frequencyId">
          <ion-item :key="customFrequency && customFrequency.tempExprId" v-for="customFrequency in customFrequencies">
            <ion-label>{{ customFrequency.description }}</ion-label>
            <ion-radio :value="customFrequency.tempExprId" slot="start" />
          </ion-item>
        </ion-radio-group>
      </ion-list>
    </div>
    
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button :disabled="!frequencyId" @click="setFrequency">
        <ion-icon :icon="save" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script lang="ts">
import { 
  IonButtons,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonItem,
  IonIcon,
  IonLabel,
  IonList,
  IonRadioGroup,
  IonRadio,
  IonTitle,
  IonToolbar,
  modalController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { closeOutline, save } from "ionicons/icons";
import { useStore } from "@/store";

export default defineComponent({
  name: "CustomFrequencyModal",
  components: { 
    IonButtons,
    IonButton,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonRadioGroup,
    IonRadio,
    IonTitle,
    IonToolbar 
  },
  data() {
    return {
      frequencyId: '',
      customFrequencies: [] as any
    }
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    async findFrequencies() {
      this.customFrequencies = await this.store.dispatch("job/findFrequency");
    },
    async setFrequency() {
      modalController.dismiss({ dismissed: true, frequencyId: this.frequencyId });
    }
  },
  async mounted () {
    await this.findFrequencies();
  },
  setup() {
    const store = useStore();
    return {
      closeOutline,
      save,
      store
    };
  }
});
</script>
