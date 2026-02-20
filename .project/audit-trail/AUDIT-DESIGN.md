# Audit Trail Design for Autonomous Delegated Agents

## Overview

All SDKs are designed with comprehensive audit trail support to enable complete traceability of agent actions. This document defines the unified audit event schema and patterns.

## Unified Audit Event Schema

All audit events follow this structure for end-to-end correlation:

```typescript
interface AuditEvent {
  // Identification
  id: string;                          // Unique event ID
  correlationId: string;               // Trace ID (session or request scoped)
  type: string;                        // Event type (e.g., 'tool.invoked')

  // Timing
  timestamp: ISO8601;                  // Event time (UTC)
  duration?: number;                   // Duration in milliseconds

  // Context
  userId?: string;                     // User initiating action
  sessionId?: string;                  // Session context
  agentId?: string;                    // Agent context
  requestId?: string;                  // Request context

  // Resource
  resourceId?: string;                 // Resource ID (tool_id, channel_id, etc.)
  resourceType?: string;               // Type of resource

  // Outcome
  status: 'success' | 'failure' | 'pending';
  result?: unknown;                    // Result or output
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };

  // Metadata
  tags?: string[];                     // Searchable tags
  metadata?: Record<string, unknown>;  // Custom context

  // Source
  source: string;                      // Which SDK/component emitted
}
```

## Correlation ID Strategy

Use correlation IDs to trace actions across system boundaries:

```typescript
// Generate at entry point
interface ExecutionContext {
  correlationId: string;     // Trace ID
  userId?: string;           // Who initiated
  sessionId?: string;        // Session context
  requestId?: string;        // Request context
}

// Pass through all async operations
async function execute(toolId: string, context: ExecutionContext) {
  const event = {
    correlationId: context.correlationId,
    userId: context.userId,
    sessionId: context.sessionId,
    // ... rest of event
  };
}
```

## Audit Trail Points by SDK

### Agent Runtime SDK

```
session.created
  → sessionId, agentId, userId, workspace, timestamp

session.restored
  → sessionId, message_count, restored_from_timestamp

tool.registered
  → toolId, schema (sanitized), source (plugin)

tool.invoked
  → toolId, params (sanitized), userId, correlationId, approvalRequired

tool.approved
  → toolId, approvalId, approverId, decision (approved/denied)

tool.executed
  → toolId, status, duration, resultSize, outputHash (not full output)

model.selected
  → model, provider, reason (primary/fallback)

context.compressed
  → sessionId, originalTokens, compressedTokens, method

session.deleted
  → sessionId, reason, deletedBy

cost.tracked
  → sessionId, provider, tokens, cost, model
```

### Channel Abstraction SDK

```
message.received
  → channelId, from (sender), to (target), textHash, timestamp

message.sent
  → channelId, to (target), status, deliveryTime

message.edited
  → messageId, originalHash, newHash, editorId

message.deleted
  → messageId, deleterId, reason?

reaction.added
  → messageId, emoji, userId, timestamp

account.linked
  → channelId, accountId, userId, linkTime

account.unlinked
  → channelId, accountId, userId, unlinkTime

security.check
  → channelId, policy_rule, sender, decision (allow/deny/block)

channel.connected
  → channelId, accountId, connectionTime

channel.disconnected
  → channelId, reason, disconnectionTime
```

### Tool Integration SDK

```
skill.loaded
  → skillId, version, toolCount, exports

tool.registered
  → toolId, paramsSchema (sanitized), registry

tool.searched
  → query, resultsCount, executionTime

tool.validated
  → toolId, paramsValid, validationErrors (sanitized)

tool.invoked
  → toolId, userId, paramsHash (not full params), correlationId

approval.requested
  → toolId, executionId, reason, requestedAt, expiresAt

approval.granted
  → approvalId, approverId, grantedAt

approval.denied
  → approvalId, denerId, reason?, deniedAt

approval.expired
  → approvalId, requestedAt, expiredAt

execution.started
  → executionId, toolId, userId, correlationId

execution.completed
  → executionId, status, duration, resultSize

execution.failed
  → executionId, errorType, errorMessage, duration

execution.timeout
  → executionId, toolId, timeoutMs, elapsed
```

