export interface HotwaxMessage {
  systemMessageId: string;
  systemMessageTypeId: string;
  description?: string;
  jobRunId?: string;
  statusId: string;
  remoteMessageId?: string;
}

export interface ShopifyBulkOperation {
  id: string;
  shopifyOperationId: string;
  status: string;
  type: string;
  createdAt: string;
  completedAt?: string;
  objectCount?: number;
  rootObjectCount?: number;
  fileSize?: number;
  errorCode?: string;
  url?: string;
  partialDataUrl?: string;
  query?: string;
  hotwaxMessage?: HotwaxMessage;
}
