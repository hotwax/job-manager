import { api } from "@common";
import { defineStore } from "pinia";
import { getDateAndTime } from "@/utils";

import logger from "@/logger";
import { mockSystemMessageErrors } from "@/mock/systemMessageErrors";
import {
  mockStatusFlowTransitions,
  mockStatusFlows,
  mockStatusTypes
} from "@/mock/systemMessageStatus";
import { mockEnums } from "@/mock/enums";
import { mockEnumerationTypes } from "@/mock/enumerationTypes";
import { mockSystemMessageTypes } from "@/mock/systemMessageTypes";
import { mockSystemMessages } from "@/mock/systemMessages";
import {
  getAllowedTransitions,
  getFutureStatuses
} from "@/utils/systemMessageReplay";
import { useUtilStore } from "./util";

const SYSTEM_MESSAGE_TYPE_FIELDS = [
  "systemMessageTypeId",
  "description",
  "parentTypeId",
  "sendServiceName",
  "consumeServiceName",
  "sendPath",
  "receivePath",
  "receiveMovePath",
  "receiveFilePattern",
  "receiveResponseEnumId"
];

const SYSTEM_MESSAGE_REMOTE_FIELDS = [
  "systemMessageRemoteId",
  "description",
  "sendUrl",
  "receiveUrl",
  "username",
  "password",
  "authHeaderName",
  "privateKey",
  "sharedSecret",
  "sendSharedSecret",
  "oldSharedSecret",
  "remoteId",
  "remoteIdType",
  "internalId",
  "internalIdType",
  "remoteAppCode",
  "accessScopeEnumId",
  "sendServiceName"
];

const API_ENDPOINTS = {
  systemMessageTypes: "system/message/types",
  systemMessageRemotes: "system/message/remotes",
  systemMessages: "system/messages",
  systemMessageEntity: "moqui/entities/moqui.service.message.SystemMessage",
  systemMessageErrors: "moqui/entities/moqui.service.message.SystemMessageError",
  enumerations: "moqui/entities/moqui.basic.Enumeration",
  enumerationTypes: "moqui/entities/moqui.basic.EnumerationType"
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const getTypeKey = (type: any) => type?.systemMessageTypeId;
const getRemoteKey = (remote: any) => remote?.systemMessageRemoteId;
const getMessageKey = (message: any) => message?.systemMessageId;
const getErrorKey = (error: any) =>
  [error?.systemMessageId, error?.errorDate, error?.attemptedStatusId].filter(Boolean).join("::");

const sanitizeEntity = (payload: Record<string, any>, fields: string[]) => {
  return fields.reduce((entity, field) => {
    if (payload[field] !== undefined) {
      entity[field] = payload[field];
    }
    return entity;
  }, {} as Record<string, any>);
};

const getMessageCounts = (messages: any[]) => ({
  sent: messages.filter((message: any) => message.statusId === "SmsgSent").length,
  error: messages.filter((message: any) => message.statusId === "SmsgError").length,
  consumed: messages.filter((message: any) => message.statusId === "SmsgConsumed").length
});

const filterMessages = (messages: any[], payload: Record<string, any> = {}, systemMessageTypes: any[] = []) => {
  let filteredMessages = [...messages];

  if (payload.systemMessageTypeId) {
    filteredMessages = filteredMessages.filter((message: any) => message.systemMessageTypeId === payload.systemMessageTypeId);
  }

  if (payload.parentTypeId) {
    const childTypeIds = systemMessageTypes
      .filter((type: any) => type.parentTypeId === payload.parentTypeId)
      .map((type: any) => type.systemMessageTypeId);

    filteredMessages = filteredMessages.filter((message: any) => childTypeIds.includes(message.systemMessageTypeId));
  }

  if (payload.systemMessageRemoteId) {
    filteredMessages = filteredMessages.filter((message: any) => message.systemMessageRemoteId === payload.systemMessageRemoteId);
  }

  if (payload.statusId) {
    filteredMessages = filteredMessages.filter((message: any) => message.statusId === payload.statusId);
  }

  if (payload.queryString?.trim()) {
    const query = payload.queryString.trim().toLowerCase();
    filteredMessages = filteredMessages.filter((message: any) =>
      message.systemMessageId?.toLowerCase().includes(query) ||
      message.systemMessageTypeId?.toLowerCase().includes(query) ||
      message.systemMessageRemoteId?.toLowerCase().includes(query) ||
      message.messageText?.toLowerCase().includes(query)
    );
  }

  // Sort by initDate descending (newest first)
  filteredMessages.sort((a, b) => {
    const timeA = a.initDate ? new Date(a.initDate).getTime() : 0;
    const timeB = b.initDate ? new Date(b.initDate).getTime() : 0;
    return timeB - timeA;
  });

  return filteredMessages;
};

const paginateMessages = (messages: any[], payload: Record<string, any> = {}) => {
  const pageSize = Math.max(Number(payload.pageSize || messages.length || 1), 1);
  const pageIndex = Math.max(Number(payload.pageIndex || 0), 0);
  const startIndex = pageIndex * pageSize;

  return messages.slice(startIndex, startIndex + pageSize);
};

const hasCollectionPayload = (response: any) => {
  const data = response?.data;
  return Array.isArray(data) || Array.isArray(data?.data) || Array.isArray(data?.items) || Array.isArray(data?.results);
};

const getResponseCollection = (response: any) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;

  return [];
};

