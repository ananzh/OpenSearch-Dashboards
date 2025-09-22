/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-console */

import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { IRouter } from '../../../../core/server';

// WebSocket server instance
let wss: WebSocketServer | null = null;
let httpServer: Server | null = null;

// Track connected clients
const connectedClients = new Set<WebSocket>();

// Debug: Track WebSocket events
let wsEventCounter = 0;
const wsEventLog: any[] = [];

function logWebSocketEvent(event: string, clientId: string, data?: any) {
  wsEventCounter++;
  const logEntry = {
    id: wsEventCounter,
    timestamp: new Date().toISOString(),
    event,
    clientId,
    data,
    totalClients: connectedClients.size,
  };
  
  wsEventLog.push(logEntry);
  if (wsEventLog.length > 50) {
    wsEventLog.shift(); // Keep only last 50 events
  }
  
  console.log(`🔌 WEBSOCKET [${wsEventCounter}]: ${event} - Client: ${clientId}`);
  console.log(`🔌 WEBSOCKET [${wsEventCounter}]: Total clients: ${connectedClients.size}`);
  if (data) {
    console.log(`🔌 WEBSOCKET [${wsEventCounter}]: Data:`, data);
  }
}

/**
 * Initialize WebSocket server for real-time MCP command delivery
 */
export function initializeWebSocketBridge(server: Server) {
  if (wss) {
    console.log('🔌 WebSocket bridge already initialized');
    return wss;
  }

  httpServer = server;
  
  // Create WebSocket server on port 8080 (separate from main HTTP server)
  wss = new WebSocketServer({ 
    port: 8080,
    path: '/mcp-websocket'
  });

  console.log('🔌 WebSocket server starting on port 8080...');

  wss.on('connection', (ws: WebSocket, request) => {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add to connected clients
    connectedClients.add(ws);
    logWebSocketEvent('CONNECTION', clientId, { 
      origin: request.headers.origin,
      userAgent: request.headers['user-agent']?.substring(0, 50) + '...'
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection_established',
      clientId,
      timestamp: new Date().toISOString(),
      message: 'WebSocket connection established for MCP commands'
    }));

    // Handle incoming messages from browser
    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        logWebSocketEvent('MESSAGE_RECEIVED', clientId, data);
        
        // Handle different message types
        switch (data.type) {
          case 'ping':
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString()
            }));
            break;
          case 'client_ready':
            logWebSocketEvent('CLIENT_READY', clientId);
            break;
          default:
            console.log(`🔌 Unknown message type: ${data.type}`);
        }
      } catch (error) {
        console.error(`🔌 Error parsing WebSocket message from ${clientId}:`, error);
      }
    });

    // Handle client disconnect
    ws.on('close', (code, reason) => {
      connectedClients.delete(ws);
      logWebSocketEvent('DISCONNECTION', clientId, { 
        code, 
        reason: reason.toString() 
      });
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
      console.error(`🔌 WebSocket error for ${clientId}:`, error);
      connectedClients.delete(ws);
      logWebSocketEvent('ERROR', clientId, { error: error.message });
    });
  });

  wss.on('listening', () => {
    console.log('✅ WebSocket server listening on port 8080');
    console.log('🔌 WebSocket endpoint: ws://localhost:8080/mcp-websocket');
  });

  wss.on('error', (error) => {
    console.error('❌ WebSocket server error:', error);
  });

  return wss;
}

/**
 * Broadcast MCP command to all connected browser clients
 */
export function broadcastMCPCommand(command: any): boolean {
  if (!wss || connectedClients.size === 0) {
    console.log('🔌 No WebSocket clients connected - command not broadcast');
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

  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
        successCount++;
      } catch (error) {
        console.error('🔌 Failed to send command to client:', error);
        failureCount++;
        // Remove failed client
        connectedClients.delete(client);
      }
    } else {
      // Remove disconnected client
      connectedClients.delete(client);
      failureCount++;
    }
  });

  console.log(`🔌 BROADCAST RESULT: ${successCount} success, ${failureCount} failed`);
  console.log(`🔌 BROADCAST COMMAND:`, {
    type: command.type,
    action: command.action,
    timestamp: command.timestamp
  });

  return successCount > 0;
}

/**
 * Get WebSocket server status
 */
export function getWebSocketStatus() {
  return {
    initialized: !!wss,
    listening: wss?.readyState === WebSocket.OPEN,
    connectedClients: connectedClients.size,
    port: 8080,
    path: '/mcp-websocket'
  };
}

/**
 * Register WebSocket status routes
 */
export function registerWebSocketRoutes(router: IRouter) {
  // WebSocket status endpoint
  router.get(
    {
      path: '/api/osd-mcp-server/websocket/status',
      validate: {},
    },
    async (context, request, response) => {
      const status = getWebSocketStatus();
      return response.ok({
        body: {
          ...status,
          eventLog: wsEventLog.slice(-10), // Last 10 events
          timestamp: new Date().toISOString()
        },
      });
    }
  );

  // Test WebSocket broadcast endpoint
  router.post(
    {
      path: '/api/osd-mcp-server/websocket/test-broadcast',
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

      const success = broadcastMCPCommand(testCommand);

      return response.ok({
        body: {
          success,
          message: success 
            ? `Test broadcast sent to ${connectedClients.size} clients`
            : 'No clients connected or broadcast failed',
          connectedClients: connectedClients.size,
          timestamp: new Date().toISOString()
        },
      });
    }
  );
}

/**
 * Cleanup WebSocket server
 */
export function cleanupWebSocketBridge() {
  if (wss) {
    console.log('🔌 Cleaning up WebSocket server...');
    
    // Close all client connections
    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1000, 'Server shutting down');
      }
    });
    connectedClients.clear();

    // Close WebSocket server
    wss.close(() => {
      console.log('✅ WebSocket server closed');
    });
    
    wss = null;
  }
}