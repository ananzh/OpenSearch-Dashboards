/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChartType } from '../types';

/**
 * Parse user intent from natural language to determine chart type
 */
export class ChartIntentParser {
  /**
   * Parse chart type from user message
   */
  static parseChartType(message: string): ChartType | undefined {
    const text = message.toLowerCase();

    // Direct chart type mentions
    if (this.matchesPattern(text, ['bar chart', 'bar graph', 'bars', 'column chart'])) {
      return 'bar';
    }

    if (this.matchesPattern(text, ['line chart', 'line graph', 'lines', 'time series', 'trend'])) {
      return 'line';
    }

    if (this.matchesPattern(text, ['pie chart', 'pie graph', 'donut', 'pie'])) {
      return 'pie';
    }

    if (this.matchesPattern(text, ['area chart', 'area graph', 'filled area'])) {
      return 'area';
    }

    if (this.matchesPattern(text, ['scatter plot', 'scatter chart', 'scatter', 'xy plot'])) {
      return 'scatter';
    }

    if (this.matchesPattern(text, ['heatmap', 'heat map', 'correlation matrix'])) {
      return 'heatmap';
    }

    if (this.matchesPattern(text, ['table', 'tabular', 'grid', 'list'])) {
      return 'table';
    }

    if (this.matchesPattern(text, ['metric', 'single value', 'gauge', 'number', 'count'])) {
      return 'metric';
    }

    return undefined;
  }

  /**
   * Check if text matches any of the patterns
   */
  private static matchesPattern(text: string, patterns: string[]): boolean {
    return patterns.some((pattern) => {
      const regex = new RegExp(`\\b${pattern.replace(/\s+/g, '\\s+')}\\b`, 'i');
      return regex.test(text);
    });
  }

  /**
   * Determine if user wants a specific visualization vs general visualization
   */
  static hasSpecificVisualizationRequest(message: string): boolean {
    const text = message.toLowerCase();

    // Look for specific chart type requests
    const specificPatterns = [
      'bar chart',
      'line chart',
      'pie chart',
      'area chart',
      'scatter plot',
      'heatmap',
      'table',
      'metric',
    ];

    return specificPatterns.some((pattern) =>
      new RegExp(`\\b${pattern.replace(/\s+/g, '\\s+')}\\b`, 'i').test(text)
    );
  }
}
