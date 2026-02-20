# Foundation Modules & SDK Analysis for Autonomous Delegated Agents

**OpenClaw Project**
**Analysis Date**: February 2026
**Focus**: Foundation modules, libraries, and SDKs for internal agent delegation with audit trail support

---

## Executive Summary

OpenClaw is a sophisticated multi-channel AI gateway (~400K lines of TypeScript) designed for personal AI assistance across 39+ messaging platforms. The architecture cleanly separates concerns into five distinct layers:

```
Communications Layer (39 extensions)
    ↓
Gateway (orchestration & routing)
    ↓
Agent Runtime (pi-mono based execution)
    ↓
Plugin System (extensibility)
    ↓
Infrastructure (system abstractions)
```

### Key Findings

1. **Modular by Design**: The codebase is already well-structured within each architectural tier, with clear responsibilities and established abstractions
2. **Plugin System Proven**: 39 channel extensions + 54 bundled skills demonstrate a mature, pluggable architecture
3. **Agent-Ready**: The agent runtime is built on top of established pi-mono framework with built-in session management, tool execution, and context compression
4. **Audit-Friendly Architecture**: Multiple layers already support hooks, events, and logging that can be leveraged for comprehensive audit trails

### Recommended Foundation Modules for Internal Agent Delegation

**Tier 1 (Core - enables autonomous agents):**
1. **Agent Runtime SDK** - Agent execution, session management, tool invocation
2. **Channel Abstraction SDK** - Unified multi-channel messaging
3. **Tool Integration SDK** - Tool discovery and execution with approval flows

**Tier 2 (Extended capabilities):**
4. **Plugin System SDK** - Plugin discovery, loading, lifecycle
5. **Config Management SDK** - Configuration validation and management
6. **Session & Memory SDK** - Session state and semantic memory queries

**Audit Trail Support**: All SDKs designed with built-in audit hooks and event logging for complete action traceability.

---

## Architecture Overview

### Layer 1: Communications Layer (`/src/channels/` + `/extensions/`)

**Purpose**: Pluggable messaging provider abstractions

**Core Channels** (built-in):
- Telegram (grammY SDK)
- Slack (@slack/bolt)
- Discord (discord-api-types)
- Signal (signal-utils)
- iMessage (native)
- WhatsApp (@whiskeysockets/baileys)
- Web (express-based)
- LINE (@line/bot-sdk)

**Extension Channels** (39 plugins):
- Matrix, Mattermost, MS Teams, Google Chat, IRC
- BlueBubbles, Feishu, Zalo, Nostr, Twitch, and more

**Abstraction Interface**:
```typescript
interface ChannelPlugin {
  id: string;
  meta: ChannelMeta;
  adapters: {
    messaging?: ChannelMessagingAdapter;      // Send/receive
    directory?: ChannelDirectoryAdapter;      // Accounts/threads
    security?: ChannelSecurityAdapter;        // Permissions
    setup?: ChannelSetupAdapter;              // OAuth/QR
    threading?: ChannelThreadingAdapter;      // Replies
    outbound?: ChannelOutboundAdapter;        // Formatting
    // ... 8+ more adapters
  };
}
```

**Key Responsibility**: Normalize diverse channel APIs to common `ChatMessage` schema with consistent error handling and retry logic.

**Audit Trail Support**:
- ✓ Per-message events (send, receive, edit, delete, react)
- ✓ Channel-specific hooks for custom auditing
- ✓ Account linking and identity tracking
- ✓ DM policy enforcement logging

---

### Layer 2: Gateway (`/src/gateway/` - 314K lines)

**Purpose**: Central orchestration, routing, and WebSocket control plane

**Key Subsystems**:
- **Lifecycle Management**: Boot sequences, auth, channel connections
- **Message Routing**: Session key parsing, channel lookup, DM scoping
- **Client Protocol**: WebSocket framing, schema validation (18 schema files)
- **Event Emission**: Typed events (presence, health, updates)
- **Control Plane**: HTTP API for web dashboard and RPC clients
- **Model Bridges**: OpenAI, OpenResponses, Bedrock integrations

**Routing Logic**:
```
Inbound Message
  ├─ Normalize to ChatMessage
  ├─ Security check (allowlist, DM policy)
  ├─ Session lookup/creation
  ├─ Route to agent
  └─ Emit event to WebSocket clients

Agent Response
  ├─ Format for channels
  ├─ Multi-channel delivery
  └─ Emit delivery events
```

**Audit Trail Support**:
- ✓ Frame validation logging
- ✓ Session creation/restoration tracking
- ✓ Security decision logging (allowlist hits, policy enforcement)
- ✓ Model selection and fallback tracking
- ✓ Token usage per request

---

### Layer 3: Agent Runtime (`/src/agents/` - 314 files)

**Purpose**: Embedded AI orchestration based on pi-mono framework

**Core Components**:

| Component | Purpose | Audit Points |
|-----------|---------|---|
| **Agent Scope** | Configuration resolution & workspace setup | Config loading, workspace init |
| **Session Manager** | State persistence and restoration | Session create, restore, prune |
| **Bootstrap System** | Inject workspace files (AGENTS.md, SOUL.md, TOOLS.md) | File injection logging |
| **Tool Executor** | Tool invocation with approval flows | Tool call, approval, execution, result |
| **Model Integration** | Handle model-specific APIs (Anthropic, OpenAI, etc.) | Model selection, fallback, cost tracking |
| **Context Compaction** | Summarization to manage context windows | Compression events, token savings |
| **Cache Manager** | Prompt caching (KV + token tracking) | Cache hits/misses, token deltas |

