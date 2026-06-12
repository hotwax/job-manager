import { computed, nextTick, ref, unref, watch, type ComputedRef, type Ref } from "vue";

export type KeyboardListFocusTarget = "input" | "result";

export interface KeyboardListNavigationState {
  activeIndex: number;
  focusTarget: KeyboardListFocusTarget;
  isInputTextSelected: boolean;
  selectActive?: boolean;
  selectInputText?: boolean;
}

interface KeyboardListNavigationAction {
  key: string;
  itemCount: number;
  onQuerySubmit?: () => void;
}

type MaybeRef<T> = T | Ref<T> | ComputedRef<T>;

interface KeyboardListNavigationOptions<T> {
  items: MaybeRef<T[]>;
  inputRef?: Ref<any>;
  listId?: string;
  getItemId?: (item: T, index: number) => string;
  onSelect: (item: T, index: number) => void;
  onQuerySubmit?: () => void;
}

const actionFlags = {
  selectActive: false,
  selectInputText: false
};

const withActionFlags = (state: KeyboardListNavigationState): Required<KeyboardListNavigationState> => ({
  ...state,
  selectActive: state.selectActive || false,
  selectInputText: state.selectInputText || false
});

const getClampedIndex = (index: number, itemCount: number) => {
  if (itemCount < 1) return -1;
  return Math.max(0, Math.min(index, itemCount - 1));
};

export const getKeyboardListNavigationState = (
  currentState: KeyboardListNavigationState,
  action: KeyboardListNavigationAction
) => {
  const itemCount = Math.max(0, action.itemCount);
  const state = withActionFlags(currentState);

  if (action.key === "Enter") {
    const activeIndex = getClampedIndex(state.activeIndex, itemCount);
    if (state.focusTarget === "result" && activeIndex > -1) {
      return {
        ...state,
        activeIndex,
        selectActive: true,
        selectInputText: false
      };
    }

    action.onQuerySubmit?.();
    return {
      ...state,
      activeIndex: -1,
      focusTarget: "input" as const,
      isInputTextSelected: true,
      selectActive: false,
      selectInputText: true
    };
  }

  if (action.key === "ArrowDown") {
    if (state.focusTarget === "input") {
      if (state.isInputTextSelected) {
        return {
          ...state,
          activeIndex: -1,
          isInputTextSelected: false,
          ...actionFlags
        };
      }

      return {
        ...state,
        activeIndex: itemCount ? 0 : -1,
        focusTarget: itemCount ? "result" as const : "input" as const,
        isInputTextSelected: false,
        ...actionFlags
      };
    }

    return {
      ...state,
      activeIndex: getClampedIndex(state.activeIndex + 1, itemCount),
      focusTarget: itemCount ? "result" as const : "input" as const,
      isInputTextSelected: false,
      ...actionFlags
    };
  }

  if (action.key === "ArrowUp") {
    if (state.focusTarget === "result") {
      const nextIndex = getClampedIndex(state.activeIndex - 1, itemCount);
      if (state.activeIndex <= 0 || nextIndex === -1) {
        return {
          ...state,
          activeIndex: -1,
          focusTarget: "input" as const,
          isInputTextSelected: true,
          selectActive: false,
          selectInputText: true
        };
      }

      return {
        ...state,
        activeIndex: nextIndex,
        isInputTextSelected: false,
        ...actionFlags
      };
    }
  }

  return {
    ...state,
    ...actionFlags
  };
};

const getElement = (element: any): HTMLElement | undefined => {
  return (element?.$el || element) as HTMLElement | undefined;
};

