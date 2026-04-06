import {
  mockStatusFlowTransitions,
  mockStatusFlows,
  mockStatuses,
  mockStatusTypes
} from "@/mock/systemMessageStatus";

const SYSTEM_MESSAGE_STATUS_TYPE_ID = "SystemMessage";
const DEFAULT_STATUS_FLOW_ID = "Default";

type SystemMessageLike = {
  statusId?: string;
  isOutgoing?: string;
};

type StatusLike = {
  statusId?: string;
  statusTypeId?: string;
  description?: string;
};

type StatusFlowLike = {
  statusFlowId?: string;
  statusTypeId?: string;
};

type StatusFlowTransitionLike = {
  statusFlowId?: string;
  statusId?: string;
  toStatusId?: string;
  transitionName?: string;
  transitionSequence?: number;
};

export type SystemMessageStatusTransition = StatusFlowTransitionLike & {
  toStatusDescription: string;
  toStatusColor: string;
};

export const systemMessageStatuses = mockStatuses.filter(
  (status: StatusLike) => status.statusTypeId === SYSTEM_MESSAGE_STATUS_TYPE_ID
);

export const systemMessageStatusTypes = mockStatusTypes.filter(
  (statusType: StatusFlowLike) => statusType.statusTypeId === SYSTEM_MESSAGE_STATUS_TYPE_ID
);

export const systemMessageStatusFlows = mockStatusFlows.filter(
  (flow: StatusFlowLike) => !flow.statusTypeId || flow.statusTypeId === SYSTEM_MESSAGE_STATUS_TYPE_ID
);

export const systemMessageStatusFlowTransitions = mockStatusFlowTransitions.filter(
  (transition: StatusFlowTransitionLike) => transition.statusFlowId === DEFAULT_STATUS_FLOW_ID
);

const statusById = new Map(
  systemMessageStatuses.map((status: StatusLike) => [status.statusId, status] as const)
);

const transitionsByStatusId = systemMessageStatusFlowTransitions.reduce(
  (transitions, transition: StatusFlowTransitionLike) => {
    if (!transition.statusId) return transitions;
    const currentTransitions = transitions.get(transition.statusId) || [];
    currentTransitions.push(transition);
    transitions.set(transition.statusId, currentTransitions);
    return transitions;
  },
  new Map<string, StatusFlowTransitionLike[]>()
);

for (const transitionList of transitionsByStatusId.values()) {
  transitionList.sort((left, right) => {
    const leftSequence = left.transitionSequence ?? Number.MAX_SAFE_INTEGER;
    const rightSequence = right.transitionSequence ?? Number.MAX_SAFE_INTEGER;

    if (leftSequence !== rightSequence) {
      return leftSequence - rightSequence;
    }

    return (left.toStatusId || "").localeCompare(right.toStatusId || "");
  });
}

export const getSystemMessageStatus = (statusId?: string) => {
  if (!statusId) return undefined;
  return statusById.get(statusId);
};

export const getSystemMessageStatusDescription = (statusId?: string) => {
  return getSystemMessageStatus(statusId)?.description || statusId || "";
};

export const getSystemMessageStatusColor = (statusId?: string) => {
  switch (statusId) {
    case "SmsgConsumed":
    case "SmsgConfirmed":
      return "success";
    case "SmsgProduced":
    case "SmsgReceived":
    case "SmsgSending":
    case "SmsgSent":
    case "SmsgConsuming":
      return "primary";
    case "SmsgRejected":
      return "warning";
    case "SmsgError":
      return "danger";
    case "SmsgCancelled":
      return "medium";
    default:
      return "medium";
  }
};

const OUTGOING_HAPPY_PATH = ["SmsgCreated", "SmsgProduced", "SmsgSending", "SmsgSent", "SmsgConfirmed"];
const INCOMING_HAPPY_PATH = ["SmsgCreated", "SmsgReceived", "SmsgConsuming", "SmsgConsumed", "SmsgConfirmed"];

export const getFutureStatuses = (message?: SystemMessageLike | null): string[] => {
  if (!message?.statusId) return [];

  const happyPath = message.isOutgoing === "Y" ? OUTGOING_HAPPY_PATH : INCOMING_HAPPY_PATH;
  const currentIndex = happyPath.indexOf(message.statusId);

  // If status is not in happy path (e.g. SmsgError), find where it was last
  if (currentIndex === -1) {
    // Basic heuristic: if it's SmsgError, it's probably stuck after Created
    return message.isOutgoing === "Y" 
      ? OUTGOING_HAPPY_PATH.filter(s => s !== "SmsgCreated")
      : INCOMING_HAPPY_PATH.filter(s => s !== "SmsgCreated");
  }

  return happyPath.slice(currentIndex + 1);
};

export const getAllowedTransitions = (message?: SystemMessageLike | null): SystemMessageStatusTransition[] => {
  if (!message?.statusId) return [];

  return (transitionsByStatusId.get(message.statusId) || []).map((transition: StatusFlowTransitionLike) => ({
    ...transition,
    toStatusDescription: getSystemMessageStatusDescription(transition.toStatusId),
    toStatusColor: getSystemMessageStatusColor(transition.toStatusId)
  }));
};