const getResponseEntity = (response: any) => {
  const data = response?.data;

  if (Array.isArray(data)) return data[0];
  if (data?.entity && typeof data.entity === "object") return data.entity;
  if (data?.item && typeof data.item === "object") return data.item;
  if (data?.record && typeof data.record === "object") return data.record;
  if (data?.data && !Array.isArray(data.data) && typeof data.data === "object") return data.data;
  if (data && typeof data === "object") return data;

  return undefined;
};

const getResponseTotal = (response: any, fallback: number) => {
  const data = response?.data;
  const total = Number(data?.count ?? data?.dataCount ?? data?.total ?? data?.totalCount ?? fallback);
  return Number.isNaN(total) ? fallback : total;
};

const mergeCollectionByKey = (existing: any[], incoming: any[], getKey: (item: any) => string | undefined) => {
  const merged = new Map<string, any>();

  [...existing, ...incoming].forEach((item) => {
    const key = getKey(item);
    if (!key) return;

    merged.set(key, {
      ...(merged.get(key) || {}),
      ...item
    });
  });

  return Array.from(merged.values());
};

const upsertByKey = (existing: any[], entity: any, getKey: (item: any) => string | undefined) => {
  const key = getKey(entity);
  if (!key) return existing;

  const index = existing.findIndex((item) => getKey(item) === key);
  if (index === -1) {
    return [entity, ...existing];
  }

  return existing.map((item) => (getKey(item) === key ? { ...item, ...entity } : item));
};

const removeByKey = (existing: any[], id: string, getKey: (item: any) => string | undefined) => {
  return existing.filter((item) => getKey(item) !== id);
};

const updateMessages = (messages: any[], payload: Record<string, any>) => {
  return messages.map((message: any) =>
    message.systemMessageId === payload.systemMessageId ? { ...message, ...payload } : message
  );
};

const canUseMockFallback = (error: any) => !error?.response;