### Plugin System SDK

```
plugin.discovered
  → pluginId, path, manifestVersion

plugin.loaded
  → pluginId, exportsCount, hooksCount

plugin.validated
  → pluginId, valid, errors (sanitized)

plugin.registered
  → pluginId, registrySlots, toolsRegistered

hook.registered
  → hookId, phase, pluginId, source

hook.invoked
  → hookId, phase, duration, status (success/failure)

hook.failed
  → hookId, phase, errorType, errorMessage

service.provided
  → pluginId, serviceId

service.invoked
  → serviceId, callerId, duration, status

plugin.enabled
  → pluginId, enabledAt

plugin.disabled
  → pluginId, reason, disabledAt

plugin.uninstalled
  → pluginId, cleanupStatus
```

### Config Management SDK

```
config.loaded
  → filePath, sizeBytes, parseTime, source

config.validated
  → schemaVersion, isValid, errorsCount

config.merged
  → sourceCount, mergeStrategy, changesCount

config.changed
  → path, oldValue (hash), newValue (hash), changedBy, changedAt

config.written
  → filePath, changesCount, writeTime, success

config.substituted
  → envVarsCount, varsSubstituted (sanitized list)

config.migrated
  → fromVersion, toVersion, changesCount

rollback
  → timestamp, revertedChanges, revertedBy

config.error
  → errorType, errorMessage, filePath
```

### Session & Memory SDK

```
session.created
  → sessionId, agentId, userId, initialMessages

session.loaded
  → sessionId, messageCount, age, loadTime

session.saved
  → sessionId, messageCount, changes, saveTime

session.compressed
  → sessionId, oldSize, newSize, compressionRatio

session.deleted
  → sessionId, reason, deletedBy

session.pruned
  → sessionsDeleted, totalFreed, prunedOlderThan

message.added
  → sessionId, messageId, role, timestamp

memory.stored
  → sessionId, textHash, embeddingProvider, tokens

memory.queried
  → queryHash, resultsCount, queryTime, threshold

memory.reranked
  → sessionId, originalCount, rerankedCount, strategy

memory.deleted
  → sessionId, itemsDeleted

temporal.decay
  → memoryAge, scoreDelta, decayFactor
```

## Audit Queries

### Example 1: Get all actions for a user in a session

```typescript
const events = await auditLog.query({
  userId: 'user123',
  sessionId: 'session456',
  startTime: '2026-02-20T00:00:00Z',
  endTime: '2026-02-21T00:00:00Z'
});

// Returns: All events (tool.invoked, message.sent, etc.) for this user/session
```

### Example 2: Find all tool executions requiring approval

```typescript
const events = await auditLog.query({
  types: ['tool.invoked', 'approval.requested', 'approval.granted'],
  tags: ['requires-approval'],
  status: 'success'
});

// Returns: All approved tool executions
```

### Example 3: Security decisions (what was blocked)

```typescript
const events = await auditLog.query({
  types: ['security.check'],
  'result.decision': 'deny'
});

// Returns: All security blocks with reasons
```

### Example 4: Trace a specific message through system

```typescript
const events = await auditLog.query({
  correlationId: 'msg-abc123'
});

// Returns: message.received → tool.invoked → security.check → message.sent
```

### Example 5: Audit compliance report

```typescript
const toolAudits = await auditLog.query({
  types: [
    'tool.registered',
    'tool.invoked',
    'approval.requested',
    'tool.executed'
  ],
  startTime: '2026-02-01T00:00:00Z'
});

console.log('Tool Audit Report:');
for (const event of toolAudits) {
  console.log(`${event.timestamp}: ${event.type} for ${event.resourceId}`);
  if (event.error) {
    console.log(`  Error: ${event.error.message}`);
  }
}
```

## Implementation Patterns

### Pattern 1: Audit-First Design

All SDKs accept optional audit log and emit events:

