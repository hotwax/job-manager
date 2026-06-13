import { api } from "@common";
import { DateTime } from "luxon";
import { defineStore } from "pinia";

import logger from "@/logger";
import { buildCustomParametersMap } from "@/utils/dataDocumentGraph";

const API_ENDPOINTS = {
  dataDocuments: "moqui/dataDocuments",
  exports: "admin/dataDocuments",
  preview: "oms/dataDocumentView",
  serviceJobs: "admin/serviceJobs"
};

// The Moqui service a scheduled export ServiceJob invokes. With a toEmailAddress parameter it
// exports the document AND emails the CSV (see hotwax-maarg-util queue#DocumentDataToExport).
const EXPORT_SERVICE_NAME = "co.hotwax.util.UtilityServices.queue#DocumentDataToExport";

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

// initDate comes back as epoch millis or a date string depending on the instance
const toMillis = (time: any) => {
  if (!time) return 0;
  if (typeof time === "number") return time;
  let dt = DateTime.fromFormat(time, "yyyy-MM-dd HH:mm:ss.SSS");
  if (!dt.isValid) dt = DateTime.fromSQL(time);
  if (!dt.isValid) dt = DateTime.fromISO(time);
  return dt.isValid ? dt.toMillis() : 0;
};

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

const hasDocumentRelations = (document: any, dataDocumentId: string) => document?.dataDocumentId === dataDocumentId;

const stripUiFields = (payload: Record<string, any>) => {
  const { localId, isNew, ...apiPayload } = payload;
  return apiPayload;
};

// An export send never reaches SmsgError; a failure is a message stuck in SmsgProduced with
// failCount > 0. Success is SmsgSent. Anything else is still in progress.
const isExportTerminalMessage = (message: any) => {
  const statusId = message?.statusId;
  return statusId === "SmsgSent" || statusId === "SmsgError" || (statusId === "SmsgProduced" && Number(message?.failCount) > 0);
};