const loadMockState = () => ({
  systemMessageTypes: [],
  allSystemMessages: clone(mockSystemMessages) as any[],
  systemMessages: clone(mockSystemMessages.slice(0, 25)) as any[],
  systemMessageRemotes: [],
  allSystemMessageErrors: clone(mockSystemMessageErrors) as any[],
  systemMessageErrors: [] as any[],
  systemMessageStatusTypes: clone(mockStatusTypes) as any[],
  systemMessageStatusFlows: clone(mockStatusFlows) as any[],
  systemMessageStatusTransitions: clone(mockStatusFlowTransitions) as any[],
  currentSystemMessage: undefined as Record<string, any> | undefined,
  currentSystemMessageType: undefined as Record<string, any> | undefined,
  currentSystemMessageRemote: undefined as Record<string, any> | undefined,
  currentEnum: undefined as Record<string, any> | undefined,
  currentEnumType: undefined as Record<string, any> | undefined,
  currentEnumSequence: [] as any[],
  relatedMessages: [] as any[],
  linkedMessages: [] as any[],
  systemMessageTotal: mockSystemMessages.length,
  loading: false,
  enums: clone(mockEnums) as any[],
  enumerationTypes: clone(mockEnumerationTypes) as any[]
});

export const useSystemMessageStore = defineStore("systemMessage", {
  state: loadMockState,
  getters: {
    getSystemMessageTypes: (state: any) => state.systemMessageTypes,
    getSystemMessages: (state: any) => state.systemMessages,
    getAllSystemMessages: (state: any) => state.allSystemMessages,
    getSystemMessageRemotes: (state: any) => state.systemMessageRemotes,
    getSystemMessageErrors: (state: any) => state.systemMessageErrors,
    getSystemMessageStatusTypes: (state: any) => state.systemMessageStatusTypes,
    getSystemMessageStatusFlows: (state: any) => state.systemMessageStatusFlows,
    getSystemMessageStatusTransitions: (state: any) => state.systemMessageStatusTransitions,
    getSystemMessageParentTypes: (state: any) => {
      const parentTypeIds = [...new Set(state.systemMessageTypes.map((type: any) => type.parentTypeId).filter(Boolean))] as string[];
      return parentTypeIds.map(id => {
        const type = state.systemMessageTypes.find((t: any) => t.systemMessageTypeId === id);
        return {
          id,
          description: type?.description || id
        };
      }).sort((a, b) => a.description.localeCompare(b.description));
    },
    getCurrentSystemMessage: (state: any) => state.currentSystemMessage,
    getCurrentSystemMessageType: (state: any) => state.currentSystemMessageType,
    getCurrentSystemMessageRemote: (state: any) => state.currentSystemMessageRemote,
    getCurrentEnum: (state: any) => state.currentEnum,
    getCurrentEnumType: (state: any) => state.currentEnumType,
    getCurrentEnumSequence: (state: any) => state.currentEnumSequence,
    getLinkedMessages: (state: any) => state.linkedMessages,
    getSystemMessageTotal: (state: any) => state.systemMessageTotal,
    getRelatedMessages: (state: any) => state.relatedMessages,
    getAllowedTransitions: () => (message: any) => getAllowedTransitions(message),
    getFutureStatuses: () => (message: any) => getFutureStatuses(message),
    getMessagesForType: (state: any) => (systemMessageTypeId: string) =>
      state.allSystemMessages.filter((message: any) => message.systemMessageTypeId === systemMessageTypeId),
    getMessagesForRemote: (state: any) => (systemMessageRemoteId: string) =>
      state.allSystemMessages.filter((message: any) => message.systemMessageRemoteId === systemMessageRemoteId),
    getMessageTypeCounts: (state: any) => (systemMessageTypeId: string) =>
      getMessageCounts(state.allSystemMessages.filter((message: any) => message.systemMessageTypeId === systemMessageTypeId)),
    getRemoteCounts: (state: any) => (systemMessageRemoteId: string) =>
      getMessageCounts(state.allSystemMessages.filter((message: any) => message.systemMessageRemoteId === systemMessageRemoteId)),
    canDeleteMessageType: (state: any) => (systemMessageTypeId: string) =>
      !state.allSystemMessages.some((message: any) => message.systemMessageTypeId === systemMessageTypeId),
    canDeleteMessageRemote: (state: any) => (systemMessageRemoteId: string) =>
      !state.allSystemMessages.some((message: any) => message.systemMessageRemoteId === systemMessageRemoteId),
    getTechnicalFields: (state: any) => (message: any) => {
      if (!message) return [];

      const fields = [
        { label: "systemMessageId", value: message.systemMessageId },
        { label: "statusId", value: message.statusId },
        { label: "initDate", value: getDateAndTime(message.initDate) },
        { label: "processedDate", value: getDateAndTime(message.processedDate) },
        { label: "lastAttemptDate", value: getDateAndTime(message.lastAttemptDate) },
        { label: "isOutgoing", value: message.isOutgoing },
        { label: "remoteMessageId", value: message.remoteMessageId }
      ];

      if (message.parentMessageId) {
        const parent = state.relatedMessages.find((rel: any) => rel.systemMessageId === message.parentMessageId);
        const field: any = { label: "parentMessageId", value: message.parentMessageId };

        if (parent) {
          field.link = `/system-messages/${message.parentMessageId}`;
        } else {
          field.info = "The parent message has been purged";
        }
        fields.push(field);
      }

      return fields.filter(f => f.value !== undefined && f.value !== null);
    },
    isLoading: (state: any) => state.loading
  },
  actions: {
    async fetchSystemMessageTypes() {
      this.loading = true;
      try {
        const response = await api({
          url: "admin/systemMessages/types",
          method: "GET",
          params: {
            pageSize: 250
          }
        });

        if(response.data?.length) {
          this.systemMessageTypes = response.data;
        }
      } catch (err) {
        logger.error("Failed to fetch system message types", err);
      } finally {
        this.loading = false;
      }
    },
    async fetchSystemMessages(payload: Record<string, any> = {}) {
      this.loading = true;

      try {
        const response = await api({
          url: "admin/systemMessages",
          method: "GET",
          params: {
            pageSize: Number(payload.pageSize ?? 25),
            pageIndex: Number(payload.pageIndex ?? 0),
            orderBy: "-initDate",
            ...payload
          }
        });

        if (hasCollectionPayload(response)) {
          const messages = getResponseCollection(response);
          this.systemMessages = messages;
          this.systemMessageTotal = getResponseTotal(response, messages.length);
          this.allSystemMessages = mergeCollectionByKey(this.allSystemMessages, messages, getMessageKey);
          return;
        }

        throw new Error("System messages API did not return a collection payload.");
      } catch (err) {
        logger.error("Failed to fetch system messages", err);

        const filteredMessages = filterMessages(this.allSystemMessages, payload, this.systemMessageTypes);
        this.systemMessageTotal = filteredMessages.length;
        this.systemMessages = paginateMessages(filteredMessages, payload);
      } finally {
        this.loading = false;
      }
    },
    async fetchSystemMessageById(systemMessageId: string, skipSetCurrent = false) {
      this.loading = true;

      try {
        const response = await api({
          url: `${API_ENDPOINTS.systemMessageEntity}/${encodeURIComponent(systemMessageId)}`,
          method: "GET"
        });

        const message = getResponseEntity(response);
        if (message?.systemMessageId) {
          if (!skipSetCurrent) {
            this.currentSystemMessage = message;
          }
          this.allSystemMessages = upsertByKey(this.allSystemMessages, message, getMessageKey);
          this.systemMessages = upsertByKey(this.systemMessages, message, getMessageKey);
          return message;
        }

        throw new Error("System message API did not return an entity payload.");
      } catch (err) {
        logger.error(`Failed to fetch system message ${systemMessageId}`, err);
        const mockMsg = this.allSystemMessages.find((message: any) => message.systemMessageId === systemMessageId);
        if (!skipSetCurrent) {
          this.currentSystemMessage = mockMsg;
        }
        return mockMsg;
      } finally {
        this.loading = false;
      }
    },
    async fetchSystemMessageRemotes() {
      this.loading = true;

      try {
        const response = await api({
          url: "oms/systemMessageRemotes",
          method: "GET",
          params: {
            pageSize: 250
          }
        });

        if (hasCollectionPayload(response)) {
          this.systemMessageRemotes = getResponseCollection(response);
        }
      } catch (err) {
        logger.error("Failed to fetch system message remotes", err);
      } finally {
        this.loading = false;
      }
    },
    async fetchSystemMessageTypeById(systemMessageTypeId: string) {
      this.loading = true;

      try {
        const response = await api({
          url: "admin/systemMessages/types",
          method: "GET",
          params: {
            systemMessageTypeId: encodeURIComponent(systemMessageTypeId),
            pageSize: 1
          }
        });

        if(response?.data && response.data[0]?.systemMessageTypeId) {
          this.currentSystemMessageType = response.data[0];
          return this.currentSystemMessageType;
        }

        throw new Error("System message type API did not return an entity payload.");
      } catch(err) {
        logger.error("Failed to fetch system message type", err);
      } finally {
        this.loading = false;
      }
    },
    async fetchSystemMessageRemoteById(systemMessageRemoteId: string) {
      this.loading = true;

      try {
        const response = await api({
          url: "oms/systemMessageRemotes",
          method: "GET",
          params: {
            systemMessageRemoteId: encodeURIComponent(systemMessageRemoteId)
          }
        });

        if(response?.data && response.data[0].systemMessageRemoteId) {
          this.currentSystemMessageRemote = response.data[0];
          return this.currentSystemMessageRemote
        }

        throw new Error("System message remote API did not return an entity payload.");
      } catch (err) {
        logger.error("Failed to fetch system message remote", err);
        this.currentSystemMessageRemote = this.systemMessageRemotes.find((remote: any) => remote.systemMessageRemoteId === systemMessageRemoteId);
        return this.currentSystemMessageRemote;
      } finally {
        this.loading = false;
      }
    },
    async fetchSystemMessageErrors(systemMessageId: string) {
      this.loading = true;

      try {
        const response = await api({
          url: API_ENDPOINTS.systemMessageErrors,
          method: "GET",
          params: {
            pageSize: 250,
            pageIndex: 0,
            systemMessageId
          }
        });

        if (hasCollectionPayload(response)) {
          const errors = getResponseCollection(response);
          this.systemMessageErrors = errors;
          this.allSystemMessageErrors = mergeCollectionByKey(this.allSystemMessageErrors, errors, getErrorKey);
          return;
        }

        throw new Error("System message errors API did not return a collection payload.");
      } catch (err) {
        logger.error("Failed to fetch system message errors", err);
        this.systemMessageErrors = this.allSystemMessageErrors.filter((error: any) => error.systemMessageId === systemMessageId);
      } finally {
        this.loading = false;
      }
    },
    async fetchRelatedMessages(systemMessageId: string) {
      this.loading = true;
      const related = [] as any[];

      try {
        let msg = this.allSystemMessages.find(m => m.systemMessageId === systemMessageId);
        if (!msg) {
          msg = await this.fetchSystemMessageById(systemMessageId);
        }

        // 1. Safe Parent Fetch
        if (msg?.parentMessageId) {
          try {
            const parent = await this.fetchSystemMessageById(msg.parentMessageId, true);
            if (parent) {
              related.push({ ...parent, relationship: 'parent' });
            }
          } catch (e) {
            logger.warn("Parent message not found or fetch failed", msg.parentMessageId);
          }
        }

        // 2. Children Fetch
        try {
          const response = await api({
            url: API_ENDPOINTS.systemMessages,
            method: "GET",
            params: {
              parentMessageId: systemMessageId,
              pageSize: 50
            }
          });

          if (hasCollectionPayload(response)) {
            const children = getResponseCollection(response);
            children.forEach((child: any) => {
              related.push({ ...child, relationship: 'child' });
            });
          }
        } catch (e) {
          logger.warn("Failed to fetch children messages from API, falling back to mock", e);
          const children = this.allSystemMessages.filter(m => m.parentMessageId === systemMessageId);
          children.forEach(child => {
            if (!related.find(r => r.systemMessageId === child.systemMessageId)) {
              related.push({ ...child, relationship: 'child' });
            }
          });
        }

        this.relatedMessages = related;
      } catch (err) {
        logger.error("Failed to resolve base message for related messages", err);
      } finally {
        this.loading = false;
      }
    },
    async updateSystemMessage(payload: Record<string, any>) {
      this.loading = true;

      try {
        const response = await api({
          url: `${API_ENDPOINTS.systemMessages}/${encodeURIComponent(payload.systemMessageId)}`,
          method: "PATCH",
          data: payload
        });

        const message = {
          ...(this.allSystemMessages.find((item: any) => item.systemMessageId === payload.systemMessageId) || {}),
          ...payload,
          ...(getResponseEntity(response) || {})
        };

        this.allSystemMessages = updateMessages(this.allSystemMessages, message);
        this.systemMessages = updateMessages(this.systemMessages, message);
        if (this.currentSystemMessage?.systemMessageId === payload.systemMessageId) {
          this.currentSystemMessage = { ...this.currentSystemMessage, ...message };
        }

        return { data: { success: true, entity: message } };
      } catch (err) {
        logger.error("Failed to update system message", err);

        if (!canUseMockFallback(err)) {
          return { error: err };
        }

        this.allSystemMessages = updateMessages(this.allSystemMessages, payload);
        this.systemMessages = updateMessages(this.systemMessages, payload);
        if (this.currentSystemMessage?.systemMessageId === payload.systemMessageId) {
          this.currentSystemMessage = { ...this.currentSystemMessage, ...payload };
        }

        return { data: { success: true, entity: payload } };
      } finally {
        this.loading = false;
      }
    },
    async downloadSystemMessageFile(systemMessageId: string) {
      try {
        const response = await api({
          // Temporary POC: reuse the cycle count download API until maarg exposes
          // a generic system message file download endpoint for job manager.
          url: `inventory-cycle-count/cycleCounts/systemMessages/${encodeURIComponent(systemMessageId)}/downloadFile`,
          method: "GET",
          responseType: "blob"
        });

        return { data: response.data, headers: response.headers };
      } catch (err) {
        logger.error(`Failed to download file for system message ${systemMessageId}`, err);
        return { error: err };
      }
    },
    async saveSystemMessageType(payload: Record<string, any>) {
      this.loading = true;

      const entity = sanitizeEntity(payload, SYSTEM_MESSAGE_TYPE_FIELDS);
      const isUpdate = this.systemMessageTypes.some((type: any) => type.systemMessageTypeId === entity.systemMessageTypeId);

      try {
        const response = await api({
          url: isUpdate
            ? `${API_ENDPOINTS.systemMessageTypes}/${encodeURIComponent(entity.systemMessageTypeId)}`
            : API_ENDPOINTS.systemMessageTypes,
          method: isUpdate ? "PATCH" : "POST",
          data: entity
        });

        const savedEntity = {
          ...(this.systemMessageTypes.find((type: any) => type.systemMessageTypeId === entity.systemMessageTypeId) || {}),
          ...entity,
          ...(getResponseEntity(response) || {})
        };

        this.systemMessageTypes = upsertByKey(this.systemMessageTypes, savedEntity, getTypeKey);
        this.currentSystemMessageType = savedEntity;

        return { data: { success: true, entity: savedEntity } };
      } catch (err) {
        logger.error("Failed to save system message type", err);

        if (!canUseMockFallback(err)) {
          return { error: err };
        }

        this.systemMessageTypes = upsertByKey(this.systemMessageTypes, entity, getTypeKey);
        this.currentSystemMessageType = entity;

        return { data: { success: true, entity } };
      } finally {
        this.loading = false;
      }
    },
    async saveSystemMessageRemote(payload: Record<string, any>) {
      this.loading = true;

      const result = {
        data: {},
        error: undefined as any
      }

      try {
        await api({
          url: `oms/systemMessageRemotes/${encodeURIComponent(payload.systemMessageRemoteId)}`,
          method: "PUT",
          data: payload
        });

        this.currentSystemMessageRemote = payload;

        result.data = { success: true, entity: payload }
      } catch (err) {
        logger.error("Failed to save system message remote", err);
        result.error = err
      } finally {
        this.loading = false;
      }

      return result
    },
    async deleteSystemMessageType(systemMessageTypeId: string) {
      this.loading = true;

      try {
        if (!this.canDeleteMessageType(systemMessageTypeId)) {
          return { error: new Error("System message type is still referenced by messages.") };
        }

        await api({
          url: `${API_ENDPOINTS.systemMessageTypes}/${encodeURIComponent(systemMessageTypeId)}`,
          method: "DELETE"
        });

        this.systemMessageTypes = removeByKey(this.systemMessageTypes, systemMessageTypeId, getTypeKey);
        if (this.currentSystemMessageType?.systemMessageTypeId === systemMessageTypeId) {
          this.currentSystemMessageType = undefined;
        }

        return { data: { success: true } };
      } catch (err) {
        logger.error("Failed to delete system message type", err);

        if (!canUseMockFallback(err)) {
          return { error: err };
        }

        this.systemMessageTypes = removeByKey(this.systemMessageTypes, systemMessageTypeId, getTypeKey);
        if (this.currentSystemMessageType?.systemMessageTypeId === systemMessageTypeId) {
          this.currentSystemMessageType = undefined;
        }

        return { data: { success: true } };
      } finally {
        this.loading = false;
      }
    },
    async deleteSystemMessageRemote(systemMessageRemoteId: string) {
      this.loading = true;
      if (!this.canDeleteMessageRemote(systemMessageRemoteId)) {
        return { error: new Error("System message remote is still referenced by messages.") };
      }

      const result = {
        data: {},
        error: undefined as any
      }

      try {
        await api({
          url: `oms/systemMessageRemotes/${encodeURIComponent(systemMessageRemoteId)}`,
          method: "DELETE"
        });

        this.currentSystemMessageRemote = undefined;

        result.data = { success: true }
      } catch (err) {
        logger.error("Failed to delete system message remote", err);
        result.error = err
      } finally {
        this.loading = false;
      }
      return result
    },
    async fetchSystemMessageStatusMetadata() {
      this.loading = true;
      try {

        await useUtilStore().fetchStatusItemsByType("SystemMessage");

        this.systemMessageStatusTypes = clone(mockStatusTypes);
        this.systemMessageStatusFlows = clone(mockStatusFlows);
        this.systemMessageStatusTransitions = clone(mockStatusFlowTransitions);
        // User requested fetching enumerations on app load
        await Promise.all([
          this.fetchEnumerations(),
          this.fetchEnumerationTypes()
        ]);
      } catch (err) {
        logger.error("Failed to fetch system message status metadata", err);
      } finally {
        this.loading = false;
      }
    },
    async fetchEnumerations() {
      this.loading = true;
      try {
        const response = await api({
          url: API_ENDPOINTS.enumerations,
          method: "GET",
          params: { pageSize: 500 } // Fetch a large batch for the app load
        });
        const entities = getResponseEntity(response);
        if (entities) {
          this.enums = entities;
          return entities;
        }
      } catch (err) {
        logger.error("Failed to fetch all enumerations, falling back to mock", err);
        this.enums = clone(mockEnums);
        return this.enums;
      } finally {
        this.loading = false;
      }
    },
    async fetchEnumerationTypes() {
      this.loading = true;
      try {
        const response = await api({
          url: API_ENDPOINTS.enumerationTypes,
          method: "GET"
        });
        const entities = getResponseEntity(response);
        if (entities) {
          this.enumerationTypes = entities;
          return entities;
        }
      } catch (err) {
        logger.error("Failed to fetch all enumeration types, falling back to mock", err);
        this.enumerationTypes = clone(mockEnumerationTypes);
        return this.enumerationTypes;
      } finally {
        this.loading = false;
      }
    },
    async fetchEnumerationById(enumId: string) {
      this.loading = true;
      try {
        const response = await api({
          url: `${API_ENDPOINTS.enumerations}/${encodeURIComponent(enumId)}`,
          method: "GET"
        });
        const entity = getResponseEntity(response);
        if (entity) {
          this.currentEnum = entity;
          return entity;
        }
      } catch (err) {
        logger.error("Failed to fetch enumeration", err);
        this.currentEnum = this.enums.find((e: any) => e.enumId === enumId);
        return this.currentEnum;
      } finally {
        this.loading = false;
      }
    },
    async fetchEnumerationTypeById(enumTypeId: string) {
      this.loading = true;
      try {
        const response = await api({
          url: `${API_ENDPOINTS.enumerationTypes}/${encodeURIComponent(enumTypeId)}`,
          method: "GET"
        });
        const entity = getResponseEntity(response);
        if (entity) {
          this.currentEnumType = entity;
          return entity;
        }
      } catch (err) {
        logger.error("Failed to fetch enumeration type", err);
        this.currentEnumType = this.enumerationTypes.find((t: any) => t.enumTypeId === enumTypeId);
        return this.currentEnumType;
      } finally {
        this.loading = false;
      }
    },
    async fetchEnumSequence(enumId: string) {
      this.loading = true;
      try {
        // 1. Find the root of the sequence by traversing backward
        let rootEnumId = enumId;
        const visitedBack = new Set();
        while (rootEnumId && !visitedBack.has(rootEnumId)) {
          visitedBack.add(rootEnumId);
          // Look for an enumeration that has this one as its relatedEnumId
          const parent = this.enums.find((e: any) => e.relatedEnumId === rootEnumId);
          if (parent) {
            rootEnumId = parent.enumId;
          } else {
            break;
          }
        }

        // 2. Build the forward sequence from the root
        const sequence = [];
        let currentEnumId: string | undefined = rootEnumId;
        const visitedForward = new Set();

        while (currentEnumId && !visitedForward.has(currentEnumId)) {
          visitedForward.add(currentEnumId);

          let enumeration = this.enums.find((e: any) => e.enumId === currentEnumId);

          // If not in local state, try one-off fetch (safeguard)
          if (!enumeration) {
            try {
              const response = await api({
                url: `${API_ENDPOINTS.enumerations}/${encodeURIComponent(currentEnumId)}`,
                method: "GET"
              });
              enumeration = getResponseEntity(response);
              if (enumeration) {
                this.enums.push(enumeration); // Cache it locally
              }
            } catch (err) {
              logger.error(`Failed to fetch missing enum in sequence: ${currentEnumId}`, err);
            }
          }

          if (enumeration) {
            sequence.push(enumeration);
            currentEnumId = enumeration.relatedEnumId;
          } else {
            break;
          }
        }
        this.currentEnumSequence = sequence;
        return sequence;
      } finally {
        this.loading = false;
      }
    },
    async fetchAllRelatedMessages(systemMessageId: string, remoteMessageId?: string) {
      this.loading = true;
      try {
        // Query for messages linked by remoteMessageId or parentMessageId
        // In a real app, this would be a complex query. For mock, we'll scan.
        const linked = this.allSystemMessages.filter((m: any) =>
          m.remoteMessageId === systemMessageId ||
          m.parentMessageId === systemMessageId ||
          (remoteMessageId && m.remoteMessageId === remoteMessageId)
        );
        this.linkedMessages = linked;
        return linked;
      } finally {
        this.loading = false;
      }
    }
  }
});
