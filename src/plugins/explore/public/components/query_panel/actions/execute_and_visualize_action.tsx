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
      'Execute a PPL query and prepare for visualization. After calling this, you should call create_chat_visualization to display the results. This tool executes the query and tells you when to create the visualization.',
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
      console.log('[execute_and_visualize] Starting execution with args:', args);

      try {
        // Step 1: Execute the PPL query in Explore (same as ppl_execute_query_action)
        console.log('[execute_and_visualize] Dispatching query:', args.query);
        dispatch(loadQueryActionCreator(services, setEditorTextWithQuery, args.query));

        // Step 2: Trigger Chat visualization action to render in Chat panel
        if (assistantActionService) {
          console.log(
            '[execute_and_visualize] AssistantActionService available, waiting for results...'
          );

          try {
            // Wait a moment for query results to be available in Redux store
            await new Promise((resolve) => setTimeout(resolve, 2000));

            console.log('[execute_and_visualize] Checking results after wait, results:', results);

            // Check if we have results to pass
            if (!results || !results.hits?.hits) {
              console.log('[execute_and_visualize] No results available yet');
              return {
                success: true,
                query: args.query,
                executed: true,
                message:
                  'Query executed successfully, but results are not yet available for visualization.',
              };
            }

            console.log(
              '[execute_and_visualize] Results available, hits count:',
              results.hits.hits.length
            );
            console.log('[execute_and_visualize] Calling assistantActionService.executeAction...');

            // Trigger the Chat visualization action programmatically with data
            // This will test if programmatic calls create ToolMessages
            console.log(
              '[execute_and_visualize] Testing programmatic call to create_chat_visualization...'
            );
            const vizResult = await assistantActionService.executeAction(
              'create_chat_visualization',
              {
                chartType: args.chartType,
                title: args.title,
                description: args.description,
                autoDetect: args.autoDetect,
                dataSource: 'provided_data',
                data: {
                  hits: results.hits.hits,
                  fieldSchema: results.fieldSchema || [],
                },
              }
            );

            console.log('[execute_and_visualize] Visualization result:', vizResult);

            return {
              success: true,
              query: args.query,
              executed: true,
              message: 'Query executed and programmatic visualization call completed.',
              chartType: args.chartType || 'auto-detected',
              visualizationResult: vizResult,
            };
          } catch (visualizationError) {
            return {
              success: true, // Query execution was successful
              query: args.query,
              executed: true,
              message: 'Query executed successfully, but visualization could not be created.',
              visualizationError:
                visualizationError instanceof Error
                  ? visualizationError.message
                  : 'Unknown visualization error',
            };
          }
        } else {
          // AssistantActionService not available (contextProvider or chat plugin disabled)
          return {
            success: true,
            query: args.query,
            executed: true,
            message:
              'Query executed successfully. Context provider or chat plugin not available for visualization.',
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          query: args.query,
        };
      }
    },

    render: ({ status, args, result }) => {
      console.log(
        '🎨 [execute_and_visualize] RENDER METHOD CALLED - status:',
        status,
        'args:',
        args,
        'result:',
        result
      );
      console.log(
        '🎨 [execute_and_visualize] This means the action appeared as a ToolMessage in chat timeline!'
      );

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

          {/* Note: Visualization renders in the Chat panel, not here */}
        </EuiPanel>
      );
    },
  });
}

// Visualization rendering is handled by the Chat plugin itself
// The visualization will appear in the Chat panel via the programmatically triggered action
