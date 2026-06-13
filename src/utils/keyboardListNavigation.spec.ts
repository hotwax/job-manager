import { describe, expect, it, vi } from "vitest";

import { getKeyboardListNavigationState } from "./keyboardListNavigation";

describe("keyboard list navigation", () => {
  it("keeps Enter on the input as a query submit and selects the input text", () => {
    const onQuerySubmit = vi.fn();
    const state = getKeyboardListNavigationState(
      { activeIndex: -1, focusTarget: "input", isInputTextSelected: false },
      { key: "Enter", itemCount: 3, onQuerySubmit }
    );

    expect(onQuerySubmit).toHaveBeenCalledTimes(1);
    expect(state).toEqual({
      activeIndex: -1,
      focusTarget: "input",
      isInputTextSelected: true,
      selectActive: false,
      selectInputText: true
    });
  });

  it("uses the first ArrowDown after selected input text to clear selection before moving into results", () => {
    const state = getKeyboardListNavigationState(
      { activeIndex: -1, focusTarget: "input", isInputTextSelected: true },
      { key: "ArrowDown", itemCount: 3 }
    );

    expect(state).toEqual({
      activeIndex: -1,
      focusTarget: "input",
      isInputTextSelected: false,
      selectActive: false,
      selectInputText: false
    });
  });

  it("moves from the input to the first selectable result on ArrowDown", () => {
    const state = getKeyboardListNavigationState(
      { activeIndex: -1, focusTarget: "input", isInputTextSelected: false },
      { key: "ArrowDown", itemCount: 3 }
    );

    expect(state).toEqual({
      activeIndex: 0,
      focusTarget: "result",
      isInputTextSelected: false,
      selectActive: false,
      selectInputText: false
    });
  });

  it("moves between result rows and returns to the input from the first row", () => {
    const secondRow = getKeyboardListNavigationState(
      { activeIndex: 0, focusTarget: "result", isInputTextSelected: false },
      { key: "ArrowDown", itemCount: 3 }
    );
    const backToFirstRow = getKeyboardListNavigationState(secondRow, { key: "ArrowUp", itemCount: 3 });
    const backToInput = getKeyboardListNavigationState(backToFirstRow, { key: "ArrowUp", itemCount: 3 });

    expect(secondRow.activeIndex).toBe(1);
    expect(secondRow.focusTarget).toBe("result");
    expect(backToFirstRow.activeIndex).toBe(0);
    expect(backToInput).toEqual({
      activeIndex: -1,
      focusTarget: "input",
      isInputTextSelected: true,
      selectActive: false,
      selectInputText: true
    });
  });

  it("selects the active result on Enter", () => {
    const state = getKeyboardListNavigationState(
      { activeIndex: 1, focusTarget: "result", isInputTextSelected: false },
      { key: "Enter", itemCount: 3 }
    );

    expect(state).toEqual({
      activeIndex: 1,
      focusTarget: "result",
      isInputTextSelected: false,
      selectActive: true,
      selectInputText: false
    });
  });
});
