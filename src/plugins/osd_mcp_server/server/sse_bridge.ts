/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-console */

import { IRouter } from '../../../../core/server';

// Track connected SSE clients
const sseClients = new Set<any>();

// Debug: Track SSE events
let sseEventCounter = 0;
const sseEventLog: any[] = [];

function logSSEEvent(event: string, clientId: string, data?: any) {
  sseEventCounter++;
  const logEntry = {
    id: sseEventCounter,
    timestamp: new Date().toISOString(),
    event,
    clientId,
    data,
    totalClients: sseClients.size,
  };
  
  sseEventLog.push(logEntry);
  if (sseEventLog.length > 50) {
    sseEventLog.shift(); // Keep only last 50 events
  }
  
  console.log(`📡 SSE [${sseEventCounter}]: ${event} - Client: ${clientId}`);
  console.log(`📡 SSE [${sseEventCounter}]: Total clients: ${sseClients.size}`);
  if (data) {
    console.log(`📡 SSE [${sseEventCounter}]: Data:`, data);
  }
}

/**
 * Broadcast MCP command to all connected SSE clients
 */
export function broadcastSSECommand(command: any): boolean {
  if (sseClients.size === 0) {
    console.log('📡 No SSE clients connected - command not broadcast');
    return false;
  }

  const message = {
    type: 'mcp_command',
    command,
    timestamp: new Date().toISOString(),
    broadcast: true
  };

  let successCount = 0;
  let failureCount = 0;

  sseClients.forEach((client) => {
    try {
      if (!client.response.destroyed && !client.response.writableEnded) {
        client.response.write(`data: ${JSON.stringify(message)}\n\n`);
        successCount++;
      } else {
        // Remove disconnected client
        sseClients.delete(client);
        failureCount++;
      }
    } catch (error) {
      console.error('📡 Failed to send command to SSE client:', error);
      failureCount++;
      // Remove failed client
      sseClients.delete(client);
    }
  });

  console.log(`📡 SSE BROADCAST RESULT: ${successCount} success, ${failureCount} failed`);
  console.log(`📡 SSE BROADCAST COMMAND:`, {
    type: command.type,
    action: command.action,
    timestamp: command.timestamp
  });

  return successCount > 0;
}

/**
 * Get SSE server status
 */
export function getSSEStatus() {
  return {
    connectedClients: sseClients.size,
    eventLog: sseEventLog.slice(-10), // Last 10 events
    timestamp: new Date().toISOString()
  };
}

/**
 * Register SSE routes
 */
export function registerSSERoutes(router: IRouter) {
  // SSE endpoint for real-time command delivery
  router.get(
    {
      path: '/api/osd-mcp-server/sse/commands',
      validate: {},
    },
    async (context, request, response) => {
      const clientId = `sse_client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`📡 SSE client connecting: ${clientId}`);
      
      // Set SSE headers
      const headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      };

      // Create SSE response
      const sseResponse = response.custom({
        statusCode: 200,
        headers,
        body: '', // We'll write to this stream
      });

      // Get the raw response object to write SSE data
      const rawResponse = (sseResponse as any).response;
      
      // Create client object
      const client = {
        id: clientId,
        response: rawResponse,
        connectedAt: new Date().toISOString(),
      };

      // Add to connected clients
      sseClients.add(client);
      logSSEEvent('CONNECTION', clientId);

      // Send initial connection message
      try {
        rawResponse.write(`data: ${JSON.stringify({
          type: 'connection_established',
          clientId,
          timestamp: new Date().toISOString(),
          message: 'SSE connection established for MCP commands'
        })}\n\n`);
      } catch (error) {
        console.error(`📡 Failed to send initial message to ${clientId}:`, error);
      }

      // Send periodic heartbeat
      const heartbeatInterval = setInterval(() => {
        try {
          if (!rawResponse.destroyed && !rawResponse.writableEnded) {
            rawResponse.write(`data: ${JSON.stringify({
              type: 'heartbeat',
              timestamp: new Date().toISOString()
            })}\n\n`);
          } else {
            clearInterval(heartbeatInterval);
            sseClients.delete(client);
          }
        } catch (error) {
          console.error(`📡 Heartbeat failed for ${clientId}:`, error);
          clearInterval(heartbeatInterval);
          sseClients.delete(client);
        }
      }, 30000); // Every 30 seconds

      // Handle client disconnect
      rawResponse.on('close', () => {
        clearInterval(heartbeatInterval);
        sseClients.delete(client);
        logSSEEvent('DISCONNECTION', clientId);
      });

      rawResponse.on('error', (error: any) => {
        console.error(`📡 SSE error for ${clientId}:`, error);
        clearInterval(heartbeatInterval);
        sseClients.delete(client);
        logSSEEvent('ERROR', clientId, { error: error.message });
      });

      return sseResponse;
    }
  );

  // SSE status endpoint
  router.get(
    {
      path: '/api/osd-mcp-server/sse/status',
      validate: {},
    },
    async (context, request, response) => {
      const status = getSSEStatus();
      return response.ok({
        body: status,
      });
    }
  );

  // Test SSE broadcast endpoint
  router.post(
    {
      path: '/api/osd-mcp-server/sse/test-broadcast',
      validate: {
        body: (value, { ok }) => ok(value || {}),
      },
    },
    async (context, request, response) => {
      const { message = 'Test broadcast' } = request.body as any;
      
      const testCommand = {
        action: 'test_broadcast',
        type: 'test',
        payload: { message },
        timestamp: new Date().toISOString(),
      };

      const success = broadcastSSECommand(testCommand);

      return response.ok({
        body: {
          success,
          message: success 
            ? `Test broadcast sent to ${sseClients.size} clients`
            : 'No clients connected or broadcast failed',
          connectedClients: sseClients.size,
          timestamp: new Date().toISOString()
        },
      });
    }
  );
}

/**
 * Cleanup SSE connections
 */
export function cleanupSSEBridge() {
  console.log('📡 Cleaning up SSE connections...');
  
  sseClients.forEach((client) => {
    try {
      if (!client.response.destroyed) {
        client.response.end();
      }
    } catch (error) {
      console.error('📡 Error closing SSE client:', error);
    }
  });
  
  sseClients.clear();
  console.log('✅ SSE connections cleaned up');
}