/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmbeddableStart, EmbeddableFactory, EmbeddableInput } from '../../../embeddable/public';
import { VisualizationEmbeddableInput } from '../../../visualizations/public';
import { ExpressionRenderer } from '../../../expressions/public';

export interface ChatVisualizationEmbeddableInput extends EmbeddableInput {
  id: string;
  title?: string;
  expression: string;
  vegaSpec?: any;
  chatMessageId: string; // Link to chat message for cleanup
}

export interface ChatVisualization {
  id: string;
  embeddableId: string;
  chatMessageId: string;
  title?: string;
  expression: string;
  vegaSpec?: any;
  createdAt: number;
}

/**
 * Service for managing visualization embeddables within chat messages
 */
export class ChatVisualizationService {
  private embeddableStart?: EmbeddableStart;
  private expressionRenderer?: ExpressionRenderer;
  private visualizations = new Map<string, ChatVisualization>();

  constructor() {}

  /**
   * Initialize the service with required dependencies
   */
  setup(embeddableStart: EmbeddableStart, expressionRenderer: ExpressionRenderer) {
    this.embeddableStart = embeddableStart;
    this.expressionRenderer = expressionRenderer;
    console.log('[ChatVisualizationService] Initialized with dependencies');
  }

  /**
   * Create a visualization embeddable for display in chat
   * @param input - Visualization input parameters
   * @returns Promise resolving to chat visualization info
   */
  async createVisualization(input: {
    title?: string;
    expression: string;
    vegaSpec?: any;
    chatMessageId: string;
  }): Promise<ChatVisualization> {
    if (!this.embeddableStart) {
      throw new Error('ChatVisualizationService not properly initialized');
    }

    const visualizationId = `chat-viz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const embeddableId = `chat-embeddable-${visualizationId}`;

    console.log(`[ChatVisualizationService] Creating visualization: ${visualizationId}`);

    // Create embeddable input for expression-based visualization
    const embeddableInput: ChatVisualizationEmbeddableInput = {
      id: embeddableId,
      title: input.title || 'Chat Visualization',
      expression: input.expression,
      vegaSpec: input.vegaSpec,
      chatMessageId: input.chatMessageId,
    };

    const chatVisualization: ChatVisualization = {
      id: visualizationId,
      embeddableId,
      chatMessageId: input.chatMessageId,
      title: input.title,
      expression: input.expression,
      vegaSpec: input.vegaSpec,
      createdAt: Date.now(),
    };

    // Store visualization info
    this.visualizations.set(visualizationId, chatVisualization);

    console.log(
      `[ChatVisualizationService] Created visualization ${visualizationId} for message ${input.chatMessageId}`
    );
    return chatVisualization;
  }

  /**
   * Get visualization by ID
   */
  getVisualization(visualizationId: string): ChatVisualization | undefined {
    return this.visualizations.get(visualizationId);
  }

  /**
   * Get all visualizations for a chat message
   */
  getVisualizationsForMessage(chatMessageId: string): ChatVisualization[] {
    return Array.from(this.visualizations.values()).filter(
      (viz) => viz.chatMessageId === chatMessageId
    );
  }

  /**
   * Remove visualization and clean up resources
   */
  removeVisualization(visualizationId: string): void {
    const visualization = this.visualizations.get(visualizationId);
    if (visualization) {
      console.log(`[ChatVisualizationService] Removing visualization: ${visualizationId}`);
      this.visualizations.delete(visualizationId);
    }
  }

  /**
   * Clean up all visualizations for a chat message (when message is deleted)
   */
  cleanupVisualizationsForMessage(chatMessageId: string): void {
    const messageViz = this.getVisualizationsForMessage(chatMessageId);
    for (const viz of messageViz) {
      this.removeVisualization(viz.id);
    }
    console.log(
      `[ChatVisualizationService] Cleaned up ${messageViz.length} visualizations for message ${chatMessageId}`
    );
  }

  /**
   * Get statistics about managed visualizations
   */
  getStats() {
    return {
      totalVisualizations: this.visualizations.size,
      visualizationsByMessage: this.groupVisualizationsByMessage(),
    };
  }

  private groupVisualizationsByMessage() {
    const grouped: Record<string, number> = {};
    for (const viz of this.visualizations.values()) {
      grouped[viz.chatMessageId] = (grouped[viz.chatMessageId] || 0) + 1;
    }
    return grouped;
  }
}
