/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-console */

import { IRouter } from '../../../../core/server';

// In-memory store for pending MCP commands
const pendingCommands: any[] = [];

// Debug: Track all requests to this module
let requestCounter = 0;
const requestLog: any[] = [];

function logRequest(path: string, method: string, headers: any, body: any) {
  requestCounter++;
  const logEntry = {
    id: requestCounter,
    timestamp: new Date().toISOString(),
    path,
    method,
    headers: {
      'user-agent': typeof headers['user-agent'] === 'string'
        ? headers['user-agent'].substring(0, 50) + '...'
        : 'Array or undefined',
      'content-type': headers['content-type'],
      'authorization': headers['authorization'] ? 'Present' : 'None',
      'osd-xsrf': headers['osd-xsrf'],
    },
    body,
    queueSizeBefore: pendingCommands.length,
  };
  
  requestLog.push(logEntry);
  if (requestLog.length > 20) {
    requestLog.shift(); // Keep only last 20 requests
  }
  
  console.log(`🔍 REQUEST DEBUG [${requestCounter}]: ${method} ${path}`);
  console.log(`🔍 REQUEST DEBUG [${requestCounter}]: Headers:`, logEntry.headers);
  console.log(`🔍 REQUEST DEBUG [${requestCounter}]: Body:`, body);
  console.log(`🔍 REQUEST DEBUG [${requestCounter}]: Queue size before: ${pendingCommands.length}`);
  
  return requestCounter;
}

/**
 * Redux Bridge Routes - Allows MCP server to communicate with browser Redux store
 *
 * These routes execute Redux actions by accessing the global services exposed by the Explore plugin.
 * The global services are made available at `global.exploreServices` when the Explore page is active.
 */
