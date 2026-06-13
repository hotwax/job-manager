<template>
  <div class="catalog-grid">
    <ion-card v-for="index in count" :key="index">
      <ion-card-header>
        <ion-card-title>
          <ion-skeleton-text animated style="width: 60%" />
        </ion-card-title>
        <ion-skeleton-text animated style="width: 40%" />
      </ion-card-header>
      <ion-card-content>
        <ion-item lines="none">
          <ion-label>
            <ion-skeleton-text animated style="width: 80%" />
            <p><ion-skeleton-text animated style="width: 55%" /></p>
          </ion-label>
        </ion-item>
      </ion-card-content>
    </ion-card>
  </div>
</template>

<script setup lang="ts">
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonSkeletonText
} from "@ionic/vue";

withDefaults(defineProps<{
  count?: number;
}>(), {
  count: 6
});
</script>
