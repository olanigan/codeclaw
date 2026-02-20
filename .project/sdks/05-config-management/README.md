# Config Management SDK

## Purpose
Configuration loading, validation, and management with change tracking and audit support.

## Key Responsibilities
- Configuration file loading (JSON5 with env substitution)
- Schema validation using Zod
- Configuration merging from multiple sources
- Legacy format migration support
- Plugin configuration composition
- Atomic writes and conflict detection
- Change history tracking

## Current Implementation
**Location**: `/src/config/` (80+ files)

**Key Files**:
- `config.ts` - Main load/validate entry point
- `io.ts` - File read/write operations
- `merge-*.ts` - Configuration composition logic
- `zod-schema.*.ts` - Runtime validators
- `validation.ts` - Schema validation with errors
- `legacy-*.ts` - Migration from old formats

## Reusability Score
**6/10** - Well-isolated but heavily coupled to Zod and OpenClaw-specific fields. Extractable with abstraction.

## Modularity Readiness
**Partially isolated**
- Heavy Zod dependency (can be abstracted)
- OpenClaw-specific fields (can be made generic)
- Could be extracted as generic config loader

## Dependencies
- `zod` (external - schema validation)
- `json5` (external - parsing)
- `/src/infra/io` (file operations)

## Recommended SDK Exports

```typescript
// Config loading
export interface ConfigLoaderOptions {
  configPath: string;
  schemaPath?: string;
  basePath?: string;
  envPrefix?: string;
  allowEnvSubstitution?: boolean;
}

export interface ConfigLoadResult {
  data: Record<string, unknown>;
  errors?: ValidationError[];
  source: string;
}

export class ConfigLoader {
  load(options: ConfigLoaderOptions): Promise<ConfigLoadResult>;
  validate(data: unknown, schema: ZodSchema): Promise<ValidationResult>;
  merge(...sources: Record<string, unknown>[]): Record<string, unknown>;
  substitute(config: Record<string, unknown>, envPrefix?: string): Record<string, unknown>;
}

// Config manager
export interface ConfigChange {
  path: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: ISO;
  userId?: string;
  source?: string;
}

export interface ConfigSnapshot {
  data: Record<string, unknown>;
  timestamp: ISO;
  hash: string;
  changes?: ConfigChange[];
}

export class ConfigManager {
  get(key: string): unknown;
  set(key: string, value: unknown): Promise<void>;
  setMultiple(updates: Record<string, unknown>): Promise<void>;
  getSnapshot(): ConfigSnapshot;
  getHistory(limit?: number): Promise<ConfigChange[]>;
  rollback(timestamp: ISO): Promise<void>;
  validate(data: unknown): Promise<ValidationResult>;
  diff(other: Record<string, unknown>): ConfigChange[];
}

// Migration
export interface MigrationRule {
  fromVersion: string;
  toVersion: string;
  transform(oldConfig: unknown): Promise<unknown>;
}

export class ConfigMigrator {
  register(rule: MigrationRule): void;
  migrate(oldConfig: unknown, fromVersion: string, toVersion: string): Promise<unknown>;
  getCurrentVersion(): string;
}

// Audit
export interface ConfigAuditEvent {
  type: 'loaded' | 'validated' | 'changed' | 'written' | 'migrated' | 'error';
  timestamp: ISO;
  path?: string;
  oldValue?: unknown;
  newValue?: unknown;
  context?: Record<string, unknown>;
}

export class ConfigAuditLog {
  on(event: ConfigAuditEvent): void;
  query(filter: ConfigAuditFilter): Promise<ConfigAuditEvent[]>;
}
```

## Audit Trail Hooks

| Event | Details |
|-------|---------|
| `config.loaded` | file_path, size_bytes, parse_time |
| `config.validated` | schema_version, errors_count |
| `config.merged` | sources_merged, merge_strategy |
| `config.changed` | path, old_value, new_value |
| `config.written` | file_path, changes_count, timestamp |
| `config.substituted` | env_vars_substituted, var_count |
| `config.migrated` | from_version, to_version, changes |
| `config.error` | error_type, error_message |
| `rollback` | timestamp, reverted_changes |

## Extraction Effort
**4-5 days**

### Subtasks
- [ ] Generify Zod schema handling
- [ ] Create ConfigManager with change tracking
- [ ] Implement config snapshots and rollback
- [ ] Add migration system
- [ ] Add config audit logging
- [ ] Write comprehensive validation tests

## Usage Example

```typescript
import { ConfigLoader, ConfigManager, ConfigAuditLog } from '@openclaw/config-sdk';

// Initialize
const auditLog = new ConfigAuditLog();
const configManager = new ConfigManager({ auditLog });

// Load configuration
const result = await ConfigLoader.load({
  configPath: '/etc/myapp/config.json5',
  envPrefix: 'MYAPP_'
});

if (result.errors) {
  console.error('Config validation errors:', result.errors);
}

// Load into manager
configManager.set('agents', result.data.agents);
configManager.set('channels', result.data.channels);

// Audit: config.loaded, config.validated, config.changed logged

// Query configuration
const agentsConfig = configManager.get('agents');

// Make changes
await configManager.set('channels.slack.enabled', false);
// Audit: config.changed logged

// View change history
const history = await configManager.getHistory(10);
console.log('Recent changes:', history);

// Audit trail
const events = await auditLog.query({
  types: ['config.changed'],
  startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
});

console.log('Config changes in last 24h:', events);

// Rollback to previous state
if (history.length > 0) {
  const previousTimestamp = history[1].timestamp;
  await configManager.rollback(previousTimestamp);
  // Audit: rollback logged
}
```

## Related Documents
- [Foundation Modules Analysis](../../analysis/FOUNDATION-MODULES-ANALYSIS.md#config-management-sdk)
- [Audit Trail Design](../../audit-trail/AUDIT-DESIGN.md)
- [Phase 2 Extended](../../roadmap/PHASE-2-EXTENDED.md)

## See Also
- Agent Runtime SDK - Uses config for agent setup
- Plugin System SDK - Validates plugin configs
- Session & Memory SDK - Stores config snapshots
