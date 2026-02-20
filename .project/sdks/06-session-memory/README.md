# Session & Memory SDK

## Purpose
Session state persistence and semantic memory queries with temporal decay and pluggable backends.

## Key Responsibilities
- Session lifecycle (create, save, restore, delete, prune)
- Session JSONL storage (immutable snapshots)
- Message history management and compression
- Semantic search on session messages
- Embedding generation and storage
- Temporal decay for recency weighting
- Pluggable memory backends (SQLite, LanceDB)

## Current Implementation
**Location**:
- Session: `/src/agents/agent-scope.ts` + JSONL persistence
- Memory: `/src/memory/` (15 files)

**Key Files**:
- `manager.ts` - Memory API (store, query, summarize)
- `sqlite.ts` - SQLite backend with sqlite-vec
- `embeddings-*.ts` - Embedding providers
- `temporal-decay.ts` - Recency weighting
- `batch-*.ts` - Batch embedding uploads

## Reusability Score
**7/10** - Session logic is embedded, memory system is pluggable but coupled, extractable with refactoring

## Modularity Readiness
**Partially isolated**
- Session logic embedded in agent runtime (needs extraction)
- Memory system is mostly decoupled (good)
- Embedding providers are abstractable (good)
- Storage backends are pluggable (good)

## Dependencies
- `sqlite-vec` (external - vector search)
- `@voyage-ai/voyageai` (external - embeddings)
- `/src/infra/storage` (file operations)
- `/src/agents/` (session integration)

## Recommended SDK Exports

```typescript
// Session interface
export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: ISO;
  metadata?: Record<string, unknown>;
}

export interface SessionSnapshot {
  id: string;
  agentId: string;
  createdAt: ISO;
  updatedAt: ISO;
  messages: SessionMessage[];
  metadata: Record<string, unknown>;
  costTracking?: CostInfo;
}

// Session store
export interface SessionStore {
  create(agentId: string, initialMessages?: SessionMessage[]): Promise<SessionSnapshot>;
  load(sessionId: string): Promise<SessionSnapshot>;
  save(session: SessionSnapshot): Promise<void>;
  delete(sessionId: string): Promise<void>;
  list(agentId: string): Promise<SessionSnapshot[]>;
  prune(maxAge: Duration): Promise<number>;
  addMessage(sessionId: string, message: SessionMessage): Promise<void>;
  getMessages(sessionId: string, limit?: number, offset?: number): Promise<SessionMessage[]>;
}

// Memory query
export interface MemoryQuery {
  text: string;
  limit?: number;
  threshold?: number;
  recencyWeight?: number;
  sessionId?: string;
}

export interface MemoryResult {
  text: string;
  embedding?: number[];
  score: number;
  timestamp: ISO;
  age: Duration;
  sessionId?: string;
}

// Memory store
export interface MemoryStore {
  store(sessionId: string, text: string): Promise<void>;
  query(q: MemoryQuery): Promise<MemoryResult[]>;
  delete(sessionId: string): Promise<void>;
  deleteOlderThan(maxAge: Duration): Promise<number>;
  getStats(): Promise<MemoryStats>;
}

// Embedding provider
export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
  embeddingDimension: number;
  costPer1kTokens: number;
}

// Backend
export interface MemoryBackend {
  store(item: MemoryItem): Promise<void>;
  query(embedding: number[], limit: number, threshold: number): Promise<MemoryResult[]>;
  delete(sessionId: string): Promise<void>;
  close(): Promise<void>;
}

// Audit
export interface SessionAuditEvent {
  type: 'created' | 'loaded' | 'saved' | 'compressed' | 'deleted' | 'pruned';
  sessionId: string;
  timestamp: ISO;
  context?: Record<string, unknown>;
}

export interface MemoryAuditEvent {
  type: 'stored' | 'queried' | 'deleted' | 'reranked';
  sessionId?: string;
  timestamp: ISO;
  context?: Record<string, unknown>;
}

export class SessionMemoryAuditLog {
  onSessionEvent(event: SessionAuditEvent): void;
  onMemoryEvent(event: MemoryAuditEvent): void;
  query(filter: SessionMemoryAuditFilter): Promise<(SessionAuditEvent | MemoryAuditEvent)[]>;
}
```

## Audit Trail Hooks

| Event | Details |
|-------|---------|
| `session.created` | session_id, agent_id, user_id |
| `session.loaded` | session_id, message_count, age |
| `session.saved` | session_id, message_count, changes |
| `session.compressed` | session_id, old_size, new_size |
| `session.deleted` | session_id, reason |
| `session.pruned` | sessions_deleted, total_size_freed |
| `message.added` | session_id, message_id, role |
| `memory.stored` | session_id, text_hash, embedding_provider |
| `memory.queried` | query_text, results_count, duration |
| `memory.reranked` | session_id, original_count, reranked_count |
| `memory.deleted` | session_id, items_deleted |
| `temporal.decay` | memory_age_days, score_delta |

## Extraction Effort
**5-7 days**

### Subtasks
- [ ] Extract session logic from agent runtime
- [ ] Create SessionStore interface (abstract over JSONL)
- [ ] Formalize MemoryStore interface
- [ ] Create embedding provider abstraction
- [ ] Implement temporal decay weighting
- [ ] Add session/memory audit logging
- [ ] Write integration tests for queries

## Usage Example

```typescript
import {
  SessionStore,
  MemoryStore,
  EmbeddingProvider,
  SessionMemoryAuditLog
} from '@openclaw/session-memory';

// Initialize
const auditLog = new SessionMemoryAuditLog();
const sessionStore = new SessionStore({ auditLog });
const memoryStore = new MemoryStore({
  backend: new SQLiteMemoryBackend(),
  embeddingProvider: new VoyageAIEmbedding(),
  auditLog
});

// Create session
const session = await sessionStore.create('agent-123', [
  {
    id: 'msg-1',
    role: 'system',
    content: 'You are a helpful assistant.',
    timestamp: new Date().toISOString()
  }
]);
// Audit: session.created logged

// Add message
await sessionStore.addMessage(session.id, {
  id: 'msg-2',
  role: 'user',
  content: 'What is the weather in NYC?',
  timestamp: new Date().toISOString()
});
// Audit: message.added logged

// Store in memory
await memoryStore.store(session.id, 'User asked about NYC weather');
// Audit: memory.stored logged

// Query memory
const results = await memoryStore.query({
  text: 'weather in New York',
  limit: 5,
  recencyWeight: 0.3  // Recent memories weighted more
});
// Audit: memory.queried logged

console.log('Memory results:', results);

// Load session later
const restoredSession = await sessionStore.load(session.id);
// Audit: session.loaded logged

console.log('Session messages:', restoredSession.messages);

// Audit query
const events = await auditLog.query({
  types: ['session.created', 'memory.queried'],
  sessionId: session.id
});

console.log('Session audit trail:', events);

// Cleanup old sessions
const pruned = await sessionStore.prune({ days: 30 });
// Audit: session.pruned logged
```

## Related Documents
- [Foundation Modules Analysis](../../analysis/FOUNDATION-MODULES-ANALYSIS.md#session-memory-sdk)
- [Audit Trail Design](../../audit-trail/AUDIT-DESIGN.md)
- [Phase 2 Extended](../../roadmap/PHASE-2-EXTENDED.md)

## See Also
- Agent Runtime SDK - Uses sessions for conversation state
- Memory SDK Details - Advanced memory operations
- Config Management SDK - Config snapshots stored similarly
