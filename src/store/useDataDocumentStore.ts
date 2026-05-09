import { api } from "@common";
import { defineStore } from "pinia";

import logger from "@/logger";

const API_ENDPOINTS = {
  dataDocuments: "moqui/dataDocuments",
  exports: "admin/dataDocuments",
  preview: "oms/dataDocumentView"
};

const getCollection = (response: any, fallbackKey?: string) => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (fallbackKey && Array.isArray(data?.[fallbackKey])) return data[fallbackKey];
  if (Array.isArray(data?.documentList)) return data.documentList;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data?.entityValueList)) return data.entityValueList;
  return [];
};

const getCount = (response: any, collection: any[]) => {
  const data = response?.data;
  return Number(data?.count ?? data?.total ?? data?.dataCount ?? data?.dataDocumentsCount ?? collection.length);
};

const getEntity = (response: any) => {
  const data = response?.data;
  if (Array.isArray(data)) return data[0];
  if (data?.entity && typeof data.entity === "object") return data.entity;
  if (data?.item && typeof data.item === "object") return data.item;
  if (data?.data && !Array.isArray(data.data) && typeof data.data === "object") return data.data;
  if (data && typeof data === "object") return data;
  return undefined;
};

const matchesQuery = (value: any, query: string) => String(value || "").toLowerCase().includes(query);

const filterDocumentsForCatalog = (documents: any[], payload: Record<string, any> = {}) => {
  const query = String(payload.queryString || "").trim().toLowerCase();
  if (!query && !payload.dataFeedId) return documents;
  return documents.filter((document) => {
    const feeds = document.feeds || document.relatedFeeds || [];
    const matchesText = !query ||
      matchesQuery(document.dataDocumentId, query) ||
      matchesQuery(document.documentName, query) ||
      matchesQuery(document.documentTitle, query) ||
      matchesQuery(document.indexName, query) ||
      matchesQuery(document.primaryEntityName, query) ||
      feeds.some((feed: any) => matchesQuery(feed.dataFeedId || feed, query));
    const matchesFeed = !payload.dataFeedId || feeds.some((feed: any) => (feed.dataFeedId || feed) === payload.dataFeedId);
    return matchesText && matchesFeed;
  });
};

const normalizeDataDocument = (document: any = {}) => {
  const relatedFeeds = document.relatedFeeds || (document.feeds || []).map((feed: any) => feed.dataFeedId || feed).filter(Boolean);
  return {
    ...document,
    relatedFeeds,
    fieldCount: document.fieldCount ?? document.fields?.length ?? 0,
    conditionCount: document.conditionCount ?? document.conditions?.length ?? 0
  };
};

const normalizeDataDocuments = (documents: any[]) => documents.map(normalizeDataDocument);

const getFeedId = (feed: any) => feed?.dataFeedId || feed?.feed?.dataFeedId || feed;

const normalizeDataFeeds = (documents: any[]) => {
  const feeds = new Map<string, any>();
  documents.forEach((document) => {
    (document.feeds || document.relatedFeeds || []).forEach((feed: any) => {
      const dataFeedId = getFeedId(feed);
      if (!dataFeedId) return;
      const feedInfo = feed?.feed || {};
      const currentFeed = feeds.get(dataFeedId) || {
        dataFeedId,
        feedName: feedInfo.feedName || dataFeedId,
        dataFeedTypeEnumId: feedInfo.dataFeedTypeEnumId || "",
        feedReceiveServiceName: feedInfo.feedReceiveServiceName || "",
        feedDeleteServiceName: feedInfo.feedDeleteServiceName || "",
        indexOnStartEmpty: feedInfo.indexOnStartEmpty || "",
        lastFeedStamp: feedInfo.lastFeedStamp || "",
        documents: []
      };
      currentFeed.feedName = feedInfo.feedName || currentFeed.feedName;
      currentFeed.dataFeedTypeEnumId = feedInfo.dataFeedTypeEnumId || currentFeed.dataFeedTypeEnumId;
      currentFeed.feedReceiveServiceName = feedInfo.feedReceiveServiceName || currentFeed.feedReceiveServiceName;
      currentFeed.feedDeleteServiceName = feedInfo.feedDeleteServiceName || currentFeed.feedDeleteServiceName;
      currentFeed.indexOnStartEmpty = feedInfo.indexOnStartEmpty || currentFeed.indexOnStartEmpty;
      currentFeed.lastFeedStamp = feedInfo.lastFeedStamp || currentFeed.lastFeedStamp;
      currentFeed.documents.push({
        dataDocumentId: document.dataDocumentId,
        documentName: document.documentName,
        documentTitle: document.documentTitle,
        primaryEntityName: document.primaryEntityName,
        indexName: document.indexName
      });
      feeds.set(dataFeedId, currentFeed);
    });
  });
  return Array.from(feeds.values()).sort((firstFeed, secondFeed) => firstFeed.dataFeedId.localeCompare(secondFeed.dataFeedId));
};