**Tool Execution Flow**:
```
Agent requests tool execution
  ├─ Validate tool availability
  ├─ Check approval requirements
  ├─ If approval needed → wait for human
  ├─ Execute with timeout
  ├─ Capture output/errors
  └─ Store in session transcript
```

**Key Files**:
- `agent-scope.ts` - Configuration and workspace setup
- `bash-tools.ts` family - Shell execution, PTY, process supervision
- `cache-trace.ts` - Prompt caching tracking
- `bootstrap-*.ts` - Workspace file injection
- `compaction.ts` - Context window optimization

**Audit Trail Support**:
- ✓ Session lifecycle (creation, restoration, pruning)
- ✓ Tool invocation with parameters
- ✓ Approval requests and decisions
- ✓ Tool execution results and errors
- ✓ Model selection and fallback
- ✓ Context compression events
- ✓ Cost tracking per session
- ✓ Token usage (cached + fresh)

---

### Layer 4: Plugin System (`/src/plugins/` - 50+ files)

**Purpose**: Extensibility framework for skills, memory, hooks, and HTTP routes

**Plugin Types**:

| Type | Examples | Discovery |
|------|----------|-----------|
| **Skills** | Coding, music, weather, notes, GitHub, Slack | `~/.openclaw/skills/` + bundled |
| **Memory** | memory-core, memory-lancedb | Plugin slots (exclusive) |
| **Channels** | All 39 extensions via /extensions/ | Plugin registry |
| **Hooks** | Lifecycle events (before-start, after-tool-call) | Event emitters |
| **HTTP Routes** | Custom endpoints | Plugin manifest routes |

**Plugin Lifecycle**:
```
1. Discovery: Load manifests from ~/.openclaw/skills & bundled
2. Validation: Validate config against plugin schema
3. Registration: Register tools, hooks, config in registry
4. Injection: Wire into agent and event emitters
5. Runtime: Plugin services available to agent
6. Shutdown: Cleanup and disable per config
```

**Audit Trail Support**:
- ✓ Plugin load/unload events
- ✓ Hook execution logging
- ✓ Tool registration (skills loaded)
- ✓ Configuration validation events
- ✓ Plugin service invocations

---

### Layer 5: Infrastructure (`/src/infra/` - 160+ files)

**Purpose**: Low-level system abstractions and utilities

**Categories**:

| Category | Components | Audit |
|----------|-----------|---|
| **Networking** | SSRF protection, proxy handling, SSH tunnels | Request logging |
| **Execution** | Process spawning, PTY, bash exec, approval | Command logging, output capture |
| **Storage** | File locking, JSON stores, migrations | Write operations, conflicts |
| **Auth** | Device pairing, OAuth token rotation, device identity | Pairing events, token refresh |
| **System** | Bonjour discovery, Tailscale, package detection | System events |
| **Providers** | Usage tracking for Anthropic/OpenAI/Gemini | API usage, cost calculation |
| **Time** | Cron scheduling, relative time, formatting | Scheduled job execution |
| **Updates** | Self-update via npm | Update checks, installations |
| **Outbound** | Message delivery queue, envelope formatting | Delivery events, channel selection |

**Key Utilities**:
- `fetch-guard.ts` - Safe HTTP with SSRF protection
- `exec-*.ts` - Process execution with audit
- `file-lock.ts` - Atomic file operations
- `session-key.ts` - Session routing logic
- `dedupe.ts` - Message deduplication
- `cron.ts` - Scheduled tasks

**Audit Trail Support**:
- ✓ Process execution (commands, output, errors)
- ✓ File operations (read, write, conflicts)
- ✓ Network requests (URL, method, status)
- ✓ Auth operations (tokens, expiry, rotation)
- ✓ Scheduled task execution
- ✓ API usage (provider, model, tokens, cost)

---

## Foundation Modules Classification

### Module Category 1: Agent Runtime Foundation

**Purpose**: Core agent execution, session management, tool invocation

**Current Implementation**: `/src/agents/` (314 files)

**Key Components**:
- Session manager (JSONL-based persistence)
- Tool executor with approval flows
- Model integration (Anthropic, OpenAI, Google, AWS)
- Context compaction (summarization)
- Workspace bootstrap (file injection)

**Reusability Score**: **9/10**

**Modularity Readiness**: **Already isolated** ✓
- Clear interfaces for session storage
- Pluggable model providers
- Tool registration API

**Audit Trail Hooks**:
| Event | Location | Trace |
|-------|----------|-------|
| Session created | `agent-scope.ts` | agent_id, user, timestamp |
| Tool registered | `tools.ts` | tool_id, plugin, source |
| Tool invoked | `bash-tools.ts` | tool_id, params, user_id |
| Tool approved | `approval-*.ts` | approval_id, decision, user |
| Tool executed | `bash-tools.ts` | tool_id, exit_code, duration |
| Model selected | `anthropic.ts` family | model, provider, reason |
| Context compressed | `compaction.ts` | old_tokens, new_tokens, method |
| Session persisted | `agent-scope.ts` | session_id, message_count |

