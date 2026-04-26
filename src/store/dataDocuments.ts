import { api } from "@common";
import { defineStore } from "pinia";

import logger from "@/logger";
import {
  mockDataDocumentConditions,
  mockDataDocumentExports,
  mockDataDocumentFields,
  mockDataDocumentPresets,
  mockDataDocumentPreviewRows,
  mockDataDocuments
} from "@/mock/dataDocuments";

const API_ENDPOINTS = {
  dataDocuments: "admin/dataDocuments",
  preview: "oms/dataDocumentView"
};

const shouldUseMockData = () => {
  const locationSearch = typeof window !== "undefined" ? window.location.search : "";
  const storage = typeof window !== "undefined" ? window.localStorage : undefined;
  if (locationSearch.includes("mockDataDocuments=true")) {
    if (typeof storage?.setItem === "function") storage.setItem("JOB_MANAGER_DATA_DOCUMENTS_MOCK", "true");
    return true;
  }
  return typeof storage?.getItem === "function" && storage.getItem("JOB_MANAGER_DATA_DOCUMENTS_MOCK") === "true";
};

const canUseMockFallback = (error: any) => !error?.response || [404, 501].includes(Number(error?.response?.status));

const getCollection = (response: any, fallbackKey?: string) => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (fallbackKey && Array.isArray(data?.[fallbackKey])) return data[fallbackKey];
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data?.entityValueList)) return data.entityValueList;
  return [];
};

