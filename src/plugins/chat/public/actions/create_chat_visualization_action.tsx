/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiPanel,
  EuiText,
  EuiSpacer,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { useOpenSearchDashboards } from '../../../opensearch_dashboards_react/public';
import { ChatDataProcessor } from '../components/visualization/utils/data_processor';
import { ChartIntentParser } from '../components/visualization/utils/intent_parser';
import { VegaSpecGenerator } from '../components/visualization/specs/vega_spec_generator';
import { ExpressionBuilder } from '../components/visualization/utils/expression_builder';
import {
  ChartType,
  VisColumn,
  ProcessedVisualizationData,
} from '../components/visualization/types';

interface OpenSearchHit {
  _source: Record<string, any>;
  _id: string;
}

interface QueryResult {
  hits: {
    hits: OpenSearchHit[];
    total: { value: number };
  };
  fieldSchema?: Array<{ name: string; type: string }>;
}

interface CreateChatVisualizationArgs {
  chartType?: ChartType;
  title?: string;
  description?: string;
  autoDetect?: boolean;
  dataSource?: 'latest_query' | 'provided_data';
  // Optional: accept data directly
  data?: {
    hits?: OpenSearchHit[];
    fieldSchema?: Array<{ name: string; type: string }>;
  };
}

const NOOP_ASSISTANT_ACTION_HOOK = (_action: any) => {};

/**
 * Helper function to create chat visualization programmatically
 * This can be called by other plugins without registering as a tool
 */
