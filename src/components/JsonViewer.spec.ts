import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import JsonViewer from "@/components/JsonViewer.vue";

vi.mock("@common", () => ({
  translate: (key: string) => key
}));

const mountViewer = (data: unknown) => mount(JsonViewer, {
  props: {
    data,
    search: ""
  },
  global: {
    stubs: {
      IonButton: {
        emits: ["click"],
        template: "<button class='ion-button' @click=\"$emit('click', $event)\"><slot /></button>"
      },
      IonIcon: {
        template: "<span />"
      }
    }
  }
});

describe("JsonViewer", () => {
  it("keeps large collections windowed until the user requests more", async () => {
    const wrapper = mountViewer(Array.from({ length: 120 }, (_, index) => index));

    expect(wrapper.findAll(".jt-node")).toHaveLength(51);

    const showMore = () => wrapper.findAll("button")
      .find((button) => button.text().includes("Show more"));

    await showMore()?.trigger("click");
    expect(wrapper.findAll(".jt-node")).toHaveLength(101);

    await showMore()?.trigger("click");
    expect(wrapper.findAll(".jt-node")).toHaveLength(121);
  });

  it("expands and collapses every mounted level through the bulk controls", async () => {
    const data = {
      level1: {
        level2: {
          level3: {
            level4: {
              value: "deep-value"
            }
          }
        }
      }
    };
    const wrapper = mountViewer(data);
    const toolbarButtons = wrapper.findAll(".jv-toolbar button");

    expect(wrapper.text()).not.toContain("deep-value");

    await toolbarButtons[0].trigger("click");
    await nextTick();
    await nextTick();
    expect(wrapper.text()).toContain("deep-value");

    await toolbarButtons[1].trigger("click");
    await nextTick();
    expect(wrapper.findAll(".jt-node")).toHaveLength(1);
  });
});