const buildFeedFromDocument = (document: any, dataFeedId: string) => {
  const feedRecord = (document?.feeds || document?.relatedFeeds || []).find((feed: any) => getFeedId(feed) === dataFeedId);
  if (!feedRecord) return undefined;
  const feedInfo = feedRecord?.feed || feedRecord || {};
  return {
    dataFeedId,
    feedName: feedInfo.feedName || dataFeedId,
    dataFeedTypeEnumId: feedInfo.dataFeedTypeEnumId || "",
    feedReceiveServiceName: feedInfo.feedReceiveServiceName || "",
    feedDeleteServiceName: feedInfo.feedDeleteServiceName || "",
    indexOnStartEmpty: feedInfo.indexOnStartEmpty || "",
    lastFeedStamp: feedInfo.lastFeedStamp || "",
    documents: [{
      dataDocumentId: document.dataDocumentId,
      documentName: document.documentName,
      documentTitle: document.documentTitle,
      primaryEntityName: document.primaryEntityName,
      indexName: document.indexName
    }]
  };
};

const buildDataDocumentListParams = (payload: Record<string, any> = {}) => {
  const { queryString, dataFeedId, ...apiPayload } = payload;
  return Object.entries({
    pageSize: Number(payload.pageSize ?? 250),
    pageIndex: Number(payload.pageIndex ?? 0),
    orderByField: payload.orderByField || "dataDocumentId",
    dependentLevels: Number(payload.dependentLevels ?? 1),
    ...apiPayload
  }).reduce((params: Record<string, any>, [key, value]) => {
    if (value !== "" && value !== undefined && value !== null) params[key] = value;
    return params;
  }, {});
};

const hasDocumentRelations = (document: any, dataDocumentId: string) => document?.dataDocumentId === dataDocumentId;

const stripUiFields = (payload: Record<string, any>) => {
  const { localId, isNew, ...apiPayload } = payload;
  return apiPayload;
};

const toDataDocumentRunPayload = (dataDocumentId: string, payload: Record<string, any>) => {
  const query = payload.query || payload;
  const filters = query.filters || [];
  const customParametersMap = filters.reduce((parameters: Record<string, any>, filter: any) => {
    if (filter.fieldNameAlias && filter.value !== undefined && filter.value !== "") {
      parameters[filter.fieldNameAlias] = filter.value;
    }
    return parameters;
  }, {});

  return {
    dataDocumentId,
    format: payload.format,
    fieldsToSelect: query.selectedFields || payload.fieldsToSelect || [],
    customParametersMap,
    orderByField: query.sort?.[0]
      ? `${query.sort[0].direction === "DESC" ? "-" : ""}${query.sort[0].fieldNameAlias}`
      : payload.orderByField,
    distinct: !!query.distinct,
    pageSize: Number(query.pageSize || payload.pageSize || 25)
  };
};

