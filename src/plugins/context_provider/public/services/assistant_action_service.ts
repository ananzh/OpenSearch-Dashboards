/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { BehaviorSubject, Observable } from 'rxjs';
import { AssistantAction, ToolStatus } from '../hooks/use_assistant_action';
import { InterToolDataService } from './inter_tool_data_service';

export interface ToolCallState {
  id: string;
  name: string;
  status: ToolStatus;
  args?: any;
  result?: any;
  error?: Error;
  timestamp: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters?: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface AssistantActionState {
  actions: Map<string, AssistantAction>;
  toolCallStates: Map<string, ToolCallState>;
  toolDefinitions: ToolDefinition[];
}

/**
 * Global singleton service for managing assistant actions across all plugins
 */
export class AssistantActionService {
  private static instance: AssistantActionService | null = null;
  private state$ = new BehaviorSubject<AssistantActionState>({
    actions: new Map(),
    toolCallStates: new Map(),
    toolDefinitions: [],
  });
  private interToolDataService?: InterToolDataService;
  private currentExecutionId: string | null = null;

  private constructor() {}

  static getInstance(): AssistantActionService {
    if (!AssistantActionService.instance) {
      AssistantActionService.instance = new AssistantActionService();
    }
    return AssistantActionService.instance;
  }

  /**
   * Get observable state for reactive updates
   */
  getState$(): Observable<AssistantActionState> {
    return this.state$.asObservable();
  }

  /**
   * Get current state snapshot
   */
  getCurrentState(): AssistantActionState {
    return this.state$.getValue();
  }

  /**
   * Set the InterToolDataService instance (called by ContextProvider plugin)
   */
  setInterToolDataService(service: InterToolDataService): void {
    this.interToolDataService = service;
    console.log('[AssistantActionService] InterToolDataService configured');
  }

  /**
   * Start a new tool execution chain
   */
  startToolExecution(sessionId: string): string {
    if (!this.interToolDataService) {
      console.warn('[AssistantActionService] No InterToolDataService available');
      return '';
    }

    this.currentExecutionId = this.interToolDataService.createExecutionContext(sessionId);
    console.log(`[AssistantActionService] Started tool execution: ${this.currentExecutionId}`);
    return this.currentExecutionId;
  }

  /**
   * Get shared data from tool execution context
   */
  getSharedToolData<T = any>(executionId: string, toolName?: string): T | null {
    if (!this.interToolDataService) {
      return null;
    }

    if (toolName) {
      return this.interToolDataService.getToolResult<T>(executionId, toolName);
    }
    return this.interToolDataService.getLastToolResult(executionId) as T;
  }

  /**
   * Get all shared data from execution context (full data for tools)
   */
  getAllSharedData(executionId: string): Record<string, any> {
    if (!this.interToolDataService || !executionId) {
      return {};
    }
    return this.interToolDataService.getAllResults(executionId);
  }

  /**
   * Get lightweight shared data for AI context (summaries only)
   */
  getAllSharedLightweightData(executionId: string): Record<string, any> {
    if (!this.interToolDataService || !executionId) {
      return {};
    }
    return this.interToolDataService.getAllLightweightResults(executionId);
  }

  registerAction = (action: AssistantAction) => {
    console.log('[AssistantActionService] Registering action:', action.name);
    const currentState = this.state$.getValue();
    const existingAction = currentState.actions.get(action.name);

    // Check if this is actually a new or changed action
    const hasChanged =
      !existingAction ||
      existingAction.description !== action.description ||
      JSON.stringify(existingAction.parameters) !== JSON.stringify(action.parameters) ||
      existingAction.available !== action.available;

    // Always update the action to get latest handler/render
    const newActions = new Map(currentState.actions);
    newActions.set(action.name, action);

    // Only trigger updates if something actually changed
    if (hasChanged) {
      console.log(
        '[AssistantActionService] Action changed, updating state. Registered actions:',
        Array.from(newActions.keys())
      );
      const toolDefinitions = this.createToolDefinitions(newActions);
      this.state$.next({
        ...currentState,
        actions: newActions,
        toolDefinitions,
      });
    } else {
      console.log('[AssistantActionService] Action unchanged, skipping state update');
    }
  };

  unregisterAction = (name: string) => {
    const currentState = this.state$.getValue();

    // Only update if the action actually exists
    if (currentState.actions.has(name)) {
      const newActions = new Map(currentState.actions);
      newActions.delete(name);

      const toolDefinitions = this.createToolDefinitions(newActions);
      this.state$.next({
        ...currentState,
        actions: newActions,
        toolDefinitions,
      });
    }
  };