**Recommended SDK Exports**:
```typescript
// Core interfaces
export interface AgentConfig { ... }
export interface AgentSession { ... }
export interface AgentTool { ... }

// Main API
export class AgentRuntime {
  createSession(config: AgentConfig): Promise<AgentSession>;
  restoreSession(sessionId: string): Promise<AgentSession>;
  executeTool(sessionId: string, tool: AgentTool, params: Record<string, unknown>): Promise<ToolResult>;
  getSessionHistory(sessionId: string): Promise<Message[]>;
  deleteSession(sessionId: string): Promise<void>;
}

// Audit
export interface AuditEvent {
  type: 'session.created' | 'tool.invoked' | 'tool.approved' | ...;
  sessionId: string;
  timestamp: ISO;
  userId?: string;
  data: Record<string, unknown>;
}
export class AuditLog {
  on(event: AuditEvent): void;
  query(filter: AuditFilter): Promise<AuditEvent[]>;
}
```

**Dependencies**:
- `@mariozechner/pi-agent-core` (external)
- `@mariozechner/pi-ai`, `@mariozechner/pi-coding-agent` (external)
- `/src/infra/` (internal - low-level)
- `/src/config/` (internal - configuration)
- `/src/memory/` (internal - semantic search)

**Effort to Extract**: **3-5 days**
- Write TypeScript interfaces for SDK surface
- Create test suite for agent lifecycle
- Document session storage contract
- Add audit event emission

---

### Module Category 2: Communication Layer (Channel Abstraction SDK)

**Purpose**: Unified multi-channel messaging abstraction

**Current Implementation**: `/src/channels/` + `/src/plugin-sdk/` + `extensions/`

**Key Components**:
- Channel plugin interface (adapters)
- Message normalization (ChatMessage)
- Account management (directory adapter)
- Security policies (DM, allowlist)
- Threading support
- Outbound formatting

**Reusability Score**: **9/10**

**Modularity Readiness**: **Already isolated** ✓
- Clear ChannelPlugin interface
- Adapter-based extensibility
- Published as `openclaw/plugin-sdk`

**Audit Trail Hooks**:
| Event | Location | Trace |
|-------|----------|-------|
| Message received | `channels/*.ts` | channel_id, from, to, text_hash |
| Message sent | `outbound/` | channel_id, to, status, delivery_time |
| Account linked | `directory-*` | channel_id, account_id, user |
| Account unlinked | `directory-*` | channel_id, account_id |
| Security check | `security-*` | channel_id, policy_rule, allow/deny |
| Reaction added | `channels/*.ts` | message_id, emoji, reactor |
| Message edited | `channels/*.ts` | message_id, diff |
| Message deleted | `channels/*.ts` | message_id, deleter |

**Recommended SDK Exports**:
```typescript
// Plugin interface (existing)
export interface ChannelPlugin { ... }
export interface ChannelMessagingAdapter { ... }
export interface ChannelSecurityAdapter { ... }

// Message normalization
export interface ChatMessage {
  id: string;
  channel: ChannelId;
  from: ChatSender;
  to: ChatTarget;
  text: string;
  attachments?: Attachment[];
  mentions?: Mention[];
  timestamp: ISO;
}

// Channel manager API
export class ChannelManager {
  getChannel(id: ChannelId): Promise<ChannelPlugin>;
  sendMessage(channel: ChannelId, message: OutboundMessage): Promise<SentMessage>;
  receiveMessage(channel: ChannelId, handler: (msg: ChatMessage) => void): () => void;
  listAccounts(channel: ChannelId): Promise<ChatAccount[]>;
  checkSecurity(channel: ChannelId, msg: ChatMessage): Promise<SecurityDecision>;
}

// Audit
export class ChannelAuditLog {
  onMessage(msg: ChatMessage): void;
  onSent(sent: SentMessage): void;
  onSecurityCheck(decision: SecurityDecision): void;
  query(filters: ChannelAuditFilter): Promise<AuditEvent[]>;
}
```

**Dependencies**:
- `@whiskeysockets/baileys`, `grammy`, `@slack/bolt`, etc. (external - channel SDKs)
- `/src/infra/` (internal - networking, execution)
- `/src/plugin-sdk/` (internal - shared types)

**Effort to Extract**: **4-6 days**
- Refactor channel imports into plugin registry
- Extract shared message normalization
- Consolidate security policy enforcement
- Create channel manager orchestrator
- Add message audit logging

---

### Module Category 3: Tool Integration SDK

**Purpose**: Tool discovery, registration, and execution with approval flows

**Current Implementation**: `/src/agents/tools.ts`, `/extensions/`, `/skills/`

**Key Components**:
- Tool manifest parsing
- Skill plugin loading
- Tool execution with timeouts
- Approval request handling
- Allowlist enforcement
- Tool result capture

**Reusability Score**: **8/10**

**Modularity Readiness**: **Already isolated** ✓
- Clear tool interface
- Plugin-based skill system
- Approval framework established

**Audit Trail Hooks**:
| Event | Location | Trace |
|-------|----------|-------|
| Skill loaded | `plugins/` | skill_id, version, manifest |
| Tool registered | `tools.ts` | tool_id, params_schema, source |
| Tool queried | `tools.ts` | query, matching_tools_count |
| Tool invoked | `bash-tools.ts` | tool_id, params, caller |
| Approval requested | `approval-*.ts` | tool_id, reason, requested_by |
| Approval granted | `approval-*.ts` | approval_id, approver, timestamp |
| Approval denied | `approval-*.ts` | approval_id, denier, reason |
| Tool executed | `bash-tools.ts` | tool_id, status, duration, output_size |
| Tool error | `bash-tools.ts` | tool_id, error_type, error_msg |
| Tool timeout | `bash-tools.ts` | tool_id, timeout_ms |

