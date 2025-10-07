/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  EuiPanel,
  EuiText,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiLoadingChart,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiBasicTable,
  EuiBasicTableColumn,
} from '@elastic/eui';
import { useOpenSearchDashboards } from '../../../../opensearch_dashboards_react/public';
import { ExpressionsStart } from '../../../../../expressions/public';
import { ProcessedVisualizationData, ChartType, VisColumn } from './types';
import { VegaSpecGenerator } from './specs/vega_spec_generator';
import { ExpressionBuilder } from './utils/expression_builder';

interface EmbeddableVisualizationProps {
  data: ProcessedVisualizationData;
  chartType: ChartType;
  title?: string;
  height?: number;
}

interface ExploreServices {
  expressions?: ExpressionsStart;
}

export const EmbeddableVisualization: React.FC<EmbeddableVisualizationProps> = ({
  data,
  chartType,
  title,
  height = 400,
}) => {
  const { services } = useOpenSearchDashboards<ExploreServices>();
  const [error, setError] = useState<string | null>(null);

  // Generate Vega specification
  const vegaSpec = useMemo(() => {
    try {
      return VegaSpecGenerator.generateSpec(data, chartType, { title });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate chart specification');
      return null;
    }
  }, [data, chartType, title]);

  // Build expression
  const expression = useMemo(() => {
    if (!vegaSpec) return '';

    try {
      return ExpressionBuilder.buildSimpleExpression(vegaSpec);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build expression');
      return '';
    }
  }, [vegaSpec]);

  // Handle table rendering separately
  if (chartType === 'table' && vegaSpec) {
    return (
      <EuiPanel paddingSize="m" style={{ height: 'auto' }}>
        <TableVisualization
          data={vegaSpec.data}
          columns={vegaSpec.columns}
          title={title || vegaSpec.title}
        />
      </EuiPanel>
    );
  }

  // Handle errors
  if (error) {
    return (
      <EuiPanel paddingSize="m" style={{ height }}>
        <EuiEmptyPrompt
          iconType="alert"
          color="danger"
          title={<h4>Visualization Error</h4>}
          body={<p>{error}</p>}
          actions={
            <EuiButton size="s" onClick={() => setError(null)}>
              Retry
            </EuiButton>
          }
        />
      </EuiPanel>
    );
  }

  // Handle no data
  if (!data.transformedData.length) {
    return (
      <EuiPanel paddingSize="m" style={{ height }}>
        <EuiEmptyPrompt
          iconType="visLine"
          title={<h4>No Data</h4>}
          body={<p>No data available for visualization.</p>}
        />
      </EuiPanel>
    );
  }

  // Get expression renderer
  const ExpressionRenderer = services.expressions?.ReactExpressionRenderer;

  if (!ExpressionRenderer) {
    return (
      <EuiPanel paddingSize="m" style={{ height }}>
        <EuiEmptyPrompt
          iconType="alert"
          color="warning"
          title={<h4>Expression Service Unavailable</h4>}
          body={
            <p>
              The visualization service is not available. Please check your plugin configuration.
            </p>
          }
        />
      </EuiPanel>
    );
  }

  if (!expression) {
    return (
      <EuiPanel paddingSize="m" style={{ height }}>
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ height: '100%' }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingChart size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel paddingSize="s" style={{ height, minHeight: '300px' }}>
      {title && (
        <>
          <EuiText size="m">
            <strong>{title}</strong>
          </EuiText>
          <EuiSpacer size="s" />
        </>
      )}

      <div style={{ height: title ? height - 50 : height, minHeight: '250px' }}>
        <ExpressionRenderer
          expression={expression}
          renderError={(renderError: any) => (
            <EuiEmptyPrompt
              iconType="alert"
              color="danger"
              title={<h4>Render Error</h4>}
              body={<p>{renderError?.message || 'Failed to render visualization'}</p>}
            />
          )}
        />
      </div>
    </EuiPanel>
  );
};

/**
 * Simple table visualization component
 */
interface TableVisualizationProps {
  data: Array<Record<string, any>>;
  columns: VisColumn[];
  title: string;
}

const TableVisualization: React.FC<TableVisualizationProps> = ({ data, columns, title }) => {
  const tableColumns: Array<EuiBasicTableColumn<Record<string, any>>> = columns.map((col) => ({
    field: col.column,
    name: col.name,
    sortable: true,
    truncateText: true,
  }));

  return (
    <>
      <EuiText size="m">
        <strong>{title}</strong>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiBasicTable
        items={data}
        columns={tableColumns}
        pagination={{
          pageIndex: 0,
          pageSize: 10,
          totalItemCount: data.length,
          showPerPageOptions: false,
        }}
        responsive
      />
    </>
  );
};
