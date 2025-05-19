/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiEmptyPrompt, EuiPanel, EuiText } from '@elastic/eui';
import { TabComponentProps } from '../../../services/tab_registry/tab_registry_service';

/**
 * Visualizations tab component for displaying charts
 */
const VisualizationsTab: React.FC<TabComponentProps> = ({ query, results }) => {
  if (!results || !results.aggregations) {
    return (
      <EuiEmptyPrompt
        title={<h3>No visualization data</h3>}
        body={
          <p>
            Try running a query with aggregations to generate a visualization.
            <br />
            Example: <code>source=my-index | stats count() by host</code>
          </p>
        }
      />
    );
  }

  // In a real implementation, this would render a chart based on the results
  // For this example, we'll just display the aggregation data as text
  return (
    <EuiPanel paddingSize="m">
      <EuiText>
        <h3>Visualization</h3>
        <p>Query: {typeof query.query === 'string' ? query.query : JSON.stringify(query.query)}</p>
        <pre>{JSON.stringify(results.aggregations, null, 2)}</pre>
      </EuiText>
    </EuiPanel>
  );
};

// Default export for React.lazy
export default VisualizationsTab;