**Recommended SDK Exports**:
```typescript
// Tool interface
export interface AgentTool {
  id: string;
  description: string;
  parameters: JsonSchema;
  execute(params: Record<string, unknown>): Promise<ToolResult>;
}

// Tool registry API
export class ToolRegistry {
  register(tool: AgentTool, source: PluginSource): void;
  unregister(toolId: string): void;
  list(): Promise<AgentTool[]>;
  get(id: string): Promise<AgentTool | null>;
  search(query: string): Promise<AgentTool[]>;
  validate(toolId: string, params: unknown): Promise<ValidationResult>;
}

// Execution with approval
export class ToolExecutor {
  execute(toolId: string, params: Record<string, unknown>, context: ExecutionContext): Promise<ToolResult>;
  // May request approval if tool requires it
}

export interface ExecutionContext {
  userId?: string;
  sessionId: string;
  requireApproval?(toolId: string): boolean;
  onApprovalRequest(req: ApprovalRequest): Promise<ApprovalDecision>;
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

**Dependencies**:
- `/src/agents/` (core agent runtime)
- `/src/infra/execution` (process execution)
- `/src/plugin-sdk/` (plugin interfaces)

**Effort to Extract**: **3-4 days**
- Formalize ToolRegistry interface
- Create ToolExecutor orchestrator
- Implement approval request handling
- Add tool audit logging

---

### Module Category 4: Plugin System SDK

**Purpose**: Plugin discovery, loading, validation, and lifecycle management

**Current Implementation**: `/src/plugins/` (50+ files)

**Key Components**:
- Plugin manifest parsing
- Plugin discovery (bundled + local)
- Config schema validation (Zod)
- Plugin registration (tools, hooks, services)
- Hook injection system
- Plugin slots (exclusive alternatives)

**Reusability Score**: **7/10**

**Modularity Readiness**: **Needs minor refactoring**
- Hook system is tightly coupled to gateway
- Plugin slots have hardcoded logic
- Service injection could be more generic

**Audit Trail Hooks**:
| Event | Location | Trace |
|-------|----------|-------|
| Plugin discovered | `discovery.ts` | plugin_id, path, manifest_version |
| Plugin loaded | `loader.ts` | plugin_id, exports_count, hooks_count |
| Config validated | `validation.ts` | plugin_id, valid, errors? |
| Plugin registered | `registry.ts` | plugin_id, registry_slots, tools_registered |
| Hook registered | `hooks.ts` | hook_phase, hook_count, plugin_source |
| Hook invoked | `hooks.ts` | hook_id, phase, duration, errors? |
| Plugin disabled | `config.ts` | plugin_id, reason |
| Plugin uninstalled | `loader.ts` | plugin_id, cleanup_status |

**Recommended SDK Exports**:
```typescript
// Plugin interfaces (existing)
export interface PluginManifest { ... }
export interface PluginHooks { ... }
export interface PluginSlots { ... }

// Plugin discovery API
export class PluginDiscovery {
  discoverBundled(): Promise<PluginManifest[]>;
  discoverLocal(basePath: string): Promise<PluginManifest[]>;
  loadManifest(path: string): Promise<PluginManifest>;
}

// Plugin loader API
export class PluginLoader {
  load(manifest: PluginManifest): Promise<LoadedPlugin>;
  unload(pluginId: string): Promise<void>;
  reload(pluginId: string): Promise<LoadedPlugin>;
}

// Plugin registry API
export class PluginRegistry {
  register(plugin: LoadedPlugin): Promise<void>;
  unregister(pluginId: string): Promise<void>;
  get(id: string): Promise<LoadedPlugin | null>;
  list(): Promise<LoadedPlugin[]>;
  getTool(id: string): Promise<AgentTool | null>;
  resolveSlot(slotName: string): Promise<Plugin | null>;
}

// Hook system
export class HookManager {
  registerHook(phase: HookPhase, handler: HookHandler): void;
  invoke(phase: HookPhase, context: HookContext): Promise<void>;
  on(phase: HookPhase, handler: HookHandler): () => void;
}

// Audit
export interface PluginAuditEvent {
  type: 'discovered' | 'loaded' | 'registered' | 'hook_invoked' | 'disabled' | 'uninstalled';
  pluginId: string;
  timestamp: ISO;
  context?: Record<string, unknown>;
}
```

**Dependencies**:
- `/src/config/` (Zod schema validation)
- `/src/plugins/` (hook system)
- `/src/infra/` (file operations)

**Effort to Extract**: **5-7 days**
- Decouple hook system from gateway
- Formalize plugin loader contract
- Create pluggable slot resolution
- Add comprehensive plugin audit logging

---

### Module Category 5: Config Management SDK

**Purpose**: Configuration loading, validation, and management with change tracking

**Current Implementation**: `/src/config/` (80+ files)

**Key Components**:
- Config file loading (JSON5 with env substitution)
- Schema validation (Zod-based)
- Config merging (file → env → runtime)
- Legacy format migration
- Plugin config composition
- Atomic writes

**Reusability Score**: **6/10**

**Modularity Readiness**: **Partially isolated**
- Heavy Zod dependency
- Tightly coupled to OpenClaw-specific fields
- Could be extracted with abstraction

**Audit Trail Hooks**:
| Event | Location | Trace |
|-------|----------|-------|
| Config loaded | `io.ts` | file_path, size_bytes, parse_time |
| Config validated | `validation.ts` | schema, errors_count |
| Config merged | `merge-*.ts` | sources_merged, merge_strategy |
| Config written | `io.ts` | file_path, changes_count, timestamp |
| Env substitution | `config.ts` | env_vars_substituted, vars_list |
| Legacy migration | `legacy-*.ts` | old_version, new_version, fields_migrated |

**Recommended SDK Exports**:
```typescript
// Config loading API
export interface ConfigLoaderOptions {
  schemaPath: string;
  basePath: string;
  envPrefix?: string;
}

