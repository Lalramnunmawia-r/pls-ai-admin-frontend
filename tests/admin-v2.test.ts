import { describe, expect, it } from "vitest";
import { flattenSubtopics, moveId, type V2Subtopic } from "../src/lib/api/admin-v2";

const node = (id: string, children: V2Subtopic[] = []): V2Subtopic => ({
  id,
  chapter_id: "ch",
  parent_id: null,
  title: id,
  section_number: null,
  sort_order: 0,
  depth: 0,
  hidden: false,
  children
});

describe("moveId", () => {
  it("swaps with the neighbour in the given direction", () => {
    expect(moveId(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveId(["a", "b", "c"], "b", 1)).toEqual(["a", "c", "b"]);
  });

  it("returns null at the edges or for unknown ids", () => {
    expect(moveId(["a", "b"], "a", -1)).toBeNull();
    expect(moveId(["a", "b"], "b", 1)).toBeNull();
    expect(moveId(["a", "b"], "z", 1)).toBeNull();
  });
});

describe("flattenSubtopics", () => {
  it("lists nodes depth-first", () => {
    const tree = [node("1", [node("1.1", [node("1.1.1")]), node("1.2")]), node("2")];
    expect(flattenSubtopics(tree).map((n) => n.id)).toEqual(["1", "1.1", "1.1.1", "1.2", "2"]);
  });
});
