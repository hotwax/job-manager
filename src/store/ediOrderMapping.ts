import { defineStore } from 'pinia';
import { defaultEdiMapping, type EdiMappingRow } from '@/utils/ediOrderMapping';
export interface RemoteOrderMapping { rows: EdiMappingRow[]; linesPath: string; sampleText: string; savedAt?: string }
// UI contract only. No endpoint exists yet: drafts are local to this browser.
export const useEdiOrderMappingStore = defineStore('ediOrderMappingDrafts', {
 state: () => ({ byRemote: {} as Record<string, RemoteOrderMapping>, unsavedRemoteId: "", discardVersion: 0 }),
 actions: {
  save(remoteId: string, draft: RemoteOrderMapping) {
   this.byRemote[remoteId] = { ...JSON.parse(JSON.stringify(draft)), savedAt: new Date().toISOString() };
  }
 }, persist: { pick: ["byRemote"] }
});
export const newOrderMapping = (): RemoteOrderMapping => ({ rows: defaultEdiMapping(), linesPath: 'lines', sampleText: '{}' });
