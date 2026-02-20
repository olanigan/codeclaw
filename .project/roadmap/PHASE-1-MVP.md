# Phase 1: MVP - Autonomous Agent Delegation

**Timeline**: 7-8 weeks | **Priority**: High | **Focus**: Core SDKs with audit trail support

## Goal
Enable autonomous agents to delegate actions across agents with complete traceability.

## SDKs Included

### 1. Agent Runtime SDK (Weeks 1-2)
**Purpose**: Core agent execution with session management

**Key Features**:
- ✅ Session lifecycle (create, restore, delete)
- ✅ Tool registration and execution
- ✅ Model selection and failover
- ✅ Context compression
- ✅ Token usage tracking
- ✅ Comprehensive audit trails

**Deliverables**:
- `@openclaw/agent-runtime` npm package
- TypeScript interfaces for agent config/session/tool
- Session store abstraction
- Test suite (unit + integration)
- Documentation with examples

**Effort**: 3-5 days

**Exit Criteria**:
- [ ] Agent runtime tests pass (100% coverage of public API)
- [ ] Session persistence works end-to-end
- [ ] Tool execution with approval works
- [ ] Audit events properly correlated with sessionId

---

### 2. Channel Abstraction SDK (Weeks 2-3)
**Purpose**: Unified multi-channel messaging

**Key Features**:
- ✅ ChannelManager orchestrator
- ✅ Message normalization
- ✅ Account management
- ✅ Security policy enforcement
- ✅ Per-channel audit hooks

**Deliverables**:
- `@openclaw/channel-sdk` (update plugin-sdk)
- ChannelManager class
- Message normalization utilities
- Channel audit logging
- Integration tests with mock channels

**Effort**: 4-6 days

**Exit Criteria**:
- [ ] Messages normalize correctly across all channel types
- [ ] Security checks work (allowlist, DM policy)
- [ ] Audit events capture all message actions
- [ ] Integration tests with 3+ channel types pass

---

### 3. Tool Integration SDK (Week 3-4)
**Purpose**: Tool discovery and execution with approval

**Key Features**:
- ✅ ToolRegistry
- ✅ ToolExecutor with approval flows
- ✅ ApprovalManager
- ✅ Tool audit logging

**Deliverables**:
- `@openclaw/tool-sdk` npm package
- ToolRegistry and ToolExecutor classes
- Approval request/decision workflow
- Tool audit logging
- Test suite

**Effort**: 3-4 days

**Exit Criteria**:
- [ ] Tool discovery and execution works
- [ ] Approval flows work (approve/deny/timeout)
- [ ] Audit trail captures all tool actions
- [ ] Tests for approval timeout handling

---

### 4. Unified Audit Framework (Weeks 2-3, parallel)
**Purpose**: Complete action traceability

**Key Features**:
- ✅ Unified AuditEvent schema
- ✅ Correlation ID propagation
- ✅ Append-only audit log storage
- ✅ Audit query interface
- ✅ Sanitization (no sensitive data)

**Deliverables**:
- `@openclaw/audit-sdk` npm package
- AuditEvent type definitions
- AuditLog with append-only storage
- AuditQuery interface
- Example queries (find by user, by tool, by correlation)

**Effort**: 4-5 days

**Exit Criteria**:
- [ ] All SDKs emit audit events
- [ ] Correlation IDs trace end-to-end
- [ ] Query interface works (by user, by type, by time)
- [ ] Sensitive data is sanitized
- [ ] Tests for audit logging

---

## Integration Points

### Message Flow with Audit
```
User → Channel → Gateway → Agent → Tool → Channel → User

Each step emits audit events:
1. message.received (channel)
2. session.restored (agent)
3. tool.invoked (agent)
4. approval.requested (tool)
5. approval.granted (tool)
6. tool.executed (agent)
7. message.sent (channel)

All correlated by: correlationId=msg-abc123
Traced by user: userId=user123
Scoped to session: sessionId=session456
```

