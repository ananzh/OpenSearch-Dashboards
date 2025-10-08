/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiPanel, EuiText, EuiSpacer, EuiCode, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { useOpenSearchDashboards } from '../../../../../opensearch_dashboards_react/public';
import { ExploreServices } from '../../../types';
import { loadQueryActionCreator } from '../../../application/utils/state_management/actions/query_editor/load_query';
import { useSetEditorTextWithQuery } from '../../../application/hooks';
import { useTabResults } from '../../../application/utils/hooks/use_tab_results';

interface ExecuteAndVisualizeArgs {
  query: string;
  chartType?: 'line' | 'bar' | 'area' | 'pie' | 'metric' | 'heatmap' | 'scatter' | 'table';
  title?: string;
  description?: string;
  autoDetect?: boolean;
}

const NOOP_ASSISTANT_ACTION_HOOK = (_action: any) => {};

/**
 * Extract sample field information for AI context
 */
function extractSampleFields(fieldSchema: any[]): any {
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
function createSampleRow(hit: any): any {
  if (!hit || !hit._source) return null;

  const source = hit._source;
  const sampleRow: any = {};
  const keys = Object.keys(source).slice(0, 5); // First 5 fields only

  for (const key of keys) {
    sampleRow[key] = source[key];
  }

  return sampleRow;
}

export function useExecuteAndVisualizeAction(
  setEditorTextWithQuery: ReturnType<typeof useSetEditorTextWithQuery>
) {
  const { services } = useOpenSearchDashboards<ExploreServices>();
  const dispatch = useDispatch();
  const { results } = useTabResults();

  // Get assistant action service through contextProvider (optional)
  const assistantActionService = services.contextProvider?.getAssistantActionService?.();

  const useAssistantAction =
    services.contextProvider?.hooks?.useAssistantAction || NOOP_ASSISTANT_ACTION_HOOK;

  useAssistantAction<ExecuteAndVisualizeArgs>({
    name: 'execute_and_visualize',
    description:
      'Execute a PPL query and prepare data for visualization. After calling this tool successfully, you should call create_chat_visualization to display the results in chat.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The PPL query to execute for visualization',
        },
        chartType: {
          type: 'string',
          enum: ['line', 'bar', 'area', 'pie', 'metric', 'heatmap', 'scatter', 'table'],
          description:
            'Specific chart type to create. If not provided, will auto-detect based on data and user intent',
        },
        title: {
          type: 'string',
          description: 'Optional title for the visualization',
        },
        description: {
          type: 'string',
          description: 'Optional description - can be used to infer chart type from user intent',
        },
        autoDetect: {
          type: 'boolean',
          description: 'Whether to automatically detect the best chart type (default: true)',
        },
      },
      required: ['query'],
    },

    handler: async (args) => {
      try {
        // Step 1: Execute the PPL query in Explore (same as ppl_execute_query_action)
        dispatch(loadQueryActionCreator(services, setEditorTextWithQuery, args.query));

        // Wait for query results to be available in Redux store
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check if we have results to pass
        if (!results || !results.hits?.hits) {
          return {
            success: false,
            error: 'Query executed but results are not yet available for visualization.',
            query: args.query,
          };
        }

        // Create lightweight response for AI context
        const lightweightResponse = {
          success: true,
          query: args.query,
          executed: true,
          dataPoints: results.hits.hits.length,
          message:
            'Query executed successfully. Data is ready for visualization. Call create_chat_visualization to display the results.',
          chartType: args.chartType || 'auto-detect',
          // Include sample data for AI understanding
          sampleFields: extractSampleFields(results.fieldSchema),
          sampleRow: results.hits.hits.length > 0 ? createSampleRow(results.hits.hits[0]) : null,
          nextAction: {
            tool: 'create_chat_visualization',
            reason: 'Query results are ready for visualization',
            recommendedArgs: {
              chartType: args.chartType,
              title: args.title,
              description: args.description,
              autoDetect: args.autoDetect,
            },
          },
        };

        // Store full query results for tool access via InterToolDataService
        // This creates a full result that includes the complete queryResults
        const fullResult = {
          ...lightweightResponse,
          queryResults: results, // Full data for next tool
        };

        // The InterToolDataService will store the fullResult and create lightweight summaries
        // Return lightweight response to avoid AI context overflow
        return fullResult;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          query: args.query,
        };
      }
    },

    render: ({ status, args, result }) => {
      if (!args) return null;

      const getStatusColor = () => {
        if (status === 'failed' || (result && !result.success)) return 'danger';
        if (status === 'complete' && result?.success) return 'success';
        return 'subdued';
      };

      const getStatusIcon = () => {
        if (status === 'failed' || (result && !result.success)) return '✗';
        if (status === 'executing') return '⟳';
        return '📊';
      };

      return (
        <EuiPanel paddingSize="s" color={getStatusColor()}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{getStatusIcon()}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                {status === 'executing' && 'Executing query and creating visualization...'}
                {status === 'complete' && result?.message}
                {status === 'failed' && (result?.error || 'Failed to execute query and visualize')}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>

          {args.title && (
            <>
              <EuiSpacer size="xs" />
              <EuiText size="s">
                <strong>Title:</strong> {args.title}
              </EuiText>
            </>
          )}

          <EuiSpacer size="xs" />
          <EuiText size="xs">
            <EuiCode transparentBackground>
              Query: {args.query}
              {result?.chartType && ` | Type: ${result.chartType}`}
              {result?.dataPoints && ` | Points: ${result.dataPoints}`}
              {result?.autoDetected && ' | Auto-detected'}
              {result?.userRequested && ' | User requested'}
            </EuiCode>
          </EuiText>

          {/* Show visualization error if query succeeded but visualization failed */}
          {result?.visualizationError && (
            <>
              <EuiSpacer size="xs" />
              <EuiText size="xs" color="subdued">
                Visualization: {result.visualizationError}
              </EuiText>
            </>
          )}

          {/* Note: Visualization renders in the Chat panel via the helper function */}
        </EuiPanel>
      );
    },
  });
}