```typescript
class MySDK {
  constructor(options: { auditLog?: AuditLog }) {
    this.auditLog = options.auditLog || new NoOpAuditLog();
  }

  async action(context: ExecutionContext) {
    const startTime = Date.now();

    try {
      const result = await doAction();

      this.auditLog.emit({
        id: generateId(),
        correlationId: context.correlationId,
        type: 'action.completed',
        status: 'success',
        result: result,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        source: 'MySDK'
      });

      return result;
    } catch (error) {
      this.auditLog.emit({
        id: generateId(),
        correlationId: context.correlationId,
        type: 'action.failed',
        status: 'failure',
        error: {
          code: error.code,
          message: error.message
        },
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        source: 'MySDK'
      });

      throw error;
    }
  }
}
```

### Pattern 2: Structured Logging

Emit events at logical boundaries:

```typescript
// ✓ Good: Single event at operation boundary
await toolExecutor.execute(toolId, params, context);
// Emits: tool.executed once with final status

// ✗ Avoid: Multiple events for same operation
await toolExecutor.start(toolId);
// Emits: tool.started
await toolExecutor.run();
// Emits: tool.running
await toolExecutor.finish();
// Emits: tool.finished
```

### Pattern 3: Context Propagation

Pass correlation ID and user context through call chain:

```typescript
// Entry point
const context: ExecutionContext = {
  correlationId: generateTraceId(),
  userId: request.user.id,
  sessionId: request.sessionId
};

// Pass through SDKs
await agent.execute({
  sessionId: context.sessionId,
  message: msg,
  auditContext: context  // Include context
});

// Each SDK forwards context
await channelMgr.sendMessage(channelId, msg, context);
await toolExecutor.execute(toolId, params, context);
```

### Pattern 4: Sensitive Data Handling

Never log sensitive data, only hashes/IDs:

```typescript
// ✓ Good: Hash sensitive data
this.auditLog.emit({
  type: 'tool.invoked',
  paramsHash: sha256(JSON.stringify(params)),  // Hash, not plaintext
  toolId: 'shell-exec',
  // ...
});

// ✗ Avoid: Plaintext sensitive data
this.auditLog.emit({
  type: 'tool.invoked',
  params: { password: 'secret123' },  // NEVER DO THIS
  // ...
});
```

### Pattern 5: Search Optimization

Use tags for efficient queries:

```typescript
// Emit with searchable tags
this.auditLog.emit({
  type: 'tool.invoked',
  tags: ['requires-approval', 'shell-exec', 'high-risk'],
  // ... other fields
});

// Query efficiently
const events = await auditLog.query({
  tags: ['high-risk'],
  status: 'success'
});
```

## Storage Considerations

### Append-Only Log

Audit logs should be immutable:

```typescript
interface AuditStore {
  append(event: AuditEvent): Promise<void>;  // Only append, never modify/delete
  query(filter: QueryFilter): Promise<AuditEvent[]>;
}
```

### Retention Policy

Recommended retention periods:

- Critical events (auth, approval): **1 year**
- Tool executions: **6 months**
- Messages: **3 months**
- Debug events: **30 days**

### Archival

Periodically archive old events:

```typescript
// Archive to S3/cold storage
await auditStore.archive({
  before: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  destination: 's3://archive/audit-logs/'
});
```

## Security & Privacy

1. **Sensitive Data**: Never log passwords, API keys, PII
2. **Anonymization**: Use user IDs not names
3. **Access Control**: Restrict audit log access to admin users
4. **Integrity**: Use digital signatures for tamper detection
5. **Encryption**: Encrypt logs in transit and at rest

## Monitoring & Alerting

Set up alerts for:
- Failed tool executions
- Denied approvals
- Security blocks
- Config changes
- Plugin failures

```typescript
auditLog.on('*', (event) => {
  if (event.status === 'failure') {
    alerting.notify('audit_failure', {
      type: event.type,
      resource: event.resourceId,
      error: event.error
    });
  }
});
```

## Related Documents
- [Audit Events by SDK](./AUDIT-EVENTS.md)
- [Foundation Modules Analysis](../analysis/FOUNDATION-MODULES-ANALYSIS.md#audit-trail-design)
- [Agent Delegation Example](../examples/agent-delegation.ts)