export const useDataDocumentStore = defineStore("useDataDocumentStore", {
  state: () => ({
    dataDocuments: [] as any[],
    dataDocumentPrimaryEntities: [] as String[],
    dataDocumentRelatedFeeds: [] as String[],
    currentDocument: undefined as any,
    fields: [] as any[],
    conditions: [] as any[],
    relatedFeeds: [] as any[],
    currentFeed: undefined as any,
    feedDocuments: [] as any[],
    relatedJobs: [] as any[],
    presets: [] as any[],
    exportHistory: [] as any[],
    previewRows: [] as any[],
    previewTotal: 0,
    total: 0,
    loading: false
  }),
  getters: {
    getDataDocuments: (state) => state.dataDocuments,
    getCurrentDocument: (state) => state.currentDocument,
    getFields: (state) => state.fields,
    getConditions: (state) => state.conditions,
    getRelatedFeeds: (state) => state.relatedFeeds,
    getCurrentFeed: (state) => state.currentFeed,
    getFeedDocuments: (state) => state.feedDocuments,
    getRelatedJobs: (state) => state.relatedJobs,
    getPresets: (state) => state.presets,
    getExportHistory: (state) => state.exportHistory,
    getPreviewRows: (state) => state.previewRows,
    getPreviewTotal: (state) => state.previewTotal,
    getTotal: (state) => state.total,
    isLoading: (state) => state.loading,
    getDataFeeds: (state) => normalizeDataFeeds(state.dataDocuments),
    getAvailablePrimaryEntities: (state) => state.dataDocumentPrimaryEntities,
    getAvailableFeeds: (state) => state.dataDocumentRelatedFeeds
  },
  actions: {
    async fetchDataDocuments(payload: Record<string, any> = {}) {
      this.loading = true;
      try {
        const response = await api({
          url: "admin/dataDocuments",
          method: "GET",
          params: payload
        });
        this.dataDocuments = response.data?.dataDocuments;
        this.total = response.data?.dataDocumentsCount;

        if(!payload.queryString && !payload.primaryEntityName && !payload.dataFeedId) {
          this.dataDocumentPrimaryEntities = [...new Set(this.dataDocuments.map((document: any) => document.primaryEntityName).filter(Boolean))].sort()
          this.dataDocumentRelatedFeeds = [...new Set(this.dataDocuments.map((document: any) => document.dataFeedId).filter(Boolean))].sort()
        }

      } catch (error) {
        logger.error("Failed to fetch data documents", error);
        this.dataDocuments = [];
        this.total = 0;
      } finally {
        this.loading = false;
      }
    },
    async fetchDataFeeds(payload: Record<string, any> = {}) {
      await this.fetchDataDocuments({
        pageSize: Number(payload.pageSize ?? 500),
        pageIndex: Number(payload.pageIndex ?? 0),
        pageNoLimit: payload.pageNoLimit ?? "true",
        ...payload
      });
    },
    async fetchDataFeed(dataFeedId: string, payload: Record<string, any> = {}) {
      this.loading = true;
      if (!this.dataDocuments.length) {
        await this.fetchDataFeeds();
      }
      const matchingFeed = normalizeDataFeeds(this.dataDocuments).find((feed: any) => feed.dataFeedId === dataFeedId) ||
        buildFeedFromDocument(this.currentDocument, dataFeedId);
      this.currentFeed = matchingFeed || {
        dataFeedId,
        feedName: dataFeedId,
        dataFeedTypeEnumId: "",
        lastFeedStamp: "",
        documents: []
      };
      this.feedDocuments = matchingFeed?.documents || [];

      try {
        const response = await api({
          url: `${API_ENDPOINTS.dataDocuments}/feeds/${encodeURIComponent(dataFeedId)}/documents`,
          method: "GET",
          params: {
            ...payload
          }
        });
        const documentList = getCollection(response, "documentList");
        if (documentList.length) {
          this.feedDocuments = documentList;
          this.currentFeed = {
            ...this.currentFeed,
            documents: documentList
          };
        }
      } catch (error) {
        logger.error(`Failed to fetch data feed ${dataFeedId}`, error);
      } finally {
        this.loading = false;
      }

      return this.currentFeed;
    },
    async fetchDataDocument(dataDocumentId: string) {
      this.loading = true;
      try {
        const response = await api({
          url: `moqui/dataDocuments/${dataDocumentId}`,
          method: "GET"
        });
        this.currentDocument = response.data;
        this.fields = this.currentDocument?.fields || [];
        this.conditions = this.currentDocument?.conditions || [];
        this.relatedFeeds = this.currentDocument?.feeds || [];
        this.relatedJobs = this.currentDocument?.jobs || [];
      } catch (error) {
        logger.error(`Failed to fetch data document ${dataDocumentId}`, error);
        this.currentDocument = undefined;
      } finally {
        this.loading = false;
      }

      await Promise.all([
        this.fetchFields(dataDocumentId),
        this.fetchConditions(dataDocumentId),
        this.fetchRelatedFeeds(dataDocumentId),
        this.fetchRelatedJobs(dataDocumentId),
        this.fetchPresets(dataDocumentId),
        this.fetchExportHistory({ dataDocumentId, pageSize: 5 })
      ]);

      return this.currentDocument;
    },
    async fetchFields(dataDocumentId: string) {
      if (hasDocumentRelations(this.currentDocument, dataDocumentId)) {
        this.fields = Array.isArray(this.currentDocument?.fields) ? this.currentDocument.fields : [];
        return;
      }
      try {
        const response = await api({
          url: `${API_ENDPOINTS.dataDocuments}/${encodeURIComponent(dataDocumentId)}/fields`,
          method: "GET",
          params: { pageSize: 500 }
        });
        this.fields = getCollection(response, "fields");
      } catch (error) {
        logger.error(`Failed to fetch fields for ${dataDocumentId}`, error);
        this.fields = [];
      }
    },
    async fetchConditions(dataDocumentId: string) {
      if (hasDocumentRelations(this.currentDocument, dataDocumentId)) {
        this.conditions = Array.isArray(this.currentDocument?.conditions) ? this.currentDocument.conditions : [];
        return;
      }
      try {
        const response = await api({
          url: `${API_ENDPOINTS.dataDocuments}/${encodeURIComponent(dataDocumentId)}/conditions`,
          method: "GET",
          params: { pageSize: 500 }
        });
        this.conditions = getCollection(response, "conditions");
      } catch (error) {
        logger.error(`Failed to fetch conditions for ${dataDocumentId}`, error);
        this.conditions = [];
      }
    },
    async fetchRelatedFeeds(dataDocumentId: string) {
      if (hasDocumentRelations(this.currentDocument, dataDocumentId)) {
        this.relatedFeeds = Array.isArray(this.currentDocument?.feeds) ? this.currentDocument.feeds : [];
        return;
      }
      try {
        const response = await api({
          url: `${API_ENDPOINTS.dataDocuments}/${encodeURIComponent(dataDocumentId)}/feeds`,
          method: "GET",
          params: { pageSize: 250 }
        });
        this.relatedFeeds = getCollection(response, "feeds");
      } catch (error) {
        logger.error(`Failed to fetch related feeds for ${dataDocumentId}`, error);
        this.relatedFeeds = [];
      }
    },
    async fetchRelatedJobs(dataDocumentId: string) {
      if (hasDocumentRelations(this.currentDocument, dataDocumentId)) {
        this.relatedJobs = Array.isArray(this.currentDocument?.jobs) ? this.currentDocument.jobs : [];
        return;
      }
      try {
        const response = await api({
          url: `${API_ENDPOINTS.dataDocuments}/${encodeURIComponent(dataDocumentId)}/jobs`,
          method: "GET",
          params: { pageSize: 250 }
        });
        this.relatedJobs = getCollection(response, "jobs");
      } catch (error) {
        logger.error(`Failed to fetch related jobs for ${dataDocumentId}`, error);
        this.relatedJobs = [];
      }
    },
    async fetchPresets(dataDocumentId: string) {
      if (hasDocumentRelations(this.currentDocument, dataDocumentId)) {
        this.presets = Array.isArray(this.currentDocument?.presets) ? this.currentDocument.presets : [];
        return;
      }
      try {
        const response = await api({
          url: `${API_ENDPOINTS.dataDocuments}/${encodeURIComponent(dataDocumentId)}/presets`,
          method: "GET",
          params: { pageSize: 250 }
        });
        this.presets = getCollection(response, "presets");
      } catch (error) {
        logger.error(`Failed to fetch query presets for ${dataDocumentId}`, error);
        this.presets = [];
      }
    },
    async saveDataDocument(payload: Record<string, any>) {
      const isNew = !this.currentDocument?.dataDocumentId || this.currentDocument.dataDocumentId !== payload.dataDocumentId;
      try {
        const response = await api({
          url: isNew ? API_ENDPOINTS.dataDocuments : `${API_ENDPOINTS.dataDocuments}/${encodeURIComponent(payload.dataDocumentId)}`,
          method: isNew ? "POST" : "PUT",
          data: payload
        });
        this.currentDocument = getEntity(response) || payload;
      } catch (error) {
        logger.error("Failed to save data document", error);
        throw error;
      }
      return this.currentDocument;
    },
    async saveField(dataDocumentId: string, field: Record<string, any>) {
      const isNew = !field.fieldSeqId || field.isNew;
      const payload = stripUiFields({ ...field, dataDocumentId });
      try {
        const response = await api({
          url: isNew
            ? `${API_ENDPOINTS.dataDocuments}/${encodeURIComponent(dataDocumentId)}/fields`
            : `${API_ENDPOINTS.dataDocuments}/${encodeURIComponent(dataDocumentId)}/fields/${encodeURIComponent(field.fieldSeqId)}`,
          method: isNew ? "POST" : "PUT",
          data: payload
        });
        return getEntity(response) || payload;
      } catch (error) {
        logger.error(`Failed to save field for ${dataDocumentId}`, error);
        throw error;
      }
    },
    async saveCondition(dataDocumentId: string, condition: Record<string, any>) {
      const isNew = !condition.conditionSeqId || condition.isNew;
      const payload = stripUiFields({ ...condition, dataDocumentId });
      try {
        const response = await api({
          url: isNew
            ? `${API_ENDPOINTS.dataDocuments}/${encodeURIComponent(dataDocumentId)}/conditions`
            : `${API_ENDPOINTS.dataDocuments}/${encodeURIComponent(dataDocumentId)}/conditions/${encodeURIComponent(condition.conditionSeqId)}`,
          method: isNew ? "POST" : "PUT",
          data: payload
        });
        return getEntity(response) || payload;
      } catch (error) {
        logger.error(`Failed to save condition for ${dataDocumentId}`, error);
        throw error;
      }
    },
    async runPreview(dataDocumentId: string, query: Record<string, any>) {
      this.loading = true;
      try {
        const response = await api({
          url: API_ENDPOINTS.preview,
          method: "POST",
          data: toDataDocumentRunPayload(dataDocumentId, query)
        });
        const rows = getCollection(response, "rows");
        this.previewRows = rows;
        this.previewTotal = getCount(response, rows);
      } catch (error) {
        logger.error(`Failed to preview data document ${dataDocumentId}`, error);
        this.previewRows = [];
        this.previewTotal = 0;
      } finally {
        this.loading = false;
      }
    },
    async savePreset(dataDocumentId: string, payload: Record<string, any>) {
      const isNew = !payload.presetId;
      let preset;
      try {
        const response = await api({
          url: isNew
            ? `${API_ENDPOINTS.dataDocuments}/${encodeURIComponent(dataDocumentId)}/presets`
            : `${API_ENDPOINTS.dataDocuments}/${encodeURIComponent(dataDocumentId)}/presets/${encodeURIComponent(payload.presetId)}`,
          method: isNew ? "POST" : "PUT",
          data: { ...payload, dataDocumentId }
        });
        preset = getEntity(response) || payload;
      } catch (error) {
        logger.error(`Failed to save query preset for ${dataDocumentId}`, error);
        throw error;
      }
      this.presets = this.presets.filter((item: any) => item.presetId !== preset.presetId).concat(preset);
      return preset;
    },
    async queueExport(dataDocumentId: string) {
      try {
        await api({
          url: "admin/dataDocuments/export",
          method: "POST",
          data: {
            dataDocumentId
          }
        });
      } catch (error) {
        logger.error(`Failed to queue data document export for ${dataDocumentId}`, error);
        throw error;
      }
    },
    async fetchExportHistory(payload: Record<string, any> = {}) {
      this.loading = true;
      this.exportHistory = [];
      try {
        const response = await api({
          url: "admin/systemMessages",
          method: "GET",
          params: {
            systemMessageTypeId: "ExportDocumentData",
            pageSize: 500
          }
        });
        if(payload.dataDocumentId) {
          this.exportHistory = response.data.systemMessages?.filter((message: any) => message.messageText.includes(payload.dataDocumentId))
        } else {
          this.exportHistory = response.data.systemMessages || [];
        }
      } catch (error) {
        logger.error("Failed to fetch data document export history", error);
      } finally {
        this.loading = false;
      }
    },
    async downloadExport(systemMessageId: string) {
      return api({
        url: `admin/dataDocuments/export/${systemMessageId}`,
        method: "GET"
      });
    }
  }
});