export class ConfigLoader {
  load(options: ConfigLoaderOptions): Promise<ConfigResult>;
  validate(data: unknown, schema: ZodSchema): Promise<ValidationResult>;
  merge(...sources: Record<string, unknown>[]): Record<string, unknown>;
}

// Config change tracking
export interface ConfigChange {
  path: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: ISO;
  userId?: string;
}

export class ConfigManager {
  get(key: string): unknown;
  set(key: string, value: unknown): Promise<void>;
  validate(data: unknown): Promise<ValidationResult>;
  getHistory(): Promise<ConfigChange[]>;
  rollback(timestamp: ISO): Promise<void>;
}

// Audit
export interface ConfigAuditEvent {
  type: 'loaded' | 'validated' | 'changed' | 'written' | 'error';
  timestamp: ISO;
  context?: Record<string, unknown>;
}
```

**Dependencies**:
- `zod` (external - schema validation)
- `/src/infra/io` (file operations)

**Effort to Extract**: **4-5 days**
- Generify Zod schema handling
- Create config change tracking
- Add audit logging
- Write comprehensive tests

---

### Module Category 6: Session & Memory SDK

**Purpose**: Session state persistence and semantic memory queries

**Current Implementation**:
- Session: `/src/agents/agent-scope.ts` + JSONL persistence
- Memory: `/src/memory/` (15 files)

**Key Components**:
- Session JSONL storage (immutable snapshots)
- Session restoration and pruning
- Semantic search (embeddings + vector DB)
- Temporal decay (recency weighting)
- Embedding providers (Voyage, Anthropic, etc.)

**Reusability Score**: **7/10**

**Modularity Readiness**: **Partially isolated**
- Session logic embedded in agent runtime
- Memory system is pluggable but tightly coupled
- Embedding providers abstractable

**Audit Trail Hooks**:
| Event | Location | Trace |
|-------|----------|-------|
| Session created | `agent-scope.ts` | session_id, agent_id, timestamp |
| Session message added | `manager.ts` | session_id, message_id, role |
| Session compressed | `compaction.ts` | session_id, old_size, new_size |
| Session queried | `agent-scope.ts` | session_id, filters |
| Session deleted | `agent-scope.ts` | session_id, reason |
| Memory stored | `manager.ts` | text_hash, embedding_provider, tokens |
| Memory queried | `manager.ts` | query_text, results_count, duration |
| Memory reranked | `manager.ts` | original_count, reranked_count |
| Temporal decay applied | `temporal-decay.ts` | memory_age_days, score_delta |

**Recommended SDK Exports**:
```typescript
// Session interface
export interface SessionSnapshot {
  id: string;
  agentId: string;
  messages: Message[];
  metadata: Record<string, unknown>;
  createdAt: ISO;
  updatedAt: ISO;
}

// Session storage API
export class SessionStore {
  create(agentId: string): Promise<SessionSnapshot>;
  load(sessionId: string): Promise<SessionSnapshot>;
  save(session: SessionSnapshot): Promise<void>;
  delete(sessionId: string): Promise<void>;
  list(agentId: string): Promise<SessionSnapshot[]>;
  prune(maxAge: Duration): Promise<number>;
}

// Memory query API
export interface MemoryQuery {
  text: string;
  limit?: number;
  threshold?: number;
  recencyWeight?: number;
}

export interface MemoryResult {
  text: string;
  embedding?: number[];
  score: number;
  timestamp: ISO;
  age: Duration;
}

export class MemoryStore {
  store(sessionId: string, text: string): Promise<void>;
  query(q: MemoryQuery): Promise<MemoryResult[]>;
  delete(sessionId: string): Promise<void>;
  deleteOlderThan(maxAge: Duration): Promise<number>;
}

// Audit
export interface SessionAuditEvent {
  type: 'created' | 'loaded' | 'saved' | 'compressed' | 'deleted' | 'pruned';
  sessionId: string;
  timestamp: ISO;
  context?: Record<string, unknown>;
}
```

**Dependencies**:
- `sqlite-vec` (external - vector search)
- `@voyage-ai/voyageai` (external - embeddings)
- `/src/infra/storage` (file operations)

**Effort to Extract**: **5-7 days**
- Extract session logic from agent runtime
- Formalize memory store interface
- Create embedding provider abstraction
- Add session audit logging

---

## Dependency Map

### Tier 1: Foundation Layer (No internal dependencies)
```
/src/infra/
  - networking, execution, storage, auth, time, updates
  ↓ (uses)
  External: axios, sharp, playwright-core, sqlite3
```

### Tier 2: Core Abstractions
```
/src/config/        (depends on: Tier 1, zod)
/src/plugin-sdk/    (depends on: Tier 1)
/src/memory/        (depends on: Tier 1, sqlite-vec)
  ↓ (provides interfaces for)
  Tier 3
