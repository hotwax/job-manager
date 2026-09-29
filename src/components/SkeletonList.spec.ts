import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SkeletonList from "./SkeletonList.vue";

describe("SkeletonList.vue", () => {
  it("holds three rows by default, each a title and a detail line", () => {
    const wrapper = mount(SkeletonList);

    expect(wrapper.findAll("ion-item")).toHaveLength(3);
    expect(wrapper.findAll("ion-skeleton-text")).toHaveLength(6);
  });

  it("holds as many rows as it is asked for", () => {
    const wrapper = mount(SkeletonList, { props: { rows: 5 } });

    expect(wrapper.findAll("ion-item")).toHaveLength(5);
  });

  it("is hidden from assistive technology, because the busy region already says it is loading", () => {
    const wrapper = mount(SkeletonList);

    expect(wrapper.attributes("aria-hidden")).toBe("true");
  });

  it("varies its widths so it reads as text rather than a repeating bar", () => {
    const wrapper = mount(SkeletonList, { props: { rows: 3 } });

    const titleWidths = wrapper.findAll("h3 ion-skeleton-text").map((bar) => bar.attributes("style"));
    expect(new Set(titleWidths).size).toBe(3);
  });
});
