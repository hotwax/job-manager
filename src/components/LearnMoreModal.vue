<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal()">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Learn more") }}</ion-title>
      <ion-buttons slot="end">
        <ion-button fill="clear" color="medium" @click="redirectToJobsDoc()">
          <ion-icon slot="icon-only" :icon="openOutline" />
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <div class="empty-state" v-if="isGeneratingAnswer">
      <ion-item lines="none">
        <ion-spinner name="crescent" slot="start" />
        {{ translate("Generating answer...") }}
      </ion-item>
    </div>

    <div class="empty-state" v-else-if="!Object.keys(askResponse).length">
      <ion-item lines="none">
        <p>{{ translate("The job details is not generating, please try again later.") }}</p>
      </ion-item>
    </div>
    
    <div v-else>
      <ion-item lines="full" class="ion-margin-top">
        <ion-label>
          {{ queryString }}
          <p>{{ currentJob?.systemJobEnumId }}</p>  
        </ion-label>
      </ion-item>

      <ion-list>
        <ion-item lines="none">
          <ion-label>{{ translate("Sources") }}</ion-label>
        </ion-item>
        <ion-row class="ion-padding" v-for="section in jobSection" :key="section.id">
          <ion-chip outline @click="redirectToDoc(section)">
            <ion-label>{{ section.title }}</ion-label>
            <ion-icon :icon="openOutline" />
          </ion-chip>
        </ion-row>
      </ion-list>
  
      <ion-item>
        <ion-label>
          <p class="overline">{{ translate("Summary") }}</p>
          {{ askResponse?.text }}
        </ion-label>
      </ion-item>
    </div>
  </ion-content>
</template>

<script lang="ts">
import { IonButton, IonButtons, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonRow, IonSpinner, IonTitle, IonToolbar, modalController } from "@ionic/vue";
import { closeOutline, openOutline } from 'ionicons/icons'
import { translate } from '@hotwax/dxp-components';
import { defineComponent } from "vue";
import { hasError } from '@/utils'
import { askQuery, searchQuery } from "@/adapter";
import logger from "@/logger";

export default defineComponent({
  name: "LearnMoreModal",
  components: {
    IonButton,
    IonButtons,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonRow,
    IonSpinner,
    IonTitle,
    IonToolbar
  },
  data() {
    return {
      queryString: '',
      askResponse: {} as any,
      jobSection: {} as any,
      isGeneratingAnswer: true
    }
  },
  props: ["currentJob"],
  mounted() {
    this.askQuery();
  },
  methods: {
    async searchQuery(pageIds: any) {
      let items = [] as any;
      this.jobSection = [];
      try {
        const resp = await searchQuery({
          queryString: this.currentJob?.enumName,
          spaceId: process.env.VUE_APP_SPACE_ID,
          baseURL: process.env.VUE_APP_GITBOOK_BASE_URL,
          token: process.env.VUE_APP_GITBOOK_API_KEY
        });
        if(!hasError(resp)) {
          items = resp.data.items;
          pageIds.forEach((pageId: any) => {
            const filteredPage = items.find((item: any) => item.id === pageId);
            if (filteredPage) {
              this.jobSection.push(...filteredPage.sections);
            }
          });
          this.isGeneratingAnswer = false;
        } else {
          throw resp.data;
        }
      } catch(error: any) {
        logger.error(error);
        this.isGeneratingAnswer = false;
      }
    },
    async askQuery() {
      this.queryString = `What does ${this.currentJob?.enumName} job do?`;
      try {
        const resp = await askQuery({ 
          queryString: this.queryString,
          spaceId: process.env.VUE_APP_SPACE_ID,
          baseURL: process.env.VUE_APP_GITBOOK_BASE_URL,
          token: process.env.VUE_APP_GITBOOK_API_KEY
        });
        if(!hasError(resp)) {
          this.askResponse = resp.data.answer;
          if(this.askResponse) {
            const pageIds = this.askResponse?.sources.map((source: any) => source.page);
            this.searchQuery(pageIds);
          } else {
            this.isGeneratingAnswer = false;
          }
        } else {
          throw resp.data;
        }
      } catch(error: any) {
        logger.error(error);
        this.isGeneratingAnswer = false;
      }
    },
    async redirectToDoc(section: any) {
      window.open(`https://docs.hotwax.co/documents/retail-operations/${section.path}`, "_blank", "noopener, noreferrer")
    },
    async redirectToJobsDoc() {
      window.open(`${process.env.VUE_APP_GITBOOK_JOBS_DOCS_URL}`, "_blank", "noopener, noreferrer")
    },
    async closeModal() {
      modalController.dismiss({ dismissed: true });
    }
  },
  setup() {
    return {
      closeOutline, 
      openOutline,
      translate
    };
  }
})
</script>
