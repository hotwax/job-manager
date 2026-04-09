import { describe, expect, it } from "vitest";

import {
  getAllowedTransitions,
  getReplayTransitions
} from "@/utils/systemMessageReplay";

describe("system message replay helpers", () => {
  it("returns outgoing replay targets for outgoing error messages", () => {
    const transitions = getReplayTransitions({
      statusId: "SmsgError",
      isOutgoing: "Y"
    });

    expect(transitions.map((transition) => transition.toStatusId)).toEqual([
      "SmsgProduced",
      "SmsgSending",
      "SmsgSent"
    ]);
  });

  it("returns incoming replay targets for incoming error messages", () => {
    const transitions = getReplayTransitions({
      statusId: "SmsgError",
      isOutgoing: "N"
    });

    expect(new Set(transitions.map((transition) => transition.toStatusId))).toEqual(
      new Set(["SmsgReceived", "SmsgConsuming", "SmsgConsumed"])
    );
  });

  it("returns all allowed transitions for consumed and sent statuses", () => {
    expect(getAllowedTransitions({ statusId: "SmsgConsumed" }).map((transition) => transition.toStatusId)).toEqual([
      "SmsgCancelled",
      "SmsgConfirmed",
      "SmsgError",
      "SmsgRejected"
    ]);

    expect(getAllowedTransitions({ statusId: "SmsgSent" }).map((transition) => transition.toStatusId)).toEqual([
      "SmsgCancelled",
      "SmsgConfirmed",
      "SmsgError",
      "SmsgRejected"
    ]);
  });

  it("returns safe fallbacks for unknown statuses or missing direction", () => {
    expect(getAllowedTransitions({ statusId: "UNKNOWN_STATUS" })).toEqual([]);
    expect(getReplayTransitions({ statusId: "SmsgError" })).toEqual([]);
  });
});
