<template>
  <ion-menu side="end" content-id="main-content" type="overlay">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Filters") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <section v-if="segmentSelected === 'history'">
          <ion-item>
            <ion-label class="ion-text-wrap">
              <p>{{ translate("Status") }}</p>
            </ion-label>
          </ion-item>
          <ion-item button v-for="(filter, index) in statusFilters" :key="index" @click="applyFilter(filter.statusId, 'status')">
            <ion-icon slot="start" :ios="filter.iosIcon" :md="filter.mdIcon" />
            <ion-checkbox :checked="pipelineFilters.status.includes(filter.statusId)">
              <ion-label>{{ translate(filter.name) }}</ion-label>
            </ion-checkbox>
          </ion-item>
        </section>

        <section>
          <ion-item>
            <ion-label class="ion-text-wrap">
              <p>{{ translate("Category") }}</p>
            </ion-label>
          </ion-item>
          <ion-item button v-for="(filter, index) in categoryFilters" :key="index" @click="applyFilter(filter.enumTypeId, 'category')">
            <ion-icon slot="start" :ios="filter.iosIcon" :md="filter.mdIcon" />
            <ion-checkbox :checked="pipelineFilters.category.includes(filter.enumTypeId)">
              <ion-label>{{ translate(filter.name) }}</ion-label>
            </ion-checkbox>
          </ion-item>
        </section>

        <section v-if="pinnedJobs && pinnedJobs.length">
          <ion-item>
            <ion-label class="ion-text-wrap">
              <p>{{ translate("Pinned") }}</p>
            </ion-label>
          </ion-item>
          <ion-item button v-for="(job, index) in pinnedJobs" :key="index" @click="applyFilter(job, 'enum')">
            <ion-checkbox :checked="pipelineFilters.enum.includes(job)">
              {{ getEnumName(job) }}
            </ion-checkbox>
          </ion-item>
        </section>
      </ion-list>
    </ion-content>
  </ion-menu>
</template>

<script lang="ts">
import {
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import { defineComponent } from "vue";
import { albumsOutline, banOutline, calendarNumberOutline, checkmarkDoneOutline, closeOutline, compassOutline, filterOutline, iceCreamOutline, libraryOutline, pulseOutline, sendOutline, settings, shirtOutline, ticketOutline } from "ionicons/icons";
import { mapGetters, useStore } from 'vuex';
import { translate } from "@hotwax/dxp-components";

export default defineComponent({
  name: "Filters",
  components: {
    IonCheckbox,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonTitle,
    IonToolbar
  },
  props: ["segmentSelected", "queryString"],
  setup() {
    const store = useStore();
    const statusFilters = [
      {
        name: "Finished",
        statusId: "SERVICE_FINISHED",
        iosIcon: checkmarkDoneOutline,
        mdIcon: checkmarkDoneOutline,
      },
      {
        name: "Cancelled",
        statusId: "SERVICE_CANCELLED",
        iosIcon: banOutline,
        mdIcon: banOutline,
      },
      {
        name: "Failed",
        statusId: "SERVICE_FAILED",
        iosIcon: closeOutline,
        mdIcon: closeOutline,
      },
    ];
    const categoryFilters = [
      {
        name: "Orders",
        iosIcon: ticketOutline,
        mdIcon: ticketOutline,
        enumTypeId: "ORDER_SYS_JOB"
      },
      {
        name: "Pre-orders",
        iosIcon: calendarNumberOutline,
        mdIcon: calendarNumberOutline,
        enumTypeId: "PRE_ORD_SYS_JOB"
      },
      {
        name: "Inventory",
        iosIcon: albumsOutline,
        mdIcon: albumsOutline,
        enumTypeId: "INVENTORY_SYS_JOB"
      },
      {
        name: "Brokering",
        iosIcon: compassOutline,
        mdIcon: compassOutline,
        enumTypeId: "BROKER_SYS_JOB"
      },
      {
        name: "Fulfillment",
        iosIcon: sendOutline,
        mdIcon: sendOutline,
        enumTypeId: "FULFILLMENT_SYS_JOB"
      },
      {
        name: "Product",
        iosIcon: shirtOutline,
        mdIcon: shirtOutline,
        enumTypeId: "PRODUCT_SYS_JOB"
      },
      {
        name: "Miscellaneous",
        iosIcon: libraryOutline,
        mdIcon: libraryOutline,
        enumTypeId: "MISC_SYS_JOB"
      },
    ];
    return {
      albumsOutline,
      banOutline,
      calendarNumberOutline,
      checkmarkDoneOutline,
      categoryFilters,
      closeOutline,
      filterOutline,
      iceCreamOutline,
      libraryOutline,
      pulseOutline,
      settings,
      shirtOutline,
      statusFilters,
      store,
      ticketOutline,
      translate
    };
  },
  computed: {
    ...mapGetters({
      getEnumName: 'job/getEnumName',
      currentEComStore: 'user/getCurrentEComStore',
      pinnedJobs: 'user/getPinnedJobs',
      pipelineFilters: 'job/getPipelineFilters'
    })
  },
  unmounted() {
    this.store.dispatch('job/clearPipelineFilters');
  },
  methods: {
    applyFilter(value: any, type: string) {
      this.store.dispatch('job/setPipelineFilters', { type, value });

      this.segmentSelected === 'pending' ? this.getFilteredPendingJobs() :
      this.segmentSelected === 'running' ? this.getFilteredRunningJobs() :
      this.getFilteredJobHistory();
    },
    async getFilteredPendingJobs(viewSize = process.env.VUE_APP_VIEW_SIZE, viewIndex = '0') {
      await this.store.dispatch('job/fetchPendingJobs', { eComStoreId: this.currentEComStore.productStoreId, viewSize, viewIndex, queryString: this.queryString, enumTypeId: this.pipelineFilters.category, systemJobEnumId: this.pipelineFilters.enum, statusId: this.pipelineFilters.status });
    },
    async getFilteredRunningJobs(viewSize = process.env.VUE_APP_VIEW_SIZE, viewIndex = '0') {
      await this.store.dispatch('job/fetchRunningJobs', { eComStoreId: this.currentEComStore.productStoreId, viewSize, viewIndex, queryString: this.queryString, enumTypeId: this.pipelineFilters.category, systemJobEnumId: this.pipelineFilters.enum, statusId: this.pipelineFilters.status });
    },
    async getFilteredJobHistory(viewSize = process.env.VUE_APP_VIEW_SIZE, viewIndex = '0') {
      await this.store.dispatch('job/fetchJobHistory', { eComStoreId: this.currentEComStore.productStoreId, viewSize, viewIndex, queryString: this.queryString, enumTypeId: this.pipelineFilters.category, systemJobEnumId: this.pipelineFilters.enum, statusId: this.pipelineFilters.status });
    },
  },
});
</script>