export const systemMessageTypeFields = [
  { key: "systemMessageTypeId", label: "Type ID", type: "text" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "parentTypeId", label: "Parent Type", type: "text" },
  { key: "sendServiceName", label: "Send Service", type: "textarea" },
  { key: "consumeServiceName", label: "Consume Service", type: "textarea" },
  { key: "sendPath", label: "Send Path", type: "textarea" },
  { key: "receivePath", label: "Receive Path", type: "textarea" },
  { key: "receiveMovePath", label: "Receive Move Path", type: "textarea" },
  { key: "receiveFilePattern", label: "Receive File Pattern", type: "text" },
  { key: "receiveResponseEnumId", label: "Receive Response Enum", type: "text" }
];

export const systemMessageRemoteFields = [
  { key: "systemMessageRemoteId", label: "Remote ID", type: "text" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "sendUrl", label: "Send URL", type: "textarea" },
  { key: "receiveUrl", label: "Receive URL", type: "textarea" },
  { key: "username", label: "Username", type: "text" },
  { key: "password", label: "Password", type: "password" },
  { key: "authHeaderName", label: "Auth Header", type: "text" },
  { key: "privateKey", label: "Private Key", type: "password" },
  { key: "sharedSecret", label: "Shared Secret", type: "password" },
  { key: "sendSharedSecret", label: "Send Shared Secret", type: "password" },
  { key: "oldSharedSecret", label: "Old Shared Secret", type: "password" },
  { key: "remoteId", label: "Remote ID Value", type: "text" },
  { key: "remoteIdType", label: "Remote ID Type", type: "text" },
  { key: "internalId", label: "Internal ID", type: "text" },
  { key: "internalIdType", label: "Internal ID Type", type: "text" },
  { key: "remoteAppCode", label: "Remote App Code", type: "text" },
  { key: "accessScopeEnumId", label: "Access Scope", type: "text" },
  { key: "sendServiceName", label: "Send Service", type: "textarea" }
];
