/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { EuiEmptyPrompt, EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import { RootState } from '../state_management/store';
import { createCacheKey } from '../state_management/handlers/query_handler';

/**
 * Component that renders the content of the active tab
 */
export const TabContent: React.FC = () => {
  const { activeTabId } = useSelector((state: RootState) => state.ui);
  const { query } = useSelector((state: RootState) => state.query);
  const isLoading = useSelector((state: RootState) => state.ui.isLoading);
  const error = useSelector((state: RootState) => state.ui.error);
  const results = useSelector((state: RootState) => state.results);
  const services = useSelector((state: RootState) => state.services);
  
  // Get the active tab definition
  const tabDefinition = services.tabRegistry.getTab(activeTabId);
  
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
  
  // Get time range
  const timeRange = services.data.query.timefilter.timefilter.getTime();
  
  // Create cache key
  const cacheKey = createCacheKey(preparedQuery, timeRange);
  
  // Get results for this tab
  const tabResults = results[cacheKey];
  
  return (
    <EuiPanel paddingSize="m">
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <EuiLoadingSpinner size="xl" />
        </div>
      ) : error ? (
        <EuiEmptyPrompt
          title={<h2>Error</h2>}
          body={<p>{error.message}</p>}
        />
      ) : !tabResults ? (
        <EuiEmptyPrompt
          title={<h2>No results</h2>}
          body={<p>Run a query to see results.</p>}
        />
      ) : (
        <TabComponent
          query={preparedQuery}
          results={tabResults}
          isLoading={isLoading}
          error={error}
        />
      )}
    </EuiPanel>
  );
};