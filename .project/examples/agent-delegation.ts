/**
 * Example: Agent Delegation with Complete Audit Trail
 *
 * This example shows how to:
 * 1. Create an agent session
 * 2. Delegate a task to the agent
 * 3. Handle tool execution with approval
 * 4. Query the audit trail for compliance
 */

import {
  AgentRuntime,
  AuditLog,
  ChannelManager,
  ToolExecutor,
  ToolRegistry
} from '@openclaw/sdks';

// Initialize audit log (central traceability)
const auditLog = new AuditLog();

// Initialize SDKs with audit support
const agent = new AgentRuntime({ auditLog });
const channels = new ChannelManager({ auditLog });
const tools = new ToolRegistry({ auditLog });
const executor = new ToolExecutor({ auditLog });

/**
 * Example 1: Create and use an agent session
 */
async function delegateTaskToAgent() {
  // Generate correlation ID for tracing
  const correlationId = `msg-${Date.now()}`;

  // Create agent session with context
  const session = await agent.createSession({
    agentId: 'assistant-001',
    userId: 'user@example.com',
    model: 'claude-3-sonnet',
    workspace: '/tmp/agent-workspace'
  });

  console.log(`Created session: ${session.id}`);
  console.log(`Audit: session.created event logged`);

  // Simulate receiving a message from a channel
  const message = {
    text: 'What is the weather in NYC?',
    from: 'user@example.com',
    channel: 'telegram',
    timestamp: new Date().toISOString()
  };

  // Execute agent with approval handler
  const response = await agent.execute({
    sessionId: session.id,
    message: message.text,
    approvalHandler: async (req) => {
      console.log(`\n🔔 Approval Request:`);
      console.log(`   Tool: ${req.toolId}`);
      console.log(`   Reason: ${req.reason}`);
      console.log(`   Expires: ${req.expiresAt}`);

      // In real use, this would prompt a human
      const approved = true;

      console.log(`✅ Approved: ${approved}`);
      // Audit: approval.granted event logged

      return approved;
    }
  });

  console.log(`\n✅ Agent Response: ${response}`);
  // Audit: tool.invoked, tool.executed events logged

  // Send response back through channel
  await channels.sendMessage('telegram', {
    to: { id: 'user@example.com' },
    text: response
  });

  // Audit: message.sent event logged

  return { sessionId: session.id, correlationId };
}

/**
 * Example 2: Query audit trail for compliance
 */
async function generateComplianceReport(userId: string, startDate: Date, endDate: Date) {
  console.log(`\n📋 Compliance Report for ${userId}`);
  console.log(`Period: ${startDate.toISOString()} - ${endDate.toISOString()}`);
  console.log('='.repeat(60));

  // Query all actions by this user
  const events = await auditLog.query({
    userId,
    startTime: startDate.toISOString(),
    endTime: endDate.toISOString()
  });

  console.log(`Total events: ${events.length}\n`);

  // Group by type
  const byType: Record<string, number> = {};
  for (const event of events) {
    byType[event.type] = (byType[event.type] || 0) + 1;
  }

  console.log('Events by type:');
  for (const [type, count] of Object.entries(byType).sort()) {
    console.log(`  ${type}: ${count}`);
  }

  // Find failed operations
  const failures = events.filter(e => e.status === 'failure');
  if (failures.length > 0) {
    console.log(`\n⚠️  Failed operations: ${failures.length}`);
    for (const event of failures) {
      console.log(`  - ${event.type}: ${event.error?.message}`);
    }
  }

  // Find security blocks
  const blocks = await auditLog.query({
    types: ['security.check'],
    'result.decision': 'deny',
    userId
  });

  if (blocks.length > 0) {
    console.log(`\n🔒 Security blocks: ${blocks.length}`);
    for (const block of blocks) {
      console.log(`  - ${block.metadata?.policy_rule}: ${block.metadata?.reason}`);
    }
  }

  // Find all tool executions
  const toolEvents = events.filter(e => e.resourceType === 'tool');
  if (toolEvents.length > 0) {
    console.log(`\n🔧 Tool executions: ${toolEvents.length}`);
    const totalDuration = toolEvents.reduce((sum, e) => sum + (e.duration || 0), 0);
    console.log(`  Total execution time: ${totalDuration}ms`);
    console.log(`  Average: ${(totalDuration / toolEvents.length).toFixed(0)}ms`);
  }

  return { events, byType, failures, blocks };
}

/**
 * Example 3: Trace a specific message end-to-end
 */
