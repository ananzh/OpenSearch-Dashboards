/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { setActiveTab } from '../slices';
import { ExploreServices } from '../../../../types';
import { defaultPrepareQuery } from './query_actions';
import { getVisualizationType } from '../../../../components/visualizations/utils/use_visualization_types';

/**
 * Determines if results can be visualized
 */
const canResultsBeVisualized = (results: any): boolean => {
  if (!results?.hits?.hits || !results?.fieldSchema || results.hits.hits.length === 0) {
    return false;
  }

  const rows = results.hits.hits;
  const fieldSchema = results.fieldSchema;
  const visualizationData = getVisualizationType(rows, fieldSchema);

  return !!visualizationData?.visualizationType;
};

/**
 * Determines the optimal tab based on results
 */
const determineOptimalTab = (results: any): string => {
  if (canResultsBeVisualized(results)) {
    return 'explore_visualization_tab';
  }
  return 'logs';
};

/**
 * Redux thunk to detect and set optimal tab
 * @param savedTabId - Optional tab ID from saved explore (when provided, skips detection)
 */
export const detectAndSetOptimalTab = createAsyncThunk<
  void,
  { services: ExploreServices; savedTabId?: string },
  { state: RootState }
>('ui/detectAndSetOptimalTab', async ({ services, savedTabId }, { getState, dispatch }) => {
  const state = getState();

  // If savedTabId is provided, use it and skip detection
  if (savedTabId) {
    dispatch(setActiveTab(savedTabId));
    return;
  }

  const query = state.query;
  const results = state.results;

  // Get results for visualization tab to test compatibility
  const visualizationTab = services.tabRegistry?.getTab('explore_visualization_tab');
  const visualizationTabPrepareQuery = visualizationTab?.prepareQuery || defaultPrepareQuery;
  const queryString = typeof query.query === 'string' ? query.query : '';
  const visualizationTabCacheKey = visualizationTabPrepareQuery(queryString);

  const visualizationResults = results[visualizationTabCacheKey];

  // Only switch if we have valid results
  if (visualizationResults && visualizationResults.hits?.hits?.length > 0) {
    const optimalTab = determineOptimalTab(visualizationResults);
    dispatch(setActiveTab(optimalTab));
  }
});
