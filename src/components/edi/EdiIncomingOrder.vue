<template><ion-card v-if="mapping"><ion-card-header><ion-card-title>{{ translate('Incoming order preview') }}</ion-card-title></ion-card-header><ion-card-content><p>{{ translate('Uses the mapping saved for this remote. No order is created.') }}</p><ion-note>{{ remoteId }}</ion-note><EdiMappingResult v-if="result" :result="result" compact /><ion-text v-else color="danger">{{ translate('The incoming message is not valid JSON.') }}</ion-text></ion-card-content></ion-card></template>
<script setup lang="ts">
import { computed } from 'vue';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonNote, IonText } from '@ionic/vue';
import { translate } from '@common';
import { useEdiOrderMappingStore } from '@/store/ediOrderMapping';
import { previewEdiOrder } from '@/utils/ediOrderMapping';
import EdiMappingResult from './EdiMappingResult.vue';
const props = defineProps<{ remoteId: string; messageText: string }>();
const store = useEdiOrderMappingStore();
const mapping = computed(() => store.byRemote[props.remoteId]);
const result = computed(() => { try { return mapping.value ? previewEdiOrder(JSON.parse(props.messageText), mapping.value.rows, mapping.value.linesPath) : null; } catch { return null; } });
</script>