async function traceMessageFlow(correlationId: string) {
  console.log(`\n🔍 Tracing message: ${correlationId}`);
  console.log('='.repeat(60));

  const events = await auditLog.query({
    correlationId
  });

  if (events.length === 0) {
    console.log('No events found for this correlation ID');
    return;
  }

  // Sort by timestamp
  events.sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  console.log(`Total steps: ${events.length}\n`);

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const elapsed = i === 0 ? 0 :
      new Date(event.timestamp).getTime() -
      new Date(events[0].timestamp).getTime();

    console.log(`[${elapsed}ms] ${event.type}`);
    console.log(`    Status: ${event.status}`);

    if (event.resourceId) {
      console.log(`    Resource: ${event.resourceId}`);
    }

    if (event.duration) {
      console.log(`    Duration: ${event.duration}ms`);
    }

    if (event.error) {
      console.log(`    Error: ${event.error.code} - ${event.error.message}`);
    }

    console.log();
  }

  // Visualize flow
  console.log('Flow:');
  const flow = events.map(e => {
    const icon = e.status === 'success' ? '✅' : e.status === 'pending' ? '⏳' : '❌';
    return `${icon} ${e.type}`;
  }).join(' → ');
  console.log(flow);
}

/**
 * Example 4: Monitoring tool approval metrics
 */
async function generateApprovalMetrics() {
  console.log(`\n📊 Approval Metrics`);
  console.log('='.repeat(60));

  // Get all approval events from last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const requested = await auditLog.query({
    types: ['approval.requested'],
    startTime: sevenDaysAgo.toISOString()
  });

  const granted = await auditLog.query({
    types: ['approval.granted'],
    startTime: sevenDaysAgo.toISOString()
  });

  const denied = await auditLog.query({
    types: ['approval.denied'],
    startTime: sevenDaysAgo.toISOString()
  });

  const timeout = await auditLog.query({
    types: ['approval.timeout'],
    startTime: sevenDaysAgo.toISOString()
  });

  console.log(`Requested: ${requested.length}`);
  console.log(`Granted:   ${granted.length} (${((granted.length / requested.length) * 100).toFixed(1)}%)`);
  console.log(`Denied:    ${denied.length} (${((denied.length / requested.length) * 100).toFixed(1)}%)`);
  console.log(`Timeout:   ${timeout.length} (${((timeout.length / requested.length) * 100).toFixed(1)}%)`);

  // Group by tool
  const byTool: Record<string, number> = {};
  for (const event of requested) {
    const tool = event.resourceId || 'unknown';
    byTool[tool] = (byTool[tool] || 0) + 1;
  }

  console.log(`\nTop tools requiring approval:`);
  Object.entries(byTool)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([tool, count]) => {
      console.log(`  ${tool}: ${count}`);
    });
}

/**
 * Example 5: Accessing session history with audit
 */
async function getSessionWithAudit(sessionId: string, userId: string) {
  console.log(`\n📚 Session History: ${sessionId}`);
  console.log('='.repeat(60));

  // Get session messages
  const session = await agent.getSessionHistory(sessionId);

  console.log(`Messages: ${session.length}`);
  for (const msg of session) {
    console.log(`  [${msg.role}] ${msg.content.substring(0, 50)}...`);
  }

  // Get audit trail for this session
  const events = await auditLog.query({
    sessionId,
    userId
  });

  console.log(`\nAudit events: ${events.length}`);

  // Show tool calls
  const toolCalls = events.filter(e => e.type === 'tool.invoked');
  if (toolCalls.length > 0) {
    console.log(`\nTool invocations:`);
    for (const call of toolCalls) {
      console.log(`  - ${call.resourceId}: ${call.status}`);
    }
  }

  return { session, events };
}

/**
 * Main execution
 */
async function main() {
  try {
    // Example 1: Delegate task
    console.log('🚀 Starting agent delegation example\n');
    const { sessionId, correlationId } = await delegateTaskToAgent();

    // Example 2: Generate compliance report
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const now = new Date();
    await generateComplianceReport('user@example.com', yesterday, now);

    // Example 3: Trace message flow
    await traceMessageFlow(correlationId);

    // Example 4: Approval metrics
    await generateApprovalMetrics();

    // Example 5: Session with audit
    await getSessionWithAudit(sessionId, 'user@example.com');

    console.log(`\n✅ Example completed successfully`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  delegateTaskToAgent,
  generateComplianceReport,
  traceMessageFlow,
  generateApprovalMetrics,
  getSessionWithAudit
};
