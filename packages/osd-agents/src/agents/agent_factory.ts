/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseAgent } from './base_agent';
import { JarvisAgent } from './jarvis/jarvis_agent';
import { ReactAgent } from './langgraph/react_agent';
import { CoActAgent } from './langgraph/coact_agent';

export class AgentFactory {
  /**
   * Create an agent instance of the specified type
   * Supports multiple agent implementations for testing and comparison
   */
  static createAgent(type: string): BaseAgent {
    const normalizedType = type.toLowerCase().trim();

    switch (normalizedType) {
      case 'jarvis':
        return new JarvisAgent();

      case 'langgraph':
      case 'react':
        return new ReactAgent();

      case 'coact':
        return new CoActAgent();

      // TODO: Phase 3 - Implement Strands agent
      // case 'strands':
      //   const { StrandsAgent } = require('./strands/strands-agent');
      //   return new StrandsAgent();

      default:
        throw new Error(
          `Unknown agent type: ${type}. Available types: ${this.getAvailableAgents().join(', ')}`
        );
    }
  }

  /**
   * Get list of all available agent types
   */
  static getAvailableAgents(): string[] {
    return ['jarvis', 'langgraph', 'react', 'coact'];
  }

  /**
   * Check if an agent type is supported
   */
  static isValidAgentType(type: string): boolean {
    return this.getAvailableAgents().includes(type.toLowerCase().trim());
  }

  /**
   * Get the default agent type
   */
  static getDefaultAgentType(): string {
    return 'jarvis';
  }
}
