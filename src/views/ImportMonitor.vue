<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Import monitor") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
    
        <div class="header ion-padding">
            <div class="title">
                <h1>Bulk Import Monitor</h1>
                <p>Real-time status of data ingestion queues.</p>
            </div>
            <ion-button fill="clear">
                <ion-icon slot="icon-only" :icon="refreshOutline" />
            </ion-button>
        </div>
    
      <div class="queues">
        <ion-card v-for="queue in queues" :key="queue.id">
          <ion-card-header>
            <div class="queue-header">
              <ion-card-title>{{ queue.name }}</ion-card-title>
              <ion-badge :color="getPriorityColor(queue.priority)">{{ queue.priority }}</ion-badge>
            </div>
          </ion-card-header>

          <ion-card-content>
            <p>{{ queue.description }}</p>
            <ion-item lines="none">
              <ion-label>
                <h2>{{ queue.pendingFiles }}</h2>
                <p>{{ translate("Pending files") }}</p>
              </ion-label>
              <ion-label slot="end" class="ion-text-end">
                <h2>{{ queue.avgSpeed }}</h2>
                <p>{{ translate("Avg. speed/file") }}</p>
              </ion-label>
            </ion-item>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBadge,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon
} from '@ionic/vue';
import { defineComponent, ref } from 'vue';
import { translate } from '@hotwax/dxp-components';
import { refreshOutline } from 'ionicons/icons';

export default defineComponent({
  name: 'ImportMonitor',
  components: {
    IonBadge,
    IonCard,
    IonCardContent,
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
    IonButton,
    IonIcon
  },
  setup() {
    const queues = ref([
      {
        id: 'q1',
        name: 'High Priority Queue',
        priority: 'High',
        description: 'Queue for processing critical real-time updates.',
        pendingFiles: 142,
        avgSpeed: '1.2s'
      },
      {
        id: 'q2',
        name: 'Bulk Import Queue',
        priority: 'Medium',
        description: 'Handles daily inventory and product updates.',
        pendingFiles: 3500,
        avgSpeed: '0.8s'
      },
      {
        id: 'q3',
        name: 'Legacy Sync',
        priority: 'Low',
        description: 'Background synchronization for legacy systems.',
        pendingFiles: 45,
        avgSpeed: '2.5s'
      }
    ]);

    const getPriorityColor = (priority: string) => {
      switch (priority.toLowerCase()) {
        case 'high': return 'danger';
        case 'medium': return 'warning';
        case 'low': return 'success';
        default: return 'medium';
      }
    };

    return {
      getPriorityColor,
      queues,
      refreshOutline,
      translate
    }
  }
});
</script>

<style scoped>

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.queues {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 16px;
}

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

ion-card {
  margin: 0;
}
</style>
