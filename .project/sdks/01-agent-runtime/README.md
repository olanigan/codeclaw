# Agent Runtime SDK

## Purpose
Core agent execution, session management, and tool invocation with comprehensive audit trails.

## Key Responsibilities
- Agent configuration and workspace setup
- Session lifecycle management (create, restore, delete, prune)
- Tool registration and execution
- Model selection and fallover
- Context window optimization via compression
- Token usage tracking and cost analysis
- Prompt caching for efficiency

## Current Implementation
**Location**: `/src/agents/` (314 files)

**Key Files**:
- `agent-scope.ts` - Configuration resolution & workspace setup
- `bash-tools.ts` family - Shell execution, PTY management
- `bootstrap-*.ts` - Workspace file injection
- `cache-trace.ts` - Prompt caching and token tracking
- `compaction.ts` - Context window optimization
- `anthropic.ts`, `openai.ts`, etc. - Model-specific integrations

## Reusability Score
**9/10** - Well-isolated, proven abstractions, minimal external coupling

## Modularity Readiness
**Already isolated** ✓
- Clear interfaces for session storage
- Pluggable model providers
- Tool registration API
- Session persistence abstraction

## Dependencies
- `@mariozechner/pi-agent-core` (external)
- `@mariozechner/pi-ai`, `@mariozechner/pi-coding-agent` (external)
- `/src/infra/` (low-level utilities)
- `/src/config/` (configuration)
- `/src/memory/` (semantic search)

## Recommended SDK Exports

```typescript
// Core interfaces
export interface AgentConfig {
  agentId: string;
  userId?: string;
  model: string;
  workspace?: string;
  systemPrompt?: string;
  tools?: AgentTool[];
  maxTokens?: number;
  approvalRequired?: boolean;
}

export interface AgentSession {
  id: string;
  agentId: string;
  createdAt: ISO;
  messages: Message[];
  metadata: Record<string, unknown>;
  costTracking: CostInfo;
}

export interface AgentTool {
  id: string;
  description: string;
  parameters: JsonSchema;
  execute(params: Record<string, unknown>): Promise<ToolResult>;
}

// Main API
export class AgentRuntime {
  constructor(options: { auditLog?: AuditLog });

  createSession(config: AgentConfig): Promise<AgentSession>;
  restoreSession(sessionId: string): Promise<AgentSession>;
  deleteSession(sessionId: string): Promise<void>;
  listSessions(agentId: string): Promise<AgentSession[]>;
  pruneSessions(maxAge: Duration): Promise<number>;

  registerTool(tool: AgentTool, source?: string): void;
  unregisterTool(toolId: string): void;

  execute(options: {
    sessionId: string;
    message: string;
    approvalHandler?: (req: ApprovalRequest) => Promise<boolean>;
  }): Promise<AgentResponse>;

  getSessionHistory(sessionId: string): Promise<Message[]>;
  compressContext(sessionId: string): Promise<CompressionResult>;

  getCostTracking(sessionId: string): Promise<CostInfo>;
}

// Audit Events
export interface AuditEvent {
  type: string;
  sessionId: string;
  timestamp: ISO;
  userId?: string;
  status: 'success' | 'failure' | 'pending';
  context?: Record<string, unknown>;
}

export class AuditLog {
  on(event: AuditEvent): void;
  query(filter: AuditFilter): Promise<AuditEvent[]>;
}
```

## Audit Trail Hooks

| Event | Details |
|-------|---------|
| `session.created` | agent_id, user, timestamp, workspace |
| `session.restored` | session_id, message_count, age |
| `session.deleted` | session_id, reason |
| `tool.registered` | tool_id, params_schema, source |
| `tool.invoked` | tool_id, params (sanitized), userId |
| `tool.approved` | approval_id, decision, approver |
| `tool.executed` | tool_id, status, duration, result_size |
| `model.selected` | model, provider, reason |
| `context.compressed` | session_id, old_tokens, new_tokens |
| `cost.tracked` | session_id, provider, tokens, cost |

## Extraction Effort
**3-5 days**

### Subtasks
- [ ] Extract session storage interface (abstraction over JSONL)
- [ ] Write TypeScript interfaces for SDK surface
- [ ] Create session lifecycle tests
- [ ] Implement audit event emission
- [ ] Document session storage contract
- [ ] Add cost tracking integration tests

## Usage Example

```typescript
import { AgentRuntime, AuditLog } from '@openclaw/agent-runtime';

// Initialize
const auditLog = new AuditLog();
const agent = new AgentRuntime({ auditLog });

// Create session
const session = await agent.createSession({
  agentId: 'assistant-001',
  userId: 'user@example.com',
  model: 'claude-3-sonnet'
});

// Execute with approval
const response = await agent.execute({
  sessionId: session.id,
  message: 'What is the weather?',
  approvalHandler: async (req) => {
    // Request human approval for sensitive operations
    return await human.approve(req);
  }
});

// Query audit trail
const events = await auditLog.query({
  sessionId: session.id,
  types: ['tool.invoked', 'tool.executed']
});
```

## Related Documents
- [Foundation Modules Analysis](../../analysis/FOUNDATION-MODULES-ANALYSIS.md#agent-runtime-sdk)
- [Audit Trail Design](../../audit-trail/AUDIT-DESIGN.md)
- [Phase 1 MVP](../../roadmap/PHASE-1-MVP.md)

## See Also
- Channel Abstraction SDK - How messages flow to agent
- Tool Integration SDK - Tool execution details
- Session & Memory SDK - Session storage and queries
