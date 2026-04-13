import { api } from "@common";
import { defineStore } from "pinia";
import { getDateAndTime } from "@/utils";

import logger from "@/logger";
import { useUtilStore } from "./util";

const API_ENDPOINTS = {
  systemMessageTypes: "system/message/types",
  systemMessageRemotes: "system/message/remotes",
  systemMessages: "system/messages",
  systemMessageEntity: "moqui/entities/moqui.service.message.SystemMessage",
  enumerations: "moqui/entities/moqui.basic.Enumeration",
};

const getMessageCounts = (messages: any[]) => ({
  sent: messages.filter((message: any) => message.statusId === "SmsgSent").length,
  error: messages.filter((message: any) => message.statusId === "SmsgError").length,
  consumed: messages.filter((message: any) => message.statusId === "SmsgConsumed").length
});

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

const updateMessages = (messages: any[], payload: Record<string, any>) => {
  return messages.map((message: any) =>
    message.systemMessageId === payload.systemMessageId ? { ...message, ...payload } : message
  );
};

const canUseMockFallback = (error: any) => !error?.response;

const loadMockState = () => ({
  systemMessageTypes: [],
  allSystemMessages: [],
  systemMessages: [],
  systemMessageRemotes: [],
  systemMessageErrors: [] as any[],
  currentSystemMessage: undefined as Record<string, any> | undefined,
  currentSystemMessageType: undefined as Record<string, any> | undefined,
  currentSystemMessageRemote: undefined as Record<string, any> | undefined,
  currentEnumSequence: [] as any[],
  relatedMessages: [] as any[],
  linkedMessages: [] as any[],
  systemMessageTotal: 0,
  loading: false,
  enums: [] as any[]
});

