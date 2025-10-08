/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ToolResult {
  data: any;
  timestamp: number;
  toolName: string;
}

export interface ToolExecutionContext {
  executionId: string;
  sessionId: string;
  results: Map<string, ToolResult>;
  metadata: {
    timestamp: number;
    status: 'active' | 'completed' | 'failed';
  };
}

/**
 * Service for sharing data between tools across different plugins
 * Manages execution contexts that allow tool chains to pass data between steps
 */
export class InterToolDataService {
  private executionContexts = new Map<string, ToolExecutionContext>();
  private sessionExecutions = new Map<string, Set<string>>();

  /**
   * Create a new execution context for a tool chain
   * @param sessionId - Chat session ID to group executions
   * @param executionId - Optional custom execution ID
   * @returns The execution ID for this context
   */
  createExecutionContext(sessionId: string, executionId?: string): string {
    const finalExecutionId =
      executionId || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const context: ToolExecutionContext = {
      executionId: finalExecutionId,
      sessionId,
      results: new Map(),
      metadata: {
        timestamp: Date.now(),
        status: 'active',
      },
    };

    this.executionContexts.set(finalExecutionId, context);

    // Track executions by session for cleanup
    if (!this.sessionExecutions.has(sessionId)) {
      this.sessionExecutions.set(sessionId, new Set());
    }
    this.sessionExecutions.get(sessionId)!.add(finalExecutionId);

    console.log(
      `[InterToolDataService] Created execution context: ${finalExecutionId} for session: ${sessionId}`
    );
    return finalExecutionId;
  }

  /**
   * Store the result from a tool execution
   * @param executionId - The execution context ID
   * @param toolName - Name of the tool that produced this result
   * @param result - The result data to store
   */
  storeToolResult(executionId: string, toolName: string, result: any): void {
    const context = this.executionContexts.get(executionId);
    if (context && this.isContextValid(context)) {
      const toolResult: ToolResult = {
        data: result,
        timestamp: Date.now(),
        toolName,
      };

      context.results.set(toolName, toolResult);
      console.log(
        `[InterToolDataService] Stored result for tool '${toolName}' in execution ${executionId}`
      );
    } else {
      console.warn(
        `[InterToolDataService] Cannot store result - invalid execution context: ${executionId}`
      );
    }
  }

  /**
   * Get result from a specific tool in the execution chain
   * @param executionId - The execution context ID
   * @param toolName - Name of the tool whose result to retrieve
   * @returns The tool result data or null if not found
   */
  getToolResult<T = any>(executionId: string, toolName: string): T | null {
    const context = this.executionContexts.get(executionId);
    if (context && this.isContextValid(context)) {
      const toolResult = context.results.get(toolName);
      if (toolResult) {
        console.log(
          `[InterToolDataService] Retrieved result for tool '${toolName}' from execution ${executionId}`
        );
        return toolResult.data as T;
      }
    }

    console.warn(
      `[InterToolDataService] No result found for tool '${toolName}' in execution ${executionId}`
    );
    return null;
  }

  /**
   * Get all results from the execution context
   * @param executionId - The execution context ID
   * @returns Object with all tool results keyed by tool name
   */
  getAllResults(executionId: string): Record<string, any> {
    const context = this.executionContexts.get(executionId);
    if (context && this.isContextValid(context)) {
      const results: Record<string, any> = {};
      for (const [toolName, toolResult] of context.results) {
        results[toolName] = toolResult.data;
      }
      return results;
    }
    return {};
  }

  /**
   * Get the most recently stored result in the execution chain
   * @param executionId - The execution context ID
   * @returns The most recent tool result data or null
   */
  getLastToolResult(executionId: string): any {
    const context = this.executionContexts.get(executionId);
    if (context && this.isContextValid(context)) {
      let lastResult = null;
      let lastTimestamp = 0;

      for (const [_, toolResult] of context.results) {
        if (toolResult.timestamp > lastTimestamp) {
          lastTimestamp = toolResult.timestamp;
          lastResult = toolResult.data;
        }
      }

      if (lastResult) {
        console.log(`[InterToolDataService] Retrieved last result from execution ${executionId}`);
      }
      return lastResult;
    }
    return null;
  }

  /**
   * Clean up all execution contexts for a session (called on new user message)
   * @param sessionId - The session ID to clean up
   */
  cleanupSession(sessionId: string): void {
    const executionIds = this.sessionExecutions.get(sessionId);
    if (executionIds) {
      console.log(
        `[InterToolDataService] Cleaning up ${executionIds.size} executions for session: ${sessionId}`
      );

      // Remove all executions for this session
      for (const executionId of executionIds) {
        this.executionContexts.delete(executionId);
      }
      this.sessionExecutions.delete(sessionId);
    }
  }

  /**
   * Mark an execution as completed (successful tool chain completion)
   * @param executionId - The execution context ID
   */
  completeExecution(executionId: string): void {
    const context = this.executionContexts.get(executionId);
    if (context) {
      context.metadata.status = 'completed';
      console.log(`[InterToolDataService] Marked execution ${executionId} as completed`);
      // Keep in memory until next user message for debugging/inspection
    }
  }

  /**
   * Mark an execution as failed and clean up immediately
   * @param executionId - The execution context ID
   */
  failExecution(executionId: string): void {
    const context = this.executionContexts.get(executionId);
    if (context) {
      context.metadata.status = 'failed';
      console.log(`[InterToolDataService] Marked execution ${executionId} as failed, cleaning up`);

      // Remove from session tracking
      const sessionExecutions = this.sessionExecutions.get(context.sessionId);
      if (sessionExecutions) {
        sessionExecutions.delete(executionId);
        if (sessionExecutions.size === 0) {
          this.sessionExecutions.delete(context.sessionId);
        }
      }

      // Remove the context
      this.executionContexts.delete(executionId);
    }
  }

  /**
   * Get statistics about current execution contexts (for debugging)
   * @returns Statistics object
   */
  getStats() {
    const contexts = Array.from(this.executionContexts.values());
    return {
      totalExecutions: this.executionContexts.size,
      activeSessions: this.sessionExecutions.size,
      byStatus: {
        active: contexts.filter((ctx) => ctx.metadata.status === 'active').length,
        completed: contexts.filter((ctx) => ctx.metadata.status === 'completed').length,
        failed: contexts.filter((ctx) => ctx.metadata.status === 'failed').length,
      },
      oldestExecution:
        contexts.length > 0 ? Math.min(...contexts.map((ctx) => ctx.metadata.timestamp)) : null,
    };
  }

  /**
   * Check if an execution context is valid (exists and not expired)
   * @param context - The execution context to validate
   * @returns True if context is valid
   */
  private isContextValid(context: ToolExecutionContext): boolean {
    return context.metadata.status !== 'failed';
  }

  /**
   * Manual cleanup method for old executions (fallback safety)
   * @param maxAge - Maximum age in milliseconds (default: 1 hour)
   */
  cleanupOldExecutions(maxAge: number = 3600000): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [executionId, context] of this.executionContexts) {
      if (now - context.metadata.timestamp > maxAge) {
        // Remove from session tracking
        const sessionExecutions = this.sessionExecutions.get(context.sessionId);
        if (sessionExecutions) {
          sessionExecutions.delete(executionId);
          if (sessionExecutions.size === 0) {
            this.sessionExecutions.delete(context.sessionId);
          }
        }

        // Remove the context
        this.executionContexts.delete(executionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[InterToolDataService] Cleaned up ${cleanedCount} old executions`);
    }
  }
}
