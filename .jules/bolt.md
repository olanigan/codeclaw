
## 2026-02-21 - [File System Bottleneck in Hot Path]
**Learning:** `jidToE164` performed synchronous `fs.readFileSync` calls on every invocation for LID lookups, causing unnecessary I/O overhead in message processing loops.
**Action:** Implemented in-memory LRU caching for file-backed mappings. Check utility functions for hidden I/O operations in hot paths.