```

### Tier 3: Domain Logic
```
/src/channels/      (depends on: Tier 1, plugin-sdk, channel SDKs)
/src/agents/        (depends on: Tier 1, config, plugins, memory, pi-mono)
  ↓ (used by)
  Tier 4
```

### Tier 4: Orchestration
```
/src/gateway/       (depends on: Tiers 1-3, express, ws)
/src/plugins/       (depends on: Tier 2-3)
  ↓ (used by)
  Tier 5
```

### Tier 5: User Interface
```
/src/cli/           (depends on: Tier 4, commander, clack)
/src/commands/      (depends on: Tier 4)
```

### Circular Dependencies to Avoid
- **Gateway ↔ Agents**: Mitigate by injecting agent executor into gateway
- **Plugins ↔ Infra**: Minimize by using hook-based integration
- **Config ↔ Plugins**: Keep config loader generic, plugin-specific config in plugins

---

## SDK Extraction Roadmap

### Phase 1: Foundation SDKs (enables autonomous agents)

**1.1 Agent Runtime SDK**
- Extract: `/src/agents/` core logic (agent-scope, tools, session management)
- Timeline: **Weeks 1-2**
- Deliverables:
  - `@openclaw/agent-runtime` package
  - Session store interface
  - Tool executor with audit hooks
  - TypeScript types for session, tool, audit events

**1.2 Channel Abstraction SDK**
- Extract: `/src/channels/` + plugin-sdk channel adapters
- Timeline: **Weeks 2-3**
- Deliverables:
  - `@openclaw/channel-sdk` package (update existing plugin-sdk)
  - ChannelManager orchestrator
  - Message normalization utilities
  - Channel audit interface

**1.3 Tool Integration SDK**
- Extract: `/src/agents/tools.ts` + approval system
- Timeline: **Week 3**
- Deliverables:
  - `@openclaw/tool-sdk` package
  - ToolRegistry API
  - ToolExecutor with approval flows
  - Tool audit logging

### Phase 2: Extended SDKs (enables extensibility)

**2.1 Plugin System SDK**
- Refactor: `/src/plugins/` for generic plugin loading
- Timeline: **Weeks 4-5**
- Deliverables:
  - `@openclaw/plugin-sdk` enhancements
  - PluginLoader with abstracted hooks
  - PluginRegistry
  - Plugin audit logging

**2.2 Config Management SDK**
- Extract: `/src/config/` with abstracted schema validation
- Timeline: **Week 5**
- Deliverables:
  - `@openclaw/config-sdk` package
  - ConfigLoader with pluggable validators
  - ConfigManager with change tracking
  - Config audit logging

**2.3 Session & Memory SDK**
- Extract: Session logic from agents + `/src/memory/`
- Timeline: **Week 6**
- Deliverables:
  - `@openclaw/session-sdk` package
  - SessionStore interface
  - MemoryStore with pluggable backends
  - Session/memory audit logging

### Phase 3: Audit & Observability Framework

**3.1 Unified Audit Log**
- Create: Centralized audit event system
- Timeline: **Week 6-7**
- Deliverables:
  - `@openclaw/audit-sdk` package
  - AuditEvent base type with correlation IDs
  - AuditStore for persistence
  - AuditQuery for structured searches

**3.2 Observability Documentation**
- Document: Audit trail points in all SDKs
- Timeline: **Week 7**
- Deliverables:
  - Audit trail mapping document
  - Example audit queries for common scenarios
  - Integration guide for external audit systems

---

## Audit Trail Design

### Audit Event Schema

All audit events follow this structure for end-to-end traceability:

```typescript
interface AuditEvent {
  // Required
  type: string;                    // 'session.created', 'tool.invoked', etc.
  timestamp: ISO8601;              // Event time
  correlationId: string;           // Trace ID (session or request scoped)

  // Context
  userId?: string;                 // User performing action
  sessionId?: string;              // Session context
  agentId?: string;                // Agent context

  // Action-specific
  resourceId?: string;             // Resource being acted on (tool_id, channel_id, etc.)
  resourceType?: string;           // Type of resource
  action?: string;                 // Specific action

  // Outcome
  status: 'success' | 'failure' | 'pending';
  result?: unknown;                // Result of action
  error?: { code: string; message: string };

  // Metadata
  duration?: number;               // Duration in ms
  metadata?: Record<string, unknown>;
}
```

### Audit Trail Points by SDK

#### Agent Runtime SDK
```
session.created
  → sessionId, agentId, userId, workspace

session.restored
  → sessionId, message_count, restored_from_timestamp

tool.registered
  → toolId, schema, source (plugin)

tool.invoked
  → toolId, params (sanitized), userId, approvalRequired

tool.approved
  → toolId, approvalId, approverId, decision

tool.executed
  → toolId, status, duration, resultSize, error?

model.selected
  → model, provider, reason (primary/fallback)

context.compressed
  → sessionId, originalTokens, compressedTokens, method

session.deleted
  → sessionId, reason
```

#### Channel Abstraction SDK
```
message.received
  → channelId, from, to, textHash, hasAttachments, mentions

message.sent
  → channelId, to, status, deliveryTime, textHash

account.linked
  → channelId, accountId, userId

account.unlinked
  → channelId, accountId, userId

security.check
  → channelId, rule, sender, decision (allow/deny)

message.edited
  → messageId, originalHash, newHash

message.deleted
  → messageId, deleter, reason?

reaction.added
  → messageId, emoji, userId
```

#### Tool Integration SDK
```
skill.loaded
  → skillId, version, toolCount, exports

tool.registered
  → toolId, paramsSchema, registry

