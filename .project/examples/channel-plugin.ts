/**
 * Example: Creating a Custom Channel Plugin
 *
 * This example shows how to create a custom messaging channel plugin
 * that integrates with the Channel Abstraction SDK.
 */

import { ChannelPlugin, ChannelMessagingAdapter, ChatMessage, AuditLog } from '@openclaw/sdks';

/**
 * Custom Slack Channel Plugin
 * Implements the ChannelPlugin interface for Slack integration
 */
class CustomSlackMessagingAdapter implements ChannelMessagingAdapter {
  private slackClient: any;
  private auditLog: AuditLog;

  constructor(slackClient: any, auditLog: AuditLog) {
    this.slackClient = slackClient;
    this.auditLog = auditLog;
  }

  /**
   * Send a message to Slack
   */
  async sendMessage(target: { id: string }, message: string): Promise<void> {
    try {
      const result = await this.slackClient.chat.postMessage({
        channel: target.id,
        text: message
      });

      // Audit: Message sent successfully
      this.auditLog.emit({
        type: 'message.sent',
        resourceId: result.ts,
        resourceType: 'message',
        status: 'success',
        metadata: {
          channel: target.id,
          timestamp: result.ts
        }
      });
    } catch (error) {
      // Audit: Send failed
      this.auditLog.emit({
        type: 'message.sent',
        resourceId: target.id,
        resourceType: 'message',
        status: 'failure',
        error: {
          code: (error as any).code || 'unknown',
          message: (error as any).message || 'Failed to send message'
        }
      });

      throw error;
    }
  }

  /**
   * Receive messages from Slack (WebSocket listener)
   */
  async receiveMessages(
    handler: (msg: ChatMessage) => Promise<void>
  ): Promise<() => void> {
    const listener = async (event: any) => {
      // Skip bot messages and other noise
      if (event.bot_id || event.subtype === 'bot_message') {
        return;
      }

      // Normalize to ChatMessage
      const chatMessage: ChatMessage = {
        id: event.ts,
        channel: `slack:${event.team_id}`,
        from: {
          id: event.user,
          displayName: event.user_name || event.user
        },
        to: {
          id: event.channel,
          name: event.channel_name
        },
        text: event.text,
        timestamp: new Date(parseInt(event.ts) * 1000).toISOString(),
        metadata: {
          threadTs: event.thread_ts,
          isReply: !!event.thread_ts
        }
      };

      // Audit: Message received
      this.auditLog.emit({
        type: 'message.received',
        resourceId: event.ts,
        resourceType: 'message',
        status: 'success',
        metadata: {
          channel: event.channel,
          from: event.user,
          hasThreading: !!event.thread_ts
        }
      });

      // Process message
      try {
        await handler(chatMessage);
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };

    // Subscribe to Slack messages
    this.slackClient.on('message', listener);

    // Return unsubscribe function
    return () => {
      this.slackClient.removeListener('message', listener);
    };
  }

  /**
   * Handle reactions to messages
   */
  async onReaction(
    handler: (event: { messageId: string; emoji: string; userId: string }) => Promise<void>
  ): Promise<() => void> {
    const listener = async (event: any) => {
      if (event.type === 'reaction_added') {
        // Audit: Reaction added
        this.auditLog.emit({
          type: 'reaction.added',
          resourceId: event.item.ts,
          resourceType: 'reaction',
          status: 'success',
          metadata: {
            emoji: event.reaction,
            userId: event.user
          }
        });

        await handler({
          messageId: event.item.ts,
          emoji: event.reaction,
          userId: event.user
        });
      }
    };

    this.slackClient.on('reaction_added', listener);

    return () => {
      this.slackClient.removeListener('reaction_added', listener);
    };
  }

  /**
   * Handle message edits
   */
  async onEdit(
    handler: (event: { messageId: string; oldText: string; newText: string }) => Promise<void>
  ): Promise<() => void> {
    const listener = async (event: any) => {
      if (event.type === 'message' && event.subtype === 'message_changed') {
        const oldText = event.previous_message?.text || '';
        const newText = event.message?.text || '';

        // Audit: Message edited
        this.auditLog.emit({
          type: 'message.edited',
          resourceId: event.message.ts,
          resourceType: 'message',
          status: 'success',
          metadata: {
            oldTextHash: this.hash(oldText),
            newTextHash: this.hash(newText)
          }
        });

        await handler({
          messageId: event.message.ts,
          oldText,
          newText
        });
      }
    };

    this.slackClient.on('message', listener);

    return () => {
      this.slackClient.removeListener('message', listener);
    };
  }

  /**
   * List accounts (workspaces and users)
   */
  async listAccounts(): Promise<any[]> {
    const users = await this.slackClient.users.list();
    return users.members.map((user: any) => ({
      id: user.id,
      name: user.real_name || user.name,
      displayName: user.profile?.display_name || user.name
    }));
  }

  /**
   * Private utility: hash text for audit trail (no sensitive data)
   */
  private hash(text: string): string {
    return require('crypto')
      .createHash('sha256')
      .update(text)
      .digest('hex')
      .substring(0, 16);
  }
}

/**
 * Plugin Definition
 */
export const slackCustomChannel: ChannelPlugin = {
  // Unique channel ID
  id: 'slack-custom',

  // Metadata
  meta: {
    name: 'Slack Custom Channel',
    version: '1.0.0',
    description: 'Custom Slack integration with advanced audit trails'
  },

  // Adapter implementations
  adapters: {
    // Messaging adapter (required)
    messaging: new CustomSlackMessagingAdapter(
      require('./slack-client'), // Slack SDK client
      new AuditLog()              // Audit log for tracking
    )

    // Other adapters could be added:
    // directory: new SlackDirectoryAdapter(),
    // security: new SlackSecurityAdapter(),
    // setup: new SlackSetupAdapter(),
    // threading: new SlackThreadingAdapter(),
  }
};

/**
 * Alternative: Using a factory function for configuration
 */
export function createSlackChannel(
  workspaceId: string,
  slackClient: any,
  auditLog: AuditLog
): ChannelPlugin {
  return {
    id: `slack-${workspaceId}`,
    meta: {
      name: `Slack - ${workspaceId}`,
      version: '1.0.0'
    },
    adapters: {
      messaging: new CustomSlackMessagingAdapter(slackClient, auditLog)
    }
  };
}

/**
 * Usage Example
 */
async function exampleUsage() {
  // Initialize channel manager
  const { ChannelManager } = await import('@openclaw/sdks');
  const auditLog = new AuditLog();
  const channels = new ChannelManager({ auditLog });

  // Register the plugin
  channels.registerChannel(slackCustomChannel);

  console.log('✅ Slack channel registered');

  // Send a message
  await channels.sendMessage('slack-custom', {
    to: { id: 'C123456' },
    text: 'Hello from agent!'
  });

  // Audit: message.sent event logged

  // Receive messages
  const unsubscribe = channels.receiveMessage('slack-custom', async (msg) => {
    console.log(`Received: ${msg.text}`);
    // Audit: message.received event logged automatically
  });

  // Query audit trail
  const events = await auditLog.query({
    types: ['message.received', 'message.sent'],
    'metadata.channel': 'C123456'
  });

  console.log(`Messages in channel: ${events.length}`);

  // Cleanup
  unsubscribe();
}

// Export for use in other modules
export { CustomSlackMessagingAdapter };
