# Tool Integration SDK

## Purpose
Tool discovery, registration, and execution with approval flows and comprehensive audit trails.

## Key Responsibilities
- Tool manifest parsing and validation
- Skill plugin loading from bundled and local paths
- Tool registry for agent discovery
- Tool execution with timeout handling
- Approval request and decision workflow
- Allowlist enforcement for safety
- Tool result capture and error handling

## Current Implementation
**Location**: `/src/agents/tools.ts`, `extensions/`, `skills/` (54 bundled skills)

**Key Files**:
- `agents/tools.ts` - Tool manifest and registry
- `agents/bash-tools.ts` family - Execution with approval
- Plugin system integration points

## Reusability Score
**8/10** - Clear tool interface, plugin-based skill system, approval framework established

## Modularity Readiness
**Already isolated** ✓
- Well-defined tool interface
- Pluggable skill discovery
- Approval framework in place
- Minimal gateway coupling

## Dependencies
- `/src/agents/` (core agent runtime)
- `/src/infra/execution` (process execution)
- `/src/plugin-sdk/` (plugin interfaces)

## Recommended SDK Exports

```typescript
// Tool interface
export interface AgentTool {
  id: string;
  name: string;
  description: string;
  parameters: JsonSchema;
  execute(params: Record<string, unknown>): Promise<ToolResult>;
  requiresApproval?: boolean;
}

export interface ToolResult {
  success: boolean;
  output?: string;
  error?: { code: string; message: string };
  metadata?: Record<string, unknown>;
}

// Tool Registry
export class ToolRegistry {
  register(tool: AgentTool, source?: PluginSource): void;
  unregister(toolId: string): void;
  list(): Promise<AgentTool[]>;
  get(id: string): Promise<AgentTool | null>;
  search(query: string): Promise<AgentTool[]>;
  validate(toolId: string, params: unknown): Promise<ValidationResult>;
}

// Tool Executor
export interface ExecutionContext {
  userId?: string;
  sessionId: string;
  requireApproval?(toolId: string): boolean;
  onApprovalRequest(req: ApprovalRequest): Promise<ApprovalDecision>;
}

export class ToolExecutor {
  execute(
    toolId: string,
    params: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ToolResult>;
  // Handles approval, timeouts, and error handling
}

// Approval System
export interface ApprovalRequest {
  id: string;
  toolId: string;
  reason: string;
  params: Record<string, unknown>;
  timestamp: ISO;
  expiresAt: ISO;
}

export enum ApprovalDecision {
  Approved = 'approved',
  Denied = 'denied',
  Timeout = 'timeout'
}

export class ApprovalManager {
  requestApproval(req: ApprovalRequest): Promise<ApprovalDecision>;
  getHistory(toolId: string): Promise<ApprovalRequest[]>;
  getStats(): Promise<ApprovalStats>;
}

// Audit
export interface ToolAuditEvent {
  type: 'registered' | 'invoked' | 'approved' | 'executed' | 'failed' | 'timeout';
  toolId: string;
  timestamp: ISO;
  userId?: string;
  context?: Record<string, unknown>;
}

export class ToolAuditLog {
  on(event: ToolAuditEvent): void;
  query(filter: ToolAuditFilter): Promise<ToolAuditEvent[]>;
}
```

## Audit Trail Hooks

| Event | Details |
|-------|---------|
| `skill.loaded` | skill_id, version, tool_count |
| `tool.registered` | tool_id, schema, source (plugin) |
| `tool.searched` | query, results_count |
| `tool.validated` | tool_id, valid, errors? |
| `tool.invoked` | tool_id, params (sanitized), user_id |
| `approval.requested` | tool_id, execution_id, reason |
| `approval.granted` | approval_id, approver_id |
| `approval.denied` | approval_id, denier_id, reason? |
| `approval.timeout` | approval_id, expires_at |
| `tool.executed` | tool_id, status, duration, result_size |
| `tool.failed` | tool_id, error_type, error_msg |
| `tool.timeout` | tool_id, timeout_ms |

## Extraction Effort
**3-4 days**

### Subtasks
- [ ] Formalize ToolRegistry interface
- [ ] Create ToolExecutor orchestrator
- [ ] Implement approval request handling
- [ ] Document tool discovery contract
- [ ] Add tool audit logging
- [ ] Write execution flow tests

## Usage Example

```typescript
import { ToolRegistry, ToolExecutor, ApprovalManager } from '@openclaw/tool-sdk';

// Initialize
const registry = new ToolRegistry();
const executor = new ToolExecutor({ auditLog });
const approvalMgr = new ApprovalManager();

// Register tool
const myTool: AgentTool = {
  id: 'weather',
  name: 'Get Weather',
  description: 'Get current weather for a location',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string' }
    }
  },
  execute: async (params) => {
    return { success: true, output: 'Sunny, 72°F' };
  },
  requiresApproval: true
};

registry.register(myTool);

// Execute with approval
const result = await executor.execute('weather', { location: 'NYC' }, {
  userId: 'user123',
  sessionId: 'session456',
  async onApprovalRequest(req) {
    const decision = await approvalMgr.requestApproval(req);
    return decision === ApprovalDecision.Approved;
  }
});

// Query execution history
const events = await auditLog.query({
  types: ['tool.invoked', 'approval.granted', 'tool.executed']
});
```

## Related Documents
- [Foundation Modules Analysis](../../analysis/FOUNDATION-MODULES-ANALYSIS.md#tool-integration-sdk)
- [Audit Trail Design](../../audit-trail/AUDIT-DESIGN.md)
- [Phase 1 MVP](../../roadmap/PHASE-1-MVP.md)

## See Also
- Agent Runtime SDK - Agent that invokes tools
- Plugin System SDK - How skills are loaded
- Approval & Safety SDK - Advanced approval workflows
