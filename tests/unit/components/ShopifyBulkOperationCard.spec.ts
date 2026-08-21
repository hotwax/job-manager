import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ShopifyBulkOperationCard from "@/components/ShopifyBulkOperationCard.vue";

describe("ShopifyBulkOperationCard.vue", () => {
  it("renders a running operation and its HotWax message", () => {
    const operation = {
      id: "gid://shopify/BulkOperation/123",
      shopifyOperationId: "123",
      status: "RUNNING",
      type: "MUTATION",
      createdAt: "2023-10-27T10:00:00Z",
      hotwaxMessage: {
        systemMessageId: "MSG-456",
        systemMessageTypeId: "ImportOrders",
        description: "Import Orders",
        jobRunId: "RUN-789",
        statusId: "SmsgProduced"
      }
    };

    const wrapper = mount(ShopifyBulkOperationCard, {
      props: {
        operation,
        enrichmentAvailable: true
      }
    });

    expect(wrapper.text()).toContain("#123");
    expect(wrapper.text()).toContain("Import Orders");
    expect(wrapper.text()).toContain("Running");
    expect(wrapper.text()).toContain("Mutation");

    // The component emits 'view-system-message' when the HotWax message is clicked.
    // Wait, the hotwax-link is an ion-item.
    const hotwaxItem = wrapper.find(".hotwax-link");
    expect(hotwaxItem.exists()).toBe(true);
    hotwaxItem.trigger("click");
    expect(wrapper.emitted()["view-system-message"]).toBeTruthy();
    expect(wrapper.emitted()["view-system-message"][0]).toEqual(["MSG-456"]);
  });

  it("handles missing HotWax message correctly", () => {
    const operation = {
      id: "gid://shopify/BulkOperation/123",
      shopifyOperationId: "123",
      status: "COMPLETED",
      type: "QUERY",
      url: "https://example.com/result.jsonl"
    };

    const wrapper = mount(ShopifyBulkOperationCard, {
      props: {
        operation,
        enrichmentAvailable: true
      }
    });

    expect(wrapper.text()).toContain("No HotWax message found for this operation");
    expect(wrapper.text()).toContain("Result file");

    // Triggering copy-id
    const copyButton = wrapper.findAll("ion-button").find(btn => btn.text().includes("Copy operation ID"));
    expect(copyButton?.exists()).toBe(true);
    copyButton?.trigger("click");
    expect(wrapper.emitted()["copy-id"]).toBeTruthy();
    expect(wrapper.emitted()["copy-id"][0]).toEqual(["gid://shopify/BulkOperation/123"]);
  });
});
