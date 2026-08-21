import { childPath, type JsonSearchIndex } from "@/utils/jsonSearch";

/**
 * One rendered line of the viewer. A container contributes an opening row, its visible
 * descendants, and a closing row, so the flat list reproduces the nesting of the tree while
 * staying indexable for virtualization.
 *
 * Display text is deliberately not precomputed here. Only the rows inside the viewport are
 * ever formatted, so flattening a large payload stays structural work.
 */
export type JsonRow = {
  id: string;
  kind: "node" | "close";
  path: string;
  name: string | number | null;
  value: any;
  depth: number;
  isContainer: boolean;
  isArray: boolean;
  childCount: number;
  open: boolean;
};

export type OpenResolver = (path: string) => boolean;

const containerSize = (value: any) =>
  Array.isArray(value) ? value.length : Object.keys(value).length;

/**
 * Produces the flat list of rows the viewer should display.
 *
 * Only expanded containers are descended into, so a collapsed subtree costs a single row no
 * matter how large it is. While a search is active, a container that hides a match is forced
 * open and its children are filtered down to the branches leading to matches, so the list
 * length tracks the size of the result set rather than the size of the payload.
 */
export function flattenJson(
  data: any,
  isOpen: OpenResolver,
  index: JsonSearchIndex | null
): JsonRow[] {
  const rows: JsonRow[] = [];

  const walk = (name: string | number | null, value: any, path: string, depth: number) => {
    const isContainer = value !== null && typeof value === "object";
    const isArray = isContainer && Array.isArray(value);
    const childCount = isContainer ? containerSize(value) : 0;
    // A revealed container holds a match, so it opens regardless of the user's own state.
    const revealed = !!index && index.revealed.has(path);
    const open = childCount > 0 && (revealed || isOpen(path));

    rows.push({
      id: `n:${path}`,
      kind: "node",
      path,
      name,
      value,
      depth,
      isContainer,
      isArray,
      childCount,
      open
    });

    if (!open) return;

    const keys = isArray ? null : Object.keys(value);
    const length = keys ? keys.length : value.length;
    for (let i = 0; i < length; i++) {
      const key = keys ? keys[i] : i;
      const child = keys ? value[key as string] : value[i];
      const path_ = childPath(path, key);
      // Inside a revealed container, show only the branches that lead to a match.
      if (revealed && !index!.matched.has(path_) && !index!.revealed.has(path_)) continue;
      walk(isArray ? i : (key as string), child, path_, depth + 1);
    }

    rows.push({
      id: `c:${path}`,
      kind: "close",
      path,
      name: null,
      value: null,
      depth,
      isContainer: true,
      isArray,
      childCount,
      open: true
    });
  };

  walk(null, data, "", 0);
  return rows;
}

export const primitiveText = (value: any) => {
  if (value === null) return "null";
  if (typeof value === "string") return `"${value}"`;
  return String(value);
};

export const primitiveClass = (value: any) => {
  if (value === null) return "jt-null";
  if (typeof value === "number") return "jt-number";
  if (typeof value === "boolean") return "jt-boolean";
  return "jt-string";
};
