# Channel Abstraction SDK

## Purpose
Unified multi-channel messaging abstraction with per-action audit hooks across 39+ messaging platforms.

## Key Responsibilities
- Channel plugin lifecycle management
- Message normalization to common schema
- Account and contact directory
- Security policy enforcement (DM policies, allowlists)
- Threading and reply support
- Outbound message formatting and delivery
- Channel-specific media handling

## Current Implementation
**Location**: `/src/channels/` + `/src/plugin-sdk/` + `extensions/`

**Core Channels** (built-in):
- Telegram, Slack, Discord, Signal, iMessage, WhatsApp, Web, LINE

**Extension Channels** (39 plugins):
- Matrix, Mattermost, MS Teams, Google Chat, IRC, BlueBubbles, Feishu, Zalo, and more

## Reusability Score
**9/10** - Well-defined plugin interface, proven extensibility, 39 extensions already using it

## Modularity Readiness
**Already isolated** ✓
- Clear ChannelPlugin interface with adapters
- Adapter-based extensibility pattern
- Published as `openclaw/plugin-sdk`
- Minimal coupling to gateway

## Dependencies
- `@whiskeysockets/baileys`, `grammy`, `@slack/bolt`, etc. (external - channel SDKs)
- `/src/infra/` (networking, execution)
- `/src/plugin-sdk/` (shared types)

## Recommended SDK Exports

```typescript
// Message types
export interface ChatMessage {
  id: string;
  channel: ChannelId;
  from: ChatSender;
  to: ChatTarget;
  text: string;
  attachments?: Attachment[];
  mentions?: Mention[];
  reactions?: Reaction[];
  thread?: ThreadContext;
  timestamp: ISO;
}

export interface OutboundMessage {
  to: ChatTarget;
  text: string;
  attachments?: Attachment[];
  format?: 'plain' | 'markdown' | 'rich';
}

// Channel Plugin Interface
export interface ChannelPlugin {
  id: string;
  meta: ChannelMeta;
  adapters: {
    messaging?: ChannelMessagingAdapter;
    directory?: ChannelDirectoryAdapter;
    security?: ChannelSecurityAdapter;
    setup?: ChannelSetupAdapter;
    threading?: ChannelThreadingAdapter;
    outbound?: ChannelOutboundAdapter;
  };
}

// Channel Manager
export class ChannelManager {
  registerChannel(plugin: ChannelPlugin): void;
  unregisterChannel(channelId: string): void;

  sendMessage(channelId: string, msg: OutboundMessage): Promise<SentMessage>;
  receiveMessage(channelId: string, handler: (msg: ChatMessage) => void): () => void;

  listAccounts(channelId: string): Promise<ChatAccount[]>;
  getAccount(channelId: string, accountId: string): Promise<ChatAccount>;

  checkSecurity(channelId: string, msg: ChatMessage): Promise<SecurityDecision>;

  onChannelReady(channelId: string, handler: () => void): () => void;
  onChannelError(channelId: string, handler: (err: Error) => void): () => void;
}

// Audit
export class ChannelAuditLog {
  onMessage(msg: ChatMessage): void;
  onSent(sent: SentMessage): void;
  onSecurityCheck(decision: SecurityDecision): void;
  query(filters: ChannelAuditFilter): Promise<AuditEvent[]>;
}
```

## Audit Trail Hooks

| Event | Details |
|-------|---------|
| `message.received` | channel_id, from, to, text_hash |
| `message.sent` | channel_id, to, status, delivery_time |
| `message.edited` | message_id, original_hash, new_hash |
| `message.deleted` | message_id, deleter, reason? |
| `reaction.added` | message_id, emoji, user_id |
| `account.linked` | channel_id, account_id, user |
| `account.unlinked` | channel_id, account_id |
| `security.check` | channel_id, policy_rule, decision |
| `channel.connected` | channel_id, account_id |
| `channel.disconnected` | channel_id, reason |

## Extraction Effort
**4-6 days**

### Subtasks
- [ ] Extract ChannelManager orchestrator
- [ ] Create message normalization utilities
- [ ] Document security policy interface
- [ ] Consolidate all channel adapters
- [ ] Add per-channel audit hooks
- [ ] Write integration tests for message flow

## Usage Example

```typescript
import { ChannelManager } from '@openclaw/channel-sdk';

const channelMgr = new ChannelManager({ auditLog });

// Register custom channel
await channelMgr.registerChannel(customSlackPlugin);

// Receive messages
channelMgr.receiveMessage('slack:workspace123', async (msg) => {
  console.log(`Message from ${msg.from.displayName}: ${msg.text}`);

  // Audit: message.received logged automatically

  // Send response
  await channelMgr.sendMessage('slack:workspace123', {
    to: { id: msg.from.id },
    text: 'Response...',
    format: 'markdown'
  });

  // Audit: message.sent logged automatically
});

// Check security policy
const decision = await channelMgr.checkSecurity('slack:workspace123', msg);
if (decision.blocked) {
  console.log(`Message blocked: ${decision.reason}`);
}

// List accounts
const accounts = await channelMgr.listAccounts('slack:workspace123');
```

## Related Documents
- [Foundation Modules Analysis](../../analysis/FOUNDATION-MODULES-ANALYSIS.md#channel-abstraction-sdk)
- [Audit Trail Design](../../audit-trail/AUDIT-DESIGN.md)
- [Phase 1 MVP](../../roadmap/PHASE-1-MVP.md)

## See Also
- Agent Runtime SDK - Agent that receives messages
- Tool Integration SDK - Tools for sending messages
- Plugin System SDK - Plugin loading mechanism
