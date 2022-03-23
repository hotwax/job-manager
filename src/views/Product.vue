<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Product") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section>
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Sync") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-label>{{ $t("Import products") }}</ion-label>
              <ion-item detail @click="openJobConfiguration('IMP_PRDTS', 'Import products')">
                <ion-label>{{ getJobStatus('IMP_PRDTS') }} </ion-label>
              </ion-item>
            </ion-item>
            <ion-item>
              <ion-label>{{ $t("Sync products") }}</ion-label>
              <ion-item detail @click="openJobConfiguration('SYNC_PRDTS', 'Sync products')">
                <ion-label>{{ getJobStatus('SYNC_PRDTS') }} </ion-label>
              </ion-item>
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap"><p>{{ $t("Sync products and category structures from Shopify into HotWax Commerce and keep them up to date.") }}</p></ion-label>
            </ion-item>
          </ion-card>
        </section>

        <aside class="desktop-only" v-show="currentJobEnum">
          <JobDetail :title="title" :jobEnum="currentJobEnum" :key="currentJobEnum"/>
        </aside>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { mapGetters, useStore } from 'vuex';
import JobDetail from '@/components/JobDetail.vue'

export default defineComponent({
  name: 'Product',
  components: {
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonMenuButton,
    IonPage,
    IonTitle,
    IonToolbar,
    JobDetail
  },
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus'
    }),
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_PRD_JOB_ENUMS as string) as any,
      currentJobEnum: 'IMP_PRDTS',
      title: 'Import products'
    }
  },
  mounted () {
    this.store.dispatch("job/fetchJobs", {
      "inputFields":{
        "systemJobEnumId": Object.values(this.jobEnums),
        "systemJobEnumId_op": "in"
      }
    });
  },
  methods: {
    openJobConfiguration(enumId: string, title: string) {
      this.currentJobEnum = enumId
      this.title = title
    }
  },
  setup() {
    const customPopoverOptions: any = {
      header: 'Schedule product sync',
      showBackdrop: false
    }
    const store = useStore();
    return {
      customPopoverOptions,
      store
    }
  }
});
</script>
