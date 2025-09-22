/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-console, max-classes-per-file */

/**
 * WebSocket Bridge Client - Real-time MCP command execution
 *
 * Replaces polling mechanism with WebSocket-based real-time communication
 * for immediate command execution without delays or stale command issues.
 */

declare global {
  interface Window {
    exploreServices?: any;
    exploreReduxActions?: any;
    webSocketBridgeClient?: WebSocketBridgeClient;
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

class WebSocketBridgeClient {
  private ws: WebSocket | null = null;
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

    console.log('🔌 WebSocket Bridge Client initializing...');

    // Wait for global services first
    await this.waitForGlobalServices();
    
    // Connect to WebSocket server
    this.connect();
    
    this.isInitialized = true;
    console.log('✅ WebSocket Bridge Client initialized');
  }

  private async waitForGlobalServices(): Promise<void> {
    return new Promise((resolve) => {
      const checkServices = () => {
        if (window.exploreServices && window.exploreServices.store) {
          console.log('🔗 WebSocket Bridge: Global services detected');
          
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
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    console.log(`🔌 Connecting to WebSocket server (attempt ${this.reconnectAttempts + 1})...`);

    try {
      // Connect to WebSocket server on port 8080
      this.ws = new WebSocket('ws://localhost:8080/mcp-websocket');

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000; // Reset delay

        // Send client ready message
        this.send({
          type: 'client_ready',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        });

        // Start heartbeat
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('🔌 Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`🔌 WebSocket connection closed: ${event.code} - ${event.reason}`);
        this.isConnecting = false;
        this.ws = null;

        // Attempt to reconnect if not intentionally closed
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('🔌 WebSocket error:', error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error('🔌 Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('🔌 Max reconnection attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔌 Scheduling reconnect in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
  }

  private startHeartbeat() {
    setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({
          type: 'ping',
          timestamp: new Date().toISOString()
        });
      }
    }, 30000); // Ping every 30 seconds
  }

  private send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('🔌 Cannot send message - WebSocket not connected');
    }
  }

  private async handleMessage(data: any) {
    console.log('🔌 WebSocket message received:', data);

    switch (data.type) {
      case 'connection_established':
        console.log('✅ WebSocket connection established:', data.clientId);
        break;

      case 'pong':
        console.log('🔌 Heartbeat pong received');
        break;

      case 'mcp_command':
        await this.handleMCPCommand(data.command);
        break;

      case 'test_broadcast':
        console.log('🔌 Test broadcast received:', data);
        break;

      default:
        console.log('🔌 Unknown WebSocket message type:', data.type);
    }
  }

  private async handleMCPCommand(command: MCPCommand) {
    console.log('🎯 WebSocket MCP Command received:', command);

    // Create unique command ID to prevent duplicates
    const commandId = `${command.type}_${command.timestamp}_${JSON.stringify(command.payload).substring(0, 50)}`;
    
    if (this.processedCommands.has(commandId)) {
      console.log('⚠️ WebSocket: Skipping duplicate command:', commandId.substring(0, 80) + '...');
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
        console.log('⚠️ WebSocket: Unknown command action:', command.action);
      }
    } catch (error) {
      console.error('❌ WebSocket: Command execution failed:', error);
      // Remove from processed commands if execution failed so it can be retried
      this.processedCommands.delete(commandId);
    }
  }

  private async executeDirectReduxCommand(command: MCPCommand) {
    console.log('🎯 WebSocket: Executing direct Redux command');
    
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
        console.log('⚠️ WebSocket: Unknown Redux command type:', type);
    }
  }

  private async executeCallAgentCommand(command: MCPCommand) {
    console.log('🤖 WebSocket: Executing callAgentActionCreator command');
    
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

      console.log('✅ WebSocket: callAgentActionCreator executed successfully');
    } catch (error) {
      console.error('❌ WebSocket: callAgentActionCreator execution failed:', error);
    }
  }

  private async handleUpdateQuery(payload: any) {
    const { query, language = 'PPL' } = payload;
    console.log('🎯 WebSocket: Updating query:', { query, language });

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
      console.log('✅ WebSocket: Query execution completed');
    } catch (error) {
      console.error('❌ WebSocket: Query execution failed:', error);
    }
  }

  private async handleExecuteQuery(payload: any) {
    const { query, waitForResults = true } = payload;
    console.log('🚀 WebSocket: Executing query:', { query, waitForResults });

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

      console.log('✅ WebSocket: Query execution completed');
    } catch (error) {
      console.error('❌ WebSocket: Query execution failed:', error);
    }
  }

  // Public methods for debugging
  public getStatus() {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      connecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      processedCommands: this.processedCommands.size
    };
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
    }
  }

  public reconnect() {
    this.disconnect();
    setTimeout(() => this.connect(), 1000);
  }
}

// Initialize the WebSocket bridge client
console.log('🔌 WEBSOCKET BRIDGE CLIENT: Starting initialization...');
const webSocketBridgeClient = new WebSocketBridgeClient();

// Export for compatibility and debugging
export { webSocketBridgeClient };

// Make it available globally for debugging
(window as any).webSocketBridgeClient = webSocketBridgeClient;

console.log('🔌 WEBSOCKET BRIDGE CLIENT: Available at window.webSocketBridgeClient');
console.log('🔌 WEBSOCKET BRIDGE CLIENT: Module loaded and client initialized');