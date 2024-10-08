<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal()">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate('Learn more.') }}</ion-title>
      <ion-button slot="end" fill="clear" @click="redirectToJobsDoc()">
        <ion-icon  color="dark" :icon="openOutline" />
      </ion-button>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <div class="empty-state" v-if="isGenratingAnswer">
      <ion-item lines="none">
        <ion-spinner name="crescent" slot="start" />
        {{ translate("Genrating answer...") }}
      </ion-item>
    </div>

    <div class="empty-state" v-else-if="!askResponse">
      <ion-item lines="none">
        <p>{{ translate("The job details is not generating, please try again later.") }}</p>
      </ion-item>
    </div>
    
    <div v-else>
      <ion-item class="ion-margin-top">
        <ion-label>
          {{ queryString }}
          <p>{{  currentJob?.systemJobEnumId }}</p>  
        </ion-label>
      </ion-item>

      <ion-list>
        <ion-item lines="none">
          <ion-label>Sources</ion-label>
        </ion-item>
        <ion-item v-for="section in jobSection" :key="section.id" lines="none">
          <ion-chip @click="redirectToDoc(section)">
            <ion-label>{{ section.title }}</ion-label>
            <ion-icon :icon="openOutline" />
          </ion-chip>
        </ion-item>
      </ion-list>
  
      <ion-item>
        <ion-label>
          <p class="overline">Summary</p>
          {{ askResponse?.text }}
        </ion-label>
      </ion-item>
    </div>
  </ion-content>
</template>

<script lang="ts">
import { IonButton, IonButtons, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonSpinner, IonTitle, IonToolbar, modalController } from "@ionic/vue";
import { closeOutline, openOutline } from 'ionicons/icons'
import { translate } from '@hotwax/dxp-components';
import { defineComponent } from "vue";
import { hasError } from '@/utils'
import { askQuery, searchQuery } from "@/adapter";

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
    IonSpinner,
    IonList,
    IonTitle,
    IonToolbar
  },
  data() {
    return {
      queryString: '',
      askResponse: {} as any,
      jobSection: {} as any,
      isGenratingAnswer: true
    }
  },
  props: ['currentJob'],
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
          this.isGenratingAnswer = false;
        } else {
          throw resp.data;
        }
      } catch(error: any) {
        console.error(error);
        this.isGenratingAnswer = false;
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
            this.isGenratingAnswer = false;
          }
        } else {
          throw resp.data;
        }
      } catch(error: any) {
        console.error(error);
        this.isGenratingAnswer = false;
      }
    },
    async redirectToDoc(section: any) {
      window.open(`https://docs.hotwax.co/documents/retail-operations/${section.path}`, "_blank")
    },
    async redirectToJobsDoc() {
      window.open(`${process.env.VUE_APP_GITBOOK_JOBS_DOCS_URL}`, "_blank")
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