export function registerReduxBridgeRoutes(router: IRouter) {
  // New endpoint: Get pending MCP commands for browser polling
  router.get(
    {
      path: '/api/osd-mcp-server/pending-commands',
      validate: {},
    },
    async (context, request, response) => {
      try {
        // Return and clear pending commands
        const commands = [...pendingCommands];
        pendingCommands.length = 0; // Clear the array

        console.log(`📨 Pending Commands: Returning ${commands.length} commands to browser`);

        return response.ok({
          body: commands,
        });
      } catch (error) {
        console.error('❌ Error getting pending commands:', error);
        return response.customError({
          statusCode: 500,
          body: {
            message: 'Failed to get pending commands',
          },
        });
      }
    }
  );

  // Helper function to add command to pending queue
  function addPendingCommand(command: any) {
    pendingCommands.push({
      ...command,
      id: Date.now(),
      timestamp: new Date().toISOString(),
    });
    console.log(`📥 Added command to pending queue. Total pending: ${pendingCommands.length}`);
  }
  // Get current Redux state
  router.get(
    {
      path: '/api/osd-mcp-server/redux/state',
      validate: false,
    },
    async (context, request, response) => {
      try {
        console.log('🔧 Server Redux Bridge - Proxying get_state request to client');

        // Return instructions for client-side execution
        return response.ok({
          body: {
            action: 'execute_redux',
            type: 'get_state',
            payload: {},
            timestamp: new Date().toISOString(),
            message: 'Redux execution instructions sent to client',
          },
        });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: {
            message: `Error accessing Redux state: ${error.message}`,
          },
        });
      }
    }
  );

  // Update query via Redux
  router.post(
    {
      path: '/api/osd-mcp-server/redux/update-query',
      validate: {
        body: (value, { ok, badRequest }) => {
          if (typeof value === 'object' && value !== null) {
            const body = value as any;
            if (typeof body.query === 'string') {
              return ok(body);
            }
          }
          return badRequest('Invalid request body');
        },
      },
    },
    async (context, request, response) => {
      try {
        const { query, language = 'PPL' } = request.body as any;

        console.log('🎯 SERVER ROUTE HIT: /api/osd-mcp-server/redux/update-query');
        console.log('📥 Request body:', { query, language });
        console.log('🔧 Returning Redux execution instructions...');

        // Option D: Return direct Redux execution instructions
        const responseBody = {
          action: 'execute_direct_redux',
          type: 'update_query',
          payload: { query, language },
          timestamp: new Date().toISOString(),
          message: 'Direct Redux execution - query will be updated via direct store.dispatch()',
          directExecution: {
            method: 'updateQueryDirect',
            params: { query, language },
            description: 'Execute Redux action directly in browser context without HTTP',
          },
        };

        // Add to pending commands queue for polling
        addPendingCommand(responseBody);

        console.log('📤 Server response:', responseBody);

        return response.ok({
          body: responseBody,
        });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: {
            message: `Error updating query: ${error.message}`,
          },
        });
      }
    }
  );

  // Execute query via Redux
  router.post(
    {
      path: '/api/osd-mcp-server/redux/execute-query',
      validate: {
        body: (value, { ok }) => {
          return ok(value || {});
        },
      },
    },
    async (context, request, response) => {
      try {
        const { query, waitForResults = true } = request.body as any;

        console.log('🔧 Server Redux Bridge - Proxying execute_query request to client');

        // Always return instructions for client-side execution (Option C)
        return response.ok({
          body: {
            action: 'execute_redux',
            type: 'execute_query',
            payload: { query, waitForResults },
            timestamp: new Date().toISOString(),
            message: 'Redux execution instructions sent to client',
          },
        });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: {
            message: `Error executing query: ${error.message}`,
          },
        });
      }
    }
  );

  // Call Agent via Redux (using callAgentActionCreator)
  router.post(
    {
      path: '/api/osd-mcp-server/redux/call-agent',
      validate: {
        body: (value, { ok, badRequest }) => {
          if (typeof value === 'object' && value !== null) {
            const body = value as any;
            if (typeof body.question === 'string') {
              return ok(body);
            }
          }
          return badRequest('Invalid request body - question is required');
        },
      },
    },
    async (context, request, response) => {
      const requestId = logRequest('/api/osd-mcp-server/redux/call-agent', 'POST', request.headers, request.body);
      
      try {
        const { question, language = 'PPL' } = request.body as any;

        console.log(`🎯 CALL-AGENT DEBUG [${requestId}]: Server route hit`);
        console.log(`🎯 CALL-AGENT DEBUG [${requestId}]: Processing call-agent request`);

        // FIX 1: Polling-only approach for call-agent
        const commandForQueue = {
          action: 'execute_call_agent',
          type: 'call_agent',
          payload: { question, language },
          timestamp: new Date().toISOString(),
          message: 'Polling-only callAgentActionCreator execution via browser polling',
          directExecution: {
            method: 'callAgentActionCreator',
            params: { question, language },
            description: 'Execute callAgentActionCreator via polling mechanism only',
          },
        };

        console.log(`🎯 CALL-AGENT DEBUG [${requestId}]: Queue size before: ${pendingCommands.length}`);
        
        // POLLING-ONLY: Add command to queue for browser polling
        addPendingCommand(commandForQueue);
        
        console.log(`🎯 CALL-AGENT DEBUG [${requestId}]: Queue size after: ${pendingCommands.length}`);
        console.log(`🎯 CALL-AGENT DEBUG [${requestId}]: Command queued successfully for polling`);

        // FIX 2: Return simple acknowledgment only (no execution instructions)
        const acknowledgment = {
          success: true,
          message: 'Call agent command queued for execution via polling',
          queued: true,
          timestamp: new Date().toISOString(),
          queueSize: pendingCommands.length,
          requestId,
        };

        console.log(`🎯 CALL-AGENT DEBUG [${requestId}]: Returning acknowledgment:`, acknowledgment);

        return response.ok({
          body: acknowledgment,
        });
      } catch (error) {
        console.error(`❌ CALL-AGENT DEBUG [${requestId}]: Error in route:`, error);
        return response.customError({
          statusCode: 500,
          body: {
            message: `Error calling agent: ${error.message}`,
          },
        });
      }
    }
  );
}
