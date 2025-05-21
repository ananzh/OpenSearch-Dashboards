/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { EuiEmptyPrompt, EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import {
  selectActiveTabId,
  selectActiveTab,
  selectQuery,
  selectResults,
  selectIsLoading,
  selectError,
} from '../state_management/selectors';

/**
 * Component that renders the content of the active tab
 * Uses memoized selectors for optimal performance
 */
export const TabContent: React.FC = () => {
  // Use memoized selectors to get state
  const activeTabId = useSelector(selectActiveTabId);
  const tabDefinition = useSelector(selectActiveTab);
  const query = useSelector(selectQuery);
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);
  const results = useSelector(selectResults);

  if (!tabDefinition) {
    return (
      <EuiEmptyPrompt
        title={<h2>Tab not found</h2>}
        body={<p>The selected tab could not be found.</p>}
      />
    );
  }

  // Get the tab component
  const TabComponent = tabDefinition.component;

  // Prepare query for the active tab
  const preparedQuery = tabDefinition.prepareQuery(query);

  return (
    <EuiPanel paddingSize="m">
      {isLoading && !results ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <EuiLoadingSpinner size="xl" />
        </div>
      ) : error ? (
        <EuiEmptyPrompt title={<h2>Error</h2>} body={<p>{error.message}</p>} />
      ) : !results ? (
        <EuiEmptyPrompt title={<h2>No results</h2>} body={<p>Run a query to see results.</p>} />
      ) : (
        <TabComponent query={preparedQuery} results={results} isLoading={isLoading} error={error} />
      )}
    </EuiPanel>
  );
};