export const useSystemMessageStore = defineStore("systemMessage", {
  state: loadMockState,
  getters: {
    getSystemMessageTypes: (state: any) => state.systemMessageTypes,
    getSystemMessages: (state: any) => state.systemMessages,
    getSystemMessageRemotes: (state: any) => state.systemMessageRemotes,
    getSystemMessageErrors: (state: any) => state.systemMessageErrors,
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
    getEnumInfo: (state: any) => (enumId: string) => state.enums.find((e: any) => e.enumId === enumId),
    getCurrentEnumSequence: (state: any) => state.currentEnumSequence,
    getLinkedMessages: (state: any) => state.linkedMessages,
    getSystemMessageTotal: (state: any) => state.systemMessageTotal,
    getRelatedMessages: (state: any) => state.relatedMessages,
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
        { label: "System Message Id", value: message.systemMessageId },
        { label: "Status Id", value: message.statusId },
        { label: "Init Date", value: getDateAndTime(message.initDate) },
        { label: "Processed Date", value: getDateAndTime(message.processedDate) },
        { label: "Last Attempt Date", value: getDateAndTime(message.lastAttemptDate) },
        { label: "Is Outgoing", value: message.isOutgoing },
        { label: "Remote Message Id", value: message.remoteMessageId }
      ];

      if (message.parentMessageId) {
        const parent = state.relatedMessages.find((rel: any) => rel.systemMessageId === message.parentMessageId);
        const field: any = { label: "Parent Message Id", value: message.parentMessageId };

        if (parent) {
          field.link = `/system-messages/${message.parentMessageId}`;
        } else {
          field.info = "The parent message has been purged";
        }
        fields.push(field);
      }

      return fields.filter(field => field.value !== undefined && field.value !== null);
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

        if(response.data?.systemMessagesCount) {
          this.systemMessages = response.data.systemMessages;
          this.systemMessageTotal = response.data.systemMessagesCount;
          return;
        }

        throw new Error("System messages API did not return a collection payload.");
      } catch (err) {
        logger.error("Failed to fetch system messages", err);
        this.systemMessages = []
        this.systemMessageTotal = 0;
      } finally {
        this.loading = false;
      }
    },
    async fetchSystemMessageById(systemMessageId: string, skipSetCurrent = false) {
      this.loading = true;

      try {
        const response = await api({
          url: "admin/systemMessages",
          method: "GET",
          params: {
            systemMessageId: encodeURIComponent(systemMessageId),
            pageSize: 1
          }
        });

        if(response.data?.systemMessages) {
          if(!skipSetCurrent) {
            this.currentSystemMessage = response.data?.systemMessages[0];
          }
          return response.data?.systemMessages[0];
        }

        throw new Error(`Failed to fetch system message information for ${systemMessageId}`);
      } catch (err) {
        logger.error(`Failed to fetch system message ${systemMessageId}`, err);
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

        if(response.data?.systemMessageRemoteList?.length) {
          this.systemMessageRemotes = response.data.systemMessageRemoteList;
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

        if(response?.data?.systemMessageRemoteList && response.data.systemMessageRemoteList[0]?.systemMessageRemoteId) {
          this.currentSystemMessageRemote = response.data.systemMessageRemoteList[0];
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
          url: `admin/systemMessages/${encodeURIComponent(systemMessageId)}/errors`,
          method: "GET",
          params: {
            pageSize: 250,
            pageIndex: 0
          }
        });

        if(response.data.length) {
          this.systemMessageErrors = response.data;
          return;
        }

        throw new Error("System message errors API did not return a collection payload.");
      } catch (err) {
        logger.error("Failed to fetch system message errors", err);
      } finally {
        this.loading = false;
      }
    },
    async fetchRelatedMessages() {
      this.loading = true;
      const related = [] as any[];

      if(!this.currentSystemMessage?.systemMessageId) {
        this.relatedMessages = [];
        return;
      }

      try {
        const msg = this.currentSystemMessage
        // 1. Safe Parent Fetch
        if(msg.parentMessageId) {
          try {
            const parent = await this.fetchSystemMessageById(msg.parentMessageId, true);
            if(parent) {
              related.push({ ...parent, relationship: 'parent' });
            }
          } catch (e) {
            logger.warn("Parent message not found or fetch failed", msg.parentMessageId);
          }
        }

        // 2. Children Fetch
        try {
          const response = await api({
            url: "admin/systemMessages",
            method: "GET",
            params: {
              parentMessageId: this.currentSystemMessage.systemMessageId,
              pageSize: 50
            }
          });

          if(response.data.systemMessagesCount) {
            response.data.systemMessages.forEach((message: any) => {
              related.push({ ...message, relationship: "child" });
            });
          }
        } catch (e) {
          logger.warn("Failed to fetch children messages from API, falling back to mock", e);
        }
      } catch (err) {
        logger.error("Failed to resolve base message for related messages", err);
      } finally {
        this.loading = false;
      }
      this.relatedMessages = related;
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

      const result = {
        data: {},
        error: undefined as any
      }

      try {
        await api({
          url: `admin/systemMessages/types/${encodeURIComponent(payload.systemMessageTypeId)}`,
          method: "PUT",
          data: payload
        });

        this.currentSystemMessageType = payload;

        result.data = { success: true, entity: payload }
      } catch (err) {
        logger.error("Failed to save system message type", err);

        result.error = err
      } finally {
        this.loading = false;
      }

      return result
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

      if (!this.canDeleteMessageType(systemMessageTypeId)) {
        return { error: new Error("System message type is still referenced by messages.") };
      }

      const result = {
        data: {},
        error: undefined as any
      }

      try {
        await api({
          url: `admin/systemMessages/types/${encodeURIComponent(systemMessageTypeId)}`,
          method: "DELETE"
        });
        
        this.currentSystemMessageType = undefined;

        result.data = { success: true }
      } catch (err) {
        logger.error("Failed to delete system message type", err);

        result.error = err
      } finally {
        this.loading = false;
      }

      return result
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
        await useUtilStore().fetchStatusFlowTransitions();
        // User requested fetching enumerations on app load
        await this.fetchEnumerations()
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
          url: "admin/enums",
          method: "GET",
          params: {
            pageSize: 500,
            enumTypeId: "ShopifyMessageTypeEnum"
          }
        });
        if(response.data) {
          this.enums = response.data;
        }
      } catch (err) {
        logger.error("Failed to fetch enumerations", err);
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
        let currentEnumId: string = rootEnumId;
        const visitedForward = new Set();

        while (currentEnumId && !visitedForward.has(currentEnumId)) {
          visitedForward.add(currentEnumId);

          let enumeration = this.enums.find((e: any) => e.enumId === currentEnumId);

          // If not in local state, try one-off fetch (safeguard)
          if (!enumeration) {
            try {
              const response = await api({
                url: "admin/enums",
                method: "GET",
                params: {
                  pageSize: 500
                }
              });
              enumeration = getResponseEntity(response);
              if (enumeration) {
                this.enums.push(enumeration); // Cache it locally
              }
            } catch (err) {
              logger.error(`Failed to fetch missing enum in sequence: ${currentEnumId}`, err);
            }
          }

          if(enumeration) {
            sequence.push(enumeration);
            currentEnumId = enumeration.relatedEnumId;
          } else {
            break;
          }
        }
        this.currentEnumSequence = sequence;
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