const toDataDocumentRunPayload = (dataDocumentId: string, payload: Record<string, any>) => {
  const query = payload.query || payload;
  const filters = query.filters || [];
  // Encode each filter's operator into Moqui search-form-inputs suffixes (_op/_not/_from/_thru)
  // so operators actually apply, instead of dropping them and treating every filter as equals.
  const customParametersMap = buildCustomParametersMap(filters);

  // dataDocumentView only honors fieldsToSelect as a comma-separated STRING (a JSON array is
  // silently ignored, returning all columns). Join it so field selection actually restricts output.
  const selectedFields = query.selectedFields || payload.fieldsToSelect || [];
  const fieldsToSelect = Array.isArray(selectedFields) ? selectedFields.join(",") : selectedFields;

  return {
    dataDocumentId,
    format: payload.format,
    fieldsToSelect,
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
    dataDocumentPrimaryEntities: [] as String[],
    dataDocumentRelatedFeeds: [] as String[],
    currentDocument: undefined as any,
    fields: [] as any[],
    conditions: [] as any[],
    relatedFeeds: [] as any[],
    currentFeed: undefined as any,
    feedDocuments: [] as any[],
    relatedJobs: [] as any[],
    scheduledExports: [] as any[],
    exportHistory: [] as any[],
    previewRows: [] as any[],
    previewTotal: 0,
    previewStatus: "idle" as "idle" | "loading" | "success" | "error",
    previewError: "",
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
    getScheduledExports: (state) => state.scheduledExports,
    getExportHistory: (state) => state.exportHistory,
    getPreviewRows: (state) => state.previewRows,
    getPreviewTotal: (state) => state.previewTotal,
    getPreviewStatus: (state) => state.previewStatus,
    getPreviewError: (state) => state.previewError,
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
        const params = Object.entries(payload).reduce((params: Record<string, any>, [key, value]) => {
          if(value !== "" && value !== undefined && value !== null) params[key] = value;
          return params;
        }, {});
        const response = await api({
          url: "admin/dataDocuments",
          method: "GET",
          params
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
      this.currentDocument = undefined;
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
      } finally {
        this.loading = false;
      }

      await this.fetchExportHistory({ dataDocumentId })

      return this.currentDocument;
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
      const isNew = !field.fieldSeqId;
      const payload = stripUiFields({ ...field, dataDocumentId });
      try {
        const response = await api({
          url: isNew
            ? `admin/dataDocuments/${encodeURIComponent(dataDocumentId)}/fields`
            : `admin/dataDocuments/${encodeURIComponent(dataDocumentId)}/fields/${encodeURIComponent(field.fieldSeqId)}`,
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
      const isNew = !condition.conditionSeqId;
      const payload = stripUiFields({ ...condition, dataDocumentId });
      try {
        const response = await api({
          url: isNew
            ? `admin/dataDocuments/${encodeURIComponent(dataDocumentId)}/conditions`
            : `admin/dataDocuments/${encodeURIComponent(dataDocumentId)}/conditions/${encodeURIComponent(condition.conditionSeqId)}`,
          method: isNew ? "POST" : "PUT",
          data: payload
        });
        return getEntity(response) || payload;
      } catch (error) {
        logger.error(`Failed to save condition for ${dataDocumentId}`, error);
        throw error;
      }
    },
    async deleteField(dataDocumentId: string, fieldSeqId: string) {
      try {
        await api({
          url: `admin/dataDocuments/${encodeURIComponent(dataDocumentId)}/fields/${encodeURIComponent(fieldSeqId)}`,
          method: "DELETE"
        });
      } catch (error) {
        logger.error(`Failed to delete field ${fieldSeqId} for ${dataDocumentId}`, error);
        throw error;
      }
    },
    async deleteCondition(dataDocumentId: string, conditionSeqId: string) {
      try {
        await api({
          url: `admin/dataDocuments/${encodeURIComponent(dataDocumentId)}/conditions/${encodeURIComponent(conditionSeqId)}`,
          method: "DELETE"
        });
      } catch (error) {
        logger.error(`Failed to delete condition ${conditionSeqId} for ${dataDocumentId}`, error);
        throw error;
      }
    },
    async runPreview(dataDocumentId: string, query: Record<string, any>) {
      this.loading = true;
      this.previewStatus = "loading";
      this.previewError = "";
      try {
        const response = await api({
          url: API_ENDPOINTS.preview,
          method: "POST",
          data: toDataDocumentRunPayload(dataDocumentId, query)
        });
        const rows = getCollection(response, "rows");
        this.previewRows = rows;
        this.previewTotal = getCount(response, rows);
        this.previewStatus = "success";
      } catch (error: any) {
        logger.error(`Failed to preview data document ${dataDocumentId}`, error);
        this.previewRows = [];
        this.previewTotal = 0;
        this.previewStatus = "error";
        // Surface a useful message: Moqui's error envelope, else the HTTP/network error.
        this.previewError = error?.response?.data?.errors
          || error?.message
          || "The preview request failed. Please try again.";
      } finally {
        this.loading = false;
      }
    },
    async queueExport(dataDocumentId: string, options: Record<string, any> = {}) {
      // The export service (queue#DocumentDataToExport) only honors dataDocumentId,
      // pageIndex, pageSize (default cap 10000) and orderByField. Field selection and
      // filters are NOT applied server-side — the CSV is always the full document with
      // its baked-in conditions. We forward only the supported params and drop the rest
      // rather than silently pretending the query applied.
      const query = options.query || {};
      const sort = Array.isArray(query.sort) ? query.sort[0] : undefined;
      const data: Record<string, any> = { dataDocumentId };
      if (sort?.fieldNameAlias) {
        data.orderByField = `${sort.direction === "DESC" ? "-" : ""}${sort.fieldNameAlias}`;
      }
      if (query.pageSize) data.pageSize = Number(query.pageSize);
      if (options.pageIndex !== undefined) data.pageIndex = Number(options.pageIndex);
      try {
        await api({
          url: "admin/dataDocuments/export",
          method: "POST",
          data
        });
        // Surface the queued export immediately (it appears as a new SystemMessage).
        await this.fetchExportHistory({ dataDocumentId });
      } catch (error) {
        logger.error(`Failed to queue data document export for ${dataDocumentId}`, error);
        throw error;
      }
    },
    // List the scheduled email-export ServiceJobs for a document. The serviceJobs list endpoint
    // supports a serviceName filter and returns each job's serviceJobParameters, so we filter the
    // export-service jobs down to the ones whose dataDocumentId parameter matches.
    async fetchScheduledExports(dataDocumentId: string) {
      try {
        const response = await api({
          url: API_ENDPOINTS.serviceJobs,
          method: "GET",
          params: { serviceName: EXPORT_SERVICE_NAME, pageSize: 200 }
        });
        const jobs = response?.data?.serviceJobList || [];
        const paramValue = (job: any, name: string) =>
          (job.serviceJobParameters || []).find((param: any) => param.parameterName === name)?.parameterValue;
        this.scheduledExports = jobs
          .filter((job: any) => paramValue(job, "dataDocumentId") === dataDocumentId)
          .map((job: any) => ({
            ...job,
            toEmailAddress: paramValue(job, "toEmailAddress"),
            ccAddresses: paramValue(job, "ccAddresses")
          }));
      } catch (error) {
        logger.error(`Failed to fetch scheduled exports for ${dataDocumentId}`, error);
        this.scheduledExports = [];
      }
      return this.scheduledExports;
    },
    // Create a cron ServiceJob that exports the document and emails the CSV. Done in two calls
    // because create (POST) registers the job + service, and the cron expression and parameters
    // are applied via update (PUT) — mirrors the verified admin/serviceJobs contract.
    async scheduleEmailExport(payload: Record<string, any>) {
      const { dataDocumentId, toEmailAddress, ccAddresses, cronExpression, orderByField, pageSize } = payload;
      // jobName must be unique and stable; encode the document + a timestamp suffix.
      const safeDoc = String(dataDocumentId).replace(/[^A-Za-z0-9]/g, "").slice(0, 60);
      const jobName = payload.jobName || `EXP_EMAIL_${safeDoc}_${DateTime.now().toFormat("yyyyMMddHHmmss")}`;
      const description = payload.description
        || `Email export of ${dataDocumentId} to ${toEmailAddress}`;
      try {
        await api({
          url: API_ENDPOINTS.serviceJobs,
          method: "POST",
          data: { jobName, description, serviceName: EXPORT_SERVICE_NAME, paused: "N" }
        });
        const serviceJobParameters = [{ parameterName: "dataDocumentId", parameterValue: dataDocumentId }];
        if (toEmailAddress) serviceJobParameters.push({ parameterName: "toEmailAddress", parameterValue: toEmailAddress });
        if (ccAddresses) serviceJobParameters.push({ parameterName: "ccAddresses", parameterValue: ccAddresses });
        if (orderByField) serviceJobParameters.push({ parameterName: "orderByField", parameterValue: orderByField });
        if (pageSize) serviceJobParameters.push({ parameterName: "pageSize", parameterValue: String(pageSize) });
        await api({
          url: `${API_ENDPOINTS.serviceJobs}/${encodeURIComponent(jobName)}`,
          method: "PUT",
          data: { jobName, cronExpression, serviceJobParameters }
        });
      } catch (error) {
        logger.error(`Failed to schedule email export for ${dataDocumentId}`, error);
        throw error;
      }
      await this.fetchScheduledExports(dataDocumentId);
      return jobName;
    },
    // Pause/resume a scheduled export. The admin REST API has no delete for serviceJobs, so
    // "remove a schedule" is modeled as pausing it (paused = Y).
    async setExportSchedulePaused(jobName: string, paused: boolean, dataDocumentId?: string) {
      try {
        await api({
          url: `${API_ENDPOINTS.serviceJobs}/${encodeURIComponent(jobName)}`,
          method: "PUT",
          data: { jobName, paused: paused ? "Y" : "N" }
        });
      } catch (error) {
        logger.error(`Failed to update schedule ${jobName}`, error);
        throw error;
      }
      if (dataDocumentId) await this.fetchScheduledExports(dataDocumentId);
    },
    // Poll the export history until the newest export for this document reaches a terminal
    // state (Ready = SmsgSent, or Failed = SmsgProduced with failCount > 0). Bounded so it
    // never polls forever. The reactive exportHistory updates live as the status changes.
    async pollExportHistory(dataDocumentId: string, options: { attempts?: number; intervalMs?: number } = {}) {
      const attempts = options.attempts ?? 12;
      const intervalMs = options.intervalMs ?? 2500;
      for (let attempt = 0; attempt < attempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        await this.fetchExportHistory({ dataDocumentId });
        const newest = this.exportHistory[0];
        if (newest && isExportTerminalMessage(newest)) return newest;
      }
      return this.exportHistory[0];
    },
    async fetchExportHistory(payload: Record<string, any> = {}) {
      this.loading = true;
      this.exportHistory = [];

      const params: Record<string, any> = {
        systemMessageTypeId: "ExportDocumentData",
        orderBy: "-initDate",
        pageSize: 500
      };
      if(payload.statusId) {
        params.statusId = payload.statusId;
      }

      try {
        const response = await api({
          url: "admin/systemMessages",
          method: "GET",
          params
        });
        // admin/systemMessages only supports statusId of the history filters, the rest are applied client-side
        let messages = response.data.systemMessages || [];
        if(payload.dataDocumentId) {
          messages = messages.filter((message: any) => message.messageText?.includes(payload.dataDocumentId));
        }
        if(payload.startedBy) {
          const startedBy = String(payload.startedBy).toLowerCase();
          messages = messages.filter((message: any) => matchesQuery(message.startedBy, startedBy));
        }
        if(payload.fromDate) {
          const fromTime = DateTime.fromISO(payload.fromDate).startOf("day").toMillis();
          messages = messages.filter((message: any) => toMillis(message.initDate) >= fromTime);
        }
        if(payload.thruDate) {
          const thruTime = DateTime.fromISO(payload.thruDate).endOf("day").toMillis();
          messages = messages.filter((message: any) => {
            const initTime = toMillis(message.initDate);
            return initTime && initTime <= thruTime;
          });
        }
        // admin/systemMessages ignores the orderBy param, so sort newest-first client-side.
        this.exportHistory = messages.sort((a: any, b: any) => toMillis(b.initDate) - toMillis(a.initDate));
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
