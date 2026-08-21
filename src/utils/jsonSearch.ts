import type { ComputedRef, InjectionKey } from "vue";

// Node paths are joined with a control character so that keys containing a "." cannot
// collide with the separator and reveal unrelated branches.
export const PATH_SEP = "\u0001";

export type JsonSearchIndex = {
  // Nodes whose own key or value matched the query.
  matched: Set<string>;
  // Containers that must render open because a match sits somewhere beneath them.
  revealed: Set<string>;
  total: number;
};

export const jsonSearchIndexKey: InjectionKey<ComputedRef<JsonSearchIndex>> = Symbol("jsonSearchIndex");

export const emptyJsonSearchIndex = (): JsonSearchIndex => ({
  matched: new Set<string>(),
  revealed: new Set<string>(),
  total: 0
});

export const childPath = (parentPath: string, key: string | number) =>
  parentPath ? `${parentPath}${PATH_SEP}${key}` : String(key);

/**
 * Walks the payload once and records which nodes match the query and which containers have
 * to be open to reveal them. Nodes then resolve their own state with a set lookup instead of
 * re-scanning their subtree, which is what made search O(n^2) per keystroke.
 *
 * Every match is recorded, with no ceiling: the viewer renders only the rows in the viewport,
 * so the cost of showing a result set no longer scales with its size.
 */
export function buildJsonSearchIndex(data: any, search: string): JsonSearchIndex {
  const index = emptyJsonSearchIndex();
  const query = search.trim().toLowerCase();
  if (!query) return index;

  const record = (path: string) => {
    // A node whose key and value both match is still a single row, and its ancestors are
    // already revealed, so recording it twice would overstate the count and redo the walk.
    if (index.matched.has(path)) return;
    index.matched.add(path);
    index.total += 1;
    // Walk up the path, marking every ancestor as revealed. Stops early once it reaches an
    // ancestor another match already revealed.
    let current = path;
    for (;;) {
      const sep = current.lastIndexOf(PATH_SEP);
      current = sep === -1 ? "" : current.slice(0, sep);
      if (index.revealed.has(current)) break;
      index.revealed.add(current);
      if (current === "") break;
    }
  };

  const walk = (value: any, path: string) => {
    if (value !== null && typeof value === "object") {
      const isArray = Array.isArray(value);
      // Object.keys() on a large array would allocate an array of index strings just to be
      // iterated, so arrays are walked by index instead.
      const keys = isArray ? null : Object.keys(value);
      const length = keys ? keys.length : value.length;

      for (let i = 0; i < length; i++) {
        const key = keys ? keys[i] : String(i);
        const child = keys ? value[key] : value[i];
        const path_ = childPath(path, key);
        if (key.toLowerCase().includes(query)) record(path_);
        walk(child, path_);
      }
      return;
    }

    const text = value === null ? "null" : String(value);
    if (text.toLowerCase().includes(query)) record(path);
  };

  walk(data, "");
  return index;
}