export async function createChatVisualization(args: CreateChatVisualizationArgs) {
  console.log('[createChatVisualization] Starting with args:', args);

  try {
    // Step 1: Parse user intent for chart type
    let requestedChartType = args.chartType;

    if (!requestedChartType && args.description) {
      // Try to parse chart type from description (user message)
      requestedChartType = ChartIntentParser.parseChartType(args.description);
    }

    // Step 2: Get data from specified source
    let queryResults: QueryResult | null = null;
    console.log('[createChatVisualization] DataSource:', args.dataSource, 'HasData:', !!args.data);

    if (args.dataSource === 'provided_data' && args.data) {
      console.log(
        '[createChatVisualization] Using provided data, hits count:',
        args.data.hits?.length
      );
      // Use provided data directly
      queryResults = {
        hits: {
          hits: args.data.hits || [],
          total: { value: args.data.hits?.length || 0 },
        },
        fieldSchema: args.data.fieldSchema || [],
      };
    } else {
      console.log('[createChatVisualization] Getting latest query results...');
      // Get from latest query results (plugin-agnostic)
      queryResults = await getLatestQueryResults({});
    }

    console.log('[createChatVisualization] Query results:', queryResults);

    if (!queryResults || !queryResults.hits?.hits) {
      console.log('[createChatVisualization] No query results available');
      return {
        success: false,
        error:
          'No query results available. Please run a query action first or provide data directly.',
      };
    }

    // Step 3: Process query results into visualization format
    const processedData = ChatDataProcessor.processOpenSearchResults(
      queryResults.hits.hits,
      queryResults.fieldSchema || []
    );

    if (!processedData.transformedData.length) {
      return {
        success: false,
        error: 'Query returned no data to visualize.',
      };
    }

    // Step 4: Determine final chart type
    let finalChartType = requestedChartType;

    if (!finalChartType && args.autoDetect !== false) {
      // Auto-detect best chart type based on data characteristics
      finalChartType = ChatDataProcessor.autoDetectChartType(processedData);
    }

    if (!finalChartType) {
      finalChartType = 'table'; // Ultimate fallback
    }

    // Step 5: Validate chart type is feasible with available data
    const isValidChartType = validateChartTypeForData(finalChartType, processedData);
    if (!isValidChartType && !requestedChartType) {
      // If auto-detected type isn't valid, fall back to table
      finalChartType = 'table';
    }

    const wasAutoDetected = !args.chartType && !requestedChartType;
    const userIntentOverrode = !!requestedChartType && requestedChartType !== finalChartType;

    // Step 6: Generate Vega spec and expression
    const vegaSpec = VegaSpecGenerator.generateSpec(processedData, finalChartType, {
      title:
        args.title ||
        `${finalChartType} visualization`.charAt(0).toUpperCase() +
          `${finalChartType} visualization`.slice(1),
    });

    const expression = ExpressionBuilder.buildVegaExpression(vegaSpec);

    let message = `Created ${finalChartType} visualization with ${processedData.transformedData.length} data points`;

    if (wasAutoDetected) {
      message += ' (auto-detected)';
    } else if (userIntentOverrode) {
      message += ` (requested ${requestedChartType}, using ${finalChartType})`;
    } else if (requestedChartType) {
      message += ' (as requested)';
    }

    return {
      success: true,
      chartType: finalChartType,
      dataPoints: processedData.transformedData.length,
      autoDetected: wasAutoDetected,
      userRequested: !!requestedChartType,
      message,
      title: args.title,
      expression, // Expression for rendering
      vegaSpec, // Include vega spec for debugging
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export function useCreateChatVisualizationAction() {
  console.log('🛠️ [useCreateChatVisualizationAction] ===== HOOK ENTRY =====');
  console.log('[useCreateChatVisualizationAction] Hook initializing...');
  const { services } = useOpenSearchDashboards();

  console.log(
    '[useCreateChatVisualizationAction] Available services:',
    Object.keys(services || {})
  );
  console.log(
    '[useCreateChatVisualizationAction] contextProvider available:',
    !!services.contextProvider
  );
  console.log('[useCreateChatVisualizationAction] expressions available:', !!services.expressions);

  const useAssistantAction =
    services.contextProvider?.hooks?.useAssistantAction || NOOP_ASSISTANT_ACTION_HOOK;

  console.log(
    '[useCreateChatVisualizationAction] useAssistantAction available:',
    useAssistantAction !== NOOP_ASSISTANT_ACTION_HOOK
  );

  // Use useMemo to prevent recreating action config on every render
  const actionConfig = React.useMemo(
    () => ({
      name: 'create_chat_visualization',
      enabled: true,
      description:
        'Create a visualization in chat from the most recent query results. Supports auto-detection of chart types or specific chart type requests. Must be used after execute_ppl_query.',
      parameters: {
        type: 'object' as const,
        properties: {
          chartType: {
            type: 'string' as const,
            enum: ['line', 'bar', 'area', 'pie', 'metric', 'heatmap', 'scatter', 'table'],
            description:
              'Specific chart type to create. If not provided, will auto-detect based on data and user intent',
          },
          title: {
            type: 'string' as const,
            description: 'Optional title for the visualization',
          },
          description: {
            type: 'string' as const,
            description: 'Optional description - can be used to infer chart type from user intent',
          },
          autoDetect: {
            type: 'boolean' as const,
            description: 'Whether to automatically detect the best chart type (default: true)',
          },
          dataSource: {
            type: 'string' as const,
            enum: ['latest_query', 'provided_data'],
            description: 'Source of data for visualization (default: latest_query)',
          },
          data: {
            type: 'object' as const,
            description: 'Optional: provide data directly instead of using latest query results',
            properties: {
              hits: {
                type: 'array' as const,
                description: 'Array of OpenSearch hits with _source data',
              },
              fieldSchema: {
                type: 'array' as const,
                description: 'Array of field schemas with name and type',
              },
            },
          },
        },
        required: [],
      },
      handler: async (args: CreateChatVisualizationArgs) => {
        console.log('[useCreateChatVisualizationAction] Handler called with args:', args);

        // Check if we have shared data from execution context
        const executionId = (args as any).__executionId;
        const sharedData = (args as any).__sharedData; // Lightweight data for AI context
        const fullSharedData = (args as any).__fullSharedData; // Full data for tool access

        console.log(
          '[useCreateChatVisualizationAction] ExecutionId:',
          executionId,
          'SharedData keys:',
          sharedData ? Object.keys(sharedData) : 'none',
          'FullSharedData keys:',
          fullSharedData ? Object.keys(fullSharedData) : 'none'
        );

        // Enhanced args with shared data if available
        const enhancedArgs = { ...args };

        // If we have shared data from execute_and_visualize, use the full data
        if (fullSharedData && fullSharedData.execute_and_visualize && !args.data) {
          console.log(
            '[useCreateChatVisualizationAction] Using full shared data from execute_and_visualize'
          );
          enhancedArgs.dataSource = 'provided_data';
          enhancedArgs.data = {
            hits: fullSharedData.execute_and_visualize.queryResults?.hits?.hits || [],
            fieldSchema: fullSharedData.execute_and_visualize.queryResults?.fieldSchema || [],
          };
        }
        // Fallback to lightweight data if full data not available (for backwards compatibility)
        else if (sharedData && sharedData.execute_and_visualize && !args.data) {
          console.log(
            '[useCreateChatVisualizationAction] Using lightweight shared data from execute_and_visualize (fallback)'
          );
          enhancedArgs.dataSource = 'provided_data';
          enhancedArgs.data = {
            hits: sharedData.execute_and_visualize.queryResults?.hits?.hits || [],
            fieldSchema: sharedData.execute_and_visualize.queryResults?.fieldSchema || [],
          };
        }

        const result = await createChatVisualization(enhancedArgs);
        console.log('[useCreateChatVisualizationAction] Handler result:', result);
        console.log('[useCreateChatVisualizationAction] Result analysis:');
        console.log('  - success:', result.success);
        console.log('  - expression exists:', !!result.expression);
        console.log('  - expression length:', result.expression?.length);
        console.log('  - title:', result.title);
        console.log('  - chartType:', result.chartType);
        return result;
      },
      render: ({ status, args, result }: any) => {
        console.log('🎨🎨🎨 [create_chat_visualization] ===== RENDER METHOD ENTRY =====');
        console.log(
          '🎨 [create_chat_visualization] RENDER METHOD CALLED - status:',
          status,
          'args:',
          args,
          'result:',
          result
        );
        console.log(
          '🎨 [create_chat_visualization] This means the action appeared as a ToolMessage in chat timeline!'
        );
        console.log('🎨 [create_chat_visualization] Checking render conditions:');
        console.log('  - status === "complete":', status === 'complete');
        console.log('  - result?.success:', result?.success);
        console.log('  - result?.expression exists:', !!result?.expression);
        console.log('  - result?.expression value:', result?.expression);

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
                  {status === 'executing' && 'Creating visualization...'}
                  {status === 'complete' && result?.message}
                  {status === 'failed' && (result?.error || 'Failed to create visualization')}
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
                {result?.chartType && `Type: ${result.chartType}`}
                {result?.dataPoints && ` | Points: ${result.dataPoints}`}
                {result?.autoDetected && ' | Auto-detected'}
                {result?.userRequested && ' | User requested'}
              </EuiCode>
            </EuiText>

            {/* Render the actual visualization when complete and successful */}
            {status === 'complete' && result?.success && result?.expression && (
              <>
                <EuiSpacer size="s" />
                <div style={{ height: '350px', width: '100%' }}>
                  <ExpressionRenderer
                    expression={result.expression}
                    searchContext={{}}
                    onRender={() => {}}
                    onError={(error: any) => console.error('Expression render error:', error)}
                  />
                </div>
                <EuiSpacer size="s" />
                <EuiFlexGroup justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <AddToDashboardButton
                      expression={result.expression}
                      title={result.title || args?.title || 'Chat Visualization'}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            )}
          </EuiPanel>
        );
      },
    }),
    []
  ); // Empty dependency array since the action config is static

  console.log(
    '[useCreateChatVisualizationAction] About to call useAssistantAction with config:',
    actionConfig
  );

  console.log(
    '[useCreateChatVisualizationAction] useAssistantAction function:',
    useAssistantAction
  );

  try {
    useAssistantAction<CreateChatVisualizationArgs>(actionConfig);
    console.log('[useCreateChatVisualizationAction] useAssistantAction called successfully');
  } catch (error) {
    console.error('[useCreateChatVisualizationAction] Error calling useAssistantAction:', error);
  }
}

/**
 * Get latest query results from global query result store
 * This is plugin-agnostic and can be populated by any query action
 */
async function getLatestQueryResults(services: any): Promise<QueryResult | null> {
  try {
    // Check if there's a global query results store
    const globalStore = (window as any).latestQueryResults;

    if (globalStore && globalStore.data) {
      return globalStore.data;
    }

    // Fallback: check assistant context store for query results
    const contextStore = (window as any).assistantContextStore;
    if (contextStore) {
      const contexts = contextStore.getAllContexts();
      const queryResultContext = contexts.find(
        (ctx: any) => ctx.description?.includes('query results') || ctx.type === 'query_results'
      );

      if (queryResultContext && queryResultContext.value) {
        return typeof queryResultContext.value === 'string'
          ? JSON.parse(queryResultContext.value)
          : queryResultContext.value;
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to get latest query results:', error);
    return null;
  }
}

/**
 * Validate if chart type is feasible with the available data
 */
function validateChartTypeForData(chartType: ChartType, data: ProcessedVisualizationData): boolean {
  const { numericalColumns, categoricalColumns, dateColumns } = data;

  switch (chartType) {
    case 'line':
    case 'area':
      // Need at least 1 numerical column for Y-axis
      return numericalColumns.length >= 1;

    case 'bar':
      // Need at least 1 numerical column
      return numericalColumns.length >= 1;

    case 'pie':
      // Need 1 numerical and 1 categorical column
      return numericalColumns.length >= 1 && categoricalColumns.length >= 1;

    case 'scatter':
      // Need at least 2 numerical columns
      return numericalColumns.length >= 2;

    case 'heatmap':
      // Need at least 1 numerical and 2 categorical OR 2 numerical
      return (
        (numericalColumns.length >= 1 && categoricalColumns.length >= 2) ||
        numericalColumns.length >= 2
      );

    case 'metric':
      // Need at least 1 numerical column
      return numericalColumns.length >= 1;

    case 'table':
      // Table can always work with any data
      return true;

    default:
      return true;
  }
}

/**
 * AddToDashboard Button Component for Chat Visualizations
 */
const AddToDashboardButton: React.FC<{
  expression: string;
  title: string;
}> = ({ expression, title }) => {
  const { services } = useOpenSearchDashboards();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleAddToDashboard = async () => {
    if (!services.dashboard) {
      console.error('Dashboard service not available');
      return;
    }

    try {
      setIsLoading(true);

      // Create a saved visualization from the expression
      const savedVisualization = await createSavedVisualization({
        title,
        expression,
        services,
      });

      if (savedVisualization && savedVisualization.id) {
        // Use the same utility function as explore plugin
        const { addToDashboard } = await import(
          '../../../../explore/public/components/visualizations/utils/add_to_dashboard'
        );

        // For simplicity, let's create a new dashboard
        // In a more complete implementation, you'd show a modal to choose existing vs new dashboard
        const dashboardId = await addToDashboard(
          services.dashboard,
          { id: savedVisualization.id, type: 'visualization' },
          'new',
          {
            newDashboardName: `Dashboard with ${title}`,
            createDashboardOptions: {
              isTitleDuplicateConfirmed: false,
              onTitleDuplicate: () => {},
            },
          }
        );

        if (dashboardId) {
          // Show success notification
          const dashboardUrl = services.core.application.getUrlForApp('dashboards', {
            path: `#/view/${dashboardId}`,
          });

          services.toastNotifications?.add({
            title: 'Visualization Added to Dashboard',
            color: 'success',
            iconType: 'check',
            text: `Successfully added "${title}" to a new dashboard. ${
              dashboardUrl ? 'View Dashboard' : ''
            }`,
          });

          // Optionally navigate to dashboard
          if (dashboardUrl) {
            window.open(dashboardUrl, '_blank');
          }
        }
      }
    } catch (error) {
      console.error('Failed to add visualization to dashboard:', error);
      services.toastNotifications?.add({
        title: 'Failed to Add to Dashboard',
        color: 'danger',
        iconType: 'alert',
        text: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <EuiButtonEmpty
      size="s"
      onClick={handleAddToDashboard}
      isLoading={isLoading}
      iconType="dashboardApp"
      data-test-subj="addToDashboardButton"
    >
      Add to Dashboard
    </EuiButtonEmpty>
  );
};

/**
 * Create a saved visualization object from an expression
 */
async function createSavedVisualization({
  title,
  expression,
  services,
}: {
  title: string;
  expression: string;
  services: any;
}) {
  try {
    // Create a saved object for the visualization
    const savedObjectsClient = services.savedObjects?.client;
    if (!savedObjectsClient) {
      throw new Error('SavedObjects client not available');
    }

    // Create the visualization saved object
    const visualizationAttributes = {
      title,
      visState: JSON.stringify({
        type: 'vega',
        params: {
          spec: expression, // The Vega expression/spec
        },
      }),
      uiStateJSON: '{}',
      description: 'Visualization created from chat',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({
          query: {
            match_all: {},
          },
        }),
      },
    };

    const result = await savedObjectsClient.create('visualization', visualizationAttributes, {
      id: `chat-viz-${Date.now()}`,
    });

    return result;
  } catch (error) {
    console.error('Failed to create saved visualization:', error);
    throw error;
  }
}

// Import ExpressionRenderer lazily to avoid circular dependencies
const ExpressionRenderer: React.FC<any> = ({ expression, searchContext, onRender, onError }) => {
  console.log('🎨 [ExpressionRenderer] Component called with expression:', expression);
  const [Component, setComponent] = React.useState<any>(null);

  React.useEffect(() => {
    console.log('🎨 [ExpressionRenderer] Loading ReactExpressionRenderer...');
    import('../../../expressions/public')
      .then(({ ReactExpressionRenderer }) => {
        console.log(
          '🎨 [ExpressionRenderer] ReactExpressionRenderer loaded:',
          ReactExpressionRenderer
        );
        setComponent(() => ReactExpressionRenderer);
      })
      .catch((error) => {
        console.error('🎨 [ExpressionRenderer] Failed to load ReactExpressionRenderer:', error);
      });
  }, []);

  if (!Component) {
    console.log('🎨 [ExpressionRenderer] Component not loaded yet, showing loading...');
    return <EuiText size="s">Loading visualization...</EuiText>;
  }

  console.log('🎨 [ExpressionRenderer] Rendering with Component:', Component);
  return (
    <Component
      expression={expression}
      searchContext={searchContext}
      onRender={() => {
        console.log('🎨 [ExpressionRenderer] onRender called');
        onRender && onRender();
      }}
      onError={(error) => {
        console.error('🎨 [ExpressionRenderer] onError called:', error);
        onError && onError(error);
      }}
    />
  );
};