tool.searched
  → query, resultsCount

tool.validated
  → toolId, paramsValid, validationErrors?

execution.started
  → toolId, userId, params (sanitized), executionId

execution.completed
  → executionId, status, duration, resultSize

execution.failed
  → executionId, errorType, errorMessage

approval.requested
  → toolId, executionId, reason

approval.granted
  → approvalId, approverId

approval.denied
  → approvalId, denerId, reason?

approval.expired
  → approvalId, requestedAt, expiredAt
```

### Correlation & Trace Queries

Enable queries like:

```typescript
// Get all actions for a user in a session
auditLog.query({
  userId: 'user123',
  sessionId: 'session456',
  startTime: ISO8601,
  endTime: ISO8601
});

// Get all tool executions that required approval
auditLog.query({
  type: 'tool.invoked',
  'metadata.approvalRequired': true
});

// Get all security decisions (what was blocked/allowed)
auditLog.query({
  type: 'security.check',
  'result.decision': 'deny'
});

// Trace a specific message through the system
auditLog.query({
  correlationId: 'message-abc123'
});
```

---

## Implementation Priorities

### For Internal Agent Delegation (User Priority)

**Must Have (enables autonomous agents):**
1. ✅ Agent Runtime SDK - Agent execution with session management
2. ✅ Channel Abstraction SDK - Multi-channel messaging
3. ✅ Tool Integration SDK - Tool discovery & execution
4. ✅ Unified Audit Framework - Complete action traceability

**Should Have (enables monitoring):**
5. ✅ Plugin System SDK - Extensibility
6. ✅ Session & Memory SDK - State persistence
7. ✅ Config Management SDK - Configuration management

**Nice to Have:**
8. Approval & Safety SDK - Advanced approval workflows
9. Channel Router SDK - Intelligent routing

### Effort Estimates

| SDK | Complexity | Effort | Risk |
|-----|-----------|--------|------|
| Agent Runtime | High | 3-5 days | Low (well-isolated) |
| Channel Abstraction | High | 4-6 days | Medium (39 channels) |
| Tool Integration | Medium | 3-4 days | Low (already modular) |
| Unified Audit | Medium | 4-5 days | Low (cross-cutting) |
| Plugin System | Medium | 5-7 days | Medium (hook coupling) |
| Session & Memory | Medium | 5-7 days | Medium (embedded logic) |
| Config Management | Low-Medium | 4-5 days | Low (isolated) |

**Total Effort for Phase 1**: **7-8 weeks** (MVP with audit support)

---

## Code Examples

### Example 1: Agent Delegation with Audit Trail

```typescript
import { AgentRuntime, AuditLog } from '@openclaw/agent-runtime';
import { ChannelManager } from '@openclaw/channel-sdk';
import { ToolExecutor } from '@openclaw/tool-sdk';

// Initialize SDKs
const auditLog = new AuditLog();
const agentRuntime = new AgentRuntime({ auditLog });
const channelMgr = new ChannelManager({ auditLog });
const toolExecutor = new ToolExecutor({ auditLog });

// Create agent session
const session = await agentRuntime.createSession({
  agentId: 'assistant-001',
  userId: 'user@example.com',
  model: 'claude-3-sonnet'
});

// Listen to audit events
auditLog.on('session.created', (event) => {
  console.log(`Audit: Session ${event.sessionId} created by ${event.userId}`);
});

auditLog.on('tool.invoked', (event) => {
  console.log(`Audit: Tool ${event.resourceId} invoked with status ${event.status}`);
});

// Receive message from channel
const message = await channelMgr.receiveMessage({
  channelId: 'telegram:123',
  from: 'user@telegram',
  text: 'What is the weather?'
});

// Audit: message.received logged

// Execute agent
const response = await agentRuntime.execute({
  sessionId: session.id,
  message: message.text,
  approvalHandler: async (req) => {
    // Example: shell command requires approval
    const approved = await human.requestApproval(req);
    // Audit: approval.granted or approval.denied logged
    return approved;
  }
});

// Send response
await channelMgr.sendMessage({
  channelId: 'telegram:123',
  to: 'user@telegram',
  text: response
});

// Audit: message.sent logged

// Query audit trail for this session
const events = await auditLog.query({
  sessionId: session.id,
  types: ['tool.invoked', 'tool.executed']
});

console.log('Session actions:', events);
```

### Example 2: Creating a Custom Channel Plugin

```typescript
import { ChannelPlugin, ChannelMessagingAdapter } from '@openclaw/channel-sdk';

class SlackCustomChannel implements ChannelMessagingAdapter {
  async sendMessage(target, message) {
    // Audit trail automatically captured by ChannelManager
    const result = await slackApi.postMessage(target, message);
    return { id: result.ts, status: 'sent' };
  }

  async receiveMessage(handler) {
    slackSocket.on('message', (msg) => {
      // Audit: message.received logged by channel manager
      handler(this.normalize(msg));
    });
  }

  normalize(slackMsg) {
    return {
      id: slackMsg.ts,
      channel: 'slack:workspace123',
      from: { id: slackMsg.user, displayName: slackMsg.user_name },
      to: { id: slackMsg.channel },
      text: slackMsg.text,
      timestamp: new Date(parseInt(slackMsg.ts) * 1000).toISOString()
    };
  }
}

