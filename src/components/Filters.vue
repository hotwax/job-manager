<template>
  <ion-menu side="end" content-id="main-content" type="overlay">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ $t("Filters") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <section v-if="segmentSelected === 'history'">
          <ion-item>
            <ion-label class="ion-text-wrap">
              <p>
                {{ $t("Status") }}
              </p>
            </ion-label>
          </ion-item>
          <ion-item button v-for="(filter, index) in statusFilters" :key="index" @click="applyStatusFilters(filter)">
            <ion-icon slot="start" :ios="filter.iosIcon" :md="filter.mdIcon" />
            <ion-label>{{ $t(filter.name) }}</ion-label>
            <ion-checkbox slot="end" :checked="selectedStatusFilters.includes(filter.statusId)" />
          </ion-item>
        </section>

        <ion-item>
          <ion-label class="ion-text-wrap">
            <p>
              {{ $t("Category") }}
            </p>
          </ion-label>
        </ion-item>
        <ion-item button v-for="(filter, index) in categoryFilters" :key="index" @click="applyCategoryFilters(filter)">
          <ion-icon slot="start" :ios="filter.iosIcon" :md="filter.mdIcon" />
          <ion-label>{{ $t(filter.name) }}</ion-label>
          <ion-checkbox slot="end" :checked="selectedCategoryFilters.includes(filter.enumTypeId)" />
        </ion-item>

        <section v-if="getPinnedJobs.length > 0">
          <ion-item>
            <ion-label class="ion-text-wrap">
              <p>
                {{ $t("Pinned") }}
              </p>
            </ion-label>
          </ion-item>
          <ion-item button v-for="(job, index) in getPinnedJobs" :key="index" @click="applyPinnedJobFilters(job)">
            <ion-label>{{ getEnumName(job) }}</ion-label>
            <ion-checkbox slot="end" :checked="selectedPinnedJobs.includes(job)" />
          </ion-item>
        </section>
      </ion-list>
    </ion-content>
  </ion-menu>
</template>

<script lang="ts">
import {
  IonContent,
  IonHeader,
  IonList,
  IonMenu,
  IonTitle,
  IonToolbar,
  IonLabel,
  IonItem,
  IonIcon,
  IonCheckbox
} from "@ionic/vue";
import { defineComponent } from "vue";
import { pulseOutline, calendarNumberOutline, ticketOutline, albumsOutline, shirtOutline, settings, iceCreamOutline, libraryOutline, checkmarkDoneOutline, banOutline, closeOutline, compassOutline, sendOutline, filterOutline } from "ionicons/icons";
import { mapGetters, useStore } from 'vuex'

export default defineComponent({
  name: "Menu",
  components: {
    IonContent,
    IonHeader,
    IonList,
    IonMenu,
    IonTitle,
    IonToolbar,
    IonLabel,
    IonItem,
    IonIcon,
    IonCheckbox
  },
  props: ["segmentSelected", "queryString", "selectedPinnedJobs"],
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
        enumTypeId: "BROKERING_SYS_JOB"
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
        name: "Miscalleneous",
        iosIcon: libraryOutline,
        mdIcon: libraryOutline,
        enumTypeId: "MISC_SYS_JOB"
      },
    ];
    return {
      pulseOutline,
      calendarNumberOutline,
      ticketOutline,
      albumsOutline,
      shirtOutline,
      settings,
      iceCreamOutline,
      store,
      filterOutline,
      libraryOutline,
      checkmarkDoneOutline,
      banOutline,
      closeOutline,
      statusFilters,
      categoryFilters,
    };
  },
  data() {
    return {
      selectedFilters: {} as any,
      selectedStatusFilters: [] as Array<string>,
      selectedCategoryFilters: [] as Array<string>,
    }
  },
  computed: {
    ...mapGetters({
      getPipelineFilters: 'job/getPipelineFilters',
      getEnumDescription: 'job/getEnumDescription',
      getEnumName: 'job/getEnumName',
      getCurrentEComStore: 'user/getCurrentEComStore',
      getPinnedJobs: 'user/getPinnedJobs',
    })
  },
  methods: {
    handleSegmentChange() {
      this.segmentSelected === 'pending' ? this.getFilteredPendingJobs() :
      this.segmentSelected === 'running' ? this.getFilteredRunningJobs() :
      this.getFilteredJobHistory();
    },
    applyStatusFilters(filter: any) {
      const index = (this as any).selectedStatusFilters.indexOf(filter.statusId);
      if ((this as any).selectedStatusFilters.includes(filter.statusId)) {
        if (index != -1) {
          (this as any).selectedStatusFilters.splice(index, 1)
        }
      } else {
        (this as any).selectedStatusFilters.push(filter.statusId)
      }
      this.store.dispatch('job/setPipelineFilters', { status: this.selectedStatusFilters, category: this.selectedCategoryFilters});
      this.handleSegmentChange();
    },
    applyCategoryFilters(filter: any) {
      const index = (this as any).selectedCategoryFilters.indexOf(filter.enumTypeId);
      if ((this as any).selectedCategoryFilters.includes(filter.enumTypeId)) {
        if (index != -1) {
          (this as any).selectedCategoryFilters.splice(index, 1)
        }
      } else {
        (this as any).selectedCategoryFilters.push(filter.enumTypeId)
      }
      this.store.dispatch('job/setPipelineFilters', { status: this.selectedStatusFilters, category: this.selectedCategoryFilters});
      this.handleSegmentChange();
    },
    applyPinnedJobFilters(jobEnumId: any) {
      const index = (this as any).selectedPinnedJobs.indexOf(jobEnumId);
      if ((this as any).selectedPinnedJobs.includes(jobEnumId) || !this.getPinnedJobs.includes(jobEnumId)) {
        if (index != -1) {
          (this as any).selectedPinnedJobs.splice(index, 1)
        }
      } else {
        (this as any).selectedPinnedJobs.push(jobEnumId)
      }
      this.store.dispatch('job/setPipelineFilters', { status: this.selectedStatusFilters, category: this.selectedCategoryFilters});
      this.handleSegmentChange();
    },
    async getFilteredPendingJobs(viewSize = process.env.VUE_APP_VIEW_SIZE, viewIndex = '0') {
      await this.store.dispatch('job/fetchPendingJobs', { eComStoreId: this.getCurrentEComStore.productStoreId, viewSize, viewIndex, queryString: this.queryString, enumTypeId: this.selectedCategoryFilters, systemJobEnumId: this.selectedPinnedJobs, statusId: this.selectedStatusFilters });
    },
    async getFilteredRunningJobs(viewSize = process.env.VUE_APP_VIEW_SIZE, viewIndex = '0') {
      await this.store.dispatch('job/fetchRunningJobs', { eComStoreId: this.getCurrentEComStore.productStoreId, viewSize, viewIndex, queryString: this.queryString, enumTypeId: this.selectedCategoryFilters, systemJobEnumId: this.selectedPinnedJobs, statusId: this.selectedStatusFilters });
    },
    async getFilteredJobHistory(viewSize = process.env.VUE_APP_VIEW_SIZE, viewIndex = '0') {
      await this.store.dispatch('job/fetchJobHistory', { eComStoreId: this.getCurrentEComStore.productStoreId, viewSize, viewIndex, queryString: this.queryString, enumTypeId: this.selectedCategoryFilters, systemJobEnumId: this.selectedPinnedJobs, statusId: this.selectedStatusFilters });
    },
  },
  watch: {
    segmentSelected(val) {
      if (val) {
        console.log('segment',this.getPipelineFilters);
        this.handleSegmentChange();
      }
    }
  }
});
</script>

<style scoped>

</style>
