/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiPanel, EuiText, EuiSpacer, EuiCode, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useOpenSearchDashboards } from '../../../../opensearch_dashboards_react/public';
import { EmbeddableVisualization } from '../components/visualization/embeddable_visualization';
import { ChatDataProcessor } from '../components/visualization/utils/data_processor';
import { ChartIntentParser } from '../components/visualization/utils/intent_parser';
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

interface VisualizeQueryDataArgs {
  query: string;
  chartType?: ChartType;
  title?: string;
  description?: string;
  autoDetect?: boolean;
}

const NOOP_ASSISTANT_ACTION_HOOK = (_action: any) => {};

export function useVisualizeQueryDataAction() {
  const { services } = useOpenSearchDashboards();

  const useAssistantAction =
    services.contextProvider?.hooks?.useAssistantAction || NOOP_ASSISTANT_ACTION_HOOK;

  useAssistantAction<VisualizeQueryDataArgs>({
    name: 'visualize_query_data',
    description:
      'Execute a PPL query and create a visualization from the results. Supports auto-detection of chart types or specific chart type requests.',
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
        // Step 1: Parse user intent for chart type
        let requestedChartType = args.chartType;

        if (!requestedChartType && args.description) {
          // Try to parse chart type from description (user message)
          requestedChartType = ChartIntentParser.parseChartType(args.description);
        }

        // Step 2: Execute the PPL query using OpenSearch client
        const queryResult = await executeQuery(services, args.query);

        if (!queryResult || !queryResult.hits?.hits) {
          return {
            success: false,
            error: 'No query results available. Please check your query and try again.',
            query: args.query,
          };
        }

        // Step 3: Process query results into visualization format
        const processedData = ChatDataProcessor.processOpenSearchResults(
          queryResult.hits.hits,
          queryResult.fieldSchema || []
        );

        if (!processedData.transformedData.length) {
          return {
            success: false,
            error: 'Query returned no data to visualize.',
            query: args.query,
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

        // Step 6: Validate chart type is feasible with available data
        const isValidChartType = validateChartTypeForData(finalChartType, processedData);
        if (!isValidChartType && !requestedChartType) {
          // If auto-detected type isn't valid, fall back to table
          finalChartType = 'table';
        }

        const wasAutoDetected = !args.chartType && !requestedChartType;
        const userIntentOverrode = !!requestedChartType && requestedChartType !== finalChartType;

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
          query: args.query,
          chartType: finalChartType,
          dataPoints: processedData.transformedData.length,
          autoDetected: wasAutoDetected,
          userRequested: !!requestedChartType,
          message,
          title: args.title,
          processedData, // Include processed data for rendering
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
              Query: {args.query}
              {result?.chartType && ` | Type: ${result.chartType}`}
              {result?.dataPoints && ` | Points: ${result.dataPoints}`}
              {result?.autoDetected && ' | Auto-detected'}
              {result?.userRequested && ' | User requested'}
            </EuiCode>
          </EuiText>

          {/* Render the actual visualization when complete and successful */}
          {status === 'complete' && result?.success && result?.processedData && (
            <>
              <EuiSpacer size="s" />
              <EmbeddableVisualization
                data={result.processedData}
                chartType={result.chartType}
                title={
                  args.title ||
                  `${result.chartType} visualization`.charAt(0).toUpperCase() +
                    `${result.chartType} visualization`.slice(1)
                }
                height={350}
              />
            </>
          )}
        </EuiPanel>
      );
    },
  });
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
 * Execute PPL query using OpenSearch client
 */
async function executeQuery(services: any, query: string): Promise<QueryResult | null> {
  try {
    // Use the data plugin's search service to execute PPL query
    const searchService = services.data?.search;
    if (!searchService) {
      throw new Error('Search service not available');
    }

    // Build the PPL query request
    const request = {
      params: {
        query,
        format: 'jdbc',
      },
    };

    // Execute the query
    const response = await searchService.search(request).toPromise();

    if (!response?.rawResponse) {
      throw new Error('Invalid query response');
    }

    // Transform the response to match our expected format
    const rawResponse = response.rawResponse;

    // Extract hits and schema from PPL response
    const hits =
      rawResponse.datarows?.map((row: any[], index: number) => ({
        _id: `doc_${index}`,
        _source:
          rawResponse.schema?.reduce((obj: any, field: any, idx: number) => {
            obj[field.name] = row[idx];
            return obj;
          }, {}) || {},
      })) || [];

    const fieldSchema =
      rawResponse.schema?.map((field: any) => ({
        name: field.name,
        type: field.type,
      })) || [];

    return {
      hits: {
        hits,
        total: { value: hits.length },
      },
      fieldSchema,
    };
  } catch (error) {
    return null;
  }
}