export const slackChannel: ChannelPlugin = {
  id: 'slack-custom',
  meta: { name: 'Slack Custom', version: '1.0' },
  adapters: {
    messaging: new SlackCustomChannel()
  }
};
```

### Example 3: Querying Audit Trail

```typescript
import { AuditLog } from '@openclaw/audit-sdk';

const auditLog = new AuditLog();

// Find all tool invocations that required approval
const approvalRequired = await auditLog.query({
  type: 'tool.invoked',
  'metadata.approvalRequired': true,
  startTime: '2026-02-20T00:00:00Z',
  endTime: '2026-02-21T00:00:00Z'
});

// Find security decisions (what was blocked)
const blocked = await auditLog.query({
  type: 'security.check',
  'result.decision': 'deny'
});

// Trace a specific message through all systems
const messageTrace = await auditLog.query({
  correlationId: 'msg-abc123'
});

// Audit compliance report
const toolAudits = await auditLog.query({
  types: [
    'tool.registered',
    'tool.invoked',
    'tool.executed'
  ]
});

console.log('Tool Audit Report:');
for (const event of toolAudits) {
  console.log(`${event.timestamp}: ${event.type} for ${event.resourceId}`);
  if (event.error) {
    console.log(`  Error: ${event.error.message}`);
  }
}
```

---

## Recommendations

### Immediate Next Steps

1. **Create Agent Runtime SDK** (Week 1-2)
   - Extract `/src/agents/` core logic into `@openclaw/agent-runtime`
   - Implement session store interface (abstraction over JSONL)
   - Add comprehensive audit event emissions
   - Write integration tests

2. **Implement Unified Audit Framework** (Week 2-3, parallel)
   - Create `@openclaw/audit-sdk` with core AuditEvent types
   - Add audit event persistence (append-only log)
   - Create AuditQuery interface for searching
   - Integrate with Agent Runtime SDK

3. **Update Channel SDK** (Week 3-4)
   - Enhance existing `@openclaw/plugin-sdk` with ChannelManager
   - Add message normalization utilities
   - Implement channel audit hooks

4. **Create Tool SDK** (Week 4)
   - Extract tool execution logic
   - Implement ToolRegistry and ToolExecutor
   - Add approval request handling with audit

### Design Patterns to Adopt

**Pattern 1: Audit-First Design**
```typescript
// All SDKs should accept optional auditLog
class MySDK {
  constructor(options: { auditLog?: AuditLog }) {
    this.auditLog = options.auditLog || new NoOpAuditLog();
  }

  async action() {
    this.auditLog.emit({
      type: 'action.started',
      // ... event data
    });
    try {
      const result = await doAction();
      this.auditLog.emit({
        type: 'action.completed',
        status: 'success',
        result
      });
    } catch (error) {
      this.auditLog.emit({
        type: 'action.failed',
        status: 'failure',
        error: { code: error.code, message: error.message }
      });
      throw;
    }
  }
}
```

**Pattern 2: Correlation IDs**
```typescript
// Pass correlation ID through call chain
interface ExecutionContext {
  correlationId: string;      // Trace across system
  userId?: string;            // Who initiated
  sessionId?: string;         // Session context
  metadata?: Record<string, unknown>;  // Custom context
}

// All async operations include context
async function executeWithContext(
  toolId: string,
  params: unknown,
  context: ExecutionContext
) {
  const event = {
    correlationId: context.correlationId,
    userId: context.userId,
    sessionId: context.sessionId,
    // ... rest of event
  };
}
```

**Pattern 3: Observable Events**
```typescript
// Export event emitters for monitoring
class AgentRuntime extends EventEmitter {
  // Listen to specific events
  onToolInvoked(handler: (event: ToolInvokedEvent) => void) {
    this.on('tool:invoked', handler);
  }

  onSessionCreated(handler: (event: SessionCreatedEvent) => void) {
    this.on('session:created', handler);
  }

  // Or listen to all events
  onAuditEvent(handler: (event: AuditEvent) => void) {
    this.on('audit:*', handler);
  }
}
```

### Success Criteria

By end of Phase 1:

- [ ] Agent Runtime SDK enables autonomous agent delegation
- [ ] All agent actions are traceable via audit log
- [ ] Agents can be delegated across session boundaries
- [ ] Tool execution requires documented approval flows
- [ ] Channel communication is abstracted and auditable
- [ ] Plugin system enables custom agent extensions
- [ ] Performance impact < 5% overhead from audit logging

### Monitoring & Observability

For each SDK, expose:

1. **Audit Events**: Structured events for all significant actions
2. **Metrics**: Count/latency of operations
3. **Traces**: Correlation IDs for end-to-end tracing
4. **Logs**: Structured logs for debugging
5. **Examples**: Reference implementations showing audit usage

---

## Conclusion

OpenClaw's architecture is well-suited for autonomous agent delegation. By extracting six foundation SDKs with built-in audit trail support, the system can enable:

- **Autonomous Agents**: Execute with full visibility and control
- **Multi-Channel**: Operate across 39+ messaging platforms
- **Extensible**: Load custom skills and channels
- **Auditable**: Complete trace of all agent actions
- **Safe**: Approval flows for sensitive operations

The modular design reduces extraction effort to **7-8 weeks for Phase 1**, with clear phasing for additional capabilities in Phase 2-3.

**Recommended Starting Point**: Begin with Agent Runtime SDK + Unified Audit Framework to establish patterns, then parallelize Channel and Tool SDKs.

---

**Document Status**: Complete Analysis
**Last Updated**: February 20, 2026
**For Questions**: See AGENTS.md for agent-specific documentation