export const useKeyboardListNavigation = <T>(options: KeyboardListNavigationOptions<T>) => {
  const inputRef = options.inputRef || ref();
  const itemElements = ref<Array<HTMLElement | undefined>>([]);
  const activeIndex = ref(-1);
  const focusTarget = ref<KeyboardListFocusTarget>("input");
  const isInputTextSelected = ref(false);
  const listId = options.listId || `keyboard-list-${Math.random().toString(36).slice(2)}`;
  const items = computed(() => unref(options.items) || []);

  const getItemId = (item: T, index: number) => {
    return options.getItemId?.(item, index) || `${listId}-option-${index}`;
  };

  const activeDescendant = computed(() => {
    const item = items.value[activeIndex.value];
    return item ? getItemId(item, activeIndex.value) : undefined;
  });

  const setItemRef = (index: number, element: any) => {
    itemElements.value[index] = getElement(element);
  };

  const getInputElement = async (event?: KeyboardEvent): Promise<HTMLInputElement | undefined> => {
    const eventTarget = event?.target as HTMLInputElement | undefined;
    if (eventTarget?.tagName === "INPUT") return eventTarget;

    const inputElement = getElement(inputRef.value) as any;
    if (!inputElement) return undefined;
    if (inputElement.tagName === "INPUT") return inputElement as HTMLInputElement;
    if (typeof inputElement.getInputElement === "function") return inputElement.getInputElement();
    return inputElement.querySelector?.("input");
  };

  const focusInput = async (selectText = false, event?: KeyboardEvent) => {
    await nextTick();
    const inputElement = await getInputElement(event);
    inputElement?.focus();
    if (selectText) inputElement?.select();
  };

  const focusItem = async (index: number) => {
    await nextTick();
    const itemElement = itemElements.value[index] as any;
    if (!itemElement) return;
    if (typeof itemElement.setFocus === "function") {
      await itemElement.setFocus();
    } else {
      itemElement.focus?.();
    }
    itemElement.scrollIntoView?.({ block: "nearest" });
  };

  const applyState = async (nextState: Required<KeyboardListNavigationState>, event?: KeyboardEvent) => {
    activeIndex.value = nextState.activeIndex;
    focusTarget.value = nextState.focusTarget;
    isInputTextSelected.value = nextState.isInputTextSelected;

    if (nextState.selectActive) {
      const selectedItem = items.value[nextState.activeIndex];
      if (selectedItem) options.onSelect(selectedItem, nextState.activeIndex);
      return;
    }

    if (nextState.focusTarget === "input") {
      await focusInput(nextState.selectInputText, event);
    } else if (nextState.activeIndex > -1) {
      await focusItem(nextState.activeIndex);
    }
  };

  const navigate = async (event: KeyboardEvent, index?: number) => {
    if (!["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) return;

    event.preventDefault();
    event.stopPropagation();

    const nextState = getKeyboardListNavigationState(
      {
        activeIndex: index ?? activeIndex.value,
        focusTarget: index === undefined ? focusTarget.value : "result",
        isInputTextSelected: isInputTextSelected.value
      },
      {
        key: event.key,
        itemCount: items.value.length,
        onQuerySubmit: options.onQuerySubmit
      }
    );

    await applyState(nextState, event);
  };

  const handleInputKeydown = (event: KeyboardEvent) => navigate(event);
  const handleItemKeydown = (event: KeyboardEvent, index: number) => navigate(event, index);

  const resetNavigation = () => {
    activeIndex.value = -1;
    focusTarget.value = "input";
    isInputTextSelected.value = false;
  };

  const getItemAttributes = (item: T, index: number) => ({
    id: getItemId(item, index),
    role: "option",
    tabindex: activeIndex.value === index ? 0 : -1,
    "aria-selected": activeIndex.value === index ? "true" : "false",
    "data-keyboard-list-option": "true"
  });

  watch(() => items.value.length, (itemCount) => {
    if (activeIndex.value >= itemCount) {
      activeIndex.value = itemCount ? itemCount - 1 : -1;
      focusTarget.value = activeIndex.value > -1 ? "result" : "input";
    }
  });

  return {
    activeIndex,
    activeDescendant,
    focusTarget,
    inputRef,
    listId,
    handleInputKeydown,
    handleItemKeydown,
    getItemAttributes,
    resetNavigation,
    setItemRef
  };
};