const getCount = (response: any, collection: any[]) => {
  const data = response?.data;
  return Number(data?.count ?? data?.total ?? data?.dataCount ?? collection.length);
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

const getMockDocuments = (payload: Record<string, any> = {}) => {
  const query = String(payload.queryString || "").trim().toLowerCase();
  return mockDataDocuments.filter((document) => {
    const matchesText = !query ||
      matchesQuery(document.dataDocumentId, query) ||
      matchesQuery(document.documentName, query) ||
      matchesQuery(document.primaryEntityName, query) ||
      matchesQuery(document.documentTitle, query) ||
      (document.relatedFeeds || []).some((feed) => matchesQuery(feed, query)) ||
      (document.relatedJobs || []).some((job) => matchesQuery(job, query)) ||
      mockDataDocumentFields.some((field) =>
        field.dataDocumentId === document.dataDocumentId &&
        (matchesQuery(field.fieldNameAlias, query) || matchesQuery(field.fieldPath, query))
      );
    const matchesEntity = !payload.primaryEntityName || document.primaryEntityName === payload.primaryEntityName;
    const matchesFeed = !payload.dataFeedId || (document.relatedFeeds || []).includes(payload.dataFeedId);
    return matchesText && matchesEntity && matchesFeed;
  });
};

const getDocumentRelations = (dataDocumentId: string) => ({
  fields: mockDataDocumentFields.filter((field) => field.dataDocumentId === dataDocumentId),
  conditions: mockDataDocumentConditions.filter((condition) => condition.dataDocumentId === dataDocumentId),
  presets: mockDataDocumentPresets.filter((preset) => preset.dataDocumentId === dataDocumentId),
  exports: mockDataDocumentExports.filter((message) => message.dataDocumentId === dataDocumentId),
  feeds: (mockDataDocuments.find((document) => document.dataDocumentId === dataDocumentId)?.relatedFeeds || []).map((dataFeedId) => ({
    dataDocumentId,
    dataFeedId
  })),
  jobs: (mockDataDocuments.find((document) => document.dataDocumentId === dataDocumentId)?.relatedJobs || []).map((jobName) => ({
    dataDocumentId,
    jobName
  }))
});

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

export const useDataDocumentStore = defineStore("dataDocuments", {
  state: () => ({
    dataDocuments: [] as any[],
    currentDocument: undefined as any,
    fields: [] as any[],
    conditions: [] as any[],
    relatedFeeds: [] as any[],
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
    getRelatedJobs: (state) => state.relatedJobs,
    getPresets: (state) => state.presets,
    getExportHistory: (state) => state.exportHistory,
    getPreviewRows: (state) => state.previewRows,
    getPreviewTotal: (state) => state.previewTotal,
    getTotal: (state) => state.total,
    isLoading: (state) => state.loading,
    getAvailablePrimaryEntities: (state) => [...new Set(state.dataDocuments.map((document: any) => document.primaryEntityName).filter(Boolean))].sort(),
    getAvailableFeeds: (state) => [...new Set(state.dataDocuments.flatMap((document: any) => document.relatedFeeds || []))].sort()
  },
  actions: {
    async fetchDataDocuments(payload: Record<string, any> = {}) {
      this.loading = true;
      if (shouldUseMockData()) {
        this.dataDocuments = getMockDocuments(payload);
        this.total = this.dataDocuments.length;
        this.loading = false;
        return;
      }
      try {
        const response = await api({
          url: API_ENDPOINTS.dataDocuments,
          method: "GET",
          params: {
            pageSize: Number(payload.pageSize ?? 250),
            pageIndex: Number(payload.pageIndex ?? 0),
            ...payload
          }
        });
        const documents = getCollection(response, "dataDocuments");
        this.dataDocuments = documents;
        this.total = getCount(response, documents);
      } catch (error) {
        logger.error("Failed to fetch data documents", error);
        if (canUseMockFallback(error)) {
          this.dataDocuments = getMockDocuments(payload);
          this.total = this.dataDocuments.length;
        } else {
          this.dataDocuments = [];
          this.total = 0;
        }
      } finally {
        this.loading = false;
      }
    },
    async fetchDataDocument(dataDocumentId: string) {
      this.loading = true;
      if (shouldUseMockData()) {
        this.currentDocument = this.dataDocuments.find((document: any) => document.dataDocumentId === dataDocumentId) ||
          mockDataDocuments.find((document) => document.dataDocumentId === dataDocumentId);
        this.loading = false;
        await Promise.all([
          this.fetchFields(dataDocumentId),
          this.fetchConditions(dataDocumentId),
          this.fetchRelatedFeeds(dataDocumentId),
          this.fetchRelatedJobs(dataDocumentId),
          this.fetchPresets(dataDocumentId),
          this.fetchExportHistory({ dataDocumentId, pageSize: 5 })
        ]);
        return this.currentDocument;
      }
      try {
        const response = await api({
          url: `${API_ENDPOINTS.dataDocuments}/${encodeURIComponent(dataDocumentId)}`,
          method: "GET"
        });
        this.currentDocument = getEntity(response);
      } catch (error) {
        logger.error(`Failed to fetch data document ${dataDocumentId}`, error);
        if (canUseMockFallback(error)) {
          this.currentDocument = mockDataDocuments.find((document) => document.dataDocumentId === dataDocumentId);
        }
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
      if (shouldUseMockData()) {
        this.fields = getDocumentRelations(dataDocumentId).fields;
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
        if (canUseMockFallback(error)) this.fields = getDocumentRelations(dataDocumentId).fields;
      }
    },
    async fetchConditions(dataDocumentId: string) {
      if (shouldUseMockData()) {
        this.conditions = getDocumentRelations(dataDocumentId).conditions;
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
        if (canUseMockFallback(error)) this.conditions = getDocumentRelations(dataDocumentId).conditions;
      }
    },
    async fetchRelatedFeeds(dataDocumentId: string) {
      if (shouldUseMockData()) {
        this.relatedFeeds = getDocumentRelations(dataDocumentId).feeds;
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
        if (canUseMockFallback(error)) this.relatedFeeds = getDocumentRelations(dataDocumentId).feeds;
      }
    },
    async fetchRelatedJobs(dataDocumentId: string) {
      if (shouldUseMockData()) {
        this.relatedJobs = getDocumentRelations(dataDocumentId).jobs;
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
        if (canUseMockFallback(error)) this.relatedJobs = getDocumentRelations(dataDocumentId).jobs;
      }
    },
    async fetchPresets(dataDocumentId: string) {
      if (shouldUseMockData()) {
        this.presets = getDocumentRelations(dataDocumentId).presets;
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
        if (canUseMockFallback(error)) this.presets = getDocumentRelations(dataDocumentId).presets;
      }
    },
    async saveDataDocument(payload: Record<string, any>) {
      const isNew = !this.currentDocument?.dataDocumentId || this.currentDocument.dataDocumentId !== payload.dataDocumentId;
      if (shouldUseMockData()) {
        this.currentDocument = { ...this.currentDocument, ...payload };
        this.dataDocuments = this.dataDocuments.filter((document: any) => document.dataDocumentId !== payload.dataDocumentId).concat(this.currentDocument);
        return this.currentDocument;
      }
      try {
        const response = await api({
          url: isNew ? API_ENDPOINTS.dataDocuments : `${API_ENDPOINTS.dataDocuments}/${encodeURIComponent(payload.dataDocumentId)}`,
          method: isNew ? "POST" : "PUT",
          data: payload
        });
        this.currentDocument = getEntity(response) || payload;
      } catch (error) {
        logger.error("Failed to save data document", error);
        if (!canUseMockFallback(error)) throw error;
        this.currentDocument = { ...this.currentDocument, ...payload };
        this.dataDocuments = this.dataDocuments.filter((document: any) => document.dataDocumentId !== payload.dataDocumentId).concat(this.currentDocument);
      }
      return this.currentDocument;
    },
    async saveField(dataDocumentId: string, field: Record<string, any>) {
      const isNew = !field.fieldSeqId || field.isNew;
      const payload = stripUiFields({ ...field, dataDocumentId });
      if (shouldUseMockData()) {
        const savedField = {
          ...payload,
          fieldSeqId: payload.fieldSeqId || String((this.fields.length + 1) * 10)
        };
        this.fields = this.fields.filter((item: any) => item.fieldSeqId !== savedField.fieldSeqId).concat(savedField);
        return savedField;
      }
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
        if (!canUseMockFallback(error)) throw error;
        const savedField = {
          ...payload,
          fieldSeqId: payload.fieldSeqId || String((this.fields.length + 1) * 10)
        };
        this.fields = this.fields.filter((item: any) => item.fieldSeqId !== savedField.fieldSeqId).concat(savedField);
        return savedField;
      }
    },
    async saveCondition(dataDocumentId: string, condition: Record<string, any>) {
      const isNew = !condition.conditionSeqId || condition.isNew;
      const payload = stripUiFields({ ...condition, dataDocumentId });
      if (shouldUseMockData()) {
        const savedCondition = {
          ...payload,
          conditionSeqId: payload.conditionSeqId || String((this.conditions.length + 1) * 10)
        };
        this.conditions = this.conditions.filter((item: any) => item.conditionSeqId !== savedCondition.conditionSeqId).concat(savedCondition);
        return savedCondition;
      }
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
        if (!canUseMockFallback(error)) throw error;
        const savedCondition = {
          ...payload,
          conditionSeqId: payload.conditionSeqId || String((this.conditions.length + 1) * 10)
        };
        this.conditions = this.conditions.filter((item: any) => item.conditionSeqId !== savedCondition.conditionSeqId).concat(savedCondition);
        return savedCondition;
      }
    },
    async runPreview(dataDocumentId: string, query: Record<string, any>) {
      this.loading = true;
      if (shouldUseMockData()) {
        const selectedFields = query.selectedFields?.length ? query.selectedFields : this.fields.map((field: any) => field.fieldNameAlias);
        this.previewRows = mockDataDocumentPreviewRows
          .filter((row) => selectedFields.some((field: string) => Object.prototype.hasOwnProperty.call(row, field)))
          .map((row) => selectedFields.reduce((previewRow: any, field: string) => {
            previewRow[field] = (row as any)[field];
            return previewRow;
          }, {}));
        this.previewTotal = this.previewRows.length;
        this.loading = false;
        return;
      }
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
        if (canUseMockFallback(error)) {
          const selectedFields = query.selectedFields?.length ? query.selectedFields : this.fields.map((field: any) => field.fieldNameAlias);
          this.previewRows = mockDataDocumentPreviewRows
            .filter((row) => selectedFields.some((field: string) => Object.prototype.hasOwnProperty.call(row, field)))
            .map((row) => selectedFields.reduce((previewRow: any, field: string) => {
              previewRow[field] = (row as any)[field];
              return previewRow;
            }, {}));
          this.previewTotal = this.previewRows.length;
        } else {
          this.previewRows = [];
          this.previewTotal = 0;
        }
      } finally {
        this.loading = false;
      }
    },
    async savePreset(dataDocumentId: string, payload: Record<string, any>) {
      const isNew = !payload.presetId;
      let preset;
      if (shouldUseMockData()) {
        preset = {
          ...payload,
          dataDocumentId,
          presetId: payload.presetId || `preset-${Date.now()}`
        };
        this.presets = this.presets.filter((item: any) => item.presetId !== preset.presetId).concat(preset);
        return preset;
      }
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
        if (!canUseMockFallback(error)) throw error;
        preset = {
          ...payload,
          dataDocumentId,
          presetId: payload.presetId || `preset-${Date.now()}`
        };
      }
      this.presets = this.presets.filter((item: any) => item.presetId !== preset.presetId).concat(preset);
      return preset;
    },
    async queueExport(dataDocumentId: string, payload: Record<string, any>) {
      if (shouldUseMockData()) {
        const message = {
          systemMessageId: `DDX${Date.now()}`,
          dataDocumentId,
          fileName: `${dataDocumentId}.${payload.format || "csv"}`,
          startedBy: "current-user",
          initDate: new Date().toISOString(),
          statusId: "SmsgProduced",
          systemMessageTypeId: "ExportDataDocument",
          recordCount: 0,
          filePath: ""
        };
        this.exportHistory = [message].concat(this.exportHistory);
        return message;
      }
      try {
        const response = await api({
          url: `${API_ENDPOINTS.dataDocuments}/${encodeURIComponent(dataDocumentId)}/exports`,
          method: "POST",
          data: toDataDocumentRunPayload(dataDocumentId, payload)
        });
        return getEntity(response) || response?.data;
      } catch (error) {
        logger.error(`Failed to queue data document export for ${dataDocumentId}`, error);
        if (!canUseMockFallback(error)) throw error;
        const message = {
          systemMessageId: `DDX${Date.now()}`,
          dataDocumentId,
          fileName: `${dataDocumentId}.${payload.format || "csv"}`,
          startedBy: "current-user",
          initDate: new Date().toISOString(),
          statusId: "SmsgProduced",
          systemMessageTypeId: "ExportDataDocument",
          recordCount: 0,
          filePath: ""
        };
        this.exportHistory = [message].concat(this.exportHistory);
        return message;
      }
    },
    async fetchExportHistory(payload: Record<string, any> = {}) {
      this.loading = true;
      if (shouldUseMockData()) {
        this.exportHistory = mockDataDocumentExports.filter((message) => {
          const matchesDocument = !payload.dataDocumentId || message.dataDocumentId === payload.dataDocumentId;
          const matchesStatus = !payload.statusId || message.statusId === payload.statusId;
          const matchesUser = !payload.startedBy || matchesQuery(message.startedBy, String(payload.startedBy).toLowerCase());
          const initDate = message.initDate ? new Date(message.initDate).getTime() : 0;
          const matchesFromDate = !payload.fromDate || initDate >= new Date(payload.fromDate).getTime();
          const matchesThruDate = !payload.thruDate || initDate <= new Date(`${payload.thruDate}T23:59:59`).getTime();
          return matchesDocument && matchesStatus && matchesUser && matchesFromDate && matchesThruDate;
        });
        this.loading = false;
        return;
      }
      try {
        const response = await api({
          url: `${API_ENDPOINTS.dataDocuments}/exports`,
          method: "GET",
          params: {
            pageSize: Number(payload.pageSize ?? 25),
            pageIndex: Number(payload.pageIndex ?? 0),
            systemMessageTypeId: "ExportDataDocument",
            orderBy: "-initDate",
            ...payload
          }
        });
        this.exportHistory = getCollection(response, "systemMessages");
      } catch (error) {
        logger.error("Failed to fetch data document export history", error);
        if (canUseMockFallback(error)) {
          this.exportHistory = mockDataDocumentExports.filter((message) => {
            const matchesDocument = !payload.dataDocumentId || message.dataDocumentId === payload.dataDocumentId;
            const matchesStatus = !payload.statusId || message.statusId === payload.statusId;
            const matchesUser = !payload.startedBy || matchesQuery(message.startedBy, String(payload.startedBy).toLowerCase());
            const initDate = message.initDate ? new Date(message.initDate).getTime() : 0;
            const matchesFromDate = !payload.fromDate || initDate >= new Date(payload.fromDate).getTime();
            const matchesThruDate = !payload.thruDate || initDate <= new Date(`${payload.thruDate}T23:59:59`).getTime();
            return matchesDocument && matchesStatus && matchesUser && matchesFromDate && matchesThruDate;
          });
        } else {
          this.exportHistory = [];
        }
      } finally {
        this.loading = false;
      }
    },
    async downloadExport(systemMessageId: string) {
      if (shouldUseMockData()) {
        return {
          data: new Blob([`systemMessageId,dataDocumentId,statusId\n${systemMessageId},mock,SmsgSent\n`], { type: "text/csv" })
        };
      }
      return api({
        url: `${API_ENDPOINTS.dataDocuments}/exports/${encodeURIComponent(systemMessageId)}`,
        method: "GET",
        responseType: "blob"
      });
    }
  }
});
