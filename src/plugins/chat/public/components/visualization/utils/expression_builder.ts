/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Build OpenSearch Dashboards expression from Vega specification
 */
export class ExpressionBuilder {
  /**
   * Convert Vega spec to OpenSearch Dashboards expression string
   */
  static buildVegaExpression(vegaSpec: any, searchContext?: any): string {
    // For table type, return empty expression (handled differently)
    if (vegaSpec.type === 'table') {
      return '';
    }

    // Build the expression chain
    const expressions = [];

    // Start with opensearchDashboards context
    expressions.push('opensearchDashboards');

    // Add context if available
    if (searchContext) {
      const contextParams = [];

      if (searchContext.timeRange) {
        contextParams.push(`timeRange="${this.escapeJson(searchContext.timeRange)}"`);
      }

      if (searchContext.filters) {
        contextParams.push(`filters="${this.escapeJson(searchContext.filters)}"`);
      }

      if (searchContext.query) {
        contextParams.push(`query="${this.escapeJson(searchContext.query)}"`);
      }

      if (contextParams.length > 0) {
        expressions.push(`opensearch_dashboards_context ${contextParams.join(' ')}`);
      }
    }

    // Add Vega function with spec
    const vegaSpecJson = JSON.stringify(vegaSpec);
    expressions.push(`vega spec="${this.escapeJson(vegaSpecJson)}"`);

    return expressions.join(' | ');
  }

  /**
   * Escape JSON for expression parameter
   */
  private static escapeJson(obj: any): string {
    const jsonString = typeof obj === 'string' ? obj : JSON.stringify(obj);
    // Escape double quotes for expression parameters
    return jsonString.replace(/"/g, '\\"');
  }

  /**
   * Build simple expression for testing
   */
  static buildSimpleExpression(vegaSpec: any): string {
    if (vegaSpec.type === 'table') {
      return '';
    }

    const specJson = JSON.stringify(vegaSpec);
    return `vega spec='${specJson.replace(/'/g, "\\'")}'`;
  }
}
