<template>
 <ion-card data-testid="edi-order-mapping">
  <ion-card-header><ion-card-title>{{ translate('EDI order mapping') }}</ion-card-title><ion-card-subtitle>{{ remoteId }} · {{ translate('Create sales order') }}</ion-card-subtitle></ion-card-header>
  <ion-card-content>
   <p>{{ translate('Map the JSON delivered by your EDI platform to an OMS sales order. Line fields repeat for every entry in the source array.') }}</p>
   <ion-segment v-model="tab" class="ion-margin-vertical">
    <ion-segment-button value="mapping"><ion-label>{{ translate('Field mapping') }}</ion-label></ion-segment-button>
    <ion-segment-button value="test"><ion-label>{{ translate('Test message') }}</ion-label></ion-segment-button>
   </ion-segment>
   <template v-if="tab === 'mapping'">
    <ion-input fill="outline" label-placement="stacked" :label="translate('Order lines array')" v-model="draft.linesPath" />
    <div class="mapping-table"  :aria-label="translate('Field mapping')">
     <div class="mapping-row mapping-heading" ><span>{{ translate('OMS field') }}</span><span>{{ translate('Value source') }}</span><span>{{ translate('Source path or value') }}</span><span>{{ translate('Transform') }}</span></div>
     <div v-for="row in draft.rows" :key="row.id" class="mapping-row" >
      <div><strong>{{ translate(row.label) }}</strong><ion-note v-if="row.required"> *</ion-note><p><code>{{ ediTargetPath(row) }}</code></p></div>
      <ion-select :aria-label="translate(row.label) + ' ' + translate('Value source')" interface="popover" v-model="row.mode"><ion-select-option value="source">{{ translate('Source field') }}</ion-select-option><ion-select-option value="constant">{{ translate('Fixed value') }}</ion-select-option></ion-select>
      <ion-input v-if="row.mode === 'source'" :aria-label="translate(row.label) + ' ' + translate('Source path')" fill="outline" v-model="row.source" />
      <ion-input v-else :aria-label="translate(row.label) + ' ' + translate('Fixed value')" fill="outline" v-model="row.constant" />
      <ion-select :aria-label="translate(row.label) + ' ' + translate('Transform')" interface="popover" v-model="row.transform"><ion-select-option value="none">{{ translate('None') }}</ion-select-option><ion-select-option value="number">{{ translate('Number') }}</ion-select-option><ion-select-option value="uppercase">{{ translate('Uppercase') }}</ion-select-option><ion-select-option v-if="row.lookup" value="lookup">{{ translate('Value map') }}</ion-select-option></ion-select>
     </div>
    </div>
   </template>
   <template v-else>
    <ion-textarea :label="translate('Sample platform message (JSON)')" label-placement="stacked" fill="outline" :rows="10" v-model="draft.sampleText" data-testid="edi-sample" />
    <ion-button @click="validate" data-testid="validate-edi">{{ translate('Validate mapping') }}</ion-button>
    <ion-text color="danger" v-if="parseError"><p role="alert">{{ parseError }}</p></ion-text>
    <EdiMappingResult v-if="result" :result="result" />
   </template>
   <div class="mapping-actions"><ion-note>{{ dirty ? translate('Unsaved mapping changes') : (store.byRemote[remoteId] ? translate('Mapping saved') : translate('Not saved yet')) }}</ion-note><ion-button fill="outline" :disabled="!dirty" @click="reset">{{ translate('Discard changes') }}</ion-button><ion-button :disabled="!dirty" @click="save" data-testid="save-edi-mapping">{{ translate('Save mapping draft') }}</ion-button></div>
  </ion-card-content>
 </ion-card>
</template>
<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonNote, IonSegment, IonSegmentButton, IonLabel, IonInput, IonSelect, IonSelectOption, IonTextarea, IonButton, IonText } from '@ionic/vue';
import { translate } from '@common';
import { useEdiOrderMappingStore, newOrderMapping } from '@/store/ediOrderMapping';
import { previewEdiOrder, ediTargetPath, type MappingResult } from '@/utils/ediOrderMapping';
import EdiMappingResult from './EdiMappingResult.vue';
const props = defineProps<{ remoteId: string }>();
const store = useEdiOrderMappingStore();
const draft = ref(newOrderMapping());
const baseline = ref('');
const tab = ref('mapping');
const result = ref<MappingResult | null>(null);
const parseError = ref('');
const dirty = computed(() => JSON.stringify(draft.value) !== baseline.value);
watch(dirty, value => { store.unsavedRemoteId = value ? props.remoteId : ''; });
watch(() => store.discardVersion, () => reset());
function beforeUnload(event: BeforeUnloadEvent) { if(dirty.value) {event.preventDefault();event.returnValue='';} }
onMounted(() => window.addEventListener('beforeunload', beforeUnload));
onUnmounted(() => window.removeEventListener('beforeunload', beforeUnload));
function reset() { draft.value = JSON.parse(JSON.stringify(store.byRemote[props.remoteId] || newOrderMapping())); baseline.value = JSON.stringify(draft.value); result.value = null; }
watch(() => props.remoteId, reset, { immediate: true });
watch(draft, () => { result.value = null; parseError.value = ''; }, { deep: true });
function validate() { try { result.value = previewEdiOrder(JSON.parse(draft.value.sampleText), draft.value.rows, draft.value.linesPath); parseError.value = ''; } catch { result.value = null; parseError.value = translate('Enter valid JSON before testing the mapping.'); } }
function save() { store.save(props.remoteId, draft.value); reset(); }
</script>
<style scoped>
.mapping-table { margin-top: 20px; }
.mapping-row { display:grid; grid-template-columns: minmax(170px, 1.5fr) minmax(110px, .8fr) minmax(160px, 1.4fr) minmax(100px, .8fr); gap:16px; align-items:center; padding:12px 0; border-bottom:1px solid var(--ion-color-light-shade); }
.mapping-row p { margin:4px 0 0; font-size:12px; overflow-wrap:anywhere; }
.mapping-heading { font-size:12px; color:var(--ion-color-medium); }
.mapping-actions { display:flex; align-items:center; gap:8px; margin-top:20px; flex-wrap:wrap; }
.mapping-actions ion-note { margin-right:auto; }
@media(max-width:700px) { .mapping-row {grid-template-columns:1fr 1fr;} .mapping-heading{display:none;} }
</style>