### Example: Complete Audit Trail
```
correlationId: "msg-123",
events: [
  {
    type: "message.received",
    correlationId: "msg-123",
    channel: "telegram",
    from: "user123",
    timestamp: "2026-02-20T10:00:00Z"
  },
  {
    type: "session.restored",
    correlationId: "msg-123",
    sessionId: "session-456",
    userId: "user123",
    timestamp: "2026-02-20T10:00:01Z"
  },
  {
    type: "tool.invoked",
    correlationId: "msg-123",
    toolId: "weather",
    userId: "user123",
    timestamp: "2026-02-20T10:00:02Z"
  },
  {
    type: "approval.requested",
    correlationId: "msg-123",
    toolId: "weather",
    timestamp: "2026-02-20T10:00:02Z"
  },
  {
    type: "approval.granted",
    correlationId: "msg-123",
    approverId: "admin123",
    timestamp: "2026-02-20T10:00:03Z"
  },
  {
    type: "tool.executed",
    correlationId: "msg-123",
    toolId: "weather",
    status: "success",
    duration: 500,
    timestamp: "2026-02-20T10:00:03Z"
  },
  {
    type: "message.sent",
    correlationId: "msg-123",
    channel: "telegram",
    to: "user123",
    status: "sent",
    timestamp: "2026-02-20T10:00:04Z"
  }
]
```

## Success Criteria

### Functional
- [ ] Autonomous agents can create and restore sessions
- [ ] Tools can be executed with approval workflow
- [ ] Messages flow through channels
- [ ] All actions are auditable and traceable

### Quality
- [ ] 100% test coverage on public APIs
- [ ] Integration tests pass (message → agent → tool → channel)
- [ ] Performance: < 5% overhead from audit logging
- [ ] No sensitive data in audit logs

### Documentation
- [ ] README for each SDK
- [ ] API documentation with examples
- [ ] Audit trail guide
- [ ] Integration guide

### Deployment
- [ ] NPM packages published
- [ ] Version 1.0.0 released
- [ ] Backwards compatibility maintained with existing APIs

## Milestone Timeline

| Week | Milestone | SDKs | Status |
|------|-----------|------|--------|
| 1-2 | Agent Runtime | #1 | 🎯 Core |
| 2-3 | Audit Framework | #4 | ⚙️ Foundation |
| 2-3 | Channel SDK | #2 | 🎯 Core |
| 3-4 | Tool SDK | #3 | 🎯 Core |
| 4-5 | Integration | All | 🔗 Integration |
| 5-6 | Testing | All | ✅ QA |
| 6-7 | Documentation | All | 📖 Docs |
| 7-8 | Release | All | 🚀 Release |

## Risk Mitigation

**Risk**: Session persistence complexity
- **Mitigation**: Use existing JSONL format, simple abstraction
- **Fallback**: Keep current session logic, wrap with interface

**Risk**: Audit event overhead
- **Mitigation**: Async event emission, no-op audit log option
- **Fallback**: Batch events, optimize storage

**Risk**: Channel abstraction leakiness
- **Mitigation**: Comprehensive normalization tests
- **Fallback**: Per-channel SDKs if abstraction insufficient

**Risk**: Tool execution safety
- **Mitigation**: Approval workflows, test with many tool types
- **Fallback**: Make approval required by default

## Success Indicators

Post-Phase 1:
- Developers can delegate agent tasks with full visibility
- All agent actions are traceable via audit log
- Tool execution is safe with approval workflows
- Channel communication is abstract and testable

## Next Steps

After Phase 1 completes:
1. **Gather Feedback**: Get developer feedback on SDKs
2. **Performance Tuning**: Optimize based on usage patterns
3. **Phase 2 Planning**: Schedule plugin/config/memory SDKs
4. **Enterprise Hardening**: Add advanced observability features

---

**Owner**: Agent Team
**Status**: Not Started
**Dependencies**: None
**Blockers**: None
