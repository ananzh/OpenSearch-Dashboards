/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiPanel, EuiText, EuiSpacer, EuiCode, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { useOpenSearchDashboards } from '../../../../opensearch_dashboards_react/public';
import { ExploreServices } from '../types';
import { loadQueryActionCreator } from '../application/utils/state_management/actions/query_editor/load_query';
import { useSetEditorTextWithQuery } from '../application/hooks';

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

  const useAssistantAction =
    services.contextProvider?.hooks?.useAssistantAction || NOOP_ASSISTANT_ACTION_HOOK;

  useAssistantAction<ExecuteAndVisualizeArgs>({
    name: 'execute_and_visualize',
    description:
      'Execute a PPL query and create a visualization in chat. This is the primary tool for query execution and visualization from any page.',
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
        // Step 1: Execute the PPL query in Explore
        dispatch(loadQueryActionCreator(services, setEditorTextWithQuery, args.query));

        // Wait for query execution to complete
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Step 2: Get results from Redux store
        // We need to access the current results from the store
        // This is a temporary solution - in production we'd want a more robust way
        const exploreStore =
          (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ||
          (window as any).__REDUX_STORE__ ||
          null;

        // Fallback: try to get from global context or service
        let currentResults = null;
        try {
          // Access results through service if available
          if (services?.data?.search) {
            // We'll rely on the global context store for now
            const contextStore = (window as any).assistantContextStore;
            if (contextStore) {
              const contexts = contextStore.getAllContexts();
              const queryResultContext = contexts.find(
                (ctx: any) =>
                  ctx.description?.includes('query results') || ctx.type === 'query_results'
              );
              if (queryResultContext?.value) {
                currentResults =
                  typeof queryResultContext.value === 'string'
                    ? JSON.parse(queryResultContext.value)
                    : queryResultContext.value;
              }
            }
          }
        } catch (error) {
          console.warn('Could not access query results from context:', error);
        }

        if (!currentResults || !currentResults.hits) {
          return {
            success: false,
            error: 'No query results available. Please check your query and try again.',
            query: args.query,
          };
        }

        // Step 3: Call Chat's visualization helper function
        const chatVisualizationResult = await callChatVisualization({
          data: {
            hits: currentResults.hits.hits,
            fieldSchema: currentResults.fieldSchema || [],
          },
          chartType: args.chartType,
          title: args.title,
          description: args.description,
          autoDetect: args.autoDetect,
          dataSource: 'provided_data',
        });

        if (!chatVisualizationResult.success) {
          return {
            success: false,
            error: chatVisualizationResult.error,
            query: args.query,
          };
        }

        return {
          success: true,
          query: args.query,
          executed: true,
          chartType: chatVisualizationResult.chartType,
          dataPoints: chatVisualizationResult.dataPoints,
          autoDetected: chatVisualizationResult.autoDetected,
          userRequested: chatVisualizationResult.userRequested,
          message: `Query executed successfully. ${chatVisualizationResult.message}`,
          title: args.title,
          // Include visualization data for rendering in chat
          visualizationResult: chatVisualizationResult,
        };
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

          {/* Render the actual visualization when complete and successful */}
          {status === 'complete' && result?.success && result?.visualizationResult && (
            <>
              <EuiSpacer size="s" />
              <ChatVisualizationRenderer result={result.visualizationResult} />
            </>
          )}
        </EuiPanel>
      );
    },
  });
}

/**
 * Call Chat's visualization helper function
 */
async function callChatVisualization(args: any) {
  try {
    // Import and call the chat visualization helper
    const { createChatVisualization } = await import(
      '../../../../chat/public/actions/create_chat_visualization_action'
    );
    return await createChatVisualization(args);
  } catch (error) {
    console.error('Failed to call chat visualization:', error);
    return {
      success: false,
      error: 'Failed to create visualization. Chat plugin may not be available.',
    };
  }
}

/**
 * Component to render the chat visualization result
 */
const ChatVisualizationRenderer: React.FC<{ result: any }> = ({ result }) => {
  if (!result?.expression) {
    return (
      <EuiText size="s" color="subdued">
        Visualization data not available
      </EuiText>
    );
  }

  // Import and render the visualization expression
  const [ExpressionRenderer, setExpressionRenderer] = React.useState<any>(null);

  React.useEffect(() => {
    import('../../../../expressions/public').then(({ ReactExpressionRenderer }) => {
      setExpressionRenderer(() => ReactExpressionRenderer);
    });
  }, []);

  if (!ExpressionRenderer) {
    return <EuiText size="s">Loading visualization...</EuiText>;
  }

  return (
    <div style={{ height: '350px', width: '100%' }}>
      <ExpressionRenderer
        expression={result.expression}
        searchContext={{}}
        onRender={() => {}}
        onError={(error: any) => console.error('Expression render error:', error)}
      />
    </div>
  );
};
