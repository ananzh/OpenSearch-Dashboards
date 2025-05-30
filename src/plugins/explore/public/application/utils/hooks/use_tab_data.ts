/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { useOpenSearchDashboards } from '../../../../../opensearch_dashboards_react/public';
import { ExploreServices } from '../../../types';
import { RootState } from '../state_management/store';
import { createTabCacheKey } from '../state_management/actions/query_actions';

/**
 * Hook that provides tab data from Redux
 * This replaces the table data functionality from useDiscoverContext
 */
export const useTabData = () => {
  // Get services from context
  const { services } = useOpenSearchDashboards<ExploreServices>();

  const queryState = useSelector((state: RootState) => state.query);
  const resultsState = useSelector((state: RootState) => state.results);
  const uiState = useSelector((state: RootState) => state.ui);

  // Get current time range from services context
  const timeRange = services.data?.query?.timefilter?.timefilter?.getTime() || {
    from: 'now-15m',
    to: 'now',
  };

  // Create cache key
  const cacheKey = createTabCacheKey(queryState.query, timeRange);

  // Get results from cache
  const results = useMemo(() => {
    return resultsState[cacheKey] || null;
  }, [resultsState, cacheKey]);

  // Extract rows from results
  const rows = useMemo(() => {
    if (results?.hits?.hits) {
      return results.hits.hits;
    }
    return [];
  }, [results]);

  // Extract field counts from results
  const fieldCounts = useMemo(() => {
    if (results?.fieldCounts) {
      return results.fieldCounts;
    }
    return {};
  }, [results]);

  return {
    rows,
    fieldCounts,
    isLoading: uiState.isLoading,
    error: uiState.error,
  };
};
