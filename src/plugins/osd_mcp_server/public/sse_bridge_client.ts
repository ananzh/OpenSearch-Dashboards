/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-console, max-classes-per-file */

/**
 * Server-Sent Events Bridge Client - Real-time MCP command execution
 *
 * Replaces polling mechanism with SSE-based real-time communication
 * for immediate command execution without delays or stale command issues.
 */

declare global {
  interface Window {
    exploreServices?: any;
    exploreReduxActions?: any;
    sseBridgeClient?: SSEBridgeClient;
  }
}

interface MCPCommand {
  action: string;
  type: string;
  payload: any;
  timestamp: string;
  message?: string;
  directExecution?: any;
}

class SSEBridgeClient {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isConnecting = false;
  private isInitialized = false;
  private processedCommands = new Set<string>();

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (this.isInitialized) return;

    console.log('📡 SSE Bridge Client initializing...');

    // Wait for global services first
    await this.waitForGlobalServices();
    
    // Connect to SSE endpoint
    this.connect();
    
    this.isInitialized = true;
    console.log('✅ SSE Bridge Client initialized');
  }

  private async waitForGlobalServices(): Promise<void> {
    return new Promise((resolve) => {
      const checkServices = () => {
        if (window.exploreServices && window.exploreServices.store) {
          console.log('🔗 SSE Bridge: Global services detected');
          
          // Test Redux store access
          try {
            const currentState = window.exploreServices.store.getState();
            console.log('✅ Redux Store Access: Working');
            console.log('📊 Current Query State:', {
              query: currentState.query?.query || 'empty',
              language: currentState.query?.language || 'unknown',
              dataset: currentState.query?.dataset?.title || 'none',
            });
          } catch (error) {
            console.error('❌ Redux Store Error:', error);
          }

          resolve();
        } else {
          setTimeout(checkServices, 1000);
        }
      };
      checkServices();
    });
  }

  private connect() {
    if (this.isConnecting || (this.eventSource && this.eventSource.readyState === EventSource.OPEN)) {
      return;
    }

    this.isConnecting = true;
    console.log(`📡 Connecting to SSE endpoint (attempt ${this.reconnectAttempts + 1})...`);

    try {
      // Connect to SSE endpoint
      this.eventSource = new EventSource('/api/osd-mcp-server/sse/commands');

      this.eventSource.onopen = () => {
        console.log('✅ SSE connection established');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000; // Reset delay
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('📡 Error parsing SSE message:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('📡 SSE error:', error);
        this.isConnecting = false;
        
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.scheduleReconnect();
        }
      };

    } catch (error) {
      console.error('📡 Failed to create SSE connection:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('📡 Max reconnection attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts++;
    console.log(`📡 Scheduling reconnect in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
  }

  private async handleMessage(data: any) {
    console.log('📡 SSE message received:', data);

    switch (data.type) {
      case 'connection_established':
        console.log('✅ SSE connection established');
        break;

      case 'mcp_command':
        await this.handleMCPCommand(data.command);
        break;

      case 'heartbeat':
        console.log('📡 Heartbeat received');
        break;

      case 'test_broadcast':
        console.log('📡 Test broadcast received:', data);
        break;

      default:
        console.log('📡 Unknown SSE message type:', data.type);
    }
  }

  private async handleMCPCommand(command: MCPCommand) {
    console.log('🎯 SSE MCP Command received:', command);

    // Create unique command ID to prevent duplicates
    const commandId = `${command.type}_${command.timestamp}_${JSON.stringify(command.payload).substring(0, 50)}`;
    
    if (this.processedCommands.has(commandId)) {
      console.log('⚠️ SSE: Skipping duplicate command:', commandId.substring(0, 80) + '...');
      return;
    }

    // Mark as processed
    this.processedCommands.add(commandId);

    // Clean up old processed commands (keep only last 50)
    if (this.processedCommands.size > 50) {
      const commandsArray = Array.from(this.processedCommands);
      this.processedCommands = new Set(commandsArray.slice(-25));
    }

    try {
      // Execute the command based on its action type
      if (command.action === 'execute_direct_redux') {
        await this.executeDirectReduxCommand(command);
      } else if (command.action === 'execute_call_agent') {
        await this.executeCallAgentCommand(command);
      } else {
        console.log('⚠️ SSE: Unknown command action:', command.action);
      }
    } catch (error) {
      console.error('❌ SSE: Command execution failed:', error);
      // Remove from processed commands if execution failed so it can be retried
      this.processedCommands.delete(commandId);
    }
  }

  private async executeDirectReduxCommand(command: MCPCommand) {
    console.log('🎯 SSE: Executing direct Redux command');
    
    const globalServices = window.exploreServices;
    if (!globalServices || !globalServices.store) {
      console.error('❌ Global services or store not available');
      return;
    }

    const { type, payload } = command;

    switch (type) {
      case 'update_query':
        await this.handleUpdateQuery(payload);
        break;
      case 'execute_query':
        await this.handleExecuteQuery(payload);
        break;
      default:
        console.log('⚠️ SSE: Unknown Redux command type:', type);
    }
  }

  private async executeCallAgentCommand(command: MCPCommand) {
    console.log('🤖 SSE: Executing callAgentActionCreator command');
    
    const globalServices = window.exploreServices;
    const reduxActions = window.exploreReduxActions;

    if (!globalServices || !globalServices.store) {
      console.error('❌ Global services or store not available');
      return;
    }

    if (!reduxActions || !reduxActions.callAgentActionCreator) {
      console.error('❌ callAgentActionCreator not available');
      return;
    }

    const { question, language = 'PPL' } = command.payload;

    try {
      // Get current dataset
      const dataset = globalServices.data.query.queryString.getQuery().dataset;

      if (!dataset) {
        console.error('❌ No dataset selected');
        return;
      }

      // Execute callAgentActionCreator
      await globalServices.store.dispatch(
        reduxActions.callAgentActionCreator({
          services: globalServices,
          editorText: question,
        })
      );

      console.log('✅ SSE: callAgentActionCreator executed successfully');
    } catch (error) {
      console.error('❌ SSE: callAgentActionCreator execution failed:', error);
    }
  }

  private async handleUpdateQuery(payload: any) {
    const { query, language = 'PPL' } = payload;
    console.log('🎯 SSE: Updating query:', { query, language });

    const globalServices = window.exploreServices;
    const reduxActions = window.exploreReduxActions;

    // Update Redux state
    if (reduxActions && reduxActions.setQueryStringWithHistory) {
      globalServices.store.dispatch(reduxActions.setQueryStringWithHistory(query));
    } else {
      globalServices.store.dispatch({
        type: 'query/setQueryStringWithHistory',
        payload: query,
        meta: { addToHistory: true },
      });
    }

    // Execute query
    try {
      if (reduxActions && reduxActions.executeQueries) {
        await globalServices.store.dispatch(
          reduxActions.executeQueries({ services: globalServices })
        );
      } else {
        await globalServices.store.dispatch({
          type: 'query/executeQueries',
          payload: { services: globalServices },
        });
      }
      console.log('✅ SSE: Query execution completed');
    } catch (error) {
      console.error('❌ SSE: Query execution failed:', error);
    }
  }

  private async handleExecuteQuery(payload: any) {
    const { query, waitForResults = true } = payload;
    console.log('🚀 SSE: Executing query:', { query, waitForResults });

    const globalServices = window.exploreServices;
    const reduxActions = window.exploreReduxActions;

    // If a query was provided, update it first
    if (query) {
      if (reduxActions && reduxActions.setQueryStringWithHistory) {
        globalServices.store.dispatch(reduxActions.setQueryStringWithHistory(query));
      } else {
        globalServices.store.dispatch({
          type: 'query/setQueryStringWithHistory',
          payload: query,
          meta: { addToHistory: true },
        });
      }
    }

    // Execute the query
    try {
      const executePromise = reduxActions && reduxActions.executeQueries
        ? globalServices.store.dispatch(reduxActions.executeQueries({ services: globalServices }))
        : globalServices.store.dispatch({
            type: 'query/executeQueries',
            payload: { services: globalServices },
          });

      if (waitForResults) {
        await executePromise;
      }

      console.log('✅ SSE: Query execution completed');
    } catch (error) {
      console.error('❌ SSE: Query execution failed:', error);
    }
  }

  // Public methods for debugging
  public getStatus() {
    return {
      connected: this.eventSource?.readyState === EventSource.OPEN,
      connecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      processedCommands: this.processedCommands.size
    };
  }

  public disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  public reconnect() {
    this.disconnect();
    setTimeout(() => this.connect(), 1000);
  }
}

// Initialize the SSE bridge client
console.log('📡 SSE BRIDGE CLIENT: Starting initialization...');
const sseBridgeClient = new SSEBridgeClient();

// Export for compatibility and debugging
export { sseBridgeClient };

// Make it available globally for debugging
(window as any).sseBridgeClient = sseBridgeClient;

console.log('📡 SSE BRIDGE CLIENT: Available at window.sseBridgeClient');
console.log('📡 SSE BRIDGE CLIENT: Module loaded and client initialized');