  executeAction = async (name: string, args: any, executionId?: string) => {
    console.log(
      '🔧 [AssistantActionService] executeAction called for:',
      name,
      'with args:',
      args,
      'executionId:',
      executionId
    );

    const currentState = this.state$.getValue();
    const action = currentState.actions.get(name);
    if (!action) {
      console.log('🔧 [AssistantActionService] Action not found:', name);
      throw new Error(`Action ${name} not found`);
    }
    if (!action.handler) {
      console.log('🔧 [AssistantActionService] Action has no handler:', name);
      throw new Error(`Action ${name} has no handler`);
    }

    // Determine execution context
    const activeExecutionId = executionId || this.currentExecutionId;

    // Enhanced args with shared data and execution context
    const enhancedArgs = {
      ...args,
    };

    // Inject shared data if execution context exists
    if (activeExecutionId && this.interToolDataService) {
      // Lightweight data for AI context (summaries only)
      enhancedArgs.__sharedData = this.getAllSharedLightweightData(activeExecutionId);

      // Full data access for tools that need complete data
      enhancedArgs.__fullSharedData = this.getAllSharedData(activeExecutionId);

      enhancedArgs.__executionId = activeExecutionId;
      console.log(
        `[AssistantActionService] Injected lightweight and full shared data for execution: ${activeExecutionId}`
      );
    }

    try {
      console.log('🔧 [AssistantActionService] Executing action handler for:', name);
      const result = await action.handler(enhancedArgs);

      // Store result for next tool in the chain
      if (activeExecutionId && this.interToolDataService && result) {
        this.interToolDataService.storeToolResult(activeExecutionId, name, result);
        console.log(
          `[AssistantActionService] Stored result for tool '${name}' in execution ${activeExecutionId}`
        );

        // Check if tool chain is complete
        if (result.success && !result.nextAction) {
          this.interToolDataService.completeExecution(activeExecutionId);
          console.log(`[AssistantActionService] Marked execution ${activeExecutionId} as complete`);
        }
      }

      // Return lightweight result to AI context to prevent model input overflow
      const lightweightResult = this.createLightweightResult(name, result);
      console.log(
        '🔧 [AssistantActionService] Returning lightweight result to AI:',
        lightweightResult
      );
      return lightweightResult;
    } catch (error) {
      // Mark execution as failed
      if (activeExecutionId && this.interToolDataService) {
        this.interToolDataService.failExecution(activeExecutionId);
        console.log(
          `[AssistantActionService] Marked execution ${activeExecutionId} as failed due to error`
        );
      }
      throw error;
    }
  };

  updateToolCallState = (id: string, state: Partial<ToolCallState>) => {
    const currentState = this.state$.getValue();
    const existing = currentState.toolCallStates.get(id) || {
      id,
      name: '',
      status: 'pending' as ToolStatus,
      timestamp: Date.now(),
    };

    const newToolCallStates = new Map(currentState.toolCallStates);
    newToolCallStates.set(id, {
      ...existing,
      ...state,
    });

    this.state$.next({
      ...currentState,
      toolCallStates: newToolCallStates,
    });
  };

  getActionRenderer = (name: string) => {
    const currentState = this.state$.getValue();
    const action = currentState.actions.get(name);
    // Service getActionRenderer called
    return action?.render;
  };

  private createToolDefinitions = (actions: Map<string, AssistantAction>): ToolDefinition[] => {
    return Array.from(actions.values())
      .filter((action) => action.available !== 'disabled')
      .map((action) => ({
        name: action.name,
        description: action.description,
        parameters: action.parameters,
      }));
  };

  getToolDefinitions = (): ToolDefinition[] => {
    return this.state$.getValue().toolDefinitions;
  };

  // For debugging
  getRegisteredActions = () => {
    return Array.from(this.state$.getValue().actions.keys());
  };

  /**
   * Create a lightweight result for AI context to prevent model input overflow
   * @param toolName - Name of the tool
   * @param result - The full result data
   * @returns Lightweight result without large data arrays
   */
  private createLightweightResult(toolName: string, result: any): any {
    // Create lightweight summaries based on tool type and result structure
    if (toolName === 'execute_and_visualize' && result.queryResults) {
      const hits = result.queryResults.hits?.hits || [];
      return {
        success: result.success,
        query: result.query,
        executed: result.executed,
        dataPoints: hits.length,
        message: result.message,
        chartType: result.chartType,
        nextAction: result.nextAction,
        // Include small sample of data structure for AI reference
        sampleFields:
          result.sampleFields || this.extractSampleFields(result.queryResults.fieldSchema),
        sampleRow: result.sampleRow || (hits.length > 0 ? this.createSampleRow(hits[0]) : null),
      };
    } else {
      // Default lightweight summary for other tools
      const lightweightResult = { ...result };

      // Remove large data arrays if present
      if (lightweightResult.queryResults) {
        lightweightResult.queryResults = '[REFERENCE_DATA_AVAILABLE]';
      }
      if (Array.isArray(lightweightResult.data) && lightweightResult.data.length > 10) {
        lightweightResult.data = '[LARGE_ARRAY_DATA_AVAILABLE]';
      }

      return lightweightResult;
    }
  }

  /**
   * Extract sample field information for AI context
   */
  private extractSampleFields(fieldSchema: any[]): any {
    if (!Array.isArray(fieldSchema) || fieldSchema.length === 0) return null;

    // Return first few fields with their types
    return fieldSchema.slice(0, 5).map((field) => ({
      name: field.name,
      type: field.type,
    }));
  }

  /**
   * Create a sample row for AI context (first few fields only)
   */
  private createSampleRow(hit: any): any {
    if (!hit || !hit._source) return null;

    const source = hit._source;
    const sampleRow: any = {};
    const keys = Object.keys(source).slice(0, 5); // First 5 fields only

    for (const key of keys) {
      sampleRow[key] = source[key];
    }

    return sampleRow;
  }
}
