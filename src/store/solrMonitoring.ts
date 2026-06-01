import { defineStore } from "pinia";
import { api } from "@common";
import logger from "@/logger";

export const useSolrMonitoringStore = defineStore("solrmonitoring", {
  state: () => ({
    summary: {} as Record<string, any>,
    repairResults: [] as Array<any>,
    repairTotalFound: 0,
    rebuildOperation: {} as Record<string, any>,
    isLoading: false,
    isSearching: false,
    isRebuilding: false,
    lastLoadedAt: ""
  }),
  getters: {
    getSummary: (state: any) => state.summary,
    getOverview: (state: any) => state.summary.overview || {},
    getSystem: (state: any) => state.summary.system || {},
    getCollections: (state: any) => state.summary.collections || [],
    getPings: (state: any) => state.summary.pings || [],
    getMetrics: (state: any) => state.summary.metrics || {},
    getRawStatus: (state: any) => state.summary.rawStatus || {},
    getConfig: (state: any) => state.summary.config || {},
    getRepairResults: (state: any) => state.repairResults,
    getRepairTotalFound: (state: any) => state.repairTotalFound,
    getRebuildOperation: (state: any) => state.rebuildOperation
  },
  actions: {
    async fetchSummary() {
      this.isLoading = true;
      try {
        const resp = await api({
          url: "admin/solrMonitoring",
          method: "GET"
        });
        this.summary = resp.data || {};
        this.lastLoadedAt = new Date().toISOString();
      } catch (error) {
        logger.error("Failed to fetch Solr monitoring summary", error);
      } finally {
        this.isLoading = false;
      }
    },
    async searchDocuments(payload: { documentType: string; query: string; pageSize?: number }) {
      this.isSearching = true;
      try {
        const resp = await api({
          url: "admin/solrDocuments",
          method: "GET",
          params: {
            documentType: payload.documentType,
            query: payload.query,
            pageSize: payload.pageSize || 20
          }
        });
        this.repairResults = resp.data?.documents || [];
        this.repairTotalFound = resp.data?.totalFound || 0;
        return resp.data || {};
      } catch (error) {
        logger.error("Failed to search Solr repair documents", error);
        return {};
      } finally {
        this.isSearching = false;
      }
    },
    async startRebuild() {
      this.isRebuilding = true;
      try {
        const resp = await api({
          url: "admin/solrRebuilds",
          method: "POST"
        });
        this.rebuildOperation = resp.data || {};
        return resp.data || {};
      } catch (error) {
        logger.error("Failed to start Solr rebuild", error);
        return {};
      } finally {
        this.isRebuilding = false;
      }
    },
    async fetchRebuildStatus(jobRunId: string) {
      if(!jobRunId) return {};
      try {
        const resp = await api({
          url: `admin/solrRebuilds/${jobRunId}`,
          method: "GET"
        });
        this.rebuildOperation = resp.data?.operation || {};
        return this.rebuildOperation;
      } catch (error) {
        logger.error("Failed to fetch Solr rebuild status", error);
        return {};
      }
    },
    async reindexDocument(payload: { documentType: string; primaryId: string }) {
      try {
        const resp = await api({
          url: "admin/solrDocuments/reindex",
          method: "POST",
          data: {
            documentType: payload.documentType,
            primaryId: payload.primaryId
          }
        });
        return resp.data || {};
      } catch (error) {
        logger.error("Failed to reindex Solr document", error);
        return {};
      }
    }
  }
});
