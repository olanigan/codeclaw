# Plugin System SDK

## Purpose
Plugin discovery, loading, validation, and lifecycle management with hook injection support.

## Key Responsibilities
- Plugin manifest parsing (bundled and local)
- Plugin discovery from multiple sources
- Config schema validation using Zod
- Plugin registration in central registry
- Hook system for lifecycle events
- Plugin slots for exclusive alternatives
- Service injection to plugins

## Current Implementation
**Location**: `/src/plugins/` (50+ files)

**Key Files**:
- `discovery.ts` - Plugin discovery logic
- `loader.ts` - Plugin loading and initialization
- `registry.ts` - Plugin registry management
- `hooks.ts` - Hook system
- `validation.ts` - Config validation
- `slots.ts` - Exclusive plugin slots

## Reusability Score
**7/10** - Well-designed but some gateway coupling, hook system could be more generic

## Modularity Readiness
**Needs minor refactoring**
- Hook system is tightly coupled to gateway
- Plugin slots have some hardcoded logic
- Service injection could be more generic
- Overall structure is sound

## Dependencies
- `/src/config/` (Zod schema validation)
- `/src/infra/` (file operations)
- `/src/plugin-sdk/` (plugin types)

## Recommended SDK Exports

```typescript
// Plugin discovery
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  schema?: ZodSchema;
  exports?: Record<string, unknown>;
  hooks?: PluginHooks;
  services?: Record<string, PluginService>;
}

export class PluginDiscovery {
  discoverBundled(): Promise<PluginManifest[]>;
  discoverLocal(basePath: string): Promise<PluginManifest[]>;
  loadManifest(path: string): Promise<PluginManifest>;
}

// Plugin loading
export interface LoadedPlugin {
  manifest: PluginManifest;
  config: Record<string, unknown>;
  exports?: Record<string, unknown>;
}

export class PluginLoader {
  load(manifest: PluginManifest, config?: Record<string, unknown>): Promise<LoadedPlugin>;
  unload(pluginId: string): Promise<void>;
  reload(pluginId: string): Promise<LoadedPlugin>;
  validate(manifest: PluginManifest, config: unknown): Promise<ValidationResult>;
}

// Plugin registry
export class PluginRegistry {
  register(plugin: LoadedPlugin): Promise<void>;
  unregister(pluginId: string): Promise<void>;
  get(id: string): Promise<LoadedPlugin | null>;
  list(): Promise<LoadedPlugin[]>;
  listByType(type: string): Promise<LoadedPlugin[]>;
  resolveSlot(slotName: string): Promise<LoadedPlugin | null>;
}

// Hook system
export type HookPhase =
  | 'plugin:loading'
  | 'plugin:loaded'
  | 'plugin:unloading'
  | 'agent:startup'
  | 'agent:shutdown'
  | 'tool:invoked'
  | 'message:received'
  | 'message:sending';

export interface HookContext {
  pluginId?: string;
  phase: HookPhase;
  data?: Record<string, unknown>;
}

export type HookHandler = (context: HookContext) => Promise<void>;

export class HookManager {
  registerHook(phase: HookPhase, handler: HookHandler, source?: string): string;
  unregisterHook(hookId: string): void;
  invoke(phase: HookPhase, context?: Record<string, unknown>): Promise<void>;
  on(phase: HookPhase, handler: HookHandler): () => void;
  listHooks(phase?: HookPhase): HookEntry[];
}

// Audit
export interface PluginAuditEvent {
  type: 'discovered' | 'loaded' | 'registered' | 'hook_invoked' | 'disabled' | 'uninstalled';
  pluginId: string;
  timestamp: ISO;
  context?: Record<string, unknown>;
}

export class PluginAuditLog {
  on(event: PluginAuditEvent): void;
  query(filter: PluginAuditFilter): Promise<PluginAuditEvent[]>;
}
```

## Audit Trail Hooks

| Event | Details |
|-------|---------|
| `plugin.discovered` | plugin_id, path, manifest_version |
| `plugin.loaded` | plugin_id, exports_count, hooks_count |
| `plugin.validated` | plugin_id, valid, errors? |
| `plugin.registered` | plugin_id, registry_slots, tools_count |
| `hook.registered` | hook_id, phase, source |
| `hook.invoked` | hook_id, phase, duration, errors? |
| `plugin.enabled` | plugin_id, enabled_timestamp |
| `plugin.disabled` | plugin_id, reason |
| `plugin.uninstalled` | plugin_id, cleanup_status |
| `service.provided` | plugin_id, service_id |
| `service.invoked` | service_id, caller, duration |

## Extraction Effort
**5-7 days**

### Subtasks
- [ ] Decouple hook system from gateway
- [ ] Formalize plugin loader contract
- [ ] Create pluggable slot resolution
- [ ] Implement plugin validation
- [ ] Add plugin audit logging
- [ ] Write plugin loading integration tests

## Usage Example

```typescript
import { PluginDiscovery, PluginLoader, PluginRegistry, HookManager } from '@openclaw/plugin-sdk';

// Initialize
const discovery = new PluginDiscovery();
const loader = new PluginLoader();
const registry = new PluginRegistry({ auditLog });
const hooks = new HookManager();

// Discover plugins
const manifests = await discovery.discoverLocal('~/.openclaw/skills');

for (const manifest of manifests) {
  // Audit: plugin.discovered logged

  try {
    // Load plugin
    const loaded = await loader.load(manifest, config);
    // Audit: plugin.loaded logged

    // Register in registry
    await registry.register(loaded);
    // Audit: plugin.registered logged

    // Register hooks
    for (const [phase, handler] of Object.entries(loaded.manifest.hooks || {})) {
      hooks.registerHook(phase as HookPhase, handler, manifest.id);
    }
  } catch (error) {
    console.error(`Failed to load plugin ${manifest.id}:`, error);
  }
}

// Invoke hook at startup
await hooks.invoke('agent:startup', { agentId: 'agent123' });
// Audit: hook.invoked logged

// Get all loaded plugins
const plugins = await registry.list();
console.log(`${plugins.length} plugins loaded`);
```

## Related Documents
- [Foundation Modules Analysis](../../analysis/FOUNDATION-MODULES-ANALYSIS.md#plugin-system-sdk)
- [Audit Trail Design](../../audit-trail/AUDIT-DESIGN.md)
- [Phase 2 Extended](../../roadmap/PHASE-2-EXTENDED.md)

## See Also
- Tool Integration SDK - Tools are loaded via plugins
- Agent Runtime SDK - Plugins are discovered for agent
- Config Management SDK - Plugin config validation
