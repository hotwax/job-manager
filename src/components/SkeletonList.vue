<template>
  <ion-list aria-hidden="true">
    <ion-item v-for="row in rows" :key="row" lines="none">
      <ion-label>
        <h3><ion-skeleton-text :animated="true" :style="{ width: titleWidths[(row - 1) % titleWidths.length] }" /></h3>
        <p><ion-skeleton-text :animated="true" :style="{ width: detailWidths[(row - 1) % detailWidths.length] }" /></p>
      </ion-label>
    </ion-item>
  </ion-list>
</template>

<script setup lang="ts">
import { IonItem, IonLabel, IonList, IonSkeletonText } from "@ionic/vue";

// Stands in for rows whose data has not arrived yet, so the space is already the right size when it
// does. It only sizes and shimmers: the caller decides when it shows and marks its region busy.
withDefaults(defineProps<{ rows?: number }>(), { rows: 3 });

// Varied so the placeholder reads as text, not as a repeating bar.
const titleWidths = ["60%", "45%", "70%"];
const detailWidths = ["40%", "55%", "35%"];
</script>
