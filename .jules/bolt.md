## 2025-02-22 - Map Iteration Optimization
**Learning:** `map.keys()` returns a new iterator object on each call. When pruning many items from a Map in a loop, repeatedly creating iterators is expensive (O(K) allocations).
**Action:** Lift the iterator creation outside the loop and reuse it when deleting multiple items sequentially.
