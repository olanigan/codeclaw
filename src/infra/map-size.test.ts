import { describe, expect, it } from "vitest";
import { pruneMapToMaxSize } from "./map-size.js";

describe("pruneMapToMaxSize", () => {
  it("prunes map to max size", () => {
    const map = new Map<string, number>();
    for (let i = 0; i < 10; i++) {
      map.set(`k${i}`, i);
    }
    pruneMapToMaxSize(map, 5);
    expect(map.size).toBe(5);
    // Should keep the latest entries (which are inserted last)
    // The keys inserted first should be removed.
    // k0...k4 removed, k5...k9 kept.
    expect(map.has("k0")).toBe(false);
    expect(map.has("k4")).toBe(false);
    expect(map.has("k5")).toBe(true);
    expect(map.has("k9")).toBe(true);
  });

  it("does nothing if map is smaller than max size", () => {
    const map = new Map<string, number>();
    map.set("a", 1);
    map.set("b", 2);
    pruneMapToMaxSize(map, 5);
    expect(map.size).toBe(2);
    expect(map.get("a")).toBe(1);
    expect(map.get("b")).toBe(2);
  });

  it("clears map if max size is 0", () => {
    const map = new Map<string, number>();
    map.set("a", 1);
    pruneMapToMaxSize(map, 0);
    expect(map.size).toBe(0);
  });

  it("clears map if max size is negative", () => {
    const map = new Map<string, number>();
    map.set("a", 1);
    pruneMapToMaxSize(map, -1);
    expect(map.size).toBe(0);
  });

  it("handles empty map", () => {
    const map = new Map<string, number>();
    pruneMapToMaxSize(map, 5);
    expect(map.size).toBe(0);
  });

  it("handles max size equal to current size", () => {
    const map = new Map<string, number>();
    map.set("a", 1);
    map.set("b", 2);
    pruneMapToMaxSize(map, 2);
    expect(map.size).toBe(2);
  });
});
