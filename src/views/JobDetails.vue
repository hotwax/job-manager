<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start" />
        <ion-title>{{ $t("Job details") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <JobConfiguration :title="this.title" :job="currentJob" :status="status" :type="type" :key="currentJob"/>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBackButton,  
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar
} from '@ionic/vue';
import { defineComponent } from 'vue';
import JobConfiguration from '@/components/JobConfiguration.vue';

export default defineComponent({
  name: 'JobDetails',
  components: {
    IonBackButton,
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    JobConfiguration
  },
  props: ["job", "title", "status", "type"],
  data(){
    return{
      currentJob: JSON.parse((this as any).$route.params.job)
    }
  },
  mounted(){
    console.log(this.job, this.title, this.status, this.type)
    console.log(this.$route)
    console.log(this.currentJob)
  }
});
